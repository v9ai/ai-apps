// Background service worker

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
          "https://*.greenhouse.io/*",
          "https://*.lever.co/*",
          "https://www.founderio.com/*",
          "https://*.workable.com/*",
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

// ── GraphQL config ────────────────────────────────────────────────────
const GRAPHQL_URL =
  import.meta.env.VITE_GRAPHQL_URL || "http://localhost:3004/api/graphql";

async function getSessionCookie(): Promise<string | undefined> {
  try {
    const cookie = await chrome.cookies.get({
      url: GRAPHQL_URL,
      name: "better-auth.session_token",
    });
    return cookie?.value;
  } catch {
    return undefined;
  }
}

async function gqlRequest(
  query: string,
  variables: Record<string, unknown>,
) {
  const sessionToken = await getSessionCookie();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (sessionToken) {
    headers["Authorization"] = `Bearer ${sessionToken}`;
  }

  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "paginationProgress") return false;

  // ── Get Blocked Companies ──
  if (message.action === "getBlockedCompanies") {
    gqlRequest(
      `query { blockedCompanies { id name } }`,
      {},
    )
      .then((data) => {
        if (data.errors) {
          sendResponse({ success: false, error: data.errors[0].message });
        } else {
          sendResponse({ success: true, companies: data.data.blockedCompanies });
        }
      })
      .catch((err) => {
        sendResponse({ success: false, error: String(err) });
      });
    return true;
  }

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

  // ── Block Company ──
  if (message.action === "blockCompany") {
    const { companyName } = message;
    gqlRequest(
      `mutation BlockCompany($name: String!, $reason: String) {
        blockCompany(name: $name, reason: $reason) { id name }
      }`,
      { name: companyName, reason: "Blocked from LinkedIn via extension" },
    )
      .then((data) => {
        if (data.errors) {
          console.error("[blockCompany] GQL error:", data.errors[0].message);
          sendResponse({ success: false, error: data.errors[0].message });
        } else {
          console.log("[blockCompany] Blocked:", data.data.blockCompany.name);
          sendResponse({ success: true, data: data.data.blockCompany });
        }
      })
      .catch((err) => {
        console.error("[blockCompany] Fetch error:", err);
        sendResponse({ success: false, error: String(err) });
      });
    return true; // keep channel open for async response
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
    browseProfiles(tabId, profiles, returnUrl);
    return true;
  }

  // ── Stop Profile Browsing ──
  if (message.action === "stopProfileBrowsing") {
    browseCancelled = true;
    sendResponse({ success: true });
    return true;
  }

  // ── Analyze Company ──
  if (message.action === "analyzeCompany") {
    const { companyName, website } = message as { companyName?: string; website?: string };

    // First, find the company
    gqlRequest(
      `query FindCompany($name: String, $website: String) {
        findCompany(name: $name, website: $website) { found company { id key name } }
      }`,
      { name: companyName || undefined, website: website || undefined },
    )
      .then(async (findResult) => {
        if (findResult.errors) {
          sendResponse({ success: false, error: findResult.errors[0].message });
          return;
        }
        const { found, company } = findResult.data.findCompany;
        if (!found || !company) {
          sendResponse({ success: false, error: `Company not found: ${companyName || website}` });
          return;
        }

        // Trigger analysis
        const analyzeResult = await gqlRequest(
          `mutation AnalyzeCompany($id: Int) {
            analyzeCompany(id: $id) { success message companyId companyKey }
          }`,
          { id: company.id },
        );

        if (analyzeResult.errors) {
          sendResponse({ success: false, error: analyzeResult.errors[0].message });
        } else {
          sendResponse({
            success: analyzeResult.data.analyzeCompany.success,
            message: analyzeResult.data.analyzeCompany.message,
            company,
          });
        }
      })
      .catch((err) => {
        sendResponse({ success: false, error: String(err) });
      });
    return true;
  }

  return false;
});

// ── Profile Browsing Engine ──────────────────────────────────────────

let browseCancelled = false;

function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const listener = (
      updatedTabId: number,
      changeInfo: { status?: string },
    ) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    // Timeout after 15s in case page never fully loads
    setTimeout(() => {
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
    await chrome.tabs.update(tabId, { url: profileUrl });
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
