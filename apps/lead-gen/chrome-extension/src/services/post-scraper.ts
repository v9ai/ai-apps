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
import { parseJobFields, isJobRelatedPost } from "../lib/job-field-parser";

const RUST_SERVER = import.meta.env.VITE_RUST_SERVER_URL || "http://localhost:9876";

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
  author_name: string | null;
  author_url: string | null;
  author_subtitle: string | null;
}

interface ScrapedLike {
  post_url: string | null;
  post_text: string | null;
  post_author_name: string | null;
  post_author_url: string | null;
  liked_date: string | null;
}

// Raw camelCase shapes returned from chrome.scripting.executeScript page functions,
// before they are mapped to the snake_case server types above.
interface ExtractedPost {
  postUrl: string | null;
  postText: string | null;
  postedDate: string | null;
  reactionsCount: number;
  commentsCount: number;
  repostsCount: number;
  mediaType: string;
  isRepost: boolean;
  originalAuthor: string | null;
  authorName: string | null;
  authorUrl: string | null;
  authorSubtitle: string | null;
}

interface ExtractedLike {
  postUrl: string | null;
  postText: string | null;
  postAuthorName: string | null;
  postAuthorUrl: string | null;
  likedDate: string | null;
}

// ── State ──

export let postsCancelled = false;

export function cancelPostScraping() {
  postsCancelled = true;
}

// ── Tab helpers ──

function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const listener = (id: number, info: { status?: string }) => {
      if (id === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        if (timeoutId !== null) clearTimeout(timeoutId);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    timeoutId = setTimeout(() => {
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

  const likes = (results?.[0]?.result ?? []) as ExtractedLike[];
  return likes.map((l) => ({
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
        authorName: string | null;
        authorUrl: string | null;
        authorSubtitle: string | null;
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

        // Author info (recruiter/poster)
        const authorNameEl = postEl.querySelector(".update-components-actor__name");
        const authorName = authorNameEl?.textContent?.trim() || null;
        const authorLinkEl = postEl.querySelector<HTMLAnchorElement>(
          ".update-components-actor__container-link, .update-components-actor__meta-link",
        );
        const authorUrl = authorLinkEl?.href?.split("?")[0] || null;
        const authorSubEl = postEl.querySelector(".update-components-actor__description, .update-components-actor__subtitle");
        const authorSubtitle = authorSubEl?.textContent?.trim() || null;

        const urn = postEl.getAttribute("data-urn") || postEl.querySelector("[data-urn]")?.getAttribute("data-urn");
        let postUrl: string | null = null;
        if (urn) postUrl = `https://www.linkedin.com/feed/update/${urn}/`;

        posts.push({ postUrl, postText, postedDate, reactionsCount, commentsCount, repostsCount, mediaType, isRepost, originalAuthor, authorName, authorUrl, authorSubtitle });
      });

      return posts;
    },
  });

  const posts = (results?.[0]?.result ?? []) as ExtractedPost[];
  return posts.map((p) => ({
    post_url: p.postUrl || null,
    post_text: p.postText || null,
    posted_date: p.postedDate || null,
    reactions_count: p.reactionsCount || 0,
    comments_count: p.commentsCount || 0,
    reposts_count: p.repostsCount || 0,
    media_type: p.mediaType || "none",
    is_repost: p.isRepost || false,
    original_author: p.originalAuthor || null,
    author_name: p.authorName || null,
    author_url: p.authorUrl || null,
    author_subtitle: p.authorSubtitle || null,
  }));
}

// ── Extract company links from post authors on the current page ──

async function extractCompanyMentions(
  tabId: number,
): Promise<Array<{ name: string; linkedin_url: string }>> {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: () => {
      const companies: Array<{ name: string; linkedin_url: string }> = [];
      const seen = new Set<string>();
      document.querySelectorAll<HTMLAnchorElement>(
        '.update-components-actor__title a[href*="/company/"]',
      ).forEach((a) => {
        const href = a.href.split("?")[0].replace(/\/$/, "");
        const name = a.textContent?.trim() || "";
        if (href && name && !seen.has(href)) {
          seen.add(href);
          companies.push({ name, linkedin_url: href });
        }
      });
      return companies;
    },
  });
  return (results?.[0]?.result ?? []) as Array<{ name: string; linkedin_url: string }>;
}

async function saveCompaniesBatch(
  companies: Array<{ name: string; linkedin_url: string }>,
): Promise<number> {
  try {
    const result = await gqlRequest(
      `mutation ImportCompanies($companies: [CompanyImportInput!]!) {
        importCompanies(companies: $companies) { success imported failed errors }
      }`,
      { companies },
    );
    return result.data?.importCompanies?.imported ?? 0;
  } catch {
    return 0;
  }
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
  let totalLikes = 0;

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
      likesFound: totalLikes,
    });

    const baseUrl = contact.linkedinUrl.replace(/\/$/, "");

    // ── Scrape posts ──
    const activityUrl = baseUrl + "/recent-activity/all/";
    try {
      await chrome.tabs.update(tabId, { url: activityUrl });
    } catch {
      console.warn(`[PostScraper] Tab closed, aborting`);
      break;
    }
    await waitForTabLoad(tabId);
    await sleep(3000);

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

    let posts: ScrapedPost[] = [];
    try {
      posts = await scrollAndExtract(tabId);
    } catch (err) {
      console.warn(`[PostScraper] Extraction failed for ${name}:`, err);
    }

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

    // ── Scrape likes ──
    if (!postsCancelled) {
      await randomDelay(3000, 5000);
      const likesUrl = baseUrl + "/recent-activity/reactions/";
      try {
        await chrome.tabs.update(tabId, { url: likesUrl });
      } catch {
        break;
      }
      await waitForTabLoad(tabId);
      await sleep(3000);

      let likes: ScrapedLike[] = [];
      try {
        likes = await scrollAndExtractLikes(tabId);
      } catch (err) {
        console.warn(`[PostScraper] Likes extraction failed for ${name}:`, err);
      }

      if (likes.length > 0) {
        try {
          const { inserted } = await postLikes(contact.id, likes);
          totalLikes += inserted;
          console.log(`[PostScraper] ${name}: ${inserted} likes stored`);
        } catch (err) {
          console.error(`[PostScraper] Failed to save likes for ${name}:`, err);
        }
      }
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
    totalLikes,
  });

  console.log(
    `[PostScraper] Complete. ${totalPosts} posts kept, ${totalFiltered} filtered, ${totalLikes} likes from ${contacts.length} contacts.`,
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

function sendJobProgress(data: Record<string, unknown>) {
  try {
    chrome.runtime.sendMessage({ action: "jobScrapingProgress", ...data });
  } catch {
    // Popup may not be open
  }
}

// ── Job search scraping ──

async function postJobPosts(posts: ScrapedPost[]): Promise<PostResult> {
  const res = await fetch(`${RUST_SERVER}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ posts }),
  });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  const data = await res.json();
  return { inserted: data.inserted, filtered: data.filtered || 0 };
}

export async function scrapeJobSearchPosts(tabId: number, searchUrl: string): Promise<void> {
  sendJobProgress({ status: "Navigating to LinkedIn job search..." });

  try {
    await chrome.tabs.update(tabId, { url: searchUrl });
  } catch {
    sendJobProgress({ error: "Tab closed during navigation" });
    return;
  }
  await waitForTabLoad(tabId);
  await sleep(3000);

  sendJobProgress({ status: "Extracting posts..." });

  let allPosts: ScrapedPost[] = [];
  try {
    allPosts = await scrollAndExtract(tabId);
  } catch (err) {
    sendJobProgress({ error: `Extraction failed: ${err}` });
    return;
  }

  if (allPosts.length === 0) {
    sendJobProgress({ done: true, inserted: 0, filtered: 0, total: 0, contacts: 0 });
    return;
  }

  // Filter to job-related posts only
  const jobPosts = allPosts.filter((p) => isJobRelatedPost(p.post_text || ""));
  const filteredOut = allPosts.length - jobPosts.length;

  console.log(`[JobScraper] ${jobPosts.length} job posts from ${allPosts.length} total (${filteredOut} non-job filtered)`);

  if (jobPosts.length === 0) {
    sendJobProgress({ done: true, inserted: 0, filtered: filteredOut, total: allPosts.length, contacts: 0 });
    return;
  }

  sendJobProgress({ status: `Saving ${jobPosts.length} job posts to Neon...` });

  // Parse job fields and save to Neon via GraphQL
  let neonInserted = 0;
  try {
    const inputs = jobPosts
      .filter((p) => p.post_url)
      .map((p) => {
        const fields = parseJobFields(p.post_text || "");
        return {
          url: p.post_url!,
          type: "job" as const,
          title: extractJobTitle(p.post_text || ""),
          content: p.post_text || null,
          authorName: p.author_name || null,
          authorUrl: p.author_url || null,
          location: fields.remoteType || null,
          employmentType: fields.contractType || null,
          postedAt: p.posted_date || null,
          rawData: {
            reactions: p.reactions_count,
            comments: p.comments_count,
            reposts: p.reposts_count,
            mediaType: p.media_type,
            authorSubtitle: p.author_subtitle,
            parsedFields: fields,
          },
        };
      });

    if (inputs.length > 0) {
      const result = await gqlRequest(
        `mutation UpsertLinkedInPosts($inputs: [UpsertLinkedInPostInput!]!) {
          upsertLinkedInPosts(inputs: $inputs) { success inserted updated errors }
        }`,
        { inputs },
      );
      neonInserted = result.data?.upsertLinkedInPosts?.inserted ?? 0;
    }
  } catch (err) {
    console.error("[JobScraper] Neon save failed:", err);
  }

  // Optionally send to Rust server for ML scoring (non-blocking)
  try {
    if (await checkServerHealth()) await postJobPosts(jobPosts);
  } catch { /* non-critical */ }

  // Extract and save companies from post authors
  try {
    const companies = await extractCompanyMentions(tabId);
    if (companies.length > 0) await saveCompaniesBatch(companies);
  } catch { /* non-critical */ }

  // Extract and import contacts from job post authors
  let contactsImported = 0;
  try {
    contactsImported = await importJobPostContacts(jobPosts);
  } catch (err) {
    console.error("[JobScraper] Contact import failed:", err);
  }

  sendJobProgress({
    done: true,
    inserted: neonInserted,
    filtered: filteredOut,
    total: allPosts.length,
    contacts: contactsImported,
  });
}

// ── Extract contacts from job post authors and import via GraphQL ──

function parseAuthorName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: "Unknown", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function parseAuthorPosition(subtitle: string | null): string | undefined {
  if (!subtitle) return undefined;
  for (const sep of [" at ", " @ ", " | "]) {
    const idx = subtitle.toLowerCase().indexOf(sep);
    if (idx > 0) return subtitle.slice(0, idx).trim();
  }
  return subtitle.trim() || undefined;
}

async function importJobPostContacts(posts: ScrapedPost[]): Promise<number> {
  // Dedup by author_url, only personal profiles (/in/)
  const seen = new Set<string>();
  const contacts: Array<{
    firstName: string;
    lastName: string;
    linkedinUrl: string;
    position?: string;
    tags: string[];
  }> = [];

  for (const p of posts) {
    const url = p.author_url?.split("?")[0]?.replace(/\/$/, "");
    if (!url || !url.includes("/in/") || seen.has(url)) continue;
    if (!p.author_name) continue;
    seen.add(url);

    const { firstName, lastName } = parseAuthorName(p.author_name);
    contacts.push({
      firstName,
      lastName,
      linkedinUrl: url,
      position: parseAuthorPosition(p.author_subtitle),
      tags: ["linkedin-job-post"],
    });
  }

  if (contacts.length === 0) return 0;

  console.log(`[JobScraper] Importing ${contacts.length} contacts from job post authors`);

  try {
    const result = await gqlRequest(
      `mutation ImportContacts($contacts: [ContactInput!]!) {
        importContacts(contacts: $contacts) { success imported failed errors }
      }`,
      { contacts },
    );
    const res = result.data?.importContacts;
    if (res) {
      if (res.failed > 0) console.warn(`[JobScraper] ${res.failed} contact imports failed:`, res.errors);
      return res.imported;
    }
    if (result.errors) console.error("[JobScraper] Contact GQL error:", result.errors[0].message);
    return 0;
  } catch (err) {
    console.error("[JobScraper] Contact import request failed:", err);
    return 0;
  }
}

function extractJobTitle(text: string): string | null {
  // Take first non-empty line as a rough title, truncated
  const firstLine = text.split("\n").find((l) => l.trim().length > 5)?.trim();
  if (!firstLine) return null;
  return firstLine.length > 200 ? firstLine.slice(0, 200) + "…" : firstLine;
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
  } catch (err) {
    console.warn("[PostScraper] Could not fetch existing contacts, will re-check all connections:", err);
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
  let totalLikes = 0;
  const allCompanies = new Map<string, { name: string; linkedin_url: string }>();

  for (let i = 0; i < allContacts.length; i++) {
    if (postsCancelled) break;

    const contact = allContacts[i];
    const name = `${contact.firstName} ${contact.lastName}`.trim();
    const baseUrl = contact.linkedinUrl.replace(/\/$/, "");
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
      likesFound: totalLikes,
    });

    // ── Scrape posts ──
    const activityUrl = baseUrl + "/recent-activity/all/";
    try {
      await chrome.tabs.update(tabId, { url: activityUrl });
    } catch {
      console.warn(`[PostScraper] Tab closed, aborting`);
      break;
    }
    await waitForTabLoad(tabId);
    await sleep(3000);

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

    let posts: ScrapedPost[] = [];
    try {
      posts = await scrollAndExtract(tabId);
    } catch (err) {
      console.warn(`[PostScraper] Extraction failed for ${name}:`, err);
    }

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

    // ── Collect companies from post authors on this activity page ──
    try {
      const companies = await extractCompanyMentions(tabId);
      for (const c of companies) {
        if (!allCompanies.has(c.linkedin_url)) allCompanies.set(c.linkedin_url, c);
      }
    } catch { /* non-critical */ }

    // ── Scrape likes ──
    if (!postsCancelled) {
      await randomDelay(3000, 5000);
      const likesUrl = baseUrl + "/recent-activity/reactions/";
      try {
        await chrome.tabs.update(tabId, { url: likesUrl });
      } catch {
        break;
      }
      await waitForTabLoad(tabId);
      await sleep(3000);

      let likes: ScrapedLike[] = [];
      try {
        likes = await scrollAndExtractLikes(tabId);
      } catch (err) {
        console.warn(`[PostScraper] Likes extraction failed for ${name}:`, err);
      }

      if (likes.length > 0) {
        try {
          const { inserted } = await postLikes(contact.id, likes);
          totalLikes += inserted;
          console.log(`[PostScraper] ${name}: ${inserted} likes stored`);
        } catch (err) {
          console.error(`[PostScraper] Failed to save likes for ${name}:`, err);
        }
      }
    }

    // Rate limiting delay
    if (i < allContacts.length - 1) {
      await randomDelay(10000, 15000);
    }
  }

  // ── Phase 4: Save companies collected from activity pages ──
  let totalCompanies = 0;
  if (!postsCancelled && allCompanies.size > 0) {
    sendProgress({ phase: "companies", status: `Saving ${allCompanies.size} companies...` });
    const batch = [...allCompanies.values()];
    const CHUNK = 50;
    for (let i = 0; i < batch.length; i += CHUNK) {
      totalCompanies += await saveCompaniesBatch(batch.slice(i, i + CHUNK));
    }
    console.log(`[PostScraper] Saved ${totalCompanies}/${allCompanies.size} companies`);
  }

  sendProgress({
    done: true,
    totalContacts: allContacts.length,
    totalPosts,
    totalFiltered,
    totalLikes,
    totalCompanies,
  });

  console.log(
    `[PostScraper] Complete. ${totalPosts} posts kept, ${totalFiltered} filtered, ${totalLikes} likes, ${totalCompanies} companies from ${allContacts.length} contacts.`,
  );
}

// ── Recruiter-only post scraping ──

async function fetchRecruiterContacts(): Promise<ScrapedContact[]> {
  const res = await fetch(`${RUST_SERVER}/contacts/recruiters`);
  if (!res.ok) throw new Error(`Failed to fetch recruiter contacts: ${res.status}`);

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

  console.log(`[RecruiterScraper] Fetched ${mapped.length} recruiter contacts`);
  return mapped;
}

export async function scrapeRecruiterPosts(tabId: number): Promise<void> {
  postsCancelled = false;

  const healthy = await checkServerHealth();
  if (!healthy) {
    sendProgress({ error: "Rust server not running on localhost:9876" });
    return;
  }

  sendProgress({ phase: "recruiter-posts", status: "Fetching recruiter contacts..." });

  let contacts: ScrapedContact[];
  try {
    contacts = await fetchRecruiterContacts();
  } catch (err) {
    sendProgress({ error: `Failed to fetch recruiters: ${err instanceof Error ? err.message : String(err)}` });
    return;
  }

  if (contacts.length === 0) {
    sendProgress({ error: "No recruiter contacts found in DB" });
    return;
  }

  sendProgress({ phase: "recruiter-posts", status: `Found ${contacts.length} recruiters` });

  let totalPosts = 0;
  let totalFiltered = 0;

  for (let i = 0; i < contacts.length; i++) {
    if (postsCancelled) break;

    const contact = contacts[i];
    const name = `${contact.firstName} ${contact.lastName}`.trim();
    const baseUrl = contact.linkedinUrl.replace(/\/$/, "");

    console.log(
      `[RecruiterScraper] ${i + 1}/${contacts.length}: ${name} (${contact.position ?? "?"}) — ${contact.linkedinUrl}`,
    );

    sendProgress({
      phase: "recruiter-posts",
      current: i + 1,
      total: contacts.length,
      contactName: `${name} — ${contact.position ?? ""}`,
      postsFound: totalPosts,
      postsFiltered: totalFiltered,
    });

    const activityUrl = baseUrl + "/recent-activity/all/";
    try {
      await chrome.tabs.update(tabId, { url: activityUrl });
    } catch {
      console.warn(`[RecruiterScraper] Tab closed, aborting`);
      break;
    }
    await waitForTabLoad(tabId);
    await sleep(3000);

    try {
      const tabInfo = await chrome.tabs.get(tabId);
      if (!tabInfo.url?.includes("linkedin.com/in/")) {
        console.warn(`[RecruiterScraper] Redirected away for ${name}, skipping`);
        await randomDelay(5000, 8000);
        continue;
      }
    } catch {
      break;
    }

    let posts: ScrapedPost[] = [];
    try {
      posts = await scrollAndExtract(tabId);
    } catch (err) {
      console.warn(`[RecruiterScraper] Extraction failed for ${name}:`, err);
    }

    if (posts.length > 0) {
      try {
        const { inserted, filtered } = await postPosts(contact.id, posts);
        totalPosts += inserted;
        totalFiltered += filtered;
        console.log(
          `[RecruiterScraper] ${name}: ${inserted} kept, ${filtered} filtered (${posts.length} scraped)`,
        );
      } catch (err) {
        console.error(`[RecruiterScraper] Failed to save posts for ${name}:`, err);
      }
    } else {
      console.log(`[RecruiterScraper] ${name}: no posts found`);
    }

    // Rate limiting delay (shorter since targeted)
    if (i < contacts.length - 1) {
      await randomDelay(8000, 12000);
    }
  }

  sendProgress({
    done: true,
    totalContacts: contacts.length,
    totalPosts,
    totalFiltered,
  });

  console.log(
    `[RecruiterScraper] Complete. ${totalPosts} posts kept, ${totalFiltered} filtered from ${contacts.length} recruiters.`,
  );
}

// ── Unified pipeline: jobs + connections + import + posts + companies ──

export async function runUnifiedPipeline(tabId: number, searchUrl: string): Promise<void> {
  postsCancelled = false;
  let totalJobPosts = 0;

  // ── Phase 1: Scrape job posts from content search ──

  sendProgress({ phase: "jobs", status: "Navigating to job search..." });

  try {
    await chrome.tabs.update(tabId, { url: searchUrl });
  } catch {
    sendProgress({ error: "Tab closed during navigation" });
    return;
  }
  await waitForTabLoad(tabId);
  await sleep(3000);

  sendProgress({ phase: "jobs", status: "Scrolling & extracting posts..." });

  let allPosts: ScrapedPost[] = [];
  try {
    allPosts = await scrollAndExtract(tabId);
  } catch (err) {
    console.error("[UnifiedPipeline] Job extraction failed:", err);
  }

  // Filter to job-related posts only
  const jobPosts = allPosts.filter((p) => isJobRelatedPost(p.post_text || ""));
  const jobFilteredOut = allPosts.length - jobPosts.length;
  let jobContactsImported = 0;

  console.log(`[UnifiedPipeline] ${jobPosts.length} job posts from ${allPosts.length} total (${jobFilteredOut} non-job filtered)`);

  if (jobPosts.length > 0 && !postsCancelled) {
    sendProgress({ phase: "jobs", status: `Saving ${jobPosts.length} job posts to Neon...` });

    try {
      const inputs = jobPosts
        .filter((p) => p.post_url)
        .map((p) => {
          const fields = parseJobFields(p.post_text || "");
          return {
            url: p.post_url!,
            type: "job" as const,
            title: extractJobTitle(p.post_text || ""),
            content: p.post_text || null,
            authorName: p.author_name || null,
            authorUrl: p.author_url || null,
            location: fields.remoteType || null,
            employmentType: fields.contractType || null,
            postedAt: p.posted_date || null,
            rawData: {
              reactions: p.reactions_count,
              comments: p.comments_count,
              reposts: p.reposts_count,
              mediaType: p.media_type,
              authorSubtitle: p.author_subtitle,
              parsedFields: fields,
            },
          };
        });

      if (inputs.length > 0) {
        const result = await gqlRequest(
          `mutation UpsertLinkedInPosts($inputs: [UpsertLinkedInPostInput!]!) {
            upsertLinkedInPosts(inputs: $inputs) { success inserted updated errors }
          }`,
          { inputs },
        );
        totalJobPosts = result.data?.upsertLinkedInPosts?.inserted ?? 0;
      }
    } catch (err) {
      console.error("[UnifiedPipeline] Neon save failed:", err);
    }

    // Optional: send to Rust server for ML scoring
    try {
      if (await checkServerHealth()) await postJobPosts(jobPosts);
    } catch { /* non-critical */ }

    // Extract companies from search results
    try {
      const companies = await extractCompanyMentions(tabId);
      if (companies.length > 0) await saveCompaniesBatch(companies);
    } catch { /* non-critical */ }

    // Import contacts from job post authors
    try {
      jobContactsImported = await importJobPostContacts(jobPosts);
    } catch (err) {
      console.error("[UnifiedPipeline] Contact import failed:", err);
    }

    sendProgress({ phase: "jobs", status: `${totalJobPosts} job posts saved, ${jobContactsImported} contacts imported (${jobFilteredOut} non-job filtered)` });
  } else {
    sendProgress({ phase: "jobs", status: `No job posts found (${jobFilteredOut} non-job filtered from ${allPosts.length})` });
  }

  if (postsCancelled) {
    sendProgress({ done: true, totalContacts: 0, totalPosts: totalJobPosts, totalFiltered: 0 });
    return;
  }

  // ── Phase 2: Fetch LinkedIn connections via Voyager API ──

  sendProgress({ phase: "connections", status: "Fetching LinkedIn connections..." });

  let connections: ScrapedConnection[];
  try {
    connections = await fetchAllConnections((fetched, total, warning) => {
      sendProgress({
        phase: "connections",
        status: warning
          ? `Warning: ${warning}`
          : `Fetching connections... ${fetched.toLocaleString()}${total ? ` / ${total.toLocaleString()}` : ""}`,
      });
    });
  } catch (err) {
    // Connections fetch failed — still report job results
    sendProgress({
      done: true,
      totalContacts: 0,
      totalPosts: totalJobPosts,
      totalFiltered: 0,
      status: `${totalJobPosts} jobs saved. Connection fetch failed: ${err instanceof Error ? err.message : String(err)}`,
    });
    return;
  }

  if (postsCancelled) {
    sendProgress({ done: true, totalContacts: 0, totalPosts: totalJobPosts, totalFiltered: 0 });
    return;
  }

  sendProgress({
    phase: "connections",
    status: `Fetched ${connections.length.toLocaleString()} connections`,
  });

  // ── Phase 3: Import new connections as contacts ──

  sendProgress({ phase: "import", status: "Checking existing contacts..." });

  let existingUrls: Set<string>;
  try {
    const existing = await fetchContactsWithLinkedIn();
    existingUrls = new Set(existing.map((c) => c.linkedinUrl.replace(/\/$/, "")));
  } catch {
    existingUrls = new Set();
  }

  const newConnections = connections.filter(
    (c) => !existingUrls.has(c.linkedinUrl.replace(/\/$/, "")),
  );

  if (postsCancelled) {
    sendProgress({ done: true, totalContacts: 0, totalPosts: totalJobPosts, totalFiltered: 0 });
    return;
  }

  if (newConnections.length > 0) {
    sendProgress({
      phase: "import",
      status: `Importing ${newConnections.length.toLocaleString()} new contacts...`,
    });

    const CHUNK_SIZE = 100;
    let totalImported = 0;
    let totalFailed = 0;

    for (let i = 0; i < newConnections.length; i += CHUNK_SIZE) {
      if (postsCancelled) break;
      const chunk = newConnections.slice(i, i + CHUNK_SIZE);
      const { imported, failed } = await importConnectionsBatch(chunk);
      totalImported += imported;
      totalFailed += failed;

      sendProgress({
        phase: "import",
        status: `Imported ${totalImported.toLocaleString()} / ${newConnections.length.toLocaleString()} new contacts${totalFailed > 0 ? ` (${totalFailed} failed)` : ""}`,
      });
    }
  } else {
    sendProgress({
      phase: "import",
      status: `All ${connections.length.toLocaleString()} connections already in DB`,
    });
  }

  if (postsCancelled) {
    sendProgress({ done: true, totalContacts: 0, totalPosts: totalJobPosts, totalFiltered: 0 });
    return;
  }

  // ── Phase 4: Scrape posts for all contacts (requires Rust server) ──

  const healthy = await checkServerHealth();
  if (!healthy) {
    sendProgress({
      done: true,
      totalContacts: 0,
      totalPosts: totalJobPosts,
      totalFiltered: 0,
    });
    return;
  }

  await sleep(1000);
  sendProgress({ phase: "posts", status: "Fetching merged contact list..." });

  const allContacts = await fetchContactsWithLinkedIn();
  if (allContacts.length === 0) {
    sendProgress({ done: true, totalContacts: 0, totalPosts: totalJobPosts, totalFiltered: 0 });
    return;
  }

  let totalPosts = 0;
  let totalFiltered = 0;
  let totalLikes = 0;
  const allCompanies = new Map<string, { name: string; linkedin_url: string }>();

  for (let i = 0; i < allContacts.length; i++) {
    if (postsCancelled) break;

    const contact = allContacts[i];
    const name = `${contact.firstName} ${contact.lastName}`.trim();
    const baseUrl = contact.linkedinUrl.replace(/\/$/, "");

    sendProgress({
      phase: "posts",
      current: i + 1,
      total: allContacts.length,
      contactName: name,
      postsFound: totalPosts,
      postsFiltered: totalFiltered,
      likesFound: totalLikes,
    });

    // Scrape posts
    const activityUrl = baseUrl + "/recent-activity/all/";
    try {
      await chrome.tabs.update(tabId, { url: activityUrl });
    } catch {
      break;
    }
    await waitForTabLoad(tabId);
    await sleep(3000);

    try {
      const tabInfo = await chrome.tabs.get(tabId);
      if (!tabInfo.url?.includes("linkedin.com/in/")) {
        await randomDelay(5000, 8000);
        continue;
      }
    } catch {
      break;
    }

    let posts: ScrapedPost[] = [];
    try {
      posts = await scrollAndExtract(tabId);
    } catch (err) {
      console.warn(`[UnifiedPipeline] Extraction failed for ${name}:`, err);
    }

    if (posts.length > 0) {
      try {
        const { inserted, filtered } = await postPosts(contact.id, posts);
        totalPosts += inserted;
        totalFiltered += filtered;
      } catch (err) {
        console.error(`[UnifiedPipeline] Failed to save posts for ${name}:`, err);
      }
    }

    // Collect companies
    try {
      const companies = await extractCompanyMentions(tabId);
      for (const c of companies) {
        if (!allCompanies.has(c.linkedin_url)) allCompanies.set(c.linkedin_url, c);
      }
    } catch { /* non-critical */ }

    // Scrape likes
    if (!postsCancelled) {
      await randomDelay(3000, 5000);
      const likesUrl = baseUrl + "/recent-activity/reactions/";
      try {
        await chrome.tabs.update(tabId, { url: likesUrl });
      } catch {
        break;
      }
      await waitForTabLoad(tabId);
      await sleep(3000);

      let likes: ScrapedLike[] = [];
      try {
        likes = await scrollAndExtractLikes(tabId);
      } catch { /* non-critical */ }

      if (likes.length > 0) {
        try {
          const { inserted } = await postLikes(contact.id, likes);
          totalLikes += inserted;
        } catch { /* non-critical */ }
      }
    }

    if (i < allContacts.length - 1) {
      await randomDelay(10000, 15000);
    }
  }

  // ── Phase 5: Save companies ──
  let totalCompanies = 0;
  if (!postsCancelled && allCompanies.size > 0) {
    sendProgress({ phase: "companies", status: `Saving ${allCompanies.size} companies...` });
    const batch = [...allCompanies.values()];
    const CHUNK = 50;
    for (let i = 0; i < batch.length; i += CHUNK) {
      totalCompanies += await saveCompaniesBatch(batch.slice(i, i + CHUNK));
    }
  }

  sendProgress({
    done: true,
    totalContacts: allContacts.length,
    totalPosts: totalJobPosts + totalPosts,
    totalFiltered,
    totalLikes,
    totalCompanies,
  });
}
