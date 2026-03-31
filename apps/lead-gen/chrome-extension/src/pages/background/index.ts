// Background service worker
import { browseContactPosts, scrapeAllPosts, cancelPostScraping, scrapeJobSearchPosts, runUnifiedPipeline } from "../../services/post-scraper";

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

  return false;
});

// ── Profile Browsing Engine ──────────────────────────────────────────

let browseCancelled = false;

function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const listener = (
      updatedTabId: number,
      changeInfo: { status?: string },
    ) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        if (timeoutId !== null) clearTimeout(timeoutId);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    // Timeout after 15s in case page never fully loads
    timeoutId = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, 15000);
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
    await new Promise((r) => setTimeout(r, 2500));

    // Expand "See more" sections
    const expanded = await clickSeeMore(tabId);
    if (expanded > 0) {
      console.log(`[BrowseProfiles] Clicked ${expanded} "See more" button(s)`);
      await new Promise((r) => setTimeout(r, 800));
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
    await new Promise((r) => setTimeout(r, 2500));
  }

  // Navigate back to search results
  await chrome.tabs.update(tabId, { url: returnUrl });
  await waitForTabLoad(tabId);

  // Wait for content script to re-inject, then send done message
  await new Promise((r) => setTimeout(r, 2000));
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

interface CompanyData {
  name: string;
  website: string;
  description: string;
  industry: string;
  size: string;
  location: string;
  linkedinUrl: string;
}

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
  let totalProcessed = 0;
  let page = 1;
  const allCompanyUrls: string[] = [];
  const returnUrl = (await chrome.tabs.get(tabId)).url || "";

  // ── Phase 1: Collect company URLs from search results (all pages) ──
  console.log("[BrowseCompanies] Phase 1: Collecting company URLs...");

  while (!companyCancelled) {
    // Wait for page content to render
    await new Promise((r) => setTimeout(r, 2000));

    // Scroll to bottom to load all results
    await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => window.scrollTo(0, document.body.scrollHeight),
    });
    await new Promise((r) => setTimeout(r, 1500));

    const urls = await extractCompanyUrls(tabId);
    const newUrls = urls.filter((u) => !allCompanyUrls.includes(u));
    allCompanyUrls.push(...newUrls);

    console.log(`[BrowseCompanies] Page ${page}: found ${newUrls.length} new companies (total: ${allCompanyUrls.length})`);

    // Try next page
    const hasNext = await extractNextPageUrl(tabId);
    if (!hasNext) break;

    page++;
    await waitForTabLoad(tabId);
    await new Promise((r) => setTimeout(r, 2000));
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
    await new Promise((r) => setTimeout(r, 2500));

    // Click "See more" if present
    await clickSeeMore(tabId);
    await new Promise((r) => setTimeout(r, 500));

    const data = await extractCompanyData(tabId);
    totalProcessed++;

    if (data && data.name) {
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
    await new Promise((r) => setTimeout(r, 1500));
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
    `[BrowseCompanies] Complete. Saved ${saved}/${totalProcessed} companies from ${page} page(s).`,
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
      func: () => window.scrollTo(0, document.body.scrollHeight),
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
        const btn = Array.from(
          document.querySelectorAll<HTMLButtonElement>("button")
        ).find((b) => {
          const text = b.textContent?.trim().toLowerCase() || "";
          return (
            text.includes("show more results") ||
            text.includes("show more") ||
            text.includes("load more")
          );
        });
        if (btn && !btn.disabled) {
          btn.click();
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
  console.log(`[BrowsePeople] Starting for companyId=${companyId}, tab=${tabId}`);

  await waitForTabLoad(tabId);
  // Extra wait for LinkedIn SPA to hydrate
  await new Promise((r) => setTimeout(r, 3000));

  const allCards: PersonCard[] = [];
  const seen = new Set<string>();
  const MAX_ROUNDS = 15;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    await scrollPeoplePage(tabId);
    await new Promise((r) => setTimeout(r, 1500));

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
      await new Promise((r) => setTimeout(r, 2000));
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
