// Background service worker — message listener & orchestrator
import { browseContactPosts, scrapeAllPosts, cancelPostScraping, scrapeJobSearchPosts, runUnifiedPipeline, scrapeRecruiterPosts, scrapeContactPostsSingle } from "../../services/post-scraper";
import { gqlRequest } from "../../services/graphql";
import { fetchRecentVisitsMap } from "../../services/visit-tracker";
import { importJobsToD1, type D1JobInput } from "../../services/jobs-d1-importer";
import { startKeepAlive, stopKeepAlive, waitForTabLoad, clickSeeMore, randomDelay } from "./tab-utils";
import { browseProfiles, setBrowseCancelled, extractFullProfileData, parseName, parseHeadline } from "./profile-browsing";
import { traverseAllSearchPages } from "./people-search-traversal";
import {
  browseCompanies,
  setCompanyCancelled,
  saveCompanyBatch,
  extractCompanyData,
  type CompanyImportBatchInput,
} from "./company-browsing";
import { browsePeople, importPeopleFromCurrentPage, setPeopleCancelled } from "./people-scraping";
import { findRelatedCompanies, setFindRelatedCancelled } from "./find-related";
import { scrapeCompanyFull, setCompanyScraperCancelled } from "./company-scraper";
import { scrapePeoplePostsFromCompanyPage, setPeoplePostsCancelled } from "./people-posts-scraper";
import {
  parseProductCategoriesFromUrl,
  taxonomyForCategoryIds,
} from "./linkedin-product-categories";

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

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "paginationProgress") return false;
  if (message.action === "productSearchPaginationProgress") return false;

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
    const { profiles, returnUrl, ignoreDedup } = message as {
      profiles: string[];
      returnUrl: string;
      ignoreDedup?: boolean;
    };
    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({ success: false, error: "No tab ID" });
      return true;
    }
    sendResponse({ success: true });
    startKeepAlive();
    browseProfiles(tabId, profiles, returnUrl, { ignoreDedup }).finally(
      stopKeepAlive,
    );
    return true;
  }

  // ── Stop Profile Browsing ──
  if (message.action === "stopProfileBrowsing") {
    setBrowseCancelled(true);
    sendResponse({ success: true });
    return true;
  }

  // ── Refresh CRM Recruiters ──
  // Pulls a batch of N already-tagged recruiters from Neon, orders by
  // least-recently-visited (per the D1 contact_visits log), then runs the
  // existing browseProfiles engine over them with ignoreDedup so the visit
  // recorded by this run is the one used to order the next cycle.
  if (message.action === "refreshCrmRecruiters") {
    const { returnUrl, batchSize } = message as {
      returnUrl: string;
      batchSize?: number;
    };
    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({ success: false, error: "No tab ID" });
      return true;
    }
    const limit = Math.max(1, Math.min(100, batchSize ?? 20));
    sendResponse({ success: true });

    (async () => {
      startKeepAlive();
      try {
        // 1. Fetch tagged recruiter contacts from Neon. Cap at 5000 — that's
        // ~2x the current 2,151 corpus, leaves headroom but bounds the
        // payload. The query is paginated via `offset` if we ever need more.
        console.log(
          `[RefreshCrm] Fetching recruiter contacts (tag=ai-recruiter, batch=${limit})…`,
        );
        const queryResult = await gqlRequest(
          `query RecruiterContactsForCycle($limit: Int!) {
            contacts(tag: "ai-recruiter", limit: $limit) {
              contacts { id linkedinUrl }
            }
          }`,
          { limit: 5000 },
        );
        const allContacts = (queryResult.data?.contacts?.contacts ?? []) as Array<{
          id: number | string;
          linkedinUrl: string | null;
        }>;
        const allUrls = allContacts
          .map((c) => c.linkedinUrl)
          .filter((u): u is string => typeof u === "string" && u.length > 0)
          // Normalize trailing slash so visit-tracker keys line up.
          .map((u) => (u.endsWith("/") ? u : u + "/"));
        console.log(
          `[RefreshCrm] Pulled ${allContacts.length} recruiter contacts, ${allUrls.length} with linkedin_url`,
        );

        if (allUrls.length === 0) {
          await chrome.tabs.sendMessage(tabId, {
            action: "browseDone",
            saved: 0,
            error: "No recruiter contacts in Neon",
          }).catch(() => {});
          return;
        }

        // 2. Pull last-visited timestamps from D1 (90-day window so older
        // visits still influence ordering).
        const visitedMap = await fetchRecentVisitsMap(allUrls, 90);

        // 3. Sort: never-visited (not in map) first, then oldest visited
        // first. Stable lexicographic tiebreak so order is deterministic.
        const sorted = [...allUrls].sort((a, b) => {
          const va = visitedMap.get(a);
          const vb = visitedMap.get(b);
          if (!va && !vb) return a.localeCompare(b);
          if (!va) return -1;
          if (!vb) return 1;
          return va.localeCompare(vb); // ISO timestamps sort chronologically
        });
        const batch = sorted.slice(0, limit);
        const neverVisited = batch.filter((u) => !visitedMap.has(u)).length;
        console.log(
          `[RefreshCrm] Batch of ${batch.length}: ${neverVisited} never-visited, ${batch.length - neverVisited} stale-revisit`,
        );

        // 4. Run the existing browser loop. ignoreDedup=true because we
        // explicitly want to revisit known contacts (the dedup window is
        // for discovery-style re-saves, not refresh cycling).
        await browseProfiles(tabId, batch, returnUrl, { ignoreDedup: true });
      } catch (err) {
        console.error(
          `[RefreshCrm] Failed:`,
          err instanceof Error ? err.message : String(err),
        );
        await chrome.tabs.sendMessage(tabId, {
          action: "browseDone",
          saved: 0,
          error: err instanceof Error ? err.message : "refresh failed",
        }).catch(() => {});
      } finally {
        stopKeepAlive();
      }
    })();
    return true;
  }

  // ── Score All DB Contacts — backfill score_recruiter_fit over every saved
  // contact with a linkedin_url. Walks the contacts table in pages, dedupes,
  // and reuses the same browseProfiles engine (createContact no-ops on
  // duplicates → post-scrape + fit-score still run).
  if (message.action === "scoreAllDbContacts") {
    const { returnUrl, ignoreDedup } = message as {
      returnUrl: string;
      ignoreDedup?: boolean;
    };
    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({ success: false, error: "No tab ID" });
      return true;
    }
    sendResponse({ success: true });

    (async () => {
      startKeepAlive();
      try {
        const PAGE_SIZE = 500;
        const HARD_CAP = 10_000;
        const seen = new Set<string>();
        let offset = 0;
        let totalReported = 0;
        let pulled = 0;

        while (offset < HARD_CAP) {
          const queryResult = await gqlRequest(
            `query AllContactsForScoring($limit: Int!, $offset: Int!) {
              contacts(limit: $limit, offset: $offset) {
                contacts { id linkedinUrl }
                totalCount
              }
            }`,
            { limit: PAGE_SIZE, offset },
          );
          const page = (queryResult.data?.contacts?.contacts ?? []) as Array<{
            id: number | string;
            linkedinUrl: string | null;
          }>;
          totalReported = Number(queryResult.data?.contacts?.totalCount ?? 0);
          if (page.length === 0) break;
          pulled += page.length;
          for (const c of page) {
            if (typeof c.linkedinUrl !== "string" || c.linkedinUrl.length === 0) continue;
            const url = c.linkedinUrl.endsWith("/") ? c.linkedinUrl : c.linkedinUrl + "/";
            seen.add(url);
          }
          console.log(
            `[ScoreAllContacts] page offset=${offset}: +${page.length} (total pulled ${pulled}/${totalReported}, urls dedup=${seen.size})`,
          );
          offset += page.length;
          if (page.length < PAGE_SIZE) break;
        }

        if (offset >= HARD_CAP) {
          console.warn(
            `[ScoreAllContacts] Hit HARD_CAP=${HARD_CAP} before exhausting totalCount=${totalReported}`,
          );
        }

        const urls = [...seen];
        console.log(
          `[ScoreAllContacts] Total to score: ${urls.length} (from ${pulled} contacts pulled)`,
        );

        if (urls.length === 0) {
          await chrome.tabs.sendMessage(tabId, {
            action: "scoreAllDone",
            saved: 0,
            error: "No contacts with linkedinUrl",
          }).catch(() => {});
          return;
        }

        await browseProfiles(tabId, urls, returnUrl, {
          ignoreDedup: ignoreDedup === true,
          progressAction: "scoreAllProgress",
          doneAction: "scoreAllDone",
        });
      } catch (err) {
        console.error(
          `[ScoreAllContacts] Failed:`,
          err instanceof Error ? err.message : String(err),
        );
        await chrome.tabs.sendMessage(tabId, {
          action: "scoreAllDone",
          saved: 0,
          error: err instanceof Error ? err.message : "score-all failed",
        }).catch(() => {});
      } finally {
        stopKeepAlive();
      }
    })();
    return true;
  }

  // ── Start Profile Browsing — All Search Pages (Voyager) ──
  if (message.action === "startProfileBrowsingAllPages") {
    const { searchUrl } = message as { searchUrl: string };
    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({ success: false, error: "No tab ID" });
      return true;
    }
    sendResponse({ success: true });
    startKeepAlive();
    traverseAllSearchPages(tabId, searchUrl).finally(stopKeepAlive);
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
    setCompanyCancelled(true);
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
    console.log(`[FindRelated:BG] Received findRelatedCompanies, tabId=${tabId}, url=${sender.tab?.url}`);
    if (!tabId) {
      console.warn("[FindRelated:BG] No tab ID available");
      sendResponse({ success: false, error: "No tab ID" });
      return true;
    }
    sendResponse({ success: true });
    startKeepAlive();
    findRelatedCompanies(tabId).finally(stopKeepAlive);
    return true;
  }

  // ── Stop Find Related crawl ──
  if (message.action === "stopFindRelated") {
    setFindRelatedCancelled(true);
    setCompanyScraperCancelled(true); // Also stop any running deep scrape phase
    sendResponse({ success: true });
    return true;
  }

  // ── Stop People Scraping (browsePeople / importPeopleFromCurrentPage) ──
  if (message.action === "stopPeopleScraping") {
    setPeopleCancelled(true);
    sendResponse({ success: true });
    return true;
  }

  // ── Scrape Posts for All People on Company Page ──
  if (message.action === "scrapePeoplePostsFromCompanyPage") {
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
    scrapePeoplePostsFromCompanyPage(tabId, companyName, companyLinkedinUrl).finally(stopKeepAlive);
    return true;
  }

  // ── Stop People Posts Scraping ──
  if (message.action === "stopPeoplePostsScraping") {
    setPeoplePostsCancelled(true);
    sendResponse({ success: true });
    return true;
  }

  // ── Scrape Full Company Profile (About + Posts + Jobs + People) ──
  if (message.action === "scrapeCompanyFull") {
    // May come from content script (sender.tab) or popup (need to query active tab)
    const directTabId = sender.tab?.id;
    if (directTabId) {
      sendResponse({ success: true });
      startKeepAlive();
      scrapeCompanyFull(directTabId).finally(stopKeepAlive);
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        const tabId = tabs[0]?.id;
        if (!tabId) {
          sendResponse({ success: false, error: "No active tab" });
          return;
        }
        sendResponse({ success: true });
        startKeepAlive();
        scrapeCompanyFull(tabId).finally(stopKeepAlive);
      });
    }
    return true;
  }

  // ── Scrape Posts for a Single Contact (triggered from web app) ──
  if (message.action === "scrapeContactPosts") {
    const { contactId, linkedinUrl, contactName } = message as {
      contactId: number;
      linkedinUrl: string;
      contactName: string;
    };
    // Create a new tab for scraping (don't hijack the app tab)
    chrome.tabs.create({ url: linkedinUrl, active: true }).then((tab) => {
      if (!tab.id) {
        sendResponse({ success: false, error: "Failed to create tab" });
        return;
      }
      sendResponse({ success: true });
      startKeepAlive();
      scrapeContactPostsSingle(tab.id, contactId, linkedinUrl, contactName).finally(stopKeepAlive);
    });
    return true;
  }

  // ── Stop Full Company Scrape ──
  if (message.action === "stopCompanyScraper") {
    setCompanyScraperCancelled(true);
    sendResponse({ success: true });
    return true;
  }

  // ── Import LinkedIn Profile (triggered from web app contact detail) ──
  if (message.action === "importLinkedInProfile") {
    const { contactId, linkedinUrl } = message as {
      contactId: number;
      linkedinUrl: string;
      contactName: string;
    };

    /** Send progress to all app tabs (webapp-bridge relays source: "lead-gen-bg") */
    const notifyApp = async (data: Record<string, unknown>) => {
      try {
        const appTabs = await chrome.tabs.query({ url: ["http://localhost:*/*", "https://*.vercel.app/*"] });
        for (const t of appTabs) {
          if (t.id) {
            chrome.tabs.sendMessage(t.id, {
              source: "lead-gen-bg",
              action: "importProfileProgress",
              contactId,
              ...data,
            }).catch(() => {});
          }
        }
      } catch { /* ignore */ }
    };

    chrome.tabs.create({ url: linkedinUrl, active: true }).then(async (tab) => {
      if (!tab.id) {
        sendResponse({ success: false, error: "Failed to create tab" });
        return;
      }
      sendResponse({ success: true });
      startKeepAlive();

      try {
        await waitForTabLoad(tab.id);
        await randomDelay(2500);

        await notifyApp({ status: "Extracting profile data..." });

        // Expand "See more" sections
        const expanded = await clickSeeMore(tab.id);
        if (expanded > 0) await randomDelay(800);

        const data = await extractFullProfileData(tab.id);
        if (!data || !data.name) {
          await notifyApp({ error: "Could not extract profile data — page may require login" });
          try { await chrome.tabs.remove(tab.id); } catch { /* */ }
          return;
        }

        const { firstName, lastName } = parseName(data.name);
        const { position, company: headlineCompany } = parseHeadline(data.headline);
        const companyName = data.currentCompany || headlineCompany;

        await notifyApp({
          status: `Extracted: ${data.name}${position ? " — " + position : ""}${companyName ? " at " + companyName : ""}`,
        });

        // Find or create company
        let companyId: number | undefined;
        if (companyName) {
          await notifyApp({ status: `Looking up company: ${companyName}...` });

          const findResult = await gqlRequest(
            `query FindCompany($name: String, $linkedinUrl: String) {
              findCompany(name: $name, linkedinUrl: $linkedinUrl) {
                found
                company { id name }
              }
            }`,
            {
              name: companyName,
              linkedinUrl: data.currentCompanyLinkedinUrl || undefined,
            },
          );

          if (findResult.data?.findCompany?.found) {
            companyId = findResult.data.findCompany.company.id;
            await notifyApp({ status: `Found company: ${findResult.data.findCompany.company.name}` });
          } else {
            await notifyApp({ status: `Creating company: ${companyName}...` });
            const key = companyName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "");

            const createResult = await gqlRequest(
              `mutation CreateCompany($input: CreateCompanyInput!) {
                createCompany(input: $input) { id name }
              }`,
              {
                input: {
                  key,
                  name: companyName,
                  linkedin_url: data.currentCompanyLinkedinUrl || undefined,
                },
              },
            );

            if (createResult.data?.createCompany?.id) {
              companyId = createResult.data.createCompany.id;
              await notifyApp({ status: `Created company: ${companyName}` });
            } else if (createResult.errors) {
              console.warn("[ImportProfile] Create company error:", createResult.errors[0].message);
            }
          }
        }

        // Update the contact
        await notifyApp({ status: "Updating contact..." });
        const updateResult = await gqlRequest(
          `mutation UpdateContact($id: Int!, $input: UpdateContactInput!) {
            updateContact(id: $id, input: $input) { id firstName lastName position company }
          }`,
          {
            id: contactId,
            input: {
              firstName,
              lastName: lastName || undefined,
              position: position || undefined,
              company: companyName || undefined,
              ...(companyId !== undefined && { companyId }),
            },
          },
        );

        if (updateResult.errors) {
          await notifyApp({ error: `Update failed: ${updateResult.errors[0].message}` });
        } else {
          await notifyApp({
            done: true,
            status: `Imported: ${data.name}${companyName ? " at " + companyName : ""}`,
          });
        }

        // Close the scraping tab
        try { await chrome.tabs.remove(tab.id); } catch { /* already closed */ }
      } catch (err) {
        await notifyApp({ error: err instanceof Error ? err.message : String(err) });
      } finally {
        stopKeepAlive();
      }
    });

    return true;
  }

  // ── Check if contact exists by LinkedIn URL ──
  if (message.action === "checkContactByLinkedinUrl") {
    const { linkedinUrl } = message as { linkedinUrl: string };

    (async () => {
      try {
        const result = await gqlRequest(
          `query CheckContactByLinkedinUrl($linkedinUrl: String!) {
            contactByLinkedinUrl(linkedinUrl: $linkedinUrl) {
              id slug firstName lastName
            }
          }`,
          { linkedinUrl },
        );
        sendResponse({
          success: true,
          contact: result.data?.contactByLinkedinUrl ?? null,
        });
      } catch (err) {
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    return true;
  }

  // ── Import Profile from LinkedIn Page (triggered by content script button) ──
  if (message.action === "importProfileFromPage") {
    const { profileData } = message as {
      profileData: {
        name: string;
        headline: string;
        location: string;
        linkedinUrl: string;
        currentCompany: string;
        currentCompanyLinkedinUrl: string;
        currentPosition?: string;
        currentEmails?: string[];
      };
    };
    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({ success: false, error: "No tab ID" });
      return true;
    }
    sendResponse({ success: true });

    const notifyTab = async (data: Record<string, unknown>) => {
      try {
        await chrome.tabs.sendMessage(tabId, { action: "importProfilePageProgress", ...data });
      } catch { /* tab closed */ }
    };

    (async () => {
      startKeepAlive();
      try {
        const { firstName, lastName } = parseName(profileData.name);
        const position =
          profileData.currentPosition || parseHeadline(profileData.headline).position;
        const companyName = profileData.currentCompany;
        const emails = profileData.currentEmails ?? [];
        const primaryEmail = emails[0];

        await notifyTab({ status: `${profileData.name} — looking up...` });

        // Find or create company
        let companyId: number | undefined;
        if (companyName) {
          const findResult = await gqlRequest(
            `query FindCompany($name: String, $linkedinUrl: String) {
              findCompany(name: $name, linkedinUrl: $linkedinUrl) {
                found
                company { id name }
              }
            }`,
            {
              name: companyName,
              linkedinUrl: profileData.currentCompanyLinkedinUrl || undefined,
            },
          );

          if (findResult.data?.findCompany?.found) {
            companyId = findResult.data.findCompany.company.id;
          } else {
            const key = companyName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "");

            const createResult = await gqlRequest(
              `mutation CreateCompany($input: CreateCompanyInput!) {
                createCompany(input: $input) { id name }
              }`,
              {
                input: {
                  key,
                  name: companyName,
                  linkedin_url: profileData.currentCompanyLinkedinUrl || undefined,
                },
              },
            );

            if (createResult.data?.createCompany?.id) {
              companyId = createResult.data.createCompany.id;
            }
          }
        }

        // Create contact
        await notifyTab({ status: "Saving contact..." });
        const createResult = await gqlRequest(
          `mutation CreateContact($input: CreateContactInput!) {
            createContact(input: $input) { id firstName lastName slug }
          }`,
          {
            input: {
              firstName,
              lastName: lastName || undefined,
              linkedinUrl: profileData.linkedinUrl,
              position: position || undefined,
              ...(companyId !== undefined && { companyId }),
              ...(primaryEmail && { email: primaryEmail }),
              ...(emails.length > 0 && { emails }),
              tags: ["linkedin-import"],
            },
          },
        );

        if (createResult.errors) {
          await notifyTab({ error: createResult.errors[0].message });
        } else {
          const contact = createResult.data.createContact;
          await notifyTab({
            done: true,
            slug: contact.slug,
            status: `Imported: ${profileData.name}${companyName ? " at " + companyName : ""}${primaryEmail ? " (" + primaryEmail + ")" : ""}`,
          });
        }
      } catch (err) {
        await notifyTab({ error: err instanceof Error ? err.message : String(err) });
      } finally {
        stopKeepAlive();
      }
    })();

    return true;
  }

  // ── Check if opportunity exists by URL ──
  if (message.action === "checkOpportunityByUrl") {
    const { url } = message as { url: string };

    (async () => {
      try {
        const result = await gqlRequest(
          `query CheckOpportunityByUrl($url: String!) {
            opportunityByUrl(url: $url) {
              id title
            }
          }`,
          { url },
        );
        sendResponse({
          success: true,
          opportunity: result.data?.opportunityByUrl ?? null,
        });
      } catch (err) {
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    return true;
  }

  // ── Import Opportunity from LinkedIn Job Page ──
  if (message.action === "importOpportunityFromPage") {
    const { opportunityData } = message as {
      opportunityData: {
        title: string;
        companyName: string;
        companyLinkedinUrl: string;
        salary: string;
        location: string;
        remoteType: string;
        employmentType: string;
        appliedStatus: string;
        jobUrl: string;
        description: string;
        hiringContact: { name: string; linkedinUrl: string; position: string } | null;
      };
    };
    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({ success: false, error: "No tab ID" });
      return true;
    }
    sendResponse({ success: true });

    const notifyTab = async (data: Record<string, unknown>) => {
      try {
        await chrome.tabs.sendMessage(tabId, { action: "importOpportunityPageProgress", ...data });
      } catch { /* tab closed */ }
    };

    (async () => {
      startKeepAlive();
      try {
        await notifyTab({ status: `Looking up "${opportunityData.title}"...` });

        // 1. Find or create company
        let companyId: number | undefined;
        if (opportunityData.companyName) {
          const findResult = await gqlRequest(
            `query FindCompany($name: String, $linkedinUrl: String) {
              findCompany(name: $name, linkedinUrl: $linkedinUrl) {
                found
                company { id name }
              }
            }`,
            {
              name: opportunityData.companyName,
              linkedinUrl: opportunityData.companyLinkedinUrl || undefined,
            },
          );

          if (findResult.data?.findCompany?.found) {
            companyId = findResult.data.findCompany.company.id;
          } else {
            const key = opportunityData.companyName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "");

            const createResult = await gqlRequest(
              `mutation CreateCompany($input: CreateCompanyInput!) {
                createCompany(input: $input) { id name }
              }`,
              {
                input: {
                  key,
                  name: opportunityData.companyName,
                  linkedin_url: opportunityData.companyLinkedinUrl || undefined,
                },
              },
            );

            if (createResult.data?.createCompany?.id) {
              companyId = createResult.data.createCompany.id;
            }
          }
        }

        // 2. Find or create hiring contact
        let contactId: number | undefined;
        if (opportunityData.hiringContact?.name) {
          await notifyTab({ status: "Checking contact..." });

          // Try dedup by linkedinUrl first if available
          if (opportunityData.hiringContact.linkedinUrl) {
            const checkResult = await gqlRequest(
              `query CheckContactByLinkedinUrl($linkedinUrl: String!) {
                contactByLinkedinUrl(linkedinUrl: $linkedinUrl) {
                  id slug firstName lastName
                }
              }`,
              { linkedinUrl: opportunityData.hiringContact.linkedinUrl },
            );

            if (checkResult.data?.contactByLinkedinUrl?.id) {
              contactId = checkResult.data.contactByLinkedinUrl.id;
            }
          }

          if (contactId === undefined) {
            const { firstName, lastName } = parseName(opportunityData.hiringContact.name);
            const createResult = await gqlRequest(
              `mutation CreateContact($input: CreateContactInput!) {
                createContact(input: $input) { id firstName lastName slug }
              }`,
              {
                input: {
                  firstName,
                  lastName: lastName || undefined,
                  linkedinUrl: opportunityData.hiringContact.linkedinUrl || undefined,
                  position: opportunityData.hiringContact.position || undefined,
                  ...(companyId !== undefined && { companyId }),
                  tags: ["linkedin-import", "hiring-team"],
                },
              },
            );

            if (createResult.data?.createContact?.id) {
              contactId = createResult.data.createContact.id;
            }
          }
        }

        // 3. Check if opportunity already exists
        await notifyTab({ status: "Creating opportunity..." });
        if (opportunityData.jobUrl) {
          const existCheck = await gqlRequest(
            `query CheckOpportunityByUrl($url: String!) {
              opportunityByUrl(url: $url) { id title }
            }`,
            { url: opportunityData.jobUrl },
          );

          if (existCheck.data?.opportunityByUrl?.id) {
            const existing = existCheck.data.opportunityByUrl;
            await notifyTab({
              done: true,
              opportunityId: existing.id,
              title: existing.title,
              status: `Already imported: ${existing.title}`,
            });
            return;
          }
        }

        // 4. Create opportunity
        const isApplied = !!opportunityData.appliedStatus;
        const metadata = JSON.stringify({
          location: opportunityData.location,
          remoteType: opportunityData.remoteType,
          employmentType: opportunityData.employmentType,
        });

        const createResult = await gqlRequest(
          `mutation CreateOpportunity($input: CreateOpportunityInput!) {
            createOpportunity(input: $input) { id title }
          }`,
          {
            input: {
              title: opportunityData.title,
              url: opportunityData.jobUrl || undefined,
              source: "linkedin",
              status: isApplied ? "applied" : "open",
              rewardText: opportunityData.salary || undefined,
              rawContext: opportunityData.description || undefined,
              metadata,
              applied: isApplied,
              appliedAt: isApplied ? new Date().toISOString() : undefined,
              tags: ["linkedin-import"],
              ...(companyId !== undefined && { companyId }),
              ...(contactId !== undefined && { contactId }),
            },
          },
        );

        if (createResult.errors) {
          await notifyTab({ error: createResult.errors[0].message });
        } else {
          const opp = createResult.data.createOpportunity;
          await notifyTab({
            done: true,
            opportunityId: opp.id,
            title: opp.title,
            status: `Imported: ${opp.title}${opportunityData.companyName ? " at " + opportunityData.companyName : ""}`,
          });
        }
      } catch (err) {
        await notifyTab({ error: err instanceof Error ? err.message : String(err) });
      } finally {
        stopKeepAlive();
      }
    })();

    return true;
  }

  // ── Bulk import: every visible LinkedIn job-search card → D1 opportunities ──
  //
  // Two paths:
  //   • Multi-page (default on /jobs/search with pagination): the content
  //     script paginates and fires `savePageBatch` per page. We POST each
  //     page to D1 as it arrives so partial progress survives a closed tab.
  //   • Single-page (`singlePage: true`, or no pagination on the page):
  //     scrape current page and POST once.
  if (message.action === "importAllOpportunitiesFromJobsSearch") {
    const tabId = sender.tab?.id;
    console.log(
      "[BG] importAllOpportunitiesFromJobsSearch from tab",
      tabId,
      "url=",
      sender.tab?.url,
    );
    if (!tabId) {
      sendResponse({ success: false, error: "No tab ID" });
      return true;
    }
    sendResponse({ success: true });

    const singlePage = !!(message as { singlePage?: boolean }).singlePage;
    const startedAt = Date.now();

    const notifyTab = async (data: Record<string, unknown>) => {
      try {
        await chrome.tabs.sendMessage(tabId, { action: "importAllProgress", ...data });
      } catch (err) {
        console.warn(`[BG] notifyTab(${tabId}) failed:`, err, "data=", data);
      }
    };

    type ImportError = {
      page: number;
      stage: "http" | "d1" | "network" | "pagination" | "extraction";
      status?: number;
      message: string;
      requestId?: string;
    };
    type PageStat = {
      page: number;
      cardsSeen: number;
      extracted: number;
      valid: number;
      inserted: number;
      skipped: number;
      descriptionsCaptured: number;
      durationMs: number;
      requestId?: string;
    };

    let totalInserted = 0;
    let totalSkipped = 0;
    let totalValid = 0;
    let totalExtracted = 0;
    let totalDescriptions = 0;
    let pagesSaved = 0;
    const errors: ImportError[] = [];
    const pageStats: PageStat[] = [];
    // Chain saves so per-page POSTs serialize — keeps accumulators race-free
    // and avoids hammering the edge worker.
    let savePromise: Promise<void> = Promise.resolve();

    const progressListener = (msg: unknown) => {
      const m = msg as {
        action?: string;
        currentPage?: number;
        totalPages?: number;
        jobsCollected?: number;
      };
      if (m?.action === "paginationProgress") {
        notifyTab({
          status: `Page ${m.currentPage}/${m.totalPages} — ${m.jobsCollected ?? 0} collected`,
          currentPage: m.currentPage,
          totalPages: m.totalPages,
        });
      }
    };
    chrome.runtime.onMessage.addListener(progressListener);

    const savePageListener = (msg: unknown) => {
      const m = msg as {
        action?: string;
        pageNumber?: number;
        totalPages?: number;
        attempt?: number;
        counters?: {
          cardsSeen?: number;
          extracted?: number;
          skippedNoTitle?: number;
          skippedNoUrl?: number;
          descriptionsCaptured?: number;
        };
        jobs?: Array<{
          title?: string;
          company?: string;
          url?: string;
          companyLinkedinUrl?: string | null;
          location?: string;
          salary?: string;
          description?: string;
          archived?: boolean;
        }>;
        companies?: Array<{ name?: string; linkedin_url?: string }>;
      };
      if (m?.action !== "savePageBatch") return;

      const pageNumber = m.pageNumber ?? 0;
      const totalPages = m.totalPages ?? 0;
      const pageJobs = m.jobs ?? [];
      const pageCompanies = m.companies ?? [];
      const counters = m.counters ?? {};

      const companyLinkedinByName = new Map<string, string>();
      for (const co of pageCompanies) {
        if (co?.name && co?.linkedin_url) companyLinkedinByName.set(co.name, co.linkedin_url);
      }

      const payload: D1JobInput[] = pageJobs
        .filter((j) => j.title && j.url)
        .map((j) => ({
          title: j.title!,
          company: j.company ?? "",
          url: j.url!,
          companyLinkedinUrl:
            j.companyLinkedinUrl ??
            (j.company ? companyLinkedinByName.get(j.company) ?? null : null),
          location: j.location ?? null,
          salary: j.salary ?? null,
          description: j.description ?? null,
          archived: !!j.archived,
        }));

      const extracted = counters.extracted ?? pageJobs.length;
      totalExtracted += extracted;
      totalValid += payload.length;
      totalDescriptions += counters.descriptionsCaptured ?? 0;

      savePromise = savePromise.then(async () => {
        const t0 = Date.now();
        if (payload.length === 0) {
          pagesSaved++;
          pageStats.push({
            page: pageNumber,
            cardsSeen: counters.cardsSeen ?? 0,
            extracted,
            valid: 0,
            inserted: 0,
            skipped: 0,
            descriptionsCaptured: counters.descriptionsCaptured ?? 0,
            durationMs: Date.now() - t0,
          });
          return;
        }
        const result = await importJobsToD1(payload);
        const stat: PageStat = {
          page: pageNumber,
          cardsSeen: counters.cardsSeen ?? 0,
          extracted,
          valid: payload.length,
          inserted: result.ok ? result.inserted : 0,
          skipped: result.ok ? result.skipped : 0,
          descriptionsCaptured: counters.descriptionsCaptured ?? 0,
          durationMs: Date.now() - t0,
          requestId: result.requestId,
        };
        pageStats.push(stat);
        if (result.ok) {
          totalInserted += result.inserted;
          totalSkipped += result.skipped;
          pagesSaved++;
          console.log(
            `[BG] page ${pageNumber}/${totalPages} ok requestId=${result.requestId} inserted=${result.inserted} skipped=${result.skipped} valid=${payload.length} extracted=${extracted}`,
          );
          await notifyTab({
            status: `Page ${pageNumber}/${totalPages} — ${totalInserted} imported / ${totalSkipped} skipped`,
            currentPage: pageNumber,
            totalPages,
          });
        } else {
          const stage: ImportError["stage"] =
            result.status && result.status >= 500 ? "d1"
              : result.status ? "http"
              : "network";
          const err: ImportError = {
            page: pageNumber,
            stage,
            status: result.status,
            message: result.error || "Save failed",
            requestId: result.requestId,
          };
          errors.push(err);
          console.warn(
            `[BG] page ${pageNumber}/${totalPages} FAIL requestId=${result.requestId} stage=${stage} status=${result.status} err=${err.message}`,
          );
          await notifyTab({
            status: `Page ${pageNumber} save failed: ${err.message}`,
            currentPage: pageNumber,
            totalPages,
          });
        }
      }).catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        errors.push({ page: pageNumber, stage: "network", message });
        console.warn(`[BG] page ${pageNumber} save threw:`, err);
      });
    };
    chrome.runtime.onMessage.addListener(savePageListener);

    (async () => {
      startKeepAlive();
      try {
        await notifyTab({ status: "Checking pagination..." });

        const paginationResp = singlePage
          ? null
          : await chrome.tabs
              .sendMessage(tabId, { action: "getPaginationInfo" })
              .catch(() => null);

        if (paginationResp?.paginationInfo) {
          // Multi-page: content script fires savePageBatch per page; the
          // savePageListener above POSTs each immediately. We just await
          // pagination completion and drain in-flight saves.
          const { totalPages } = paginationResp.paginationInfo as { totalPages: number };
          await notifyTab({ status: `Scraping ${totalPages} pages...` });
          const r = await chrome.tabs.sendMessage(tabId, {
            action: "extractJobsWithPagination",
          });
          if (!r?.success) {
            await notifyTab({ error: r?.error || "Pagination failed" });
            return;
          }

          await savePromise;

          const pageFailures = (r.pageFailures ?? []) as Array<{
            page: number;
            reason: string;
          }>;
          for (const pf of pageFailures) {
            errors.push({
              page: pf.page,
              stage: pf.reason === "empty-extraction" ? "extraction" : "pagination",
              message: pf.reason,
            });
          }

          const pagesScraped = r.pagesScraped ?? pagesSaved;
          const pagesFailed = pageFailures.length;
          const finishedAt = Date.now();

          if (totalValid === 0 && errors.length === 0) {
            await notifyTab({ error: "No job cards found across pages" });
            return;
          }

          const donePayload = {
            done: true,
            pagesScraped,
            pagesTotal: totalPages,
            pagesFailed,
            inserted: totalInserted,
            skipped: totalSkipped,
            total: totalValid,
            totals: {
              extracted: totalExtracted,
              valid: totalValid,
              inserted: totalInserted,
              skipped: totalSkipped,
              descriptionsCaptured: totalDescriptions,
            },
            pageStats,
            errors,
            startedAt,
            finishedAt,
            durationMs: finishedAt - startedAt,
            status:
              errors.length > 0
                ? `Pages ${pagesScraped}/${totalPages} (${pagesFailed} failed) — Inserted ${totalInserted}, Skipped ${totalSkipped}, Errors ${errors.length}`
                : `Imported ${totalInserted} / skipped ${totalSkipped} (${pagesScraped} pages)`,
          };
          console.log(
            `[BG] importAllOpportunities done`,
            JSON.stringify(donePayload),
          );
          await notifyTab(donePayload);
          return;
        }

        // Single-page path.
        await notifyTab({ status: "Scraping current page..." });
        const r = await chrome.tabs.sendMessage(tabId, { action: "extractJobs" });
        const c = await chrome.tabs
          .sendMessage(tabId, { action: "extractCompaniesFromJobs" })
          .catch(() => ({ companies: [] }));
        const scraped = {
          jobs: (r?.jobs ?? []) as unknown[],
          companies: (c?.companies ?? []) as unknown[],
          pagesScraped: 1,
        };

        if (scraped.jobs.length === 0) {
          await notifyTab({ error: "No job cards found on the page" });
          return;
        }

        const companyLinkedinByName = new Map<string, string>();
        for (const co of scraped.companies as Array<{ name?: string; linkedin_url?: string }>) {
          if (co?.name && co?.linkedin_url) companyLinkedinByName.set(co.name, co.linkedin_url);
        }

        const payload: D1JobInput[] = (scraped.jobs as Array<{
          title?: string;
          company?: string;
          url?: string;
          companyLinkedinUrl?: string | null;
          location?: string;
          salary?: string;
          description?: string;
          archived?: boolean;
        }>)
          .filter((j) => j.title && j.url)
          .map((j) => ({
            title: j.title!,
            company: j.company ?? "",
            url: j.url!,
            companyLinkedinUrl:
              j.companyLinkedinUrl ??
              (j.company ? companyLinkedinByName.get(j.company) ?? null : null),
            location: j.location ?? null,
            salary: j.salary ?? null,
            description: j.description ?? null,
            archived: !!j.archived,
          }));

        await notifyTab({ status: `Saving ${payload.length} to D1...` });
        const result = await importJobsToD1(payload);

        if (!result.ok) {
          errors.push({
            page: 1,
            stage: result.status && result.status >= 500 ? "d1" : result.status ? "http" : "network",
            status: result.status,
            message: result.error || "D1 import failed",
            requestId: result.requestId,
          });
          console.warn(
            `[BG] single-page import failed requestId=${result.requestId} status=${result.status} err=${result.error}`,
          );
          await notifyTab({ error: result.error || "D1 import failed" });
          return;
        }

        const finishedAt = Date.now();
        const donePayload = {
          done: true,
          pagesScraped: scraped.pagesScraped,
          pagesTotal: scraped.pagesScraped,
          pagesFailed: 0,
          inserted: result.inserted,
          skipped: result.skipped,
          total: result.total,
          totals: {
            extracted: payload.length,
            valid: payload.length,
            inserted: result.inserted,
            skipped: result.skipped,
            descriptionsCaptured: 0,
          },
          pageStats: [
            {
              page: 1,
              cardsSeen: payload.length,
              extracted: payload.length,
              valid: payload.length,
              inserted: result.inserted,
              skipped: result.skipped,
              descriptionsCaptured: 0,
              durationMs: finishedAt - startedAt,
              requestId: result.requestId,
            },
          ],
          errors,
          startedAt,
          finishedAt,
          durationMs: finishedAt - startedAt,
          status: `Imported ${result.inserted} / skipped ${result.skipped} (${scraped.pagesScraped} pages)`,
        };
        console.log(
          `[BG] importAllOpportunities (single-page) done`,
          JSON.stringify(donePayload),
        );
        await notifyTab(donePayload);
      } catch (err) {
        await notifyTab({ error: err instanceof Error ? err.message : String(err) });
      } finally {
        chrome.runtime.onMessage.removeListener(progressListener);
        chrome.runtime.onMessage.removeListener(savePageListener);
        stopKeepAlive();
      }
    })();

    return true;
  }

  // ── Browse Companies on LinkedIn product-search pages ─────────────
  // Content script paginates `/search/results/products/*` and fires
  // `saveCompanyBatchFromProducts` per page. We funnel each batch through
  // the existing saveCompanyBatch() → importCompanies GraphQL mutation,
  // which upserts into Neon's companies table.
  if (message.action === "browseProductCompanies") {
    const tabId = sender.tab?.id;
    const m = message as {
      action: string;
      sourceUrl?: string;
      categoryIds?: string[];
    };
    const sourceUrl = m.sourceUrl ?? sender.tab?.url;
    console.log("[BG] browseProductCompanies from tab", tabId, "url=", sourceUrl);
    if (!tabId) {
      sendResponse({ success: false, error: "No tab ID" });
      return true;
    }
    sendResponse({ success: true });

    const categoryIds =
      Array.isArray(m.categoryIds) && m.categoryIds.length > 0
        ? m.categoryIds
        : parseProductCategoriesFromUrl(sourceUrl);
    const serviceTaxonomy = taxonomyForCategoryIds(categoryIds);
    console.log(
      "[BG] browseProductCompanies categories=",
      JSON.stringify(categoryIds),
      "taxonomy=",
      JSON.stringify(serviceTaxonomy),
    );

    const startedAt = Date.now();

    const notifyTab = async (data: Record<string, unknown>) => {
      try {
        await chrome.tabs.sendMessage(tabId, {
          action: "browseProductCompaniesProgress",
          ...data,
        });
      } catch (err) {
        console.warn(`[BG] browseProductCompanies notifyTab(${tabId}) failed:`, err, data);
      }
    };

    let totalImported = 0;
    let pagesSaved = 0;
    const errors: Array<{ page: number; message: string }> = [];
    const seenUrls = new Set<string>();
    let savePromise: Promise<void> = Promise.resolve();

    const progressListener = (msg: unknown) => {
      const m = msg as {
        action?: string;
        currentPage?: number;
        totalPages?: number;
        collected?: number;
      };
      if (m?.action === "productSearchPaginationProgress") {
        notifyTab({
          status: `Page ${m.currentPage}/${m.totalPages} — ${m.collected ?? 0} collected`,
          currentPage: m.currentPage,
          totalPages: m.totalPages,
        });
      }
    };
    chrome.runtime.onMessage.addListener(progressListener);

    const savePageListener = (msg: unknown) => {
      const m = msg as {
        action?: string;
        pageNumber?: number;
        totalPages?: number;
        companies?: Array<{ name?: string; linkedin_url?: string }>;
      };
      if (m?.action !== "saveCompanyBatchFromProducts") return;

      const pageNumber = m.pageNumber ?? 0;
      const totalPages = m.totalPages ?? 0;
      const pageCompanies = m.companies ?? [];

      const batch = pageCompanies
        .filter((c) => !!c.name && !!c.linkedin_url)
        .filter((c) => {
          if (seenUrls.has(c.linkedin_url!)) return false;
          seenUrls.add(c.linkedin_url!);
          return true;
        })
        .map((c) => ({
          name: c.name!,
          linkedin_url: c.linkedin_url!,
          ...(serviceTaxonomy.length > 0 ? { service_taxonomy: serviceTaxonomy } : {}),
        }));

      savePromise = savePromise.then(async () => {
        if (batch.length === 0) {
          pagesSaved++;
          return;
        }
        try {
          const imported = await saveCompanyBatch(batch);
          totalImported += imported;
          pagesSaved++;
          await notifyTab({
            status: `Page ${pageNumber}/${totalPages} — ${totalImported} imported`,
            currentPage: pageNumber,
            totalPages,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          errors.push({ page: pageNumber, message });
          console.warn(`[BG] product page ${pageNumber} save failed:`, err);
          await notifyTab({
            status: `Page ${pageNumber} save failed: ${message}`,
            currentPage: pageNumber,
            totalPages,
          });
        }
      });
    };
    chrome.runtime.onMessage.addListener(savePageListener);

    (async () => {
      startKeepAlive();
      try {
        await notifyTab({ status: "Checking pagination..." });

        const r = await chrome.tabs
          .sendMessage(tabId, { action: "extractCompaniesFromProductsWithPagination" })
          .catch((err) => ({ success: false, error: err?.message ?? String(err) }));

        if (!r?.success) {
          await notifyTab({ error: r?.error || "Product scrape failed" });
          return;
        }

        await savePromise;

        const totalPages = (r.totalPages as number) ?? 0;
        const pagesScraped = (r.pagesScraped as number) ?? pagesSaved;
        const pageFailures = (r.pageFailures ?? []) as Array<{
          page: number;
          reason: string;
        }>;
        for (const pf of pageFailures) {
          errors.push({ page: pf.page, message: pf.reason });
        }

        if (totalImported === 0 && errors.length === 0) {
          await notifyTab({ error: "No companies found across product pages" });
          return;
        }

        // ── Phase 2: deep scrape each company ─────────────────────────
        // For every unique LinkedIn company URL we collected, open a hidden
        // background tab on /about/, run extractCompanyData, and re-upsert
        // with rich fields (website, description, industry, size, location).
        // importCompanies does onConflictDoUpdate on companies.key, so this
        // enriches the lite rows we already wrote in Phase 1.
        const urls = Array.from(seenUrls);
        await notifyTab({
          status: `Deep scraping 0/${urls.length}...`,
          currentPage: pagesScraped,
          totalPages,
        });

        let deepScraped = 0;
        let deepEnriched = 0;
        let consecutiveEmpty = 0;
        const RATE_LIMIT_THRESHOLD = 5;
        let abortedByRateLimit = false;
        const deepBatch: Array<CompanyImportBatchInput> = [];

        const flushDeepBatch = async () => {
          if (deepBatch.length === 0) return;
          try {
            await saveCompanyBatch(deepBatch.splice(0));
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            errors.push({ page: 0, message: `deep-batch-save: ${message}` });
            console.warn("[BG] deep-batch save failed:", err);
          }
        };

        // Auth-wall heuristic — LinkedIn redirects to a sign-in shell when the
        // session is invalid or rate-limited; we'd otherwise save "Sign in" as
        // a company name from extractCompanyData's <h1> fallback.
        const isAuthWallName = (name: string): boolean => {
          const n = name.trim().toLowerCase();
          return (
            n === "sign in" ||
            n === "join linkedin" ||
            n === "linkedin" ||
            n.startsWith("sign in to ") ||
            n.startsWith("join linkedin")
          );
        };

        // Strip /about/, /life/, /jobs/, locale suffixes — keep the canonical
        // /company/<slug>/ form so the lite save and deep save agree on URL.
        const canonicalCompanyUrl = (raw: string, fallback: string): string => {
          try {
            const u = new URL(raw, "https://www.linkedin.com");
            const m = u.pathname.match(/^\/company\/([^/]+)/);
            if (m) return `https://www.linkedin.com/company/${m[1]}/`;
          } catch { /* fall through */ }
          return fallback;
        };

        for (const url of urls) {
          const aboutUrl = url.replace(/\/$/, "") + "/about/";
          let scrapeTabId: number | null = null;
          try {
            const tab = await chrome.tabs.create({ url: aboutUrl, active: false });
            scrapeTabId = tab.id ?? null;
            if (!scrapeTabId) throw new Error("Failed to open scrape tab");

            await waitForTabLoad(scrapeTabId, 25000);
            await randomDelay(2000);
            await clickSeeMore(scrapeTabId);
            await randomDelay(500);

            const data = await extractCompanyData(scrapeTabId);
            if (data && data.name && !isAuthWallName(data.name)) {
              const descriptionParts = [
                data.description,
                data.industry ? `Industry: ${data.industry}` : "",
                data.size ? `Size: ${data.size}` : "",
              ].filter(Boolean);

              deepBatch.push({
                name: data.name,
                website: data.website || undefined,
                linkedin_url: canonicalCompanyUrl(data.linkedinUrl ?? "", url),
                description: descriptionParts.join("\n") || undefined,
                location: data.location || undefined,
                industry: data.industry || undefined,
                ...(serviceTaxonomy.length > 0
                  ? { service_taxonomy: serviceTaxonomy }
                  : {}),
              });
              deepEnriched++;
              consecutiveEmpty = 0;
            } else {
              consecutiveEmpty++;
              if (data?.name && isAuthWallName(data.name)) {
                console.warn(`[BG] auth-wall detected for ${url} — name="${data.name}"`);
              }
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            errors.push({ page: 0, message: `deep-scrape ${url}: ${message}` });
            console.warn(`[BG] deep-scrape failed for ${url}:`, err);
            consecutiveEmpty++;
          } finally {
            if (scrapeTabId !== null) {
              await chrome.tabs.remove(scrapeTabId).catch(() => {});
            }
          }

          deepScraped++;
          await notifyTab({
            status: `Deep scraping ${deepScraped}/${urls.length} — ${deepEnriched} enriched`,
            currentPage: pagesScraped,
            totalPages,
          });

          if (deepBatch.length >= 10) {
            await flushDeepBatch();
          }

          // Circuit breaker: 5 empties in a row almost always means LinkedIn
          // is serving a challenge/auth wall. Aborting beats burning through
          // 200 more pointless tab opens.
          if (consecutiveEmpty >= RATE_LIMIT_THRESHOLD) {
            abortedByRateLimit = true;
            errors.push({
              page: 0,
              message: `rate-limit suspected — ${consecutiveEmpty} consecutive empty scrapes, aborting at ${deepScraped}/${urls.length}`,
            });
            console.warn(
              `[BG] aborting Phase 2 after ${consecutiveEmpty} consecutive empty scrapes`,
            );
            break;
          }

          await randomDelay(800);
        }

        await flushDeepBatch();

        const finishedAt = Date.now();
        const donePayload = {
          done: true,
          pagesScraped,
          pagesTotal: totalPages,
          pagesFailed: pageFailures.length,
          inserted: totalImported,
          deepScraped,
          deepEnriched,
          abortedByRateLimit,
          skipped: 0,
          errors,
          startedAt,
          finishedAt,
          durationMs: finishedAt - startedAt,
          status: abortedByRateLimit
            ? `⚠ Rate-limited at ${deepScraped}/${urls.length} — Imported ${totalImported}, Enriched ${deepEnriched}`
            : errors.length > 0
              ? `Pages ${pagesScraped}/${totalPages} — Imported ${totalImported}, Enriched ${deepEnriched}/${urls.length}, Errors ${errors.length}`
              : `Imported ${totalImported}, Enriched ${deepEnriched}/${urls.length} (${pagesScraped} pages)`,
        };
        console.log("[BG] browseProductCompanies done", JSON.stringify(donePayload));
        await notifyTab(donePayload);
      } catch (err) {
        await notifyTab({ error: err instanceof Error ? err.message : String(err) });
      } finally {
        chrome.runtime.onMessage.removeListener(progressListener);
        chrome.runtime.onMessage.removeListener(savePageListener);
        stopKeepAlive();
      }
    })();

    return true;
  }

  return false;
});
