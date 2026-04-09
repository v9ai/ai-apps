// ── Company Browsing Engine ──────────────────────────────────────────

import { type CompanyData, isICPTarget } from "../../lib/icp-filter";
import { gqlRequest } from "../../services/graphql";
import { randomDelay, waitForTabLoad, clickSeeMore, safeTabUpdate } from "./tab-utils";

let companyCancelled = false;

export function setCompanyCancelled(value: boolean) {
  companyCancelled = value;
}

export function extractCompanyUrls(tabId: number): Promise<string[]> {
  return chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        const links: string[] = [];
        // LinkedIn company search result links
        document.querySelectorAll<HTMLAnchorElement>(
          'a[href*="/company/"]'
        ).forEach((a) => {
          const href = a.href.split("?")[0].replace(/\/$/, "");
          // Only company profile links, not /company/xxx/jobs etc.
          if (/\/company\/[^/]+$/.test(new URL(href).pathname) && !links.includes(href)) {
            links.push(href);
          }
        });
        return links;
      },
    })
    .then((results) => results?.[0]?.result ?? [])
    .catch(() => []);
}

export function extractCompanyData(tabId: number): Promise<CompanyData | null> {
  return chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        const getText = (sel: string) =>
          document.querySelector(sel)?.textContent?.trim() || "";

        // Company name
        const name =
          getText("h1.org-top-card-summary__title") ||
          getText("h1.top-card-layout__title") ||
          getText("h1");

        // Description — "About" section
        const description =
          getText("p.org-top-card-summary__tagline") ||
          getText("section.org-about-module p") ||
          getText('[data-test-id="about-us__description"]') ||
          "";

        // Details from the info strip
        const dtDds: Record<string, string> = {};
        document.querySelectorAll("dl.org-page-details__definition-list dt, dl.org-page-details__definition-list dd").forEach((el) => {
          if (el.tagName === "DT") {
            const key = el.textContent?.trim().toLowerCase() || "";
            const dd = el.nextElementSibling;
            if (dd && dd.tagName === "DD") {
              dtDds[key] = dd.textContent?.trim() || "";
            }
          }
        });

        // Fallback: scan all definition terms on the page
        if (Object.keys(dtDds).length === 0) {
          document.querySelectorAll("dt").forEach((dt) => {
            const key = dt.textContent?.trim().toLowerCase() || "";
            const dd = dt.nextElementSibling;
            if (dd?.tagName === "DD") {
              dtDds[key] = dd.textContent?.trim() || "";
            }
          });
        }

        // Also try the top card info items
        const infoItems: string[] = [];
        document.querySelectorAll(".org-top-card-summary-info-list__info-item").forEach((el) => {
          infoItems.push(el.textContent?.trim() || "");
        });

        const industry = dtDds["industry"] || dtDds["industries"] || infoItems[0] || "";
        const size =
          dtDds["company size"] ||
          dtDds["size"] ||
          infoItems.find((s) => /employees/i.test(s)) ||
          "";
        const location =
          dtDds["headquarters"] ||
          dtDds["location"] ||
          infoItems.find((s) => /,/.test(s) && !/employees/i.test(s)) ||
          "";

        // Website link
        const websiteLink = document.querySelector<HTMLAnchorElement>(
          'a[data-test-id="about-us__website"] , a.org-top-card-primary-actions__action--website, a.link-without-visited-state[href*="://"]'
        );
        const website = websiteLink?.href || "";

        // Extract LinkedIn numeric company ID
        let linkedinNumericId: string | undefined;

        // Strategy 1: data-urn attributes
        const urnEl = document.querySelector(
          '[data-urn*="urn:li:fsd_company:"], [data-urn*="urn:li:company:"]'
        );
        if (urnEl) {
          const urn = urnEl.getAttribute("data-urn") || "";
          const m = urn.match(/urn:li:(?:fsd_)?company:(\d+)/);
          if (m) linkedinNumericId = m[1];
        }

        // Strategy 2: embedded JSON in script tags
        if (!linkedinNumericId) {
          for (const script of document.querySelectorAll("script")) {
            const t = script.textContent || "";
            const m =
              t.match(/"companyId"\s*:\s*(\d+)/) ||
              t.match(/"objectUrn"\s*:\s*"urn:li:(?:fsd_)?company:(\d+)"/) ||
              t.match(/urn:li:(?:fsd_)?company:(\d+)/);
            if (m) {
              linkedinNumericId = m[1];
              break;
            }
          }
        }

        // Strategy 3: meta/link tags
        if (!linkedinNumericId) {
          for (const el of document.querySelectorAll(
            'meta[content*="company"], link[href*="company"]'
          )) {
            const val = el.getAttribute("content") || el.getAttribute("href") || "";
            const m = val.match(/company[:/](\d+)/);
            if (m) {
              linkedinNumericId = m[1];
              break;
            }
          }
        }

        // Diagnostic: which extraction strategy succeeded?
        const strategyUsed = linkedinNumericId
          ? (urnEl ? "data-urn" : "json-or-meta")
          : "NONE";
        console.log(
          `[extractCompanyData] ${name} — numericId: ${linkedinNumericId ?? "NONE"} (strategy: ${strategyUsed})`
        );

        return {
          name,
          website,
          description,
          industry,
          size,
          location,
          linkedinUrl: window.location.href.split("?")[0],
          linkedinNumericId,
        };
      },
    })
    .then((results) => results?.[0]?.result ?? null)
    .catch(() => null);
}

/**
 * Count remote job postings for a company by navigating to LinkedIn jobs search.
 * Only called for ICP-matching companies to avoid unnecessary page loads.
 */
export interface RemoteJobsResult {
  count: number;
  status: "ok" | "no-results" | "no-selectors" | "login-wall" | "error";
  method?: "header" | "cards" | "none";
}

export async function countRemoteJobs(
  tabId: number,
  numericId: string,
): Promise<RemoteJobsResult> {
  const jobsUrl = `https://www.linkedin.com/jobs/search/?f_C=${numericId}&f_WT=2&geoId=92000000`;

  try {
    await safeTabUpdate(tabId, { url: jobsUrl });
    await waitForTabLoad(tabId);

    // Poll for job-related content to appear (up to 8s), instead of fixed delay
    const selectorReady = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        return new Promise<boolean>((resolve) => {
          const selectors = [
            ".jobs-search-no-results-banner",
            ".jobs-search-results-list",
            ".scaffold-layout__list",
            "[data-job-id]",
            ".job-card-container",
            ".jobs-search-results-list__subtitle",
          ];
          let attempts = 0;
          const poll = () => {
            for (const sel of selectors) {
              if (document.querySelector(sel)) { resolve(true); return; }
            }
            if (++attempts < 16) setTimeout(poll, 500);
            else resolve(false);
          };
          poll();
        });
      },
    });

    const ready = selectorReady?.[0]?.result ?? false;
    if (!ready) {
      // Extra delay as last resort
      await randomDelay(2000);
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: (): RemoteJobsResult => {
        const url = window.location.href;

        // Detect login wall / redirect
        if (url.includes("/login") || url.includes("/authwall") || url.includes("/checkpoint")) {
          return { count: 0, status: "login-wall", method: "none" };
        }

        // Check for "no results" banner
        if (document.querySelector(".jobs-search-no-results-banner")) {
          return { count: 0, status: "no-results", method: "none" };
        }

        // Strategy 1: Parse "X results" text from header
        const headerText =
          document.querySelector(".jobs-search-results-list__subtitle")
            ?.textContent?.trim() ||
          document.querySelector(
            ".jobs-search-results-list__title-heading h1+span"
          )?.textContent?.trim() ||
          // Newer LinkedIn layouts
          document.querySelector(".jobs-search-results-list__title-heading small")
            ?.textContent?.trim() ||
          document.querySelector("[class*='jobs-search'] h1+span, [class*='jobs-search'] h1+small")
            ?.textContent?.trim() ||
          "";
        const countMatch = headerText.match(/([\d,]+)\s+results?/i);
        if (countMatch) {
          return {
            count: parseInt(countMatch[1].replace(/,/g, ""), 10),
            status: "ok",
            method: "header",
          };
        }

        // Strategy 2: Count job card elements (multiple selector generations)
        const cards = document.querySelectorAll(
          [
            "[data-job-id]",
            ".job-card-container",
            ".jobs-search-results__list-item",
            ".scaffold-layout__list-item",
            ".jobs-search-results-list li",
            "[class*='job-card-container']",
          ].join(", ")
        );
        if (cards.length > 0) {
          return { count: cards.length, status: "ok", method: "cards" };
        }

        // Nothing matched
        return { count: 0, status: "no-selectors", method: "none" };
      },
    });

    return results?.[0]?.result ?? { count: 0, status: "error", method: "none" };
  } catch {
    return { count: 0, status: "error", method: "none" };
  }
}

function extractNextPageUrl(tabId: number): Promise<string | null> {
  return chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        const nextBtn = document.querySelector<HTMLButtonElement>(
          'button[aria-label="Next"]'
        );
        if (nextBtn && !nextBtn.disabled) {
          nextBtn.click();
          return window.location.href;
        }
        return null;
      },
    })
    .then((results) => results?.[0]?.result ?? null)
    .catch(() => null);
}

export async function saveCompanyBatch(
  batch: Array<{
    name: string;
    website?: string;
    linkedin_url?: string;
    description?: string;
    location?: string;
    industry?: string;
  }>,
): Promise<number> {
  try {
    const result = await gqlRequest(
      `mutation ImportCompanies($companies: [CompanyImportInput!]!) {
        importCompanies(companies: $companies) { success imported failed errors }
      }`,
      { companies: batch },
    );

    if (result.data?.importCompanies) {
      const { imported, failed, errors } = result.data.importCompanies;
      if (failed > 0) {
        console.warn(`[BrowseCompanies] ${failed} failed:`, errors);
      }
      return imported;
    }
    if (result.errors) {
      console.error("[BrowseCompanies] GQL error:", result.errors[0].message);
    }
    return 0;
  } catch (err) {
    console.error("[BrowseCompanies] Save batch error:", err);
    return 0;
  }
}

export async function browseCompanies(tabId: number) {
  companyCancelled = false;
  let saved = 0;
  let filtered = 0;
  let totalProcessed = 0;
  let totalRemoteJobs = 0;
  let page = 1;
  const allCompanyUrls: string[] = [];
  const returnUrl = (await chrome.tabs.get(tabId)).url || "";

  // ── Phase 1: Collect company URLs from search results (all pages) ──
  console.log("[BrowseCompanies] Phase 1: Collecting company URLs...");

  while (!companyCancelled) {
    // Wait for page content to render
    await randomDelay(2000);

    // Scroll to bottom to load all results
    await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => window.scrollTo(0, document.body.scrollHeight),
    });
    await randomDelay(1500);

    const urls = await extractCompanyUrls(tabId);
    const newUrls = urls.filter((u) => !allCompanyUrls.includes(u));
    allCompanyUrls.push(...newUrls);

    console.log(`[BrowseCompanies] Page ${page}: found ${newUrls.length} new companies (total: ${allCompanyUrls.length})`);

    // Try next page
    const hasNext = await extractNextPageUrl(tabId);
    if (!hasNext) break;

    page++;
    await waitForTabLoad(tabId);
    await randomDelay(2000);
  }

  console.log(`[BrowseCompanies] Phase 2: Visiting ${allCompanyUrls.length} companies...`);

  // ── Phase 2: Visit each company and extract data ──
  const batch: Array<{
    name: string;
    website?: string;
    linkedin_url?: string;
    description?: string;
    location?: string;
    industry?: string;
  }> = [];

  for (let i = 0; i < allCompanyUrls.length; i++) {
    if (companyCancelled) break;

    const companyUrl = allCompanyUrls[i];
    console.log(`[BrowseCompanies] ${i + 1}/${allCompanyUrls.length}: ${companyUrl}`);

    // Navigate to company "about" page for richer data
    const aboutUrl = companyUrl.replace(/\/$/, "") + "/about/";
    try {
      await chrome.tabs.update(tabId, { url: aboutUrl });
    } catch {
      console.warn("[BrowseCompanies] Tab closed during navigation, aborting");
      break;
    }
    await waitForTabLoad(tabId);
    await randomDelay(2500);

    // Click "See more" if present
    await clickSeeMore(tabId);
    await randomDelay(500);

    const data = await extractCompanyData(tabId);
    totalProcessed++;

    if (data && data.name) {
      const icp = isICPTarget(data);
      if (!icp.target) {
        filtered++;
        console.log(`[BrowseCompanies] SKIP: ${data.name} (${icp.reason}) | ${data.industry} | ${data.size}`);
        continue;
      }

      // Check remote job postings (boost signal, not a gate)
      let remoteJobCount = -1;
      if (data.linkedinNumericId) {
        console.log(`[BrowseCompanies] Checking remote jobs for ${data.name} (ID: ${data.linkedinNumericId})...`);
        const jobResult = await countRemoteJobs(tabId, data.linkedinNumericId);
        remoteJobCount = jobResult.count;
        totalRemoteJobs += Math.max(0, remoteJobCount);
        if (jobResult.status === "login-wall") {
          console.log(`[BrowseCompanies] ${data.name} — ⛔ LOGIN WALL — cannot check remote jobs`);
        } else if (jobResult.status === "no-selectors") {
          console.log(`[BrowseCompanies] ${data.name} — ⚠️ NO SELECTORS MATCHED — LinkedIn DOM may have changed`);
        } else if (remoteJobCount > 0) {
          console.log(`[BrowseCompanies] ${data.name} — 🎯✅ CONFIRMED — ${remoteJobCount} active remote jobs (via ${jobResult.method})`);
        } else {
          console.log(`[BrowseCompanies] ${data.name} — 🎯⚠️ UNCONFIRMED — no active remote jobs`);
        }
      } else {
        console.log(`[BrowseCompanies] No numeric ID for ${data.name}, skipping job count`);
      }

      const jobLabel = remoteJobCount > 0 ? `Remote Jobs: ${remoteJobCount}` : "";

      batch.push({
        name: data.name,
        website: data.website || undefined,
        linkedin_url: data.linkedinUrl || undefined,
        description: [data.description, data.industry ? `Industry: ${data.industry}` : "", data.size ? `Size: ${data.size}` : "", jobLabel]
          .filter(Boolean)
          .join("\n") || undefined,
        location: data.location || undefined,
        industry: data.industry || undefined,
      });

      console.log(
        `[BrowseCompanies] Extracted: ${data.name} | ${data.industry} | ${data.size} | ${data.location}`,
      );
    }

    // Save in batches of 10
    if (batch.length >= 10) {
      const result = await saveCompanyBatch(batch.splice(0));
      saved += result;
    }

    // Dwell
    await randomDelay(1500);
  }

  // Save remaining
  if (batch.length > 0) {
    const result = await saveCompanyBatch(batch.splice(0));
    saved += result;
  }

  // Navigate back to search results
  await chrome.tabs.update(tabId, { url: returnUrl });
  await waitForTabLoad(tabId);

  console.log(
    `[BrowseCompanies] Complete. Saved ${saved}/${totalProcessed} companies (${filtered} filtered, ${totalRemoteJobs} remote jobs found) from ${page} page(s).`,
  );
}
