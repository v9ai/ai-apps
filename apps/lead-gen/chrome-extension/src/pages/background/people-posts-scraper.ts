// ── Scrape Posts for All People on a Company Page ────────────────────
//
// Orchestrator: collect people cards from /company/{slug}/people/,
// then iterate each person's activity page to extract posts and
// save to SQLite via the Next.js API at localhost:3004.

import {
  extractPeopleCards,
  scrollPeoplePage,
  clickShowMorePeople,
  detectPeoplePageBlocker,
  type PersonCard,
} from "./people-scraping";
import {
  randomDelay,
  waitForTabLoad,
  isTabAlive,
  safeTabUpdate,
  safeSendMessage,
} from "./tab-utils";
import { scrollAndExtract } from "../../services/post-scraper";
import { sleep } from "../../lib/scraper-utils";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3004";

let cancelled = false;

/** Check if a post date is within the last N days. Handles ISO dates and LinkedIn relative text. */
function isWithinDays(postedDate: string | null, maxDays: number): boolean {
  if (!postedDate) return true;

  const parsed = Date.parse(postedDate);
  if (!isNaN(parsed)) {
    return Date.now() - parsed <= maxDays * 86_400_000;
  }

  const match = postedDate.match(/(\d+)\s*(m|min|h|hr|d|w|mo|yr)/i);
  if (!match) return true;

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  let days = 0;
  if (unit === "d") days = value;
  else if (unit === "w") days = value * 7;
  else if (unit === "mo") days = value * 30;
  else if (unit === "yr") days = value * 365;

  return days <= maxDays;
}

const MAX_POST_AGE_DAYS = 30;

/** Check if a person already has posts in SQLite via HEAD request */
async function personHasPostsInDb(slug: string, linkedinUrl: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${API_BASE}/api/companies/${slug}/posts?person=${encodeURIComponent(linkedinUrl)}`,
      { method: "HEAD" },
    );
    return res.ok; // 200 = has posts, 404 = no posts
  } catch {
    return false;
  }
}

/** Save posts to SQLite via POST to Next.js API */
async function savePosts(
  slug: string,
  companyName: string,
  companyLinkedinUrl: string,
  person: PersonCard,
  posts: Awaited<ReturnType<typeof scrollAndExtract>>,
): Promise<{ inserted: number; duplicates: number }> {
  const res = await fetch(`${API_BASE}/api/companies/${slug}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      companyName,
      companyLinkedinUrl,
      personName: person.name,
      personLinkedinUrl: person.linkedinUrl,
      personHeadline: person.headline || null,
      posts: posts.map((p) => ({
        post_url: p.post_url,
        post_text: p.post_text,
        posted_date: p.posted_date,
        reactions_count: p.reactions_count,
        comments_count: p.comments_count,
        reposts_count: p.reposts_count,
        media_type: p.media_type,
        is_repost: p.is_repost,
        original_author: p.original_author,
        author_name: p.author_name,
        author_url: p.author_url,
      })),
    }),
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/** Extract company slug from LinkedIn URL */
function extractSlug(linkedinUrl: string): string {
  const match = linkedinUrl.match(/\/company\/([^/?#]+)/);
  return match ? match[1] : linkedinUrl.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
}

export function setPeoplePostsCancelled(value: boolean) {
  cancelled = value;
}

export async function scrapePeoplePostsFromCompanyPage(
  tabId: number,
  companyName: string,
  companyLinkedinUrl: string,
): Promise<void> {
  cancelled = false;
  await chrome.storage.session.set({ postScrapingActive: true });

  const LOG = "[PeoplePosts]";
  const slug = extractSlug(companyLinkedinUrl);
  console.log(`${LOG} Starting for "${companyName}" (${slug}) on tab ${tabId}`);

  try {
    if (!(await isTabAlive(tabId))) {
      console.warn(`${LOG} Tab no longer exists, aborting`);
      return;
    }

    // Ensure we're on the /people/ page
    const tab = await chrome.tabs.get(tabId);
    const currentUrl = tab.url || "";
    if (!currentUrl.includes("/people")) {
      const peopleUrl = companyLinkedinUrl.replace(/\/$/, "") + "/people/";
      await safeTabUpdate(tabId, { url: peopleUrl });
      await waitForTabLoad(tabId);
      await randomDelay(4000);
    } else {
      await randomDelay(2500);
    }

    const blocker = await detectPeoplePageBlocker(tabId);
    if (blocker) {
      console.warn(`${LOG} ${blocker}`);
      await safeSendMessage(tabId, {
        action: "scrapePeoplePostsError",
        error: `${blocker}. Make sure you are logged in.`,
      });
      return;
    }

    // ── Phase 1: Collect people cards ──

    const allCards: PersonCard[] = [];
    const seen = new Set<string>();
    const MAX_ROUNDS = 15;
    let consecutiveEmptyRounds = 0;

    for (let round = 0; round < MAX_ROUNDS; round++) {
      if (cancelled) break;
      if (!(await isTabAlive(tabId))) {
        console.warn(`${LOG} Tab closed during collection, aborting`);
        return;
      }

      await scrollPeoplePage(tabId);
      await randomDelay(2000);

      const cards = await extractPeopleCards(tabId);
      let newCount = 0;
      for (const card of cards) {
        if (card.linkedinUrl && !seen.has(card.linkedinUrl)) {
          seen.add(card.linkedinUrl);
          allCards.push(card);
          newCount++;
        }
      }

      console.log(`${LOG} Round ${round + 1}: +${newCount} new (total ${allCards.length})`);
      await safeSendMessage(tabId, {
        action: "scrapePeoplePostsProgress",
        message: `Collecting... ${allCards.length} people`,
      });

      const clickedMore = await clickShowMorePeople(tabId);
      if (clickedMore) {
        consecutiveEmptyRounds = 0;
        await randomDelay(2500);
      } else if (newCount === 0) {
        consecutiveEmptyRounds++;
        if (consecutiveEmptyRounds >= 2) break;
        await randomDelay(1500);
      } else {
        consecutiveEmptyRounds = 0;
      }
    }

    if (allCards.length === 0) {
      await safeSendMessage(tabId, {
        action: "scrapePeoplePostsError",
        error: "No people found. Make sure you are logged in.",
      });
      return;
    }

    console.log(`${LOG} Collected ${allCards.length} people`);

    // ── Phase 2: Filter out people already scraped ──

    if (cancelled) return;

    await safeSendMessage(tabId, {
      action: "scrapePeoplePostsProgress",
      message: `Checking ${allCards.length} people against DB...`,
    });

    const toScrape: PersonCard[] = [];
    let alreadyScraped = 0;

    for (const card of allCards) {
      if (cancelled) break;

      if (await personHasPostsInDb(slug, card.linkedinUrl)) {
        alreadyScraped++;
        console.log(`${LOG} Skipping ${card.name} — already has posts`);
      } else {
        toScrape.push(card);
      }
    }

    console.log(`${LOG} ${alreadyScraped} already scraped, ${toScrape.length} to scrape`);

    if (toScrape.length === 0) {
      await safeSendMessage(tabId, {
        action: "scrapePeoplePostsDone",
        people: 0,
        posts: 0,
        filtered: 0,
        skipped: alreadyScraped,
      });
      chrome.notifications.create(`posts-done-${Date.now()}`, {
        type: "basic",
        iconUrl: chrome.runtime.getURL("icon-128.png"),
        title: `Posts scraped — ${companyName}`,
        message: `All ${alreadyScraped} people already scraped`,
      });
      return;
    }

    await safeSendMessage(tabId, {
      action: "scrapePeoplePostsProgress",
      message: `${alreadyScraped} already saved, scraping ${toScrape.length} remaining...`,
    });

    // ── Phase 3: Iterate remaining people and scrape their posts ──

    let totalPostsSaved = 0;
    let peopleScraped = 0;

    for (let i = 0; i < toScrape.length; i++) {
      if (cancelled) {
        console.log(`${LOG} Cancelled after ${peopleScraped} people`);
        break;
      }
      if (!(await isTabAlive(tabId))) {
        console.warn(`${LOG} Tab closed during scraping, aborting`);
        return;
      }

      const person = toScrape[i];
      const personLabel = `${i + 1}/${toScrape.length}: ${person.name}`;

      // Navigate to activity page
      const baseUrl = person.linkedinUrl.replace(/\/$/, "");
      const activityUrl = baseUrl + "/recent-activity/all/";

      await safeSendMessage(tabId, {
        action: "scrapePeoplePostsProgress",
        message: `${personLabel} — navigating...`,
      });

      try {
        await safeTabUpdate(tabId, { url: activityUrl });
      } catch {
        console.warn(`${LOG} Could not navigate to ${person.name}'s activity`);
        continue;
      }
      await waitForTabLoad(tabId);
      await sleep(3000);

      // Verify we're on the right page
      try {
        const tabInfo = await chrome.tabs.get(tabId);
        if (!tabInfo.url?.includes("linkedin.com/in/")) {
          console.warn(`${LOG} Redirected away from ${person.name}'s profile, skipping`);
          continue;
        }
      } catch {
        continue;
      }

      // Extract posts
      await safeSendMessage(tabId, {
        action: "scrapePeoplePostsProgress",
        message: `${personLabel} — extracting posts...`,
      });

      let posts: Awaited<ReturnType<typeof scrollAndExtract>> = [];
      try {
        posts = await scrollAndExtract(tabId);
      } catch (err) {
        console.warn(`${LOG} Extraction failed for ${person.name}:`, err);
        continue;
      }

      // Filter to last month only
      const before = posts.length;
      posts = posts.filter((p) => isWithinDays(p.posted_date, MAX_POST_AGE_DAYS));
      if (before !== posts.length) {
        console.log(`${LOG} ${personLabel} — filtered ${before - posts.length} old posts (kept ${posts.length})`);
      }

      // Save to SQLite via Next.js API
      if (posts.length > 0) {
        try {
          const { inserted } = await savePosts(slug, companyName, companyLinkedinUrl, person, posts);
          totalPostsSaved += inserted;
          console.log(`${LOG} ${personLabel} — ${inserted} saved`);
        } catch (err) {
          console.warn(`${LOG} Failed to save posts for ${person.name}:`, err);
        }
      } else {
        console.log(`${LOG} ${personLabel} — no posts found`);
      }

      peopleScraped++;

      await safeSendMessage(tabId, {
        action: "scrapePeoplePostsProgress",
        message: `${personLabel} — ${posts.length} posts (${totalPostsSaved} total saved)`,
      });

      // Rate limit between people
      if (i < toScrape.length - 1) {
        await randomDelay(12000);
      }
    }

    // ── Phase 4: Done ──

    console.log(`${LOG} Done! ${peopleScraped} scraped, ${alreadyScraped} skipped, ${totalPostsSaved} posts saved`);
    await safeSendMessage(tabId, {
      action: "scrapePeoplePostsDone",
      people: peopleScraped,
      posts: totalPostsSaved,
      filtered: 0,
      skipped: alreadyScraped,
    });

    chrome.notifications.create(`posts-done-${Date.now()}`, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icon-128.png"),
      title: `Posts scraped — ${companyName}`,
      message: `${peopleScraped} people, ${totalPostsSaved} posts saved${alreadyScraped ? `, ${alreadyScraped} skipped` : ""}`,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`${LOG} Unexpected error:`, errMsg);
    await safeSendMessage(tabId, {
      action: "scrapePeoplePostsError",
      error: errMsg,
    });

    chrome.notifications.create(`posts-error-${Date.now()}`, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icon-128.png"),
      title: `Posts scrape failed — ${companyName}`,
      message: errMsg.slice(0, 120),
    });
  } finally {
    await chrome.storage.session.set({ postScrapingActive: false });
  }
}
