/**
 * Post scraping orchestration service.
 * Navigates LinkedIn profiles, extracts posts, sends to local Rust/LanceDB server.
 *
 * Two entry points:
 *   browseContactPosts(tabId) — scrape posts for DB contacts only (legacy)
 *   scrapeAllPosts(tabId)     — fetch connections via API + import + scrape posts for all
 */

// These functions run in page context via chrome.scripting.executeScript.
// They MUST NOT be imported at module level because this file is bundled
// into the service worker where window/document don't exist.
// Instead, we inline them directly in the executeScript calls below.

import { fetchAllConnections, type ScrapedConnection } from "./connection-scraper";
import { gqlRequest } from "./graphql";

const RUST_SERVER = "http://localhost:9876";

// ── Types ──

interface ScrapedContact {
  id: number;
  firstName: string;
  lastName: string;
  linkedinUrl: string;
  company: string | null;
  position: string | null;
}

interface ScrapedPost {
  post_url: string | null;
  post_text: string | null;
  posted_date: string | null;
  reactions_count: number;
  comments_count: number;
  reposts_count: number;
  media_type: string;
  is_repost: boolean;
  original_author: string | null;
}

interface ScrapedLike {
  post_url: string | null;
  post_text: string | null;
  post_author_name: string | null;
  post_author_url: string | null;
  liked_date: string | null;
}


// ── State ──

export let postsCancelled = false;

export function cancelPostScraping() {
  postsCancelled = true;
}

// ── Tab helpers ──

function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const listener = (id: number, info: { status?: string }) => {
      if (id === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, 15000);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function randomDelay(min: number, max: number): Promise<void> {
  return sleep(min + Math.random() * (max - min));
}

// ── Fetch contacts from Rust server (which queries Neon directly) ──

async function fetchContactsWithLinkedIn(): Promise<ScrapedContact[]> {
  const res = await fetch(`${RUST_SERVER}/contacts`);
  if (!res.ok) throw new Error(`Failed to fetch contacts: ${res.status}`);

  const contacts: Array<{
    id: number;
    first_name: string;
    last_name: string;
    linkedin_url: string;
    company: string | null;
    position: string | null;
  }> = await res.json();

  const mapped = contacts.map((c) => ({
    id: c.id,
    firstName: c.first_name,
    lastName: c.last_name,
    linkedinUrl: c.linkedin_url,
    company: c.company,
    position: c.position,
  }));

  console.log(`[PostScraper] Fetched ${mapped.length} contacts from Rust server`);
  return mapped;
}

// ── Check Rust server health ──

export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${RUST_SERVER}/stats`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function getServerStats(): Promise<{
  contacts: number;
  posts: number;
} | null> {
  try {
    const res = await fetch(`${RUST_SERVER}/stats`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── Post to Rust server ──

interface PostResult {
  inserted: number;
  filtered: number;
}

async function postPosts(
  contactId: number,
  posts: ScrapedPost[],
): Promise<PostResult> {
  const res = await fetch(`${RUST_SERVER}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contact_id: contactId, posts }),
  });

  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  const data = await res.json();
  return { inserted: data.inserted, filtered: data.filtered || 0 };
}

// ── Post likes to Rust server ──

async function postLikes(
  contactId: number,
  likes: ScrapedLike[],
): Promise<{ inserted: number }> {
  const res = await fetch(`${RUST_SERVER}/likes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contact_id: contactId, likes }),
  });

  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  const data = await res.json();
  return { inserted: data.inserted };
}

// ── Extract likes from a reactions activity page ──

async function scrollAndExtractLikes(
  tabId: number,
): Promise<ScrapedLike[]> {
  // Scroll until no new content loads
  let previousHeight = 0;
  let staleCount = 0;

  while (staleCount < 3) {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        window.scrollTo(0, document.body.scrollHeight);
        return document.body.scrollHeight;
      },
    });
    const currentHeight = results?.[0]?.result ?? 0;
    await sleep(2000);

    if (currentHeight === previousHeight) {
      staleCount++;
    } else {
      staleCount = 0;
    }
    previousHeight = currentHeight;
  }

  // Extract liked posts
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: () => {
      const likes: Array<{
        postUrl: string | null;
        postText: string | null;
        postAuthorName: string | null;
        postAuthorUrl: string | null;
        likedDate: string | null;
      }> = [];

      document.querySelectorAll(".feed-shared-update-v2, .occludable-update").forEach((postEl) => {
        // Skip ads
        if (postEl.querySelector(".feed-shared-update-v2__ad-badge")) return;
        if (postEl.querySelector('[data-test-id="feed-shared-update-v2__sponsored"]')) return;

        // Post text
        const textEl = postEl.querySelector(
          ".feed-shared-update-v2__description, .update-components-text, .feed-shared-text__text-view, .feed-shared-inline-show-more-text",
        );
        const postText = textEl?.textContent?.trim() || null;

        // Post author
        const authorEl = postEl.querySelector(".update-components-actor__name");
        const postAuthorName = authorEl?.textContent?.trim() || null;

        const authorLink = postEl.querySelector<HTMLAnchorElement>(
          ".update-components-actor__container-link, .update-components-actor__meta-link",
        );
        const postAuthorUrl = authorLink?.href || null;

        // Date
        const timeEl = postEl.querySelector("time");
        const likedDate = timeEl?.getAttribute("datetime") ||
          postEl.querySelector(".update-components-actor__sub-description")?.textContent?.trim() || null;

        // Post URL
        const urn = postEl.getAttribute("data-urn") || postEl.querySelector("[data-urn]")?.getAttribute("data-urn");
        let postUrl: string | null = null;
        if (urn) postUrl = `https://www.linkedin.com/feed/update/${urn}/`;

        likes.push({ postUrl, postText, postAuthorName, postAuthorUrl, likedDate });
      });

      return likes;
    },
  });

  const likes = results?.[0]?.result || [];
  return likes.map((l: any) => ({
    post_url: l.postUrl || null,
    post_text: l.postText || null,
    post_author_name: l.postAuthorName || null,
    post_author_url: l.postAuthorUrl || null,
    liked_date: l.likedDate || null,
  }));
}

// ── Scroll and extract posts from an activity page ──

async function scrollAndExtract(
  tabId: number,
): Promise<ScrapedPost[]> {
  // Click "see more" buttons first
  await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: () => {
      let clicked = 0;
      document.querySelectorAll<HTMLElement>("button, a").forEach((el) => {
        const text = el.textContent?.trim().toLowerCase() || "";
        if ((text === "see more" || text === "…see more" || text === "...see more") && el.offsetParent !== null) {
          el.click();
          clicked++;
        }
      });
      return clicked;
    },
  });
  await sleep(800);

  // Scroll until no new content loads
  let previousHeight = 0;
  let staleCount = 0;

  while (staleCount < 3) {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        window.scrollTo(0, document.body.scrollHeight);
        return document.body.scrollHeight;
      },
    });
    const currentHeight = results?.[0]?.result ?? 0;

    await sleep(2000);

    if (currentHeight === previousHeight) {
      staleCount++;
    } else {
      staleCount = 0;
    }
    previousHeight = currentHeight;

    // Click any new "see more" buttons that appeared
    await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        document.querySelectorAll<HTMLElement>("button, a").forEach((el) => {
          const text = el.textContent?.trim().toLowerCase() || "";
          if ((text === "see more" || text === "…see more" || text === "...see more") && el.offsetParent !== null) {
            el.click();
          }
        });
      },
    });
    await sleep(300);
  }

  // Extract all posts
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: () => {
      const posts: Array<{
        postUrl: string | null;
        postText: string;
        postedDate: string | null;
        reactionsCount: number;
        commentsCount: number;
        repostsCount: number;
        mediaType: string;
        isRepost: boolean;
        originalAuthor: string | null;
      }> = [];

      document.querySelectorAll(".feed-shared-update-v2, .occludable-update").forEach((postEl) => {
        if (postEl.querySelector(".feed-shared-update-v2__ad-badge")) return;
        if (postEl.querySelector('[data-test-id="feed-shared-update-v2__sponsored"]')) return;

        const textEl = postEl.querySelector(
          ".feed-shared-update-v2__description, .update-components-text, .feed-shared-text__text-view, .feed-shared-inline-show-more-text",
        );
        const postText = textEl?.textContent?.trim() || "";

        const timeEl = postEl.querySelector("time");
        const postedDate = timeEl?.getAttribute("datetime") ||
          postEl.querySelector(".update-components-actor__sub-description")?.textContent?.trim() || null;

        const reactionsEl = postEl.querySelector('.social-details-social-counts__reactions-count, [data-test-id="social-actions__reaction-count"]');
        const reactionsCount = parseInt((reactionsEl?.textContent || "0").replace(/[^0-9]/g, "")) || 0;

        const commentsBtn = Array.from(postEl.querySelectorAll("button, a")).find(
          (b) => /comment/i.test(b.textContent || "") && /\d/.test(b.textContent || ""),
        );
        const commentsCount = parseInt((commentsBtn?.textContent || "0").replace(/[^0-9]/g, "")) || 0;

        const repostsBtn = Array.from(postEl.querySelectorAll("button, a")).find(
          (b) => /repost/i.test(b.textContent || "") && /\d/.test(b.textContent || ""),
        );
        const repostsCount = parseInt((repostsBtn?.textContent || "0").replace(/[^0-9]/g, "")) || 0;

        let mediaType = "none";
        if (postEl.querySelector("video, .update-components-linkedin-video")) mediaType = "video";
        else if (postEl.querySelector(".update-components-article")) mediaType = "article";
        else if (postEl.querySelector(".update-components-document")) mediaType = "document";
        else if (postEl.querySelector(".update-components-poll")) mediaType = "poll";
        else if (postEl.querySelector(".feed-shared-image, .update-components-image, .ivm-image-view-model")) mediaType = "image";

        const headerEl = postEl.querySelector(".update-components-header__text-view, .update-components-header");
        const isRepost = /reposted/i.test(headerEl?.textContent || "");
        const originalAuthor = isRepost ? (postEl.querySelector(".update-components-actor__name")?.textContent?.trim() || null) : null;

        const urn = postEl.getAttribute("data-urn") || postEl.querySelector("[data-urn]")?.getAttribute("data-urn");
        let postUrl: string | null = null;
        if (urn) postUrl = `https://www.linkedin.com/feed/update/${urn}/`;

        posts.push({ postUrl, postText, postedDate, reactionsCount, commentsCount, repostsCount, mediaType, isRepost, originalAuthor });
      });

      return posts;
    },
  });

  const posts = results?.[0]?.result || [];
  return posts.map((p: any) => ({
    post_url: p.postUrl || null,
    post_text: p.postText || null,
    posted_date: p.postedDate || null,
    reactions_count: p.reactionsCount || 0,
    comments_count: p.commentsCount || 0,
    reposts_count: p.repostsCount || 0,
    media_type: p.mediaType || "none",
    is_repost: p.isRepost || false,
    original_author: p.originalAuthor || null,
  }));
}

// ── Main scraping loop ──

export async function browseContactPosts(tabId: number): Promise<void> {
  postsCancelled = false;

  // Check server
  const healthy = await checkServerHealth();
  if (!healthy) {
    sendProgress({ error: "Rust server not running on localhost:9876" });
    return;
  }

  // Fetch contacts
  sendProgress({ status: "Fetching contacts..." });
  const contacts = await fetchContactsWithLinkedIn();
  if (contacts.length === 0) {
    sendProgress({ error: "No contacts with LinkedIn URLs found" });
    return;
  }

  let totalPosts = 0;
  let totalFiltered = 0;

  for (let i = 0; i < contacts.length; i++) {
    if (postsCancelled) break;

    const contact = contacts[i];
    const name = `${contact.firstName} ${contact.lastName}`.trim();
    console.log(
      `[PostScraper] ${i + 1}/${contacts.length}: ${name} — ${contact.linkedinUrl}`,
    );

    sendProgress({
      current: i + 1,
      total: contacts.length,
      contactName: name,
      postsFound: totalPosts,
      postsFiltered: totalFiltered,
    });

    // Navigate to activity page
    const activityUrl = contact.linkedinUrl.replace(/\/$/, "") + "/recent-activity/all/";
    try {
      await chrome.tabs.update(tabId, { url: activityUrl });
    } catch {
      console.warn(`[PostScraper] Tab closed, aborting`);
      break;
    }
    await waitForTabLoad(tabId);
    await sleep(3000); // Wait for SPA render

    // Check if we landed on the right page (not a login wall or 404)
    try {
      const tabInfo = await chrome.tabs.get(tabId);
      if (!tabInfo.url?.includes("linkedin.com/in/")) {
        console.warn(`[PostScraper] Redirected away for ${name}, skipping`);
        await randomDelay(5000, 8000);
        continue;
      }
    } catch {
      break; // Tab gone
    }

    // Scroll and extract posts
    let posts: ScrapedPost[] = [];
    try {
      posts = await scrollAndExtract(tabId);
    } catch (err) {
      console.warn(`[PostScraper] Extraction failed for ${name}:`, err);
    }

    // Send posts to Rust server (scoring filters irrelevant ones)
    if (posts.length > 0) {
      try {
        const { inserted, filtered } = await postPosts(contact.id, posts);
        totalPosts += inserted;
        totalFiltered += filtered;
        console.log(
          `[PostScraper] ${name}: ${inserted} kept, ${filtered} filtered (${posts.length} scraped)`,
        );
      } catch (err) {
        console.error(`[PostScraper] Failed to save posts for ${name}:`, err);
      }
    } else {
      console.log(`[PostScraper] ${name}: no posts found`);
    }

    // Rate limiting delay
    if (i < contacts.length - 1) {
      await randomDelay(10000, 15000);
    }
  }

  sendProgress({
    done: true,
    totalContacts: contacts.length,
    totalPosts,
    totalFiltered,
  });

  console.log(
    `[PostScraper] Complete. ${totalPosts} kept, ${totalFiltered} filtered from ${contacts.length} contacts.`,
  );
}

// ── Progress messaging ──

function sendProgress(data: Record<string, unknown>) {
  try {
    chrome.runtime.sendMessage({
      action: "postScrapingProgress",
      ...data,
    });
  } catch {
    // Popup may not be open
  }
}

// ── Import connections directly via GraphQL (no self-messaging) ──

async function importConnectionsBatch(
  connections: ScrapedConnection[],
): Promise<{ imported: number; failed: number; errors: string[] }> {
  try {
    const result = await gqlRequest(
      `mutation ImportContacts($contacts: [ContactInput!]!) {
        importContacts(contacts: $contacts) { success imported failed errors }
      }`,
      {
        contacts: connections.map((c) => ({
          firstName: c.firstName,
          lastName: c.lastName,
          linkedinUrl: c.linkedinUrl,
          position: c.position || undefined,
          tags: ["linkedin-connection"],
        })),
      },
    );

    const res = result.data?.importContacts;
    if (res) {
      return { imported: res.imported, failed: res.failed, errors: res.errors || [] };
    }

    const errMsg = result.errors?.[0]?.message ?? "GraphQL error";
    console.error("[ImportConnections] GQL error:", errMsg);
    return { imported: 0, failed: connections.length, errors: [errMsg] };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[ImportConnections] Request error:", errMsg);
    return { imported: 0, failed: connections.length, errors: [errMsg] };
  }
}

// ── Full pipeline: connections + import + posts ──

export async function scrapeAllPosts(tabId: number): Promise<void> {
  postsCancelled = false;

  // Check server
  const healthy = await checkServerHealth();
  if (!healthy) {
    sendProgress({ error: "Rust server not running on localhost:9876" });
    return;
  }

  // ── Phase 1: Fetch all LinkedIn connections via Voyager API ──

  sendProgress({ phase: "connections", status: "Fetching LinkedIn connections..." });

  let connections: ScrapedConnection[];
  try {
    connections = await fetchAllConnections((fetched, total, warning) => {
      sendProgress({
        phase: "connections",
        status: warning
          ? `⚠ ${warning}`
          : `Fetching connections... ${fetched.toLocaleString()}${total ? ` / ${total.toLocaleString()}` : ""}`,
      });
    });
  } catch (err) {
    sendProgress({
      error: `Connection fetch failed: ${err instanceof Error ? err.message : String(err)}`,
    });
    return;
  }

  if (postsCancelled) {
    sendProgress({ done: true, totalContacts: 0, totalPosts: 0, totalFiltered: 0 });
    return;
  }

  sendProgress({
    phase: "connections",
    status: `Fetched ${connections.length.toLocaleString()} connections`,
  });

  // ── Phase 2: Import new connections as contacts ──

  sendProgress({ phase: "import", status: "Checking existing contacts..." });

  // Get existing contacts from Rust server (which reads from Neon)
  let existingUrls: Set<string>;
  try {
    const existing = await fetchContactsWithLinkedIn();
    existingUrls = new Set(existing.map((c) => c.linkedinUrl.replace(/\/$/, "")));
  } catch {
    existingUrls = new Set();
  }

  // Filter to only new connections
  const newConnections = connections.filter(
    (c) => !existingUrls.has(c.linkedinUrl.replace(/\/$/, "")),
  );

  if (postsCancelled) {
    sendProgress({ done: true, totalContacts: 0, totalPosts: 0, totalFiltered: 0 });
    return;
  }

  if (newConnections.length > 0) {
    sendProgress({
      phase: "import",
      status: `Importing ${newConnections.length.toLocaleString()} new contacts...`,
    });

    // Import in chunks of 100
    const CHUNK_SIZE = 100;
    let totalImported = 0;
    let totalFailed = 0;
    const allErrors: string[] = [];

    for (let i = 0; i < newConnections.length; i += CHUNK_SIZE) {
      if (postsCancelled) break;
      const chunk = newConnections.slice(i, i + CHUNK_SIZE);
      const { imported, failed, errors } = await importConnectionsBatch(chunk);
      totalImported += imported;
      totalFailed += failed;
      if (errors.length > 0) allErrors.push(...errors.slice(0, 3));

      const failedStr = totalFailed > 0 ? ` (${totalFailed.toLocaleString()} failed)` : "";
      sendProgress({
        phase: "import",
        status: `Imported ${totalImported.toLocaleString()} / ${newConnections.length.toLocaleString()} new contacts${failedStr}`,
      });
    }

    const summary = [`Done: ${totalImported.toLocaleString()} new, ${(connections.length - newConnections.length).toLocaleString()} already existed`];
    if (totalFailed > 0) summary.push(`${totalFailed.toLocaleString()} failed`);
    if (allErrors.length > 0) summary.push(`Errors: ${allErrors.slice(0, 3).join("; ")}`);
    sendProgress({
      phase: "import",
      status: summary.join(" | "),
    });
  } else {
    sendProgress({
      phase: "import",
      status: `All ${connections.length.toLocaleString()} connections already in DB`,
    });
  }

  if (postsCancelled) {
    sendProgress({ done: true, totalContacts: 0, totalPosts: 0, totalFiltered: 0 });
    return;
  }

  // Brief pause before switching to post scraping
  await sleep(1000);

  // ── Phase 3: Scrape posts for all contacts ──

  sendProgress({ phase: "posts", status: "Fetching merged contact list..." });

  const allContacts = await fetchContactsWithLinkedIn();
  if (allContacts.length === 0) {
    sendProgress({ error: "No contacts with LinkedIn URLs found" });
    return;
  }

  let totalPosts = 0;
  let totalFiltered = 0;

  for (let i = 0; i < allContacts.length; i++) {
    if (postsCancelled) break;

    const contact = allContacts[i];
    const name = `${contact.firstName} ${contact.lastName}`.trim();
    console.log(
      `[PostScraper] ${i + 1}/${allContacts.length}: ${name} — ${contact.linkedinUrl}`,
    );

    sendProgress({
      phase: "posts",
      current: i + 1,
      total: allContacts.length,
      contactName: name,
      postsFound: totalPosts,
      postsFiltered: totalFiltered,
    });

    // Navigate to activity page
    const activityUrl = contact.linkedinUrl.replace(/\/$/, "") + "/recent-activity/all/";
    try {
      await chrome.tabs.update(tabId, { url: activityUrl });
    } catch {
      console.warn(`[PostScraper] Tab closed, aborting`);
      break;
    }
    await waitForTabLoad(tabId);
    await sleep(3000);

    // Check if we landed on the right page
    try {
      const tabInfo = await chrome.tabs.get(tabId);
      if (!tabInfo.url?.includes("linkedin.com/in/")) {
        console.warn(`[PostScraper] Redirected away for ${name}, skipping`);
        await randomDelay(5000, 8000);
        continue;
      }
    } catch {
      break;
    }

    // Scroll and extract posts
    let posts: ScrapedPost[] = [];
    try {
      posts = await scrollAndExtract(tabId);
    } catch (err) {
      console.warn(`[PostScraper] Extraction failed for ${name}:`, err);
    }

    // Send posts to Rust server
    if (posts.length > 0) {
      try {
        const { inserted, filtered } = await postPosts(contact.id, posts);
        totalPosts += inserted;
        totalFiltered += filtered;
        console.log(
          `[PostScraper] ${name}: ${inserted} kept, ${filtered} filtered (${posts.length} scraped)`,
        );
      } catch (err) {
        console.error(`[PostScraper] Failed to save posts for ${name}:`, err);
      }
    } else {
      console.log(`[PostScraper] ${name}: no posts found`);
    }

    // Rate limiting delay
    if (i < allContacts.length - 1) {
      await randomDelay(10000, 15000);
    }
  }

  sendProgress({
    done: true,
    totalContacts: allContacts.length,
    totalPosts,
    totalFiltered,
  });

  console.log(
    `[PostScraper] Complete. ${totalPosts} kept, ${totalFiltered} filtered from ${allContacts.length} contacts.`,
  );
}
