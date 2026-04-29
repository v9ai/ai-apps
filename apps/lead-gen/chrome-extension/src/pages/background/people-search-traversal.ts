// ── Cross-page People Search Traversal ──────────────────────────────
//
// Drives PaginationManager + voyager-people-search to collect every
// profile a /search/results/people/ query returns (up to LinkedIn's ~1000
// cap), filters to remote-friendly hits, then hands the deduped URL list
// to the existing browseProfiles() engine for per-profile enrichment +
// CRM save.

import { PaginationManager } from "../../lib/pagination-manager";
import {
  peopleSearchEndpoint,
  type PersonHit,
} from "../../lib/voyager-people-search";
import { browseProfiles } from "./profile-browsing";
import { GRAPHQL_URL } from "../../services/graphql";

// ── Remote-only filtering ─────────────────────────────────────────────
//
// Lead-gen scope is remote-global (see CLAUDE.md). The traversal refuses
// to run unless the user's search URL has at least one remote signal in
// keywords, and individual hits are dropped if their headline carries an
// explicit on-site/hybrid-only signal.

const REMOTE_KEYWORD_PATTERNS = [
  /\bremote\b/i,
  /\bfully[\s-]?remote\b/i,
  /\bwfh\b/i,
  /\banywhere\b/i,
  /\bdistributed\b/i,
  /\bremoto\b/i,
];

const ANTI_REMOTE_HEADLINE_PATTERNS = [
  /\bon[\s-]?site\s+only\b/i,
  /\bonsite\s+only\b/i,
  /\bin[\s-]?office\s+only\b/i,
  /\bhybrid\s+only\b/i,
  /\bno\s+remote\b/i,
];

function searchUrlHasRemoteSignal(searchUrl: string): boolean {
  try {
    const url = new URL(searchUrl);
    const keywords = url.searchParams.get("keywords") ?? "";
    return REMOTE_KEYWORD_PATTERNS.some((re) => re.test(keywords));
  } catch {
    return false;
  }
}

function isRemoteFriendly(hit: PersonHit): boolean {
  return !ANTI_REMOTE_HEADLINE_PATTERNS.some((re) => re.test(hit.headline));
}

// ── Web-app progress channel ──────────────────────────────────────────
//
// Mirrors the notifyWebApp() helper in people-scraping.ts but kept local
// to avoid a circular import.

async function notifyWebApp(action: string, data: Record<string, unknown>) {
  try {
    const appOrigin = new URL(GRAPHQL_URL).origin;
    const tabs = await chrome.tabs.query({ url: [`${appOrigin}/*`] });
    for (const tab of tabs) {
      if (!tab.id) continue;
      chrome.tabs
        .sendMessage(tab.id, { source: "lead-gen-bg", action, ...data })
        .catch(() => {});
    }
  } catch {
    // ignore
  }
}

async function notifyContent(tabId: number, message: Record<string, unknown>) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {
    // tab may have navigated away — fall through
  }
}

// ── Public entry point ────────────────────────────────────────────────

export async function traverseAllSearchPages(
  tabId: number,
  searchUrl: string,
): Promise<void> {
  if (!searchUrlHasRemoteSignal(searchUrl)) {
    const error =
      "Add 'remote' (or fully-remote / wfh / anywhere) to your LinkedIn search keywords first — lead-gen targets remote-global only.";
    console.warn(`[TraverseAll] Refusing to run: ${error}`);
    await notifyContent(tabId, { action: "browseDone", saved: 0, error });
    await notifyWebApp("peopleScrapeError", { error });
    return;
  }

  const config = peopleSearchEndpoint(searchUrl);
  const manager = new PaginationManager<PersonHit>(config);

  let result;
  try {
    await notifyWebApp("peopleScrapeProgress", {
      message: "Paginating LinkedIn search…",
    });
    result = await manager.fetchAll((progress) => {
      const total = progress.reportedTotal ?? "?";
      console.log(
        `[TraverseAll] page ${progress.page} — ${progress.collected}/${total} collected`,
      );
      void notifyWebApp("peopleScrapeProgress", {
        message: `Paginating… ${progress.collected}/${total}`,
      });
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[TraverseAll] Pagination failed:", errMsg);
    await notifyContent(tabId, {
      action: "browseDone",
      saved: 0,
      error: errMsg,
    });
    await notifyWebApp("peopleScrapeError", { error: errMsg });
    return;
  }

  const remoteFriendly = result.items.filter(isRemoteFriendly);
  const dropped = result.items.length - remoteFriendly.length;
  console.log(
    `[TraverseAll] Collected ${result.items.length} hits (${result.pagesFetched} pages, ${result.duplicatesFiltered} dupes, ${result.rateLimitRetries} rate-limit retries). Remote-filtered: kept ${remoteFriendly.length}, dropped ${dropped}.`,
  );

  if (remoteFriendly.length === 0) {
    const error =
      result.items.length === 0
        ? "No profiles returned. Refresh the SEARCH_CLUSTERS_QUERY_ID in voyager-people-search.ts (LinkedIn rotates it) or verify you are signed in."
        : `All ${result.items.length} profiles were filtered as non-remote. Refine your LinkedIn search.`;
    await notifyContent(tabId, { action: "browseDone", saved: 0, error });
    await notifyWebApp("peopleScrapeError", { error });
    return;
  }

  if (result.hitDepthCap) {
    console.warn(
      `[TraverseAll] Hit LinkedIn's ${config.maxDepth}-result cap — narrow the query for full coverage.`,
    );
  }

  const profileUrls = remoteFriendly.map((hit) => hit.profileUrl);
  await notifyWebApp("peopleScrapeProgress", {
    message: `Visiting ${profileUrls.length} remote profiles…`,
  });

  // Hand off to the existing engine — it owns navigation, dwell timing,
  // auth-wall detection, and createContact persistence.
  await browseProfiles(tabId, profileUrls, searchUrl);
}
