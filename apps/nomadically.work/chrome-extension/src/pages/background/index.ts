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

    if (!emails.length) {
      sendResponse({ success: false, error: "No email found in post" });
      return true;
    }

    (async () => {
      try {
        const sessionToken = await getSessionCookie();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (sessionToken) {
          headers["Authorization"] = `Bearer ${sessionToken}`;
        }

        // Step 1: Generate email via LangGraph pipeline (REST)
        const API_BASE = GRAPHQL_URL.replace("/api/graphql", "");
        const genRes = await fetch(`${API_BASE}/api/email-outreach/generate`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            recipientName: authorName || "there",
            recipientRole: authorSubtitle || undefined,
            postText: postText.slice(0, 2000),
            postUrl,
            recipientEmail: emails[0],
            tone: "professional and friendly",
          }),
        });

        if (!genRes.ok) {
          const err = await genRes.json().catch(() => ({ error: "Generation failed" }));
          sendResponse({ success: false, error: err.error || `HTTP ${genRes.status}` });
          return;
        }

        const { subject, html, text } = await genRes.json();

        // Step 2: Send the email via GraphQL
        const sendResult = await gqlRequest(
          `mutation SendEmail($input: SendEmailInput!) {
            sendEmail(input: $input) { success id error }
          }`,
          {
            input: {
              to: emails[0],
              subject,
              html,
              text,
            },
          },
        );

        if (sendResult.errors) {
          sendResponse({ success: false, error: sendResult.errors[0].message });
          return;
        }

        const { success, error: sendError } = sendResult.data.sendEmail;
        if (success) {
          console.log(`[sendEmail] Sent to ${emails[0]} re: ${subject}`);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: sendError || "Send failed" });
        }
      } catch (err) {
        console.error("[sendEmail] Error:", err);
        sendResponse({ success: false, error: String(err) });
      }
    })();
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

  return false;
});
