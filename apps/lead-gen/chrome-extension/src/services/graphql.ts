/**
 * Shared GraphQL client for the Chrome extension.
 * Used by both the background service worker and service modules (post-scraper, etc.)
 */

export const GRAPHQL_URL =
  import.meta.env.VITE_GRAPHQL_URL || "http://localhost:3004/api/graphql";

export async function getSessionCookie(): Promise<string | undefined> {
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

export async function gqlRequest(
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
