// ── Scrape Posts for All People on a Company Page ────────────────────
//
// Orchestrator: collect people cards from /company/{slug}/people/,
// import them as contacts, then iterate each person's activity page
// to extract posts and save to LanceDB via the Rust server.

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
import {
  scrollAndExtract,
  postPosts,
  checkServerHealth,
} from "../../services/post-scraper";
import { gqlRequest } from "../../services/graphql";
import { sleep } from "../../lib/scraper-utils";

const RUST_SERVER = import.meta.env.VITE_RUST_SERVER_URL || "http://localhost:9876";

let cancelled = false;

/** Check if a contact already has posts saved in LanceDB */
async function contactHasPosts(contactId: number): Promise<boolean> {
  try {
    const res = await fetch(`${RUST_SERVER}/posts/classified?contact_id=${contactId}&limit=1`);
    if (!res.ok) return false;
    const posts = await res.json();
    return Array.isArray(posts) && posts.length > 0;
  } catch {
    return false;
  }
}

/** Check if a post date is within the last N days. Handles ISO dates and LinkedIn relative text (1w, 2mo, 1yr). */
function isWithinDays(postedDate: string | null, maxDays: number): boolean {
  if (!postedDate) return true; // keep posts with unknown dates

  // Try ISO date first (e.g. "2025-03-15T10:30:00.000Z")
  const parsed = Date.parse(postedDate);
  if (!isNaN(parsed)) {
    const ageMs = Date.now() - parsed;
    return ageMs <= maxDays * 86_400_000;
  }

  // LinkedIn relative text: "1d", "2w", "3mo", "1yr", "2h", "30m"
  const match = postedDate.match(/(\d+)\s*(m|min|h|hr|d|w|mo|yr)/i);
  if (!match) return true; // unknown format — keep it

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  let days = 0;
  if (unit === "m" || unit === "min") days = 0;
  else if (unit === "h" || unit === "hr") days = 0;
  else if (unit === "d") days = value;
  else if (unit === "w") days = value * 7;
  else if (unit === "mo") days = value * 30;
  else if (unit === "yr") days = value * 365;

  return days <= maxDays;
}

const MAX_POST_AGE_DAYS = 30;

export function setPeoplePostsCancelled(value: boolean) {
  cancelled = value;
}

export async function scrapePeoplePostsFromCompanyPage(
  tabId: number,
  companyName: string,
  companyLinkedinUrl: string,
): Promise<void> {
  cancelled = false;

  const LOG = "[PeoplePosts]";
  console.log(`${LOG} Starting for "${companyName}" on tab ${tabId}`);

  try {
    // ── Pre-flight checks ──

    if (!(await isTabAlive(tabId))) {
      console.warn(`${LOG} Tab no longer exists, aborting`);
      return;
    }

    const healthy = await checkServerHealth();
    if (!healthy) {
      await safeSendMessage(tabId, {
        action: "scrapePeoplePostsError",
        error: "Rust server not running on localhost:9876",
      });
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

    // ── Phase 2: Import contacts (so they get DB IDs) ──

    if (cancelled) return;

    await safeSendMessage(tabId, {
      action: "scrapePeoplePostsProgress",
      message: `Importing ${allCards.length} contacts...`,
    });

    const contactInputs = allCards.map((card) => ({
      name: card.name,
      linkedinUrl: card.linkedinUrl,
      workEmail: null,
      headline: card.headline || null,
    }));

    try {
      await gqlRequest(
        `mutation ImportCompanyWithContacts($input: ImportCompanyWithContactsInput!) {
          importCompanyWithContacts(input: $input) {
            success
            company { id name }
            contactsImported
            contactsSkipped
            errors
          }
        }`,
        {
          input: {
            companyName,
            linkedinUrl: companyLinkedinUrl,
            website: null,
            contacts: contactInputs,
          },
        },
      );
    } catch (err) {
      console.error(`${LOG} Import error:`, err);
      await safeSendMessage(tabId, {
        action: "scrapePeoplePostsError",
        error: `Import failed: ${err instanceof Error ? err.message : String(err)}`,
      });
      return;
    }

    // ── Phase 2b: Filter out people already scraped ──

    if (cancelled) return;

    await safeSendMessage(tabId, {
      action: "scrapePeoplePostsProgress",
      message: `Checking ${allCards.length} people against DB...`,
    });

    // Look up contact IDs and check which already have posts
    const toScrape: { card: PersonCard; contactId: number }[] = [];
    let alreadyScraped = 0;

    for (const card of allCards) {
      if (cancelled) break;

      let contactId = 0;
      try {
        const result = await gqlRequest(
          `query ContactByLinkedinUrl($linkedinUrl: String!) {
            contactByLinkedinUrl(linkedinUrl: $linkedinUrl) { id }
          }`,
          { linkedinUrl: card.linkedinUrl },
        );
        contactId = result.data?.contactByLinkedinUrl?.id ?? 0;
      } catch {
        // No contact found — will use id 0
      }

      if (contactId > 0 && await contactHasPosts(contactId)) {
        alreadyScraped++;
        console.log(`${LOG} Skipping ${card.name} — already has posts (contact ${contactId})`);
      } else {
        toScrape.push({ card, contactId });
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
      return;
    }

    await safeSendMessage(tabId, {
      action: "scrapePeoplePostsProgress",
      message: `${alreadyScraped} already saved, scraping ${toScrape.length} remaining...`,
    });

    // ── Phase 3: Iterate remaining people and scrape their posts ──

    let totalPostsSaved = 0;
    let totalPostsFiltered = 0;
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

      const { card: person, contactId } = toScrape[i];
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

      // Verify we're on the right page (not redirected to login/authwall)
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

      // Save to LanceDB via Rust server
      if (posts.length > 0) {
        try {
          const { inserted, filtered } = await postPosts(contactId, posts);
          totalPostsSaved += inserted;
          totalPostsFiltered += filtered;
          console.log(`${LOG} ${personLabel} — ${inserted} saved, ${filtered} filtered`);
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

    console.log(`${LOG} Done! ${peopleScraped} scraped, ${alreadyScraped} skipped, ${totalPostsSaved} posts saved, ${totalPostsFiltered} filtered`);
    await safeSendMessage(tabId, {
      action: "scrapePeoplePostsDone",
      people: peopleScraped,
      posts: totalPostsSaved,
      filtered: totalPostsFiltered,
      skipped: alreadyScraped,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`${LOG} Unexpected error:`, errMsg);
    await safeSendMessage(tabId, {
      action: "scrapePeoplePostsError",
      error: errMsg,
    });
  }
}
