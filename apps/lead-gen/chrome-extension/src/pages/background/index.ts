// Background service worker
import { browseContactPosts, scrapeAllPosts, cancelPostScraping, scrapeJobSearchPosts, runUnifiedPipeline, scrapeRecruiterPosts } from "../../services/post-scraper";
import { type CompanyData, isICPTarget, parseLinkedInSize } from "../../lib/icp-filter";

// ── Dev hot-reload via WebSocket ──────────────────────────────────────
if (import.meta.env.DEV) {
  const connect = () => {
    const ws = new WebSocket("ws://localhost:35729");
    ws.onmessage = async (event) => {
      if (event.data === "reload") {
        // Refresh tabs running content scripts before reloading extension
        const tabs = await chrome.tabs.query({ url: [
          "https://*.linkedin.com/jobs/*",
          "https://*.linkedin.com/feed/*",
          "https://*.google.com/search*",
          "https://*.ashbyhq.com/*",
        ]});
        for (const tab of tabs) {
          if (tab.id) chrome.tabs.reload(tab.id);
        }
        chrome.runtime.reload();
      }
    };
    ws.onclose = () => setTimeout(connect, 5000);
    ws.onerror = () => ws.close();
  };
  connect();
}

// ── GraphQL config (shared module) ───────────────────────────────────
import { gqlRequest, GRAPHQL_URL } from "../../services/graphql";

// ── Randomised delay to avoid bot detection ────────────────────────
// LinkedIn fingerprints automation by detecting constant timing.
// Always jitter delays by +/-30% to mimic human variance.
function randomDelay(baseMs: number): Promise<void> {
  const jitter = baseMs * 0.3;
  const ms = baseMs + Math.floor(Math.random() * jitter * 2 - jitter);
  return new Promise((r) => setTimeout(r, Math.max(200, ms)));
}

// ── Service worker keepAlive ─────────────────────────────────────────
// MV3 service workers can be terminated after ~30s of inactivity.
// Keep-alive prevents Chrome from killing the worker during long operations
// (fetching 17K+ connections + importing takes several minutes).
let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

export function startKeepAlive() {
  if (keepAliveInterval) return;
  keepAliveInterval = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => { /* no-op to reset idle timer */ });
  }, 25_000);
}

export function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "paginationProgress") return false;

  // ── Send Email from LinkedIn Post (via LangGraph pipeline) ──
  if (message.action === "sendEmailFromPost") {
    const { postData } = message;
    const { authorName, authorSubtitle, postText, postUrl, emails } = postData as {
      authorName: string;
      authorSubtitle: string;
      postText: string;
      postUrl: string;
      emails: string[];
    };

    gqlRequest(
      `mutation SendOutreachEmail($input: SendOutreachEmailInput!) {
        sendOutreachEmail(input: $input) { success emailId subject error }
      }`,
      {
        input: {
          recipientName: authorName || "there",
          recipientRole: authorSubtitle || undefined,
          recipientEmail: emails[0] || undefined,
          postText: postText.slice(0, 2000),
          postUrl,
          tone: "professional and friendly",
        },
      },
    )
      .then((result) => {
        if (result.errors) {
          sendResponse({ success: false, error: result.errors[0].message });
          return;
        }
        const { success, subject, error: sendError } = result.data.sendOutreachEmail;
        if (success) {
          console.log(`[sendEmail] Outreach sent to ${emails[0]} re: ${subject}`);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: sendError || "Send failed" });
        }
      })
      .catch((err) => {
        console.error("[sendEmail] Error:", err);
        sendResponse({ success: false, error: String(err) });
      });
    return true;
  }

  // ── Click element in page's main world (bypasses CSP + isolated world) ──
  if (message.action === "clickInMainWorld") {
    const { selector } = message;
    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({ success: false, error: "No tab ID" });
      return true;
    }
    chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: (sel: string) => {
        const el = document.querySelector(sel) as HTMLElement | null;
        if (!el) return false;
        // Dispatch full pointer/mouse sequence — Ember binds on mousedown/pointerdown,
        // so a bare .click() misses the action handler on LinkedIn modals.
        const opts: MouseEventInit = { bubbles: true, cancelable: true, view: window };
        el.dispatchEvent(new PointerEvent('pointerdown', opts));
        el.dispatchEvent(new MouseEvent('mousedown', opts));
        el.dispatchEvent(new PointerEvent('pointerup', opts));
        el.dispatchEvent(new MouseEvent('mouseup', opts));
        el.click();
        return true;
      },
      args: [selector],
    })
      .then((results) => {
        const clicked = results?.[0]?.result ?? false;
        sendResponse({ success: true, clicked });
      })
      .catch((err) => {
        sendResponse({ success: false, error: String(err) });
      });
    return true;
  }

  // ── Start Profile Browsing ──
  if (message.action === "startProfileBrowsing") {
    const { profiles, returnUrl } = message as {
      profiles: string[];
      returnUrl: string;
    };
    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({ success: false, error: "No tab ID" });
      return true;
    }
    sendResponse({ success: true });
    startKeepAlive();
    browseProfiles(tabId, profiles, returnUrl).finally(stopKeepAlive);
    return true;
  }

  // ── Stop Profile Browsing ──
  if (message.action === "stopProfileBrowsing") {
    browseCancelled = true;
    sendResponse({ success: true });
    return true;
  }

  // ── Start Company Browsing ──
  if (message.action === "startCompanyBrowsing") {
    // Message comes from popup, so sender.tab is undefined — find active tab
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        sendResponse({ success: false, error: "No active tab" });
        return;
      }
      sendResponse({ success: true });
      startKeepAlive();
      browseCompanies(tabId).finally(stopKeepAlive);
    });
    return true;
  }

  // ── Stop Company Browsing ──
  if (message.action === "stopCompanyBrowsing") {
    companyCancelled = true;
    sendResponse({ success: true });
    return true;
  }

  // ── Start Full Pipeline (Connections + Import + Posts) ──
  if (message.action === "startFullPipeline") {
    chrome.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        sendResponse({ success: false, error: "No active tab" });
        return;
      }
      sendResponse({ success: true });
      startKeepAlive();
      try {
        console.log("[FullPipeline] Starting scrapeAllPosts for tab", tabId);
        await scrapeAllPosts(tabId);
      } catch (err) {
        console.error("[FullPipeline] Error:", err);
        try {
          chrome.runtime.sendMessage({
            action: "postScrapingProgress",
            error: err instanceof Error ? err.message : String(err),
          });
        } catch { /* popup may be closed */ }
      } finally {
        stopKeepAlive();
      }
    });
    return true;
  }

  // ── Start Unified Pipeline (jobs + connections + import + posts + companies) ──
  if (message.action === "startUnifiedPipeline") {
    const { searchUrl } = message as { searchUrl: string };
    chrome.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        sendResponse({ success: false, error: "No active tab" });
        return;
      }
      sendResponse({ success: true });
      startKeepAlive();
      try {
        await runUnifiedPipeline(tabId, searchUrl);
      } catch (err) {
        try {
          chrome.runtime.sendMessage({
            action: "postScrapingProgress",
            error: err instanceof Error ? err.message : String(err),
          });
        } catch { /* popup may be closed */ }
      } finally {
        stopKeepAlive();
      }
    });
    return true;
  }

  // ── Start Post Scraping (DB contacts only — legacy) ──
  if (message.action === "startPostScraping") {
    chrome.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        sendResponse({ success: false, error: "No active tab" });
        return;
      }
      sendResponse({ success: true });
      startKeepAlive();
      try {
        console.log("[PostScraping] Starting browseContactPosts for tab", tabId);
        await browseContactPosts(tabId);
      } catch (err) {
        console.error("[PostScraping] Error:", err);
        try {
          chrome.runtime.sendMessage({
            action: "postScrapingProgress",
            error: err instanceof Error ? err.message : String(err),
          });
        } catch { /* popup may be closed */ }
      } finally {
        stopKeepAlive();
      }
    });
    return true;
  }

  // ── Stop Post Scraping ──
  if (message.action === "stopPostScraping") {
    cancelPostScraping();
    sendResponse({ success: true });
    return true;
  }

  // ── Scrape Recruiter Posts ──
  if (message.action === "startRecruiterScraping") {
    chrome.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        sendResponse({ success: false, error: "No active tab" });
        return;
      }
      sendResponse({ success: true });
      startKeepAlive();
      try {
        await scrapeRecruiterPosts(tabId);
      } catch (err) {
        try {
          chrome.runtime.sendMessage({
            action: "postScrapingProgress",
            error: err instanceof Error ? err.message : String(err),
          });
        } catch { /* popup may be closed */ }
      } finally {
        stopKeepAlive();
      }
    });
    return true;
  }

  // ── Scrape Job Search Posts ──
  if (message.action === "scrapeJobPosts") {
    const { searchUrl } = message as { searchUrl: string };
    chrome.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        sendResponse({ success: false, error: "No active tab" });
        return;
      }
      sendResponse({ success: true });
      startKeepAlive();
      try {
        await scrapeJobSearchPosts(tabId, searchUrl);
      } catch (err) {
        try {
          chrome.runtime.sendMessage({
            action: "jobScrapingProgress",
            error: err instanceof Error ? err.message : String(err),
          });
        } catch { /* popup may be closed */ }
      } finally {
        stopKeepAlive();
      }
    });
    return true;
  }

  // ── Import LinkedIn Company People ──
  if (message.action === "importLinkedInPeople") {
    const { linkedinPeopleUrl, companyId } = message as {
      linkedinPeopleUrl: string;
      companyId: number;
    };
    chrome.tabs.create({ url: linkedinPeopleUrl, active: false }).then((tab) => {
      sendResponse({ success: true });
      if (tab.id) {
        startKeepAlive();
        browsePeople(tab.id, companyId).finally(stopKeepAlive);
      }
    });
    return true;
  }

  // ── Import People from Company Page (triggered by content script button) ──
  if (message.action === "importPeopleFromCompanyPage") {
    const { companyName, companyLinkedinUrl } = message as {
      companyName: string;
      companyLinkedinUrl: string;
    };
    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({ success: false, error: "No tab ID" });
      return true;
    }
    sendResponse({ success: true });
    startKeepAlive();
    importPeopleFromCurrentPage(tabId, companyName, companyLinkedinUrl).finally(stopKeepAlive);
    return true;
  }

  // ── Find Related/Similar Companies ──
  if (message.action === "findRelatedCompanies") {
    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({ success: false, error: "No tab ID" });
      return true;
    }
    sendResponse({ success: true });
    startKeepAlive();
    findRelatedCompanies(tabId).finally(stopKeepAlive);
    return true;
  }

  // ── Stop People Scraping (browsePeople / importPeopleFromCurrentPage) ──
  if (message.action === "stopPeopleScraping") {
    peopleCancelled = true;
    sendResponse({ success: true });
    return true;
  }

  return false;
});

// ── Tab Safety Helpers ──────────────────────────────────────────────

async function isTabAlive(tabId: number): Promise<boolean> {
  try {
    await chrome.tabs.get(tabId);
    return true;
  } catch {
    return false;
  }
}

async function safeTabUpdate(tabId: number, props: chrome.tabs.UpdateProperties): Promise<void> {
  if (!(await isTabAlive(tabId))) {
    throw new Error(`Tab ${tabId} was closed`);
  }
  await chrome.tabs.update(tabId, props);
}

async function safeSendMessage(tabId: number, message: Record<string, unknown>): Promise<void> {
  try {
    if (await isTabAlive(tabId)) {
      await chrome.tabs.sendMessage(tabId, message);
    }
  } catch {
    // Content script not available (tab navigated, closed, or script not injected)
  }
}

// ── Profile Browsing Engine ──────────────────────────────────────────

let browseCancelled = false;

function waitForTabLoad(tabId: number, timeoutMs = 20000): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      chrome.tabs.onUpdated.removeListener(listener);
      chrome.tabs.onRemoved.removeListener(removedListener);
      if (timeoutId !== null) clearTimeout(timeoutId);
    };

    const settle = (error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve();
    };

    const listener = (
      updatedTabId: number,
      changeInfo: { status?: string },
    ) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        settle();
      }
    };

    const removedListener = (removedTabId: number) => {
      if (removedTabId === tabId) {
        settle(new Error(`Tab ${tabId} was closed during navigation`));
      }
    };

    // Check if tab is already complete before attaching listener (race condition fix)
    chrome.tabs.get(tabId).then((tab) => {
      if (tab.status === "complete") {
        settle();
      } else {
        chrome.tabs.onUpdated.addListener(listener);
        chrome.tabs.onRemoved.addListener(removedListener);
        // Timeout in case page never fully loads
        timeoutId = setTimeout(() => {
          console.warn(`[waitForTabLoad] Timeout after ${timeoutMs}ms for tab ${tabId}`);
          settle();
        }, timeoutMs);
      }
    }).catch(() => {
      settle(new Error(`Tab ${tabId} does not exist`));
    });
  });
}

function clickSeeMore(tabId: number): Promise<number> {
  return chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        let clicked = 0;
        const opts: MouseEventInit = { bubbles: true, cancelable: true, view: window };
        const clickEl = (el: HTMLElement) => {
          el.dispatchEvent(new PointerEvent("pointerdown", opts));
          el.dispatchEvent(new MouseEvent("mousedown", opts));
          el.dispatchEvent(new PointerEvent("pointerup", opts));
          el.dispatchEvent(new MouseEvent("mouseup", opts));
          el.click();
          clicked++;
        };

        // LinkedIn's "see more" class
        document.querySelectorAll<HTMLElement>("a.lt-line-clamp__more, button.lt-line-clamp__more").forEach(clickEl);

        // Text-based fallback: buttons/links containing "see more"
        document.querySelectorAll<HTMLElement>("button, a").forEach((el) => {
          const text = el.textContent?.trim().toLowerCase() || "";
          if ((text === "see more" || text === "…see more" || text === "...see more") && el.offsetParent !== null) {
            clickEl(el);
          }
        });

        return clicked;
      },
    })
    .then((results) => results?.[0]?.result ?? 0)
    .catch(() => 0);
}

function extractProfileData(tabId: number): Promise<{
  name: string;
  headline: string;
  location: string;
  linkedinUrl: string;
} | null> {
  return chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        const nameEl =
          document.querySelector("h1.text-heading-xlarge") ||
          document.querySelector("h1");
        const headlineEl = document.querySelector(
          ".text-body-medium.break-words",
        );
        const locationEl = document.querySelector(
          "span.text-body-small.inline.t-black--light.break-words",
        );

        return {
          name: nameEl?.textContent?.trim() || "",
          headline: headlineEl?.textContent?.trim() || "",
          location: locationEl?.textContent?.trim() || "",
          linkedinUrl: window.location.href.split("?")[0],
        };
      },
    })
    .then((results) => results?.[0]?.result ?? null)
    .catch(() => null);
}

function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: "Unknown", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function parseHeadline(headline: string): {
  position: string;
  company: string;
} {
  // Try splitting on common separators: " at ", " @ ", " | "
  for (const sep of [" at ", " @ ", " | "]) {
    const idx = headline.toLowerCase().indexOf(sep);
    if (idx > 0) {
      return {
        position: headline.slice(0, idx).trim(),
        company: headline.slice(idx + sep.length).trim(),
      };
    }
  }
  return { position: headline, company: "" };
}

async function browseProfiles(
  tabId: number,
  profiles: string[],
  returnUrl: string,
) {
  browseCancelled = false;
  let saved = 0;

  for (let i = 0; i < profiles.length; i++) {
    if (browseCancelled) break;

    const profileUrl = profiles[i];
    console.log(
      `[BrowseProfiles] ${i + 1}/${profiles.length}: ${profileUrl}`,
    );

    // Navigate to profile
    try {
      await chrome.tabs.update(tabId, { url: profileUrl });
    } catch {
      console.warn("[BrowseProfiles] Tab closed during navigation, aborting");
      break;
    }
    await waitForTabLoad(tabId);

    // Wait for LinkedIn SPA content to render
    await randomDelay(2500);

    // Expand "See more" sections
    const expanded = await clickSeeMore(tabId);
    if (expanded > 0) {
      console.log(`[BrowseProfiles] Clicked ${expanded} "See more" button(s)`);
      await randomDelay(800);
    }

    // Extract profile data
    const data = await extractProfileData(tabId);

    if (data && data.name) {
      const { firstName, lastName } = parseName(data.name);
      const { position, company } = parseHeadline(data.headline);

      // Send progress to content script (may fail if on profile page — that's fine)
      try {
        await chrome.tabs.sendMessage(tabId, {
          action: "browseProgress",
          current: i + 1,
          total: profiles.length,
          name: firstName,
        });
      } catch { /* content script not on search page */ }

      // Save contact via GraphQL
      try {
        const result = await gqlRequest(
          `mutation CreateContact($input: CreateContactInput!) {
            createContact(input: $input) { id firstName lastName }
          }`,
          {
            input: {
              firstName,
              lastName: lastName || undefined,
              linkedinUrl: data.linkedinUrl,
              position: position || undefined,
              tags: ["linkedin-browse", "ai-recruiter"],
            },
          },
        );

        if (result.data?.createContact?.id) {
          saved++;
          console.log(
            `[BrowseProfiles] Saved: ${firstName} ${lastName} (${position} ${company ? "at " + company : ""})`,
          );
        } else if (result.errors) {
          console.warn(
            `[BrowseProfiles] GQL error for ${data.name}:`,
            result.errors[0].message,
          );
        }
      } catch (err) {
        console.error(`[BrowseProfiles] Save failed for ${data.name}:`, err);
      }
    }

    // Dwell — remaining time up to ~5s total (already spent ~2.5s waiting for render)
    await randomDelay(2500);
  }

  // Navigate back to search results
  await chrome.tabs.update(tabId, { url: returnUrl });
  await waitForTabLoad(tabId);

  // Wait for content script to re-inject, then send done message
  await randomDelay(2000);
  try {
    await chrome.tabs.sendMessage(tabId, {
      action: "browseDone",
      saved,
    });
  } catch { /* content script may not be ready */ }

  console.log(
    `[BrowseProfiles] Complete. Saved ${saved}/${profiles.length} contacts.`,
  );
}

// ── Company Browsing Engine ──────────────────────────────────────────

let companyCancelled = false;

// CompanyData imported from ../../lib/icp-filter

function extractCompanyUrls(tabId: number): Promise<string[]> {
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

function extractCompanyData(tabId: number): Promise<CompanyData | null> {
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

        return {
          name,
          website,
          description,
          industry,
          size,
          location,
          linkedinUrl: window.location.href.split("?")[0],
        };
      },
    })
    .then((results) => results?.[0]?.result ?? null)
    .catch(() => null);
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

async function browseCompanies(tabId: number) {
  companyCancelled = false;
  let saved = 0;
  let filtered = 0;
  let totalProcessed = 0;
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

      batch.push({
        name: data.name,
        website: data.website || undefined,
        linkedin_url: data.linkedinUrl || undefined,
        description: [data.description, data.industry ? `Industry: ${data.industry}` : "", data.size ? `Size: ${data.size}` : ""]
          .filter(Boolean)
          .join("\n") || undefined,
        location: data.location || undefined,
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
    `[BrowseCompanies] Complete. Saved ${saved}/${totalProcessed} companies (${filtered} filtered) from ${page} page(s).`,
  );
}

async function saveCompanyBatch(
  batch: Array<{
    name: string;
    website?: string;
    linkedin_url?: string;
    description?: string;
    location?: string;
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

// ── LinkedIn Company People Scraper ──────────────────────────────────

let peopleCancelled = false;

interface PersonCard {
  name: string;
  headline: string;
  linkedinUrl: string;
}

function extractPeopleCards(tabId: number): Promise<PersonCard[]> {
  return chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        const results: { name: string; headline: string; linkedinUrl: string }[] = [];
        const seen = new Set<string>();

        document.querySelectorAll<HTMLElement>(
          ".org-people-profile-card, .artdeco-entity-lockup"
        ).forEach((card) => {
          // Name — try multiple selectors LinkedIn has used
          const nameEl =
            card.querySelector(".org-people-profile-card__profile-title") ||
            card.querySelector(".artdeco-entity-lockup__title") ||
            card.querySelector("[data-anonymize='person-name']") ||
            card.querySelector(".lt-line-clamp__line");
          const name = nameEl?.textContent?.trim() || "";
          if (!name || name === "LinkedIn Member") return;

          // Headline / title
          const headlineEl =
            card.querySelector(".lit-lockup__subtitle") ||
            card.querySelector(".artdeco-entity-lockup__caption") ||
            card.querySelector(".org-people-profile-card__profile-position");
          const headline = headlineEl?.textContent?.trim() || "";

          // Profile URL
          const linkEl = card.querySelector<HTMLAnchorElement>("a[href*='/in/']");
          const raw = linkEl?.href || "";
          const match = raw.match(/linkedin\.com\/in\/([^/?#]+)/);
          if (!match) return;
          const linkedinUrl = `https://www.linkedin.com/in/${match[1]}/`;

          if (seen.has(linkedinUrl)) return;
          seen.add(linkedinUrl);

          results.push({ name, headline, linkedinUrl });
        });

        return results;
      },
    })
    .then((res) => (res?.[0]?.result as PersonCard[]) ?? [])
    .catch(() => []);
}

function scrollPeoplePage(tabId: number): Promise<void> {
  return chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        // Incremental scroll to trigger lazy-loading at each viewport boundary.
        // A single jump to bottom skips intermediate load triggers on LinkedIn.
        return new Promise<void>((resolve) => {
          const totalHeight = document.body.scrollHeight;
          const viewportHeight = window.innerHeight;
          let current = window.scrollY;
          const step = viewportHeight * 0.7;

          function doScroll() {
            current = Math.min(current + step, totalHeight);
            window.scrollTo({ top: current, behavior: "smooth" });
            if (current < totalHeight) {
              setTimeout(doScroll, 300 + Math.random() * 200);
            } else {
              resolve();
            }
          }

          doScroll();
        });
      },
    })
    .then(() => undefined)
    .catch(() => undefined);
}

function clickShowMorePeople(tabId: number): Promise<boolean> {
  return chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        const el = Array.from(
          document.querySelectorAll<HTMLElement>("button, a")
        ).find((el) => {
          const text = el.textContent?.trim().toLowerCase() || "";
          // Skip navigation links that leave the people page
          if (el.tagName === "A") {
            const href = (el as HTMLAnchorElement).href || "";
            if (href.includes("/search/results/")) return false;
          }
          return (
            text.includes("show more results") ||
            text.includes("show more") ||
            text.includes("show all") ||
            text.includes("see all") ||
            text.includes("load more")
          );
        });
        if (el) {
          if (el.tagName === "BUTTON" && (el as HTMLButtonElement).disabled) {
            return false;
          }
          el.click();
          return true;
        }
        return false;
      },
    })
    .then((res) => (res?.[0]?.result as boolean) ?? false)
    .catch(() => false);
}

async function notifyWebApp(action: string, data: Record<string, unknown>) {
  try {
    // Derive the app origin from GRAPHQL_URL so this works in any environment
    // (dev, staging, prod) without hardcoding a port.
    const appOrigin = new URL(GRAPHQL_URL).origin;
    const tabs = await chrome.tabs.query({
      url: [`${appOrigin}/*`],
    });
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          source: "lead-gen-bg",
          action,
          ...data,
        }).catch(() => { /* tab may not have content script */ });
      }
    }
  } catch { /* ignore */ }
}

async function browsePeople(tabId: number, companyId: number) {
  peopleCancelled = false;
  console.log(`[BrowsePeople] Starting for companyId=${companyId}, tab=${tabId}`);

  await waitForTabLoad(tabId);
  // Extra wait for LinkedIn SPA to hydrate
  await randomDelay(3000);

  const allCards: PersonCard[] = [];
  const seen = new Set<string>();
  const MAX_ROUNDS = 15;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    await scrollPeoplePage(tabId);
    if (peopleCancelled) break;

    await randomDelay(1500);

    const cards = await extractPeopleCards(tabId);
    let newCount = 0;
    for (const card of cards) {
      if (!seen.has(card.linkedinUrl)) {
        seen.add(card.linkedinUrl);
        allCards.push(card);
        newCount++;
      }
    }

    console.log(`[BrowsePeople] Round ${round + 1}: +${newCount} new (total ${allCards.length})`);
    await notifyWebApp("peopleScrapeProgress", {
      message: `Collecting… ${allCards.length} found`,
    });

    const clickedMore = await clickShowMorePeople(tabId);
    if (clickedMore) {
      await randomDelay(2000);
    } else if (newCount === 0) {
      // No new cards and no "show more" — we're done
      break;
    }
  }

  console.log(`[BrowsePeople] Collected ${allCards.length} people — importing...`);
  await notifyWebApp("peopleScrapeProgress", {
    message: `Importing ${allCards.length} contacts…`,
  });

  // Close the LinkedIn tab
  chrome.tabs.remove(tabId).catch(() => {});

  if (allCards.length === 0) {
    await notifyWebApp("peopleScrapeError", {
      error: "No people found on the LinkedIn page. Make sure you are logged in to LinkedIn.",
    });
    return;
  }

  // Build contact input list
  const contacts = allCards.map((card) => {
    const parts = card.name.trim().split(/\s+/);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";
    return {
      firstName,
      lastName,
      linkedinUrl: card.linkedinUrl,
      position: card.headline || undefined,
      companyId,
      email: null,
      company: null,
    };
  });

  try {
    const result = await gqlRequest(
      `mutation ImportContacts($contacts: [ContactInput!]!) {
        importContacts(contacts: $contacts) { success imported failed errors }
      }`,
      { contacts },
    );

    const res = result.data?.importContacts;
    if (res) {
      console.log(`[BrowsePeople] Imported ${res.imported}, failed ${res.failed}`);
      await notifyWebApp("peopleScrapeComplete", {
        imported: res.imported,
        failed: res.failed,
      });
    } else {
      const errMsg = result.errors?.[0]?.message ?? "GraphQL error";
      console.error("[BrowsePeople] GQL error:", errMsg);
      await notifyWebApp("peopleScrapeError", { error: errMsg });
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[BrowsePeople] Import error:", errMsg);
    await notifyWebApp("peopleScrapeError", { error: errMsg });
  }
}

// ── Import People from Current Company Page ─────────────────────────

async function importPeopleFromCurrentPage(
  tabId: number,
  companyName: string,
  companyLinkedinUrl: string,
) {
  console.log(`[ImportPeople] Starting for "${companyName}" on tab ${tabId}`);

  try {
    // Verify tab is still alive before starting
    if (!(await isTabAlive(tabId))) {
      console.warn("[ImportPeople] Tab no longer exists, aborting");
      return;
    }

    // Ensure we're on the /people/ page
    const tab = await chrome.tabs.get(tabId);
    const currentUrl = tab.url || "";
    if (!currentUrl.includes("/people")) {
      const peopleUrl = companyLinkedinUrl.replace(/\/$/, "") + "/people/";
      await safeTabUpdate(tabId, { url: peopleUrl });
      await waitForTabLoad(tabId);
      // LinkedIn SPA needs extra time to hydrate the people list
      await randomDelay(4000);
    } else {
      await randomDelay(2500);
    }

    peopleCancelled = false;
    const allCards: PersonCard[] = [];
    const seen = new Set<string>();
    const MAX_ROUNDS = 15;
    let consecutiveEmptyRounds = 0;

    for (let round = 0; round < MAX_ROUNDS; round++) {
      if (peopleCancelled) break;

      // Check tab still exists each round
      if (!(await isTabAlive(tabId))) {
        console.warn("[ImportPeople] Tab closed during scrape, aborting");
        return;
      }

      await scrollPeoplePage(tabId);
      await randomDelay(2000);

      const cards = await extractPeopleCards(tabId);
      let newCount = 0;
      for (const card of cards) {
        if (card.linkedinUrl && !seen.has(card.linkedinUrl)) {
          seen.add(card.linkedinUrl);
          allCards.push(card);
          newCount++;
        }
      }

      console.log(`[ImportPeople] Round ${round + 1}: +${newCount} new (total ${allCards.length})`);

      await safeSendMessage(tabId, {
        action: "importPeopleProgress",
        message: `Collecting... ${allCards.length} found`,
      });

      const clickedMore = await clickShowMorePeople(tabId);
      if (clickedMore) {
        consecutiveEmptyRounds = 0;
        await randomDelay(2500);
      } else if (newCount === 0) {
        consecutiveEmptyRounds++;
        // Break after 2 consecutive empty rounds to handle slow loading
        if (consecutiveEmptyRounds >= 2) break;
        await randomDelay(1500);
      } else {
        consecutiveEmptyRounds = 0;
      }
    }

    if (allCards.length === 0) {
      await safeSendMessage(tabId, {
        action: "importPeopleError",
        error: "No people found. Make sure you are logged in.",
      });
      return;
    }

    console.log(`[ImportPeople] Collected ${allCards.length} people — importing...`);

    await safeSendMessage(tabId, {
      action: "importPeopleProgress",
      message: `Importing ${allCards.length} contacts...`,
    });

    const contactInputs = allCards.map((card) => ({
      name: card.name,
      linkedinUrl: card.linkedinUrl,
      workEmail: null,
      headline: card.headline || null,
    }));

    const result = await gqlRequest(
      `mutation ImportCompanyWithContacts($input: ImportCompanyWithContactsInput!) {
        importCompanyWithContacts(input: $input) {
          success
          company { id name }
          contactsImported
          contactsSkipped
          errors
        }
      }`,
      {
        input: {
          companyName,
          linkedinUrl: companyLinkedinUrl,
          website: null,
          contacts: contactInputs,
        },
      },
    );

    const res = result.data?.importCompanyWithContacts;
    if (res?.success) {
      console.log(`[ImportPeople] Imported ${res.contactsImported}, skipped ${res.contactsSkipped}`);
      await safeSendMessage(tabId, {
        action: "importPeopleDone",
        imported: res.contactsImported,
        skipped: res.contactsSkipped,
        companyId: res.company?.id,
      });
    } else {
      const errMsg = res?.errors?.[0] || result.errors?.[0]?.message || "Import failed";
      console.error("[ImportPeople] Error:", errMsg);
      await safeSendMessage(tabId, {
        action: "importPeopleError",
        error: errMsg,
      });
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[ImportPeople] Unexpected error:", errMsg);
    await safeSendMessage(tabId, {
      action: "importPeopleError",
      error: errMsg,
    });
  }
}

// ── Find Related/Similar Companies ──────────────────────────────────

// Click "Show all" in the "Pages people also viewed" section (if present).
// Returns true if the button was found and clicked.
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

// Check if a modal/dialog is open and scrape company links from it, then close it.
// Returns the links found, or empty array if no modal.
function scrapeModalCompanyUrls(tabId: number): Promise<string[]> {
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

        // Scroll modal content to trigger lazy-loading
        const scrollable = modal.querySelector(".artdeco-modal__content") || modal;
        (scrollable as HTMLElement).scrollTop = (scrollable as HTMLElement).scrollHeight;

        const links: string[] = [];
        modal.querySelectorAll<HTMLAnchorElement>('a[href*="/company/"]').forEach((a) => {
          try {
            const href = a.href.split("?")[0].replace(/\/$/, "");
            const parsed = new URL(href);
            const match = parsed.pathname.match(/^\/company\/([^/]+)$/);
            if (match && !links.includes(href)) links.push(href);
          } catch { /* skip malformed URLs */ }
        });

        console.log(`[FindRelated] Modal: found ${links.length} company links`);

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

        return links;
      },
    })
    .then((res) => (res?.[0]?.result as string[]) ?? [])
    .catch((err) => {
      console.error("[FindRelated] scrapeModalCompanyUrls error:", err);
      return [];
    });
}

// Extract company URLs from the "Pages people also viewed" sidebar (fallback).
function extractSidebarCompanyUrls(tabId: number): Promise<string[]> {
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

        const links: string[] = [];
        container.querySelectorAll<HTMLAnchorElement>('a[href*="/company/"]').forEach((a) => {
          try {
            const href = a.href.split("?")[0].replace(/\/$/, "");
            const parsed = new URL(href);
            const match = parsed.pathname.match(/^\/company\/([^/]+)$/);
            if (match && !links.includes(href)) links.push(href);
          } catch { /* skip malformed URLs */ }
        });
        console.log(`[FindRelated] Sidebar: found ${links.length} company links`);
        return links;
      },
    })
    .then((res) => (res?.[0]?.result as string[]) ?? [])
    .catch((err) => {
      console.error("[FindRelated] extractSidebarCompanyUrls error:", err);
      return [];
    });
}

// Orchestrate: try modal first (click "Show all" → wait → scrape), fall back to sidebar.
async function extractSimilarCompanyUrls(tabId: number): Promise<string[]> {
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

const MAX_COMPANIES = 150;

// Inject (or update) a floating status overlay on the current page.
// Survives navigation because it's re-injected after each waitForTabLoad.
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
  },
): Promise<void> {
  return chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: (s: { saved: number; skipped: number; queued: number; targets: number; filtered?: number; name: string; phase: string }) => {
        const ATTR = "data-lg-crawl-overlay";
        const COPY_ATTR = "data-lg-crawl-copy";
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
        const filteredPart = s.filtered ? `, ${s.filtered} filtered` : "";
        const statusText = `${s.saved} saved${targetPart}, ${s.skipped} dupes${filteredPart} (${s.queued} queued) \u2014 ${s.name}`;
        const copyText = `FindRelated: ${s.saved} saved (${s.targets} targets), ${s.skipped} dupes, ${s.filtered ?? 0} filtered, ${s.queued} queued \u2014 ${s.name} [${s.phase}]`;
        el.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:${dotColor};display:inline-block;flex-shrink:0;animation:lgpulse 1.2s ease-in-out infinite"></span><span style="user-select:text">${statusText}</span>`;

        // Add or update copy button
        let copyBtn = el.querySelector(`[${COPY_ATTR}]`) as HTMLButtonElement | null;
        if (!copyBtn) {
          copyBtn = document.createElement("button");
          copyBtn.setAttribute(COPY_ATTR, "true");
          copyBtn.style.cssText = "background:none;border:none;cursor:pointer;opacity:0.6;font-size:14px;padding:0;margin-left:4px;flex-shrink:0;line-height:1;";
          copyBtn.textContent = "\u{1F4CB}";
          copyBtn.addEventListener("mouseenter", () => { copyBtn!.style.opacity = "1"; });
          copyBtn.addEventListener("mouseleave", () => { copyBtn!.style.opacity = "0.6"; });
          copyBtn.addEventListener("click", () => {
            const text = copyBtn!.getAttribute("data-copy-text") || "";
            navigator.clipboard.writeText(text).then(() => {
              copyBtn!.textContent = "\u2713";
              setTimeout(() => { copyBtn!.textContent = "\u{1F4CB}"; }, 1000);
            });
          });
          el.appendChild(copyBtn);
        }
        copyBtn.setAttribute("data-copy-text", copyText);

        if (!document.getElementById("lg-crawl-pulse-style")) {
          const style = document.createElement("style");
          style.id = "lg-crawl-pulse-style";
          style.textContent = "@keyframes lgpulse{0%,100%{opacity:1}50%{opacity:.3}}";
          document.head.appendChild(style);
        }
      },
      args: [status],
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

// parseLinkedInSize imported from ../../lib/icp-filter

// Normalize a LinkedIn company URL to a canonical form for dedup.
function normalizeCompanyUrl(url: string): string {
  return url.split("?")[0].replace(/\/$/, "").toLowerCase();
}

async function findRelatedCompanies(tabId: number) {
  console.log("[FindRelated] Starting BFS crawl...");

  try {
    if (!(await isTabAlive(tabId))) {
      console.warn("[FindRelated] Tab no longer exists, aborting");
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
    const seedUrl = `https://www.linkedin.com/company/${companyMatch[1]}`;

    // BFS state
    const visited = new Set<string>();
    const queue: string[] = [];
    let saved = 0;
    let skipped = 0;
    let filtered = 0;
    let targets = 0;

    // Mark seed as visited (don't re-scrape the page we started on)
    visited.add(normalizeCompanyUrl(seedUrl));

    // ── Seed phase ─────────────────────────────────────────────────────
    if (currentUrl.includes("/people") || currentUrl.includes("/about")) {
      await safeTabUpdate(tabId, { url: seedUrl + "/" });
      await waitForTabLoad(tabId);
      await randomDelay(4000);
    }

    // Scroll to load lazy content
    for (let i = 0; i < 3; i++) {
      if (!(await isTabAlive(tabId))) return;
      await chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        func: () => window.scrollTo(0, document.body.scrollHeight),
      }).catch(() => {});
      await randomDelay(2500);
    }

    const seedUrls = await extractSimilarCompanyUrls(tabId);
    for (const url of seedUrls) {
      const norm = normalizeCompanyUrl(url);
      if (!visited.has(norm)) {
        visited.add(norm);
        queue.push(url);
      }
    }
    console.log(`[FindRelated] Seeded queue with ${queue.length} companies from starting page`);

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
    while (queue.length > 0 && (saved + skipped + filtered) < MAX_COMPANIES) {
      if (!(await isTabAlive(tabId))) {
        console.warn("[FindRelated] Tab closed during BFS crawl, stopping");
        break;
      }

      const url = queue.shift()!;

      // a) Navigate to /about/ and scrape company data
      const aboutUrl = url.replace(/\/$/, "") + "/about/";
      const urlSlug = url.match(/\/company\/([^/]+)/)?.[1] || "loading...";
      await safeTabUpdate(tabId, { url: aboutUrl });
      await waitForTabLoad(tabId);
      await randomDelay(2000);
      await injectCrawlOverlay(tabId, { saved, skipped, targets, queued: queue.length, name: urlSlug, phase: "saving" });

      await clickSeeMore(tabId);
      await randomDelay(500);

      const data = await extractCompanyData(tabId);
      if (data && data.name) {
        const icp = isICPTarget(data);

        if (!icp.target) {
          filtered++;
          console.log(`[FindRelated] ${saved + skipped + filtered}/${MAX_COMPANIES}: ⊘ ${data.name} — ${icp.reason} (queued: ${queue.length})`);
          await injectCrawlOverlay(tabId, { saved, skipped, targets, filtered, queued: queue.length, name: `⊘ ${data.name} [${icp.reason}]`, phase: "saving" });
        } else {
          // Build company object and save
          const company = {
            name: data.name,
            website: data.website || undefined,
            linkedin_url: data.linkedinUrl || undefined,
            description: [
              data.description,
              data.industry ? `Industry: ${data.industry}` : "",
              data.size ? `Size: ${data.size}` : "",
            ]
              .filter(Boolean)
              .join("\n") || undefined,
            location: data.location || undefined,
          };

          const result = await saveCompanyBatch([company]);
          if (result > 0) {
            saved += result;
            targets++;
            console.log(`[FindRelated] ${saved + skipped + filtered}/${MAX_COMPANIES}: 🎯 ${data.name} ✓ SAVED (queued: ${queue.length})`);
            await injectCrawlOverlay(tabId, { saved, skipped, targets, filtered, queued: queue.length, name: `🎯 ✓ ${data.name}`, phase: "saving" });
          } else {
            skipped++;
            targets++;
            console.log(`[FindRelated] ${saved + skipped + filtered}/${MAX_COMPANIES}: 🎯 ${data.name} ⊘ ALREADY EXISTS (queued: ${queue.length})`);
            await injectCrawlOverlay(tabId, { saved, skipped, targets, filtered, queued: queue.length, name: `🎯 ⊘ ${data.name}`, phase: "saving" });
          }
        }

        // Send progress (will only reach content script if on same origin)
        safeSendMessage(tabId, {
          action: "findRelatedProgress",
          current: saved,
          total: MAX_COMPANIES,
          name: data.name,
          queued: queue.length,
          skipped,
          targets,
          filtered,
        }).catch(() => {});
      }

      // d) Discover new related companies from THIS page
      if ((saved + skipped) < MAX_COMPANIES && (await isTabAlive(tabId))) {
        // Navigate to main company page (strip /about/)
        const mainUrl = url.replace(/\/$/, "") + "/";
        await safeTabUpdate(tabId, { url: mainUrl });
        await waitForTabLoad(tabId);
        await randomDelay(2000);
        await injectCrawlOverlay(tabId, { saved, skipped, targets, queued: queue.length, name: data?.name || urlSlug, phase: "discovering" });

        // Scroll to load lazy content
        for (let i = 0; i < 3; i++) {
          if (!(await isTabAlive(tabId))) break;
          await chrome.scripting.executeScript({
            target: { tabId },
            world: "MAIN",
            func: () => window.scrollTo(0, document.body.scrollHeight),
          }).catch(() => {});
          await randomDelay(2500);
        }

        const newUrls = await extractSimilarCompanyUrls(tabId);
        let newCount = 0;
        for (const newUrl of newUrls) {
          const norm = normalizeCompanyUrl(newUrl);
          if (!visited.has(norm)) {
            visited.add(norm);
            queue.push(newUrl);
            newCount++;
          }
        }
        if (newCount > 0) {
          console.log(`[FindRelated] ${data?.name || url} yielded ${newCount} new companies (queue: ${queue.length}, visited: ${visited.size})`);
        }
      }

      await randomDelay(1500);
    }

    // ── After loop ─────────────────────────────────────────────────────
    console.log(`[FindRelated] Crawl complete. saved=${saved}, skipped=${skipped}, filtered=${filtered}, visited=${visited.size}, queue_remaining=${queue.length}`);

    // Navigate back to original page and remove overlay
    if (await isTabAlive(tabId)) {
      await removeCrawlOverlay(tabId);
      try {
        await safeTabUpdate(tabId, { url: returnUrl });
        await waitForTabLoad(tabId);
      } catch {
        console.warn("[FindRelated] Could not navigate back to original page");
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
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[FindRelated] Unexpected error:", errMsg);
    if (await isTabAlive(tabId)) {
      await injectCrawlOverlay(tabId, { saved: 0, skipped: 0, targets: 0, filtered: 0, queued: 0, name: errMsg.slice(0, 40), phase: "error" });
    }
    await safeSendMessage(tabId, {
      action: "findRelatedError",
      error: errMsg,
    });
  }
}
