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

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface GqlResponse {
  data?: any;
  errors?: Array<{ message: string; locations?: unknown[]; path?: string[] }>;
}

export async function gqlRequest(
  query: string,
  variables: Record<string, unknown>,
  timeoutMs = 30_000,
): Promise<GqlResponse> {
  const sessionToken = await getSessionCookie();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (sessionToken) {
    headers["Authorization"] = `Bearer ${sessionToken}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(`GraphQL request timed out after ${timeoutMs}ms`), timeoutMs);

  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  if (!res.ok) {
    throw new Error(`GraphQL HTTP error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
