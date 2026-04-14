// ── Find Related/Similar Companies (BFS Crawl) ──────────────────────

import { isICPTarget } from "../../lib/icp-filter";
import {
  randomDelay,
  waitForTabLoad,
  clickSeeMore,
  isTabAlive,
  safeTabUpdate,
  safeSendMessage,
  scrollToBottom,
} from "./tab-utils";
import {
  extractCompanyData,
  countRemoteJobsVoyagerFirst,
  saveCompanyBatch,
  type RemoteJobsResult,
} from "./company-browsing";
import { scrapePosts, scrapeJobs, scrapePeople, setCompanyScraperCancelled, type CompanyContext } from "./company-scraper";
import { gqlRequest } from "../../services/graphql";

const MAX_COMPANIES = 150;
const SAVE_BATCH_SIZE = 10;
const MAX_LOG_LINES_IN_OVERLAY = 80;

// ── Cancellation ────────────────────────────────────────────────────
let findRelatedCancelled = false;

export function setFindRelatedCancelled(value: boolean) {
  findRelatedCancelled = value;
}

// Click "Show all" in the "Pages people also viewed" section (if present).
function clickShowAllSimilar(tabId: number): Promise<boolean> {
  return chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        const keywords = ["people also viewed", "similar pages", "affiliated"];
        const headings = document.querySelectorAll("h1, h2, h3, h4, [role='heading']");
        for (const heading of headings) {
          const text = heading.textContent?.trim().toLowerCase() || "";
          if (keywords.some((kw) => text.includes(kw))) {
            // Walk up from heading to find a container with a "Show all" link
            let container: Element | null = heading.closest("section") || heading.closest("aside");
            if (!container) {
              let el: Element | null = heading.parentElement;
              while (el && el !== document.body) {
                const hasBtn = Array.from(el.querySelectorAll<HTMLElement>("a, button")).some((b) => {
                  const t = b.textContent?.trim().toLowerCase() || "";
                  return t.includes("show all") || t.includes("see all");
                });
                if (hasBtn || el.querySelector('a[href*="/company/"]')) {
                  container = el;
                  break;
                }
                el = el.parentElement;
              }
            }
            if (!container) continue;
            console.log(`[FindRelated] Container for 'Show all': <${container.tagName}> class="${container.className?.toString().slice(0, 80)}"`);
            const btn = Array.from(container.querySelectorAll<HTMLElement>("a, button")).find((el) => {
              const t = el.textContent?.trim().toLowerCase() || "";
              return t.includes("show all") || t.includes("see all");
            });
            if (btn) {
              console.log("[FindRelated] Found 'Show all' button, clicking:", btn.textContent?.trim());
              btn.click();
              return true;
            }
          }
        }
        return false;
      },
    })
    .then((res) => (res?.[0]?.result as boolean) ?? false)
    .catch((err) => {
      console.error("[FindRelated] clickShowAllSimilar error:", err);
      return false;
    });
}

interface CompanyLink {
  url: string;
  industry: string;
}

// Check if a modal/dialog is open and scrape company links + industry from it, then close it.
function scrapeModalCompanyUrls(tabId: number): Promise<CompanyLink[]> {
  return chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        const modal =
          document.querySelector('[role="dialog"]') ||
          document.querySelector(".artdeco-modal");
        if (!modal) {
          console.log("[FindRelated] No modal found on page");
          return [];
        }

        // Scroll modal content incrementally to trigger lazy-loading
        const scrollable = modal.querySelector(".artdeco-modal__content") || modal;
        const el = scrollable as HTMLElement;
        const step = 500;
        for (let pos = 0; pos < el.scrollHeight; pos += step) {
          el.scrollTop = pos;
        }
        el.scrollTop = el.scrollHeight;

        // Extract company cards with industry labels
        const results: { url: string; industry: string }[] = [];
        const seen = new Set<string>();
        const cards = modal.querySelectorAll(".org-view-entity-card__container");

        for (const card of cards) {
          // Extract company URL
          const anchor = card.querySelector<HTMLAnchorElement>('a[href*="/company/"]');
          if (!anchor) continue;
          try {
            const href = anchor.href.split("?")[0].replace(/\/$/, "");
            const parsed = new URL(href);
            const match = parsed.pathname.match(/^\/company\/([^/]+)$/);
            if (!match || seen.has(href)) continue;
            seen.add(href);

            // Extract industry from subtitle
            const subtitleEl = card.querySelector(".org-view-entity-card__subtitle");
            const industry = subtitleEl?.textContent?.trim() || "";

            results.push({ url: href, industry });
          } catch { /* skip malformed URLs */ }
        }

        // Fallback: if no card containers found, extract plain links (no industry info)
        if (results.length === 0) {
          modal.querySelectorAll<HTMLAnchorElement>('a[href*="/company/"]').forEach((a) => {
            try {
              const href = a.href.split("?")[0].replace(/\/$/, "");
              const parsed = new URL(href);
              const match = parsed.pathname.match(/^\/company\/([^/]+)$/);
              if (match && !seen.has(href)) {
                seen.add(href);
                results.push({ url: href, industry: "" });
              }
            } catch { /* skip malformed URLs */ }
          });
          console.log(`[FindRelated] Modal: card selector missed, fallback found ${results.length} company links`);
        } else {
          console.log(`[FindRelated] Modal: found ${results.length} company cards`);
        }

        // Close modal
        const dismiss =
          modal.querySelector<HTMLElement>(".artdeco-modal__dismiss") ||
          modal.querySelector<HTMLElement>('button[aria-label="Dismiss"]') ||
          modal.querySelector<HTMLElement>('button[aria-label="Close"]');
        if (dismiss) {
          dismiss.click();
          console.log("[FindRelated] Modal dismissed");
        } else {
          console.warn("[FindRelated] No dismiss button found on modal");
        }

        return results;
      },
    })
    .then((res) => (res?.[0]?.result as CompanyLink[]) ?? [])
    .catch((err) => {
      console.error("[FindRelated] scrapeModalCompanyUrls error:", err);
      return [];
    });
}

// Extract company URLs + industry from the "Pages people also viewed" sidebar (fallback).
function extractSidebarCompanyUrls(tabId: number): Promise<CompanyLink[]> {
  return chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        const keywords = ["people also viewed", "similar pages", "affiliated"];
        let container: Element | null = null;
        const headings = document.querySelectorAll("h1, h2, h3, h4, [role='heading']");
        for (const heading of headings) {
          const text = heading.textContent?.trim().toLowerCase() || "";
          if (keywords.some((kw) => text.includes(kw))) {
            // Walk up from heading to find a container that has /company/ links
            container = heading.closest("section") || heading.closest("aside");
            if (!container) {
              let el: Element | null = heading.parentElement;
              while (el && el !== document.body) {
                if (el.querySelector('a[href*="/company/"]')) {
                  container = el;
                  break;
                }
                el = el.parentElement;
              }
            }
            break;
          }
        }
        if (!container) {
          console.log("[FindRelated] No 'people also viewed' section found on page");
          console.log("[FindRelated] All headings on page:");
          headings.forEach((h) => console.log(`  <${h.tagName}> "${h.textContent?.trim().slice(0, 80)}"`));
          return [];
        }
        console.log(`[FindRelated] Sidebar container: <${container.tagName}> class="${container.className?.toString().slice(0, 80)}"`);

        // Try card-based extraction first (has industry labels)
        const results: { url: string; industry: string }[] = [];
        const seen = new Set<string>();
        const cards = container.querySelectorAll(".org-view-entity-card__container, [class*='entity-card']");

        for (const card of cards) {
          const anchor = card.querySelector<HTMLAnchorElement>('a[href*="/company/"]');
          if (!anchor) continue;
          try {
            const href = anchor.href.split("?")[0].replace(/\/$/, "");
            const parsed = new URL(href);
            const match = parsed.pathname.match(/^\/company\/([^/]+)$/);
            if (!match || seen.has(href)) continue;
            seen.add(href);

            const subtitleEl = card.querySelector(".org-view-entity-card__subtitle, [class*='subtitle']");
            const industry = subtitleEl?.textContent?.trim() || "";
            results.push({ url: href, industry });
          } catch { /* skip malformed URLs */ }
        }

        // Fallback: plain link extraction (no industry info available)
        if (results.length === 0) {
          container.querySelectorAll<HTMLAnchorElement>('a[href*="/company/"]').forEach((a) => {
            try {
              const href = a.href.split("?")[0].replace(/\/$/, "");
              const parsed = new URL(href);
              const match = parsed.pathname.match(/^\/company\/([^/]+)$/);
              if (match && !seen.has(href)) {
                seen.add(href);
                results.push({ url: href, industry: "" });
              }
            } catch { /* skip malformed URLs */ }
          });
        }

        console.log(`[FindRelated] Sidebar: found ${results.length} company links`);
        return results;
      },
    })
    .then((res) => (res?.[0]?.result as CompanyLink[]) ?? [])
    .catch((err) => {
      console.error("[FindRelated] extractSidebarCompanyUrls error:", err);
      return [];
    });
}

// Orchestrate: try modal first (click "Show all" → wait → scrape), fall back to sidebar.
async function extractSimilarCompanyUrls(tabId: number): Promise<CompanyLink[]> {
  const clicked = await clickShowAllSimilar(tabId);

  if (clicked) {
    console.log("[FindRelated] 'Show all' clicked, waiting for modal...");
    // Poll for modal to open — each attempt is a separate sync executeScript
    for (let attempt = 0; attempt < 5; attempt++) {
      await randomDelay(1000);
      const modalLinks = await scrapeModalCompanyUrls(tabId);
      if (modalLinks.length > 0) {
        console.log(`[FindRelated] Modal yielded ${modalLinks.length} companies`);
        return modalLinks;
      }
    }
    console.warn("[FindRelated] Modal had 0 links after 5 attempts, falling back to sidebar");
  } else {
    console.log("[FindRelated] No 'Show all' button, using sidebar");
  }

  return extractSidebarCompanyUrls(tabId);
}

// Inject (or update) a floating status overlay on the current page.
function injectCrawlOverlay(
  tabId: number,
  status: {
    saved: number;
    skipped: number;
    queued: number;
    targets: number;
    filtered?: number;
    name: string;
    phase: "saving" | "discovering" | "error";
    logText?: string;
  },
): Promise<void> {
  // Cap log text to last N lines to avoid passing megabytes to DOM
  const cappedLog = status.logText
    ? status.logText.split("\n").slice(-MAX_LOG_LINES_IN_OVERLAY).join("\n")
    : "";

  return chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: (s: { saved: number; skipped: number; queued: number; targets: number; filtered?: number; name: string; phase: string; logText?: string }) => {
        const ATTR = "data-lg-crawl-overlay";
        const COPY_ATTR = "data-lg-crawl-copy";
        const LOG_ATTR = "data-lg-crawl-log";
        let el = document.querySelector(`[${ATTR}]`) as HTMLDivElement | null;
        if (!el) {
          el = document.createElement("div");
          el.setAttribute(ATTR, "true");
          el.style.cssText = `
            position:fixed; bottom:20px; right:20px; z-index:999999;
            background:rgba(15,23,42,0.9); color:#fff; padding:10px 14px;
            border-radius:8px; font:13px/1.4 -apple-system,sans-serif;
            max-width:400px; box-shadow:0 4px 12px rgba(0,0,0,0.3);
            display:flex; align-items:center; gap:8px;
            user-select:text;
          `;
          document.body.appendChild(el);
        }
        const dotColor = s.phase === "saving" ? "#22c55e"
          : s.phase === "discovering" ? "#eab308" : "#ef4444";
        const targetPart = s.targets > 0 ? ` (${s.targets} \u{1F3AF})` : "";
        const filteredPart = s.filtered ? `, ${s.filtered} skipped` : "";
        const statusText = `${s.saved} saved${targetPart}, ${s.skipped} dupes${filteredPart} (${s.queued} queued) \u2014 ${s.name}`;
        const copyText = `FindRelated: ${s.saved} saved (${s.targets} targets), ${s.skipped} dupes, ${s.filtered ?? 0} skipped, ${s.queued} queued \u2014 ${s.name} [${s.phase}]`;
        el.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:${dotColor};display:inline-block;flex-shrink:0;animation:lgpulse 1.2s ease-in-out infinite"></span><span style="user-select:text">${statusText}</span>`;

        const btnStyle = "background:none;border:none;cursor:pointer;opacity:0.6;font-size:14px;padding:0;flex-shrink:0;line-height:1;";
        function makeBtn(attr: string, icon: string, title: string, dataAttr: string): HTMLButtonElement {
          let btn = el!.querySelector(`[${attr}]`) as HTMLButtonElement | null;
          if (!btn) {
            btn = document.createElement("button");
            btn.setAttribute(attr, "true");
            btn.style.cssText = btnStyle + "margin-left:4px;";
            btn.textContent = icon;
            btn.title = title;
            btn.addEventListener("mouseenter", () => { btn!.style.opacity = "1"; });
            btn.addEventListener("mouseleave", () => { btn!.style.opacity = "0.6"; });
            btn.addEventListener("click", () => {
              const text = btn!.getAttribute(dataAttr) || "";
              navigator.clipboard.writeText(text).then(() => {
                const orig = btn!.textContent;
                btn!.textContent = "\u2713";
                setTimeout(() => { btn!.textContent = orig; }, 1000);
              });
            });
            el!.appendChild(btn);
          }
          return btn;
        }

        // Status copy button
        const copyBtn = makeBtn(COPY_ATTR, "\u{1F4CB}", "Copy status", "data-copy-text");
        copyBtn.setAttribute("data-copy-text", copyText);

        // Full log copy button
        const logBtn = makeBtn(LOG_ATTR, "\u{1F4DC}", "Copy full crawl log", "data-log-text");
        logBtn.setAttribute("data-log-text", s.logText || "");

        if (!document.getElementById("lg-crawl-pulse-style")) {
          const style = document.createElement("style");
          style.id = "lg-crawl-pulse-style";
          style.textContent = "@keyframes lgpulse{0%,100%{opacity:1}50%{opacity:.3}}";
          document.head.appendChild(style);
        }
      },
      args: [{ ...status, logText: cappedLog }],
    })
    .then(() => {})
    .catch(() => {});
}

// Remove the crawl overlay from the page.
function removeCrawlOverlay(tabId: number): Promise<void> {
  return chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        document.querySelector("[data-lg-crawl-overlay]")?.remove();
        document.getElementById("lg-crawl-pulse-style")?.remove();
      },
    })
    .then(() => {})
    .catch(() => {});
}

// Normalize a LinkedIn company URL to a canonical form for dedup.
function normalizeCompanyUrl(url: string): string {
  return url.split("?")[0].replace(/\/$/, "").toLowerCase();
}

function downloadCrawlLog(data: {
  seedUrl: string;
  companySlug: string;
  stats: { saved: number; skipped: number; targets: number; filtered: number; visited: number; duration_ms: number; totalRemoteJobs?: number; cancelled?: boolean };
  entries: string[];
}) {
  const json = JSON.stringify({
    timestamp: new Date().toISOString(),
    seedUrl: data.seedUrl,
    stats: data.stats,
    entries: data.entries,
  }, null, 2);
  const dataUrl = "data:application/json;base64," + btoa(unescape(encodeURIComponent(json)));
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  chrome.downloads.download({
    url: dataUrl,
    filename: `crawl-log-${data.companySlug}-${ts}.json`,
    saveAs: false,
  });
}

/** Build the company payload for saving — shared between find-related and browse-companies. */
function buildCompanyPayload(data: {
  name: string;
  website: string;
  description: string;
  industry: string;
  size: string;
  location: string;
  linkedinUrl: string;
}, remoteJobCount: number) {
  const jobLabel = remoteJobCount > 0 ? `Remote Jobs: ${remoteJobCount}` : "";
  return {
    name: data.name,
    website: data.website || undefined,
    linkedin_url: data.linkedinUrl || undefined,
    description: [
      data.description,
      data.industry ? `Industry: ${data.industry}` : "",
      data.size ? `Size: ${data.size}` : "",
      jobLabel,
    ]
      .filter(Boolean)
      .join("\n") || undefined,
    location: data.location || undefined,
    industry: data.industry || undefined,
  };
}

/** Filter constant — only queue companies matching this industry from modal/sidebar cards. */
const INDUSTRY_FILTER = "staffing and recruiting";

export async function findRelatedCompanies(tabId: number) {
  findRelatedCancelled = false;
  setCompanyScraperCancelled(false);
  const crawlLog: string[] = [];
  const crawlT0 = Date.now();
  let crawlSlug = "unknown";
  let crawlSeedUrl = "unknown";

  function log(msg: string) {
    crawlLog.push(`[${new Date().toISOString()}] ${msg}`);
    console.log(msg);
  }
  function logWarn(msg: string) {
    crawlLog.push(`[${new Date().toISOString()}] WARN: ${msg}`);
    console.warn(msg);
  }
  function logError(msg: string) {
    crawlLog.push(`[${new Date().toISOString()}] ERROR: ${msg}`);
    console.error(msg);
  }

  log("[FindRelated] Starting BFS crawl...");

  try {
    if (!(await isTabAlive(tabId))) {
      logWarn("[FindRelated] Tab no longer exists, aborting");
      return;
    }

    const tab = await chrome.tabs.get(tabId);
    const currentUrl = tab.url || "";
    const companyMatch = currentUrl.match(/\/company\/([^/]+)/);
    if (!companyMatch) {
      await safeSendMessage(tabId, {
        action: "findRelatedError",
        error: "Not on a company page",
      });
      return;
    }

    const returnUrl = currentUrl;
    crawlSlug = companyMatch[1];
    const seedUrl = `https://www.linkedin.com/company/${crawlSlug}`;
    crawlSeedUrl = seedUrl;

    // BFS state
    const visited = new Set<string>();
    const queue: string[] = [];
    let saved = 0;
    let skipped = 0;
    let filtered = 0;
    let targets = 0;
    let totalRemoteJobs = 0;

    // Batch accumulator
    const pendingBatch: Array<{
      name: string;
      website?: string;
      linkedin_url?: string;
      description?: string;
      location?: string;
      industry?: string;
    }> = [];

    async function flushBatch(): Promise<number> {
      if (pendingBatch.length === 0) return 0;
      const batch = pendingBatch.splice(0);
      return saveCompanyBatch(batch);
    }

    // Mark seed as visited (don't re-scrape the page we started on)
    visited.add(normalizeCompanyUrl(seedUrl));

    // ── Seed phase ─────────────────────────────────────────────────────
    if (currentUrl.includes("/people") || currentUrl.includes("/about")) {
      await safeTabUpdate(tabId, { url: seedUrl + "/" });
      await waitForTabLoad(tabId);
      await randomDelay(4000);
    }

    // Scroll to load lazy content
    await scrollToBottom(tabId, 3, 2500);

    const seedLinks = await extractSimilarCompanyUrls(tabId);
    let seedFiltered = 0;
    for (const link of seedLinks) {
      const norm = normalizeCompanyUrl(link.url);
      if (visited.has(norm)) continue;
      visited.add(norm);
      // Pre-filter by industry when available from card metadata
      if (link.industry && link.industry.toLowerCase() !== INDUSTRY_FILTER) {
        seedFiltered++;
        filtered++;
        continue;
      }
      queue.push(link.url);
    }
    log(`[FindRelated] Seeded queue with ${queue.length} companies from starting page (${seedFiltered} skipped by industry filter)`);

    if (queue.length === 0) {
      await safeSendMessage(tabId, {
        action: "findRelatedDone",
        saved: 0,
        skipped: 0,
        found: 0,
      });
      return;
    }

    // ── BFS loop ───────────────────────────────────────────────────────
    // Only saved + skipped (dupes) count toward MAX_COMPANIES.
    // Non-recruitment companies are "filtered" and don't count — we want N recruitment companies.
    while (queue.length > 0 && (saved + skipped) < MAX_COMPANIES) {
      // ── Cancellation check ──
      if (findRelatedCancelled) {
        log("[FindRelated] Cancelled by user");
        // Flush remaining batch
        const flushed = await flushBatch();
        saved += flushed;
        break;
      }

      if (!(await isTabAlive(tabId))) {
        logWarn("[FindRelated] Tab closed during BFS crawl, stopping");
        break;
      }

      const url = queue.shift()!;

      // a) Navigate to /about/ — scrape company data AND discover related companies
      const aboutUrl = url.replace(/\/$/, "") + "/about/";
      const urlSlug = url.match(/\/company\/([^/]+)/)?.[1] || "loading...";
      await safeTabUpdate(tabId, { url: aboutUrl });
      await waitForTabLoad(tabId);
      await randomDelay(2000);
      await injectCrawlOverlay(tabId, { saved, skipped, targets, filtered, queued: queue.length, name: urlSlug, phase: "saving", logText: crawlLog.join("\n") });

      await clickSeeMore(tabId);
      await randomDelay(500);

      const data = await extractCompanyData(tabId);
      const icp = data?.name ? isICPTarget(data) : null;

      if (data && data.name) {
        if (!icp?.target) {
          // Not recruitment — skip saving but still discover related companies below
          filtered++;
          log(`[FindRelated] SKIP ${data.name} — ${icp.reason} (industry: ${data.industry}) (queued: ${queue.length})`);
          await injectCrawlOverlay(tabId, { saved, skipped, targets, filtered, queued: queue.length, name: `⊘ ${data.name} [${icp.reason}]`, phase: "saving", logText: crawlLog.join("\n") });
        } else {
          // Check remote jobs via Voyager API first (no tab navigation needed)
          let remoteJobCount = -1;
          let jobStatus: RemoteJobsResult["status"] = "ok";
          if (data.linkedinNumericId) {
            log(`[FindRelated] Checking remote jobs for ${data.name} (ID: ${data.linkedinNumericId})...`);
            const jobResult = await countRemoteJobsVoyagerFirst(tabId, data.linkedinNumericId);
            remoteJobCount = jobResult.count;
            jobStatus = jobResult.status;
            totalRemoteJobs += Math.max(0, remoteJobCount);
            if (jobResult.status === "login-wall") {
              log(`[FindRelated] ${data.name} — ⛔ LOGIN WALL — cannot check remote jobs`);
            } else if (jobResult.status === "no-selectors") {
              log(`[FindRelated] ${data.name} — ⚠️ NO SELECTORS MATCHED — LinkedIn DOM may have changed`);
            } else if (remoteJobCount > 0) {
              log(`[FindRelated] ${data.name} — 🎯✅ CONFIRMED — ${remoteJobCount} active remote jobs (via ${jobResult.method})`);
            } else {
              log(`[FindRelated] ${data.name} — 🎯⚠️ UNCONFIRMED — no active remote jobs, needs recruiter post check`);
            }
          } else {
            log(`[FindRelated] ⚠️⚠️ No numeric ID for ${data.name} — ALL 3 extraction strategies failed, SKIPPING remote job check`);
          }

          // Build company object and add to batch
          const company = buildCompanyPayload(data, Math.max(0, remoteJobCount));

          const overlayJobText = remoteJobCount > 0
            ? `${remoteJobCount} jobs`
            : jobStatus === "login-wall" ? "⛔ login"
            : jobStatus === "no-selectors" ? "⚠️ DOM?"
            : remoteJobCount === 0 ? "0 jobs ⚠️"
            : "";
          const overlayName = (suffix: string) =>
            overlayJobText ? `🎯 ${suffix} ${data.name} (${overlayJobText})` : `🎯 ${suffix} ${data.name}`;

          pendingBatch.push(company);

          // Flush batch when it reaches SAVE_BATCH_SIZE
          if (pendingBatch.length >= SAVE_BATCH_SIZE) {
            const batchResult = await flushBatch();
            const newSaved = batchResult;
            const newSkipped = SAVE_BATCH_SIZE - batchResult;
            saved += newSaved;
            skipped += newSkipped;
            targets += SAVE_BATCH_SIZE;
            log(`[FindRelated] Batch flushed: ${newSaved} saved, ${newSkipped} dupes (total: ${saved}/${MAX_COMPANIES})`);
            await injectCrawlOverlay(tabId, { saved, skipped, targets, filtered, queued: queue.length, name: overlayName("✓"), phase: "saving", logText: crawlLog.join("\n") });
          } else {
            // Optimistic display — show as pending
            await injectCrawlOverlay(tabId, { saved, skipped, targets: targets + 1, filtered, queued: queue.length, name: overlayName("…"), phase: "saving", logText: crawlLog.join("\n") });
          }

        }

        // Send progress (will only reach content script if on same origin)
        safeSendMessage(tabId, {
          action: "findRelatedProgress",
          current: saved + pendingBatch.length,
          total: MAX_COMPANIES,
          name: data.name,
          queued: queue.length,
          skipped,
          targets: targets + pendingBatch.length,
          filtered,
        }).catch(() => {});
      }

      // d) Discover new related companies FIRST (while still on /about/ page)
      //    Must happen before deep scrape which navigates away to /posts/, /people/
      if ((saved + skipped + pendingBatch.length) < MAX_COMPANIES && (await isTabAlive(tabId)) && !findRelatedCancelled) {
        await injectCrawlOverlay(tabId, { saved, skipped, targets, filtered, queued: queue.length, name: data?.name || urlSlug, phase: "discovering", logText: crawlLog.join("\n") });

        // Scroll to load lazy content on /about/ page
        await scrollToBottom(tabId, 2, 2000);

        let newLinks = await extractSimilarCompanyUrls(tabId);

        // If /about/ page had no related companies, try main page as fallback
        if (newLinks.length === 0) {
          const mainUrl = url.replace(/\/$/, "") + "/";
          await safeTabUpdate(tabId, { url: mainUrl });
          await waitForTabLoad(tabId);
          await randomDelay(2000);
          await scrollToBottom(tabId, 3, 2500);
          newLinks = await extractSimilarCompanyUrls(tabId);
        }

        let newCount = 0;
        let newFiltered = 0;
        for (const link of newLinks) {
          const norm = normalizeCompanyUrl(link.url);
          if (visited.has(norm)) continue;
          visited.add(norm);
          // Pre-filter by industry when available from card metadata
          if (link.industry && link.industry.toLowerCase() !== INDUSTRY_FILTER) {
            newFiltered++;
            filtered++;
            continue;
          }
          queue.push(link.url);
          newCount++;
        }
        if (newCount > 0 || newFiltered > 0) {
          log(`[FindRelated] ${data?.name || url} yielded ${newCount} new companies, ${newFiltered} skipped by industry (queue: ${queue.length}, visited: ${visited.size})`);
        }
      }

      // e) Deep scrape: Posts, Jobs, People for ICP-matching companies
      //    Runs AFTER discovery since it navigates away from /about/
      if (data && data.name && icp?.target && !findRelatedCancelled && (await isTabAlive(tabId))) {
        try {
          const companyBaseUrl = url.replace(/\/$/, "");
          const ctx: CompanyContext = {
            name: data.name,
            linkedinUrl: data.linkedinUrl,
            linkedinNumericId: data.linkedinNumericId,
            website: data.website,
          };

          // Resolve DB company ID so posts/jobs link to the right company
          let companyId: number | null = null;
          try {
            const res = await gqlRequest(
              `query FindCompanyByName($name: String) {
                findCompany(name: $name) { found company { id } }
              }`,
              { name: data.name },
            );
            companyId = res.data?.findCompany?.company?.id ?? null;
          } catch { /* non-critical — posts/jobs still save, just unlinked */ }

          // Sync cancellation flag so phase functions respect BFS cancel
          setCompanyScraperCancelled(findRelatedCancelled);

          // Posts
          await injectCrawlOverlay(tabId, { saved, skipped, targets, filtered, queued: queue.length, name: `📝 ${data.name} posts`, phase: "saving", logText: crawlLog.join("\n") });
          const postsResult = await scrapePosts(tabId, companyBaseUrl, companyId);
          log(`[FindRelated] ${data.name} — posts: ${postsResult.saved} new, ${postsResult.updated} updated / ${postsResult.total} total${postsResult.error ? ` (${postsResult.error})` : ""}`);

          if (!findRelatedCancelled && (await isTabAlive(tabId))) {
            setCompanyScraperCancelled(false);
            // Jobs (Voyager API — may navigate to company home for numeric ID)
            await injectCrawlOverlay(tabId, { saved, skipped, targets, filtered, queued: queue.length, name: `💼 ${data.name} jobs`, phase: "saving", logText: crawlLog.join("\n") });
            const jobsResult = await scrapeJobs(tabId, companyBaseUrl, ctx, companyId);
            log(`[FindRelated] ${data.name} — jobs: ${jobsResult.jobsSaved} new, ${jobsResult.jobsUpdated} updated, hiring: ${jobsResult.hiringContactsSaved}${jobsResult.error ? ` (${jobsResult.error})` : ""}`);
          }

          if (!findRelatedCancelled && (await isTabAlive(tabId))) {
            setCompanyScraperCancelled(false);
            // People
            await injectCrawlOverlay(tabId, { saved, skipped, targets, filtered, queued: queue.length, name: `👥 ${data.name} people`, phase: "saving", logText: crawlLog.join("\n") });
            const peopleResult = await scrapePeople(tabId, companyBaseUrl, ctx);
            log(`[FindRelated] ${data.name} — people: ${peopleResult.saved}/${peopleResult.total}${peopleResult.error ? ` (${peopleResult.error})` : ""}`);
          }
        } catch (deepErr) {
          logError(`[FindRelated] Deep scrape failed for ${data.name}: ${deepErr instanceof Error ? deepErr.message : String(deepErr)}`);
        }
      }

      await randomDelay(1500);
    }

    // ── Flush remaining batch ─────────────────────────────────────────
    if (pendingBatch.length > 0) {
      const remaining = pendingBatch.length;
      const batchResult = await flushBatch();
      saved += batchResult;
      skipped += (remaining - batchResult);
      targets += remaining;
      log(`[FindRelated] Final batch flushed: ${batchResult} saved, ${remaining - batchResult} dupes`);
    }

    // ── After loop ─────────────────────────────────────────────────────
    const wasCancelled = findRelatedCancelled;
    log(`[FindRelated] Crawl ${wasCancelled ? "cancelled" : "complete"}. saved=${saved}, skipped=${skipped}, filtered=${filtered}, visited=${visited.size}, queue_remaining=${queue.length}`);

    // Download crawl log
    downloadCrawlLog({
      seedUrl: crawlSeedUrl,
      companySlug: crawlSlug,
      stats: { saved, skipped, targets, filtered, visited: visited.size, duration_ms: Date.now() - crawlT0, totalRemoteJobs, cancelled: wasCancelled },
      entries: crawlLog,
    });

    // Navigate back to original page and remove overlay
    if (await isTabAlive(tabId)) {
      await removeCrawlOverlay(tabId);
      try {
        await safeTabUpdate(tabId, { url: returnUrl });
        await waitForTabLoad(tabId);
      } catch {
        logWarn("[FindRelated] Could not navigate back to original page");
      }
    }

    await randomDelay(4000);
    await safeSendMessage(tabId, {
      action: "findRelatedDone",
      saved,
      skipped,
      filtered,
      targets,
      found: visited.size - 1, // exclude seed
      cancelled: wasCancelled,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logError(`[FindRelated] Unexpected error: ${errMsg}`);

    // Download crawl log even on error
    downloadCrawlLog({
      seedUrl: crawlSeedUrl,
      companySlug: crawlSlug,
      stats: { saved: 0, skipped: 0, targets: 0, filtered: 0, visited: 0, duration_ms: Date.now() - crawlT0 },
      entries: crawlLog,
    });

    if (await isTabAlive(tabId)) {
      await injectCrawlOverlay(tabId, { saved: 0, skipped: 0, targets: 0, filtered: 0, queued: 0, name: errMsg.slice(0, 40), phase: "error", logText: crawlLog.join("\n") });
    }
    await safeSendMessage(tabId, {
      action: "findRelatedError",
      error: errMsg,
    });
  }
}
