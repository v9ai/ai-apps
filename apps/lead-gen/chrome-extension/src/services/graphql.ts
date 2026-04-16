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
  // Extract operation name for logging
  const opMatch = query.match(/(?:query|mutation)\s+(\w+)/);
  const operationName = opMatch?.[1] ?? "anonymous";

  const sessionToken = await getSessionCookie();
  if (!sessionToken) {
    console.warn(`[GQL] ${operationName} — no session token, request will be unauthenticated`);
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (sessionToken) {
    headers["Authorization"] = `Bearer ${sessionToken}`;
  }

  console.log(`[GQL] ${operationName} → ${GRAPHQL_URL}`);
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
    // Try to read the response body — servers often put the real failure
    // reason (stack trace, GraphQL error message, Vercel error page) there.
    let bodySnippet = "";
    try {
      const bodyText = await res.text();
      bodySnippet = bodyText.slice(0, 500);
    } catch { /* ignore */ }
    const errMsg = `${operationName} — HTTP ${res.status} ${res.statusText}${bodySnippet ? `: ${bodySnippet}` : ""}`;
    console.error(`[GQL] ${errMsg}`);
    throw new Error(errMsg);
  }

  const json: GqlResponse = await res.json();
  if (json.errors?.length) {
    console.warn(`[GQL] ${operationName} — GraphQL errors:`, json.errors.map(e => e.message).join("; "));
  }
  return json;
}
