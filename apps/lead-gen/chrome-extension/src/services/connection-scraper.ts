/**
 * Fetches LinkedIn connections via the Voyager API (paginated).
 * Much faster than DOM infinite scroll — handles 17K+ connections in ~2-3 minutes.
 */

import { postsCancelled } from "./post-scraper";

export interface ScrapedConnection {
  firstName: string;
  lastName: string;
  linkedinUrl: string;
  position: string | null;
}

const CONNECTIONS_API =
  "https://www.linkedin.com/voyager/api/relationships/dash/connections";
const DECORATION_ID =
  "com.linkedin.voyager.dash.deco.web.mynetwork.ConnectionListWithProfile-16";
const PAGE_SIZE = 40;
const REQUEST_DELAY_MS = 300; // 300ms between requests to avoid throttling

/**
 * Read LinkedIn's CSRF token from the JSESSIONID cookie.
 * The Voyager API requires this as a `csrf-token` header.
 */
async function getCsrfToken(): Promise<string> {
  const cookie = await chrome.cookies.get({
    url: "https://www.linkedin.com",
    name: "JSESSIONID",
  });
  if (!cookie?.value) {
    throw new Error("Not logged into LinkedIn — JSESSIONID cookie not found");
  }
  // LinkedIn stores the JSESSIONID wrapped in quotes: "ajax:123456..."
  return cookie.value.replace(/^"|"$/g, "");
}

/**
 * Fetch a single page of connections from the Voyager API.
 */
async function fetchConnectionsPage(
  csrfToken: string,
  start: number,
): Promise<{
  elements: Array<{
    firstName: string;
    lastName: string;
    publicIdentifier: string;
    headline: string | null;
  }>;
  total: number;
}> {
  const url = new URL(CONNECTIONS_API);
  url.searchParams.set("decorationId", DECORATION_ID);
  url.searchParams.set("count", String(PAGE_SIZE));
  url.searchParams.set("start", String(start));
  url.searchParams.set("q", "search");
  url.searchParams.set("sortType", "RECENTLY_ADDED");

  const res = await fetch(url.toString(), {
    headers: {
      "csrf-token": csrfToken,
      "x-restli-protocol-version": "2.0.0",
      Accept: "application/vnd.linkedin.normalized+json+2.1",
    },
    credentials: "include",
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("LinkedIn session expired — please log in again");
  }
  if (res.status === 429) {
    throw new Error("LinkedIn rate limit hit — try again in a few minutes");
  }
  if (!res.ok) {
    throw new Error(`Voyager API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  // The Voyager response nests connection data in `included` or `elements`
  // depending on the decoration. Parse both shapes.
  const total = data?.paging?.total ?? data?.data?.paging?.total ?? 0;

  const elements: Array<{
    firstName: string;
    lastName: string;
    publicIdentifier: string;
    headline: string | null;
  }> = [];

  // Shape 1: normalized response with `included` array
  if (Array.isArray(data.included)) {
    for (const item of data.included) {
      // Profile entities have a $type containing "Profile" and a publicIdentifier
      if (
        item.publicIdentifier &&
        typeof item.firstName === "string" &&
        typeof item.lastName === "string"
      ) {
        elements.push({
          firstName: item.firstName,
          lastName: item.lastName,
          publicIdentifier: item.publicIdentifier,
          headline: item.headline ?? null,
        });
      }
    }
  }

  // Shape 2: direct `elements` array with nested connectedMember
  if (elements.length === 0 && Array.isArray(data.elements)) {
    for (const el of data.elements) {
      const member =
        el.connectedMember ||
        el.connectedMemberResolutionResult ||
        el;
      if (
        member.publicIdentifier &&
        typeof member.firstName === "string"
      ) {
        elements.push({
          firstName: member.firstName,
          lastName: member.lastName ?? "",
          publicIdentifier: member.publicIdentifier,
          headline: member.headline ?? null,
        });
      }
    }
  }

  return { elements, total };
}

/**
 * Fetch ALL LinkedIn connections via paginated Voyager API calls.
 * Reports progress via callback. Respects `postsCancelled` flag.
 */
export async function fetchAllConnections(
  onProgress?: (fetched: number, total: number | null) => void,
): Promise<ScrapedConnection[]> {
  const csrfToken = await getCsrfToken();
  const seen = new Set<string>();
  const connections: ScrapedConnection[] = [];
  let start = 0;
  let total: number | null = null;

  while (true) {
    if (postsCancelled) break;

    const page = await fetchConnectionsPage(csrfToken, start);

    if (total === null && page.total > 0) {
      total = page.total;
    }

    if (page.elements.length === 0) break;

    for (const el of page.elements) {
      const url = `https://www.linkedin.com/in/${el.publicIdentifier}/`;
      if (seen.has(url)) continue;
      seen.add(url);

      connections.push({
        firstName: el.firstName,
        lastName: el.lastName,
        linkedinUrl: url,
        position: el.headline,
      });
    }

    onProgress?.(connections.length, total);

    start += PAGE_SIZE;
    if (total !== null && start >= total) break;

    // Rate limit
    await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
  }

  return connections;
}
