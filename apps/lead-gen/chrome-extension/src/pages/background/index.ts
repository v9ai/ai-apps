// Background service worker — message listener & orchestrator
import { browseContactPosts, scrapeAllPosts, cancelPostScraping, scrapeJobSearchPosts, runUnifiedPipeline, scrapeRecruiterPosts, scrapeContactPostsSingle } from "../../services/post-scraper";
import { gqlRequest } from "../../services/graphql";
import { importJobsToD1, type D1JobInput } from "../../services/jobs-d1-importer";
import { startKeepAlive, stopKeepAlive, waitForTabLoad, clickSeeMore, randomDelay } from "./tab-utils";
import { browseProfiles, setBrowseCancelled, extractFullProfileData, parseName, parseHeadline } from "./profile-browsing";
import { browseCompanies, setCompanyCancelled } from "./company-browsing";
import { browsePeople, importPeopleFromCurrentPage, setPeopleCancelled } from "./people-scraping";
import { findRelatedCompanies, setFindRelatedCancelled } from "./find-related";
import { scrapeCompanyFull, setCompanyScraperCancelled } from "./company-scraper";
import { scrapePeoplePostsFromCompanyPage, setPeoplePostsCancelled } from "./people-posts-scraper";

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
    setBrowseCancelled(true);
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
        const { position } = parseHeadline(profileData.headline);
        const companyName = profileData.currentCompany;

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
            status: `Imported: ${profileData.name}${companyName ? " at " + companyName : ""}`,
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
    if (!tabId) {
      sendResponse({ success: false, error: "No tab ID" });
      return true;
    }
    sendResponse({ success: true });

    const singlePage = !!(message as { singlePage?: boolean }).singlePage;

    const notifyTab = async (data: Record<string, unknown>) => {
      try {
        await chrome.tabs.sendMessage(tabId, { action: "importAllProgress", ...data });
      } catch { /* tab closed */ }
    };

    // Running totals for multi-page mode. Reported in the final `done` msg.
    let totalInserted = 0;
    let totalSkipped = 0;
    let totalReceived = 0;
    let pagesSaved = 0;
    let lastSaveError: string | null = null;
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

      savePromise = savePromise.then(async () => {
        if (payload.length === 0) {
          pagesSaved++;
          return;
        }
        const result = await importJobsToD1(payload);
        totalReceived += payload.length;
        if (result.ok) {
          totalInserted += result.inserted;
          totalSkipped += result.skipped;
          pagesSaved++;
          await notifyTab({
            status: `Page ${pageNumber}/${totalPages} — ${totalInserted} imported / ${totalSkipped} skipped`,
            currentPage: pageNumber,
            totalPages,
          });
        } else {
          lastSaveError = result.error || "Save failed";
          await notifyTab({
            status: `Page ${pageNumber} save failed: ${lastSaveError}`,
            currentPage: pageNumber,
            totalPages,
          });
        }
      }).catch((err) => {
        lastSaveError = err instanceof Error ? err.message : String(err);
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

          if (totalReceived === 0) {
            await notifyTab({ error: lastSaveError || "No job cards found across pages" });
            return;
          }

          const pagesScraped = r.pagesScraped ?? pagesSaved;
          await notifyTab({
            done: true,
            inserted: totalInserted,
            skipped: totalSkipped,
            total: totalReceived,
            pagesScraped,
            status: lastSaveError
              ? `Imported ${totalInserted} / errors: ${lastSaveError}`
              : `Imported ${totalInserted} / skipped ${totalSkipped} (${pagesScraped} pages)`,
          });
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
          await notifyTab({ error: result.error || "D1 import failed" });
          return;
        }

        await notifyTab({
          done: true,
          inserted: result.inserted,
          skipped: result.skipped,
          total: result.total,
          pagesScraped: scraped.pagesScraped,
          status: `Imported ${result.inserted} / skipped ${result.skipped} (${scraped.pagesScraped} pages)`,
        });
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
