console.log("background script loaded");

// ── Dev hot-reload via WebSocket ──────────────────────────────────────
if (import.meta.env.DEV) {
  const connect = () => {
    const ws = new WebSocket("ws://localhost:35729");
    ws.onmessage = (event) => {
      if (event.data === "reload") {
        console.log("[dev-reload] Reloading extension…");
        chrome.runtime.reload();
      }
    };
    ws.onclose = () => {
      // Reconnect after 2s if server restarts
      setTimeout(connect, 5000);
    };
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

async function graphqlMutation(
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
  console.log("Background received message:", message);

  // Handle pagination progress updates
  if (message.action === "paginationProgress") {
    console.log(
      `Pagination progress: Page ${message.currentPage}/${message.totalPages}, Jobs: ${message.jobsCollected}`,
    );
    return false;
  }

  // ── Get Blocked Companies ──
  if (message.action === "getBlockedCompanies") {
    graphqlMutation(
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

  // ── Block Company ──
  if (message.action === "blockCompany") {
    const { companyName } = message;
    graphqlMutation(
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
