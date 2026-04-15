// ── LinkedIn Company People Scraper ──────────────────────────────────

import { gqlRequest, GRAPHQL_URL } from "../../services/graphql";
import { randomDelay, waitForTabLoad, isTabAlive, safeTabUpdate, safeSendMessage } from "./tab-utils";

const SCROLL_TIMEOUT_MS = 15_000;
const BROWSE_PEOPLE_TIMEOUT_MS = 240_000; // 4 minutes max for entire operation

let peopleCancelled = false;

export function setPeopleCancelled(value: boolean) {
  peopleCancelled = value;
}

export interface PersonCard {
  name: string;
  headline: string;
  linkedinUrl: string;
}

export function extractPeopleCards(tabId: number): Promise<PersonCard[]> {
  return chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        const results: { name: string; headline: string; linkedinUrl: string }[] = [];
        const seen = new Set<string>();

        document.querySelectorAll<HTMLElement>(
          ".org-people-profile-card, .artdeco-entity-lockup"
        ).forEach((card) => {
          // Name — try multiple selectors LinkedIn has used
          const nameEl =
            card.querySelector(".org-people-profile-card__profile-title") ||
            card.querySelector(".artdeco-entity-lockup__title") ||
            card.querySelector("[data-anonymize='person-name']") ||
            card.querySelector(".lt-line-clamp__line");
          const name = nameEl?.textContent?.trim() || "";
          if (!name || name === "LinkedIn Member") return;

          // Headline / title
          const headlineEl =
            card.querySelector(".lit-lockup__subtitle") ||
            card.querySelector(".artdeco-entity-lockup__caption") ||
            card.querySelector(".org-people-profile-card__profile-position");
          const headline = headlineEl?.textContent?.trim() || "";

          // Profile URL
          const linkEl = card.querySelector<HTMLAnchorElement>("a[href*='/in/']");
          const raw = linkEl?.href || "";
          const match = raw.match(/linkedin\.com\/in\/([^/?#]+)/);
          if (!match) return;
          const linkedinUrl = `https://www.linkedin.com/in/${match[1]}/`;

          if (seen.has(linkedinUrl)) return;
          seen.add(linkedinUrl);

          results.push({ name, headline, linkedinUrl });
        });

        return results;
      },
    })
    .then((res) => (res?.[0]?.result as PersonCard[]) ?? [])
    .catch(() => []);
}

export function scrollPeoplePage(tabId: number): Promise<void> {
  const scrollPromise = chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        // Incremental scroll to trigger lazy-loading at each viewport boundary.
        // A single jump to bottom skips intermediate load triggers on LinkedIn.
        return new Promise<void>((resolve) => {
          const totalHeight = document.body.scrollHeight;
          const viewportHeight = window.innerHeight;
          let current = window.scrollY;
          const step = Math.max(viewportHeight * 0.7, 400);

          // Guard: if page has no scrollable content, resolve immediately
          if (totalHeight <= viewportHeight || totalHeight === 0) {
            window.scrollTo(0, totalHeight);
            resolve();
            return;
          }

          function doScroll() {
            current = Math.min(current + step, totalHeight);
            window.scrollTo({ top: current, behavior: "smooth" });
            if (current < totalHeight) {
              setTimeout(doScroll, 300 + Math.random() * 200);
            } else {
              resolve();
            }
          }

          doScroll();
        });
      },
    })
    .then(() => undefined);

  // Race against a timeout — if the injected script never resolves
  // (tab navigated, LinkedIn unresponsive, CAPTCHA), unblock the loop.
  return Promise.race([
    scrollPromise,
    new Promise<void>((resolve) => {
      setTimeout(() => {
        console.warn(`[scrollPeoplePage] Timeout after ${SCROLL_TIMEOUT_MS}ms for tab ${tabId}`);
        resolve();
      }, SCROLL_TIMEOUT_MS);
    }),
  ]).catch(() => undefined);
}

export function clickShowMorePeople(tabId: number): Promise<boolean> {
  return chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        const el = Array.from(
          document.querySelectorAll<HTMLElement>("button, a")
        ).find((el) => {
          const text = el.textContent?.trim().toLowerCase() || "";
          // Skip navigation links that leave the people page
          if (el.tagName === "A") {
            const href = (el as HTMLAnchorElement).href || "";
            if (href.includes("/search/results/")) return false;
          }
          return (
            text.includes("show more results") ||
            text.includes("show more") ||
            text.includes("show all") ||
            text.includes("see all") ||
            text.includes("load more")
          );
        });
        if (el) {
          if (el.tagName === "BUTTON" && (el as HTMLButtonElement).disabled) {
            return false;
          }
          el.click();
          return true;
        }
        return false;
      },
    })
    .then((res) => (res?.[0]?.result as boolean) ?? false)
    .catch(() => false);
}

/**
 * Detect if LinkedIn is blocking the people page (auth wall, CAPTCHA, redirect).
 * Returns a human-readable reason string, or null if the page looks normal.
 */
export function detectPeoplePageBlocker(tabId: number): Promise<string | null> {
  return chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        const url = window.location.href;

        if (url.includes("/login") || url.includes("/authwall") || url.includes("/checkpoint")) {
          return "LinkedIn login wall detected";
        }

        if (url.includes("/checkpoint/challenge") || document.querySelector("#captcha-internal")) {
          return "LinkedIn CAPTCHA challenge detected";
        }

        const bodyText = document.body.innerText || "";
        if (
          bodyText.includes("Sign in to view") ||
          bodyText.includes("Join now to see") ||
          bodyText.includes("Sign in to LinkedIn")
        ) {
          const cards = document.querySelectorAll(
            ".org-people-profile-card, .artdeco-entity-lockup"
          );
          if (cards.length === 0) {
            return "LinkedIn requires sign-in to view this page";
          }
        }

        return null;
      },
    })
    .then((res) => (res?.[0]?.result as string | null) ?? null)
    .catch(() => null);
}

async function notifyWebApp(action: string, data: Record<string, unknown>) {
  try {
    // Derive the app origin from GRAPHQL_URL so this works in any environment
    // (dev, staging, prod) without hardcoding a port.
    const appOrigin = new URL(GRAPHQL_URL).origin;
    const tabs = await chrome.tabs.query({
      url: [`${appOrigin}/*`],
    });
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          source: "lead-gen-bg",
          action,
          ...data,
        }).catch(() => { /* tab may not have content script */ });
      }
    }
  } catch { /* ignore */ }
}

export async function browsePeople(tabId: number, companyId: number) {
  peopleCancelled = false;
  console.log(`[BrowsePeople] Starting for companyId=${companyId}, tab=${tabId}`);

  try {
    await Promise.race([
      browsePeopleInner(tabId, companyId),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Import timed out after 4 minutes")), BROWSE_PEOPLE_TIMEOUT_MS)
      ),
    ]);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[BrowsePeople] Fatal:", errMsg);
    chrome.tabs.remove(tabId).catch(() => {});
    await notifyWebApp("peopleScrapeError", { error: errMsg });
  }
}

async function browsePeopleInner(tabId: number, companyId: number) {
  await waitForTabLoad(tabId);
  // Extra wait for LinkedIn SPA to hydrate
  await randomDelay(3000);

  // Check for auth wall before starting
  const blocker = await detectPeoplePageBlocker(tabId);
  if (blocker) {
    console.warn(`[BrowsePeople] ${blocker}`);
    chrome.tabs.remove(tabId).catch(() => {});
    await notifyWebApp("peopleScrapeError", {
      error: `${blocker}. Make sure you are logged in to LinkedIn.`,
    });
    return;
  }

  const allCards: PersonCard[] = [];
  const seen = new Set<string>();
  const MAX_ROUNDS = 15;
  let consecutiveEmptyRounds = 0;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    if (!(await isTabAlive(tabId))) {
      console.warn("[BrowsePeople] Tab closed during scrape, aborting");
      await notifyWebApp("peopleScrapeError", {
        error: "LinkedIn tab was closed during scraping.",
      });
      return;
    }

    await scrollPeoplePage(tabId);
    if (peopleCancelled) break;

    await randomDelay(1500);

    const cards = await extractPeopleCards(tabId);
    let newCount = 0;
    for (const card of cards) {
      if (!seen.has(card.linkedinUrl)) {
        seen.add(card.linkedinUrl);
        allCards.push(card);
        newCount++;
      }
    }

    console.log(`[BrowsePeople] Round ${round + 1}: +${newCount} new (total ${allCards.length})`);
    await notifyWebApp("peopleScrapeProgress", {
      message: `Collecting… ${allCards.length} found`,
    });

    const clickedMore = await clickShowMorePeople(tabId);
    if (clickedMore) {
      await randomDelay(2000);
      if (newCount === 0) {
        consecutiveEmptyRounds++;
        if (consecutiveEmptyRounds >= 3) {
          console.log(`[BrowsePeople] 3 consecutive empty rounds despite "show more" — stopping`);
          break;
        }
      } else {
        consecutiveEmptyRounds = 0;
      }
    } else if (newCount === 0) {
      // No new cards and no "show more" — we're done
      break;
    } else {
      consecutiveEmptyRounds = 0;
    }
  }

  console.log(`[BrowsePeople] Collected ${allCards.length} people — importing...`);
  await notifyWebApp("peopleScrapeProgress", {
    message: `Importing ${allCards.length} contacts…`,
  });

  // Close the LinkedIn tab
  chrome.tabs.remove(tabId).catch(() => {});

  if (allCards.length === 0) {
    await notifyWebApp("peopleScrapeError", {
      error: "No people found on the LinkedIn page. Make sure you are logged in to LinkedIn.",
    });
    return;
  }

  // Build contact input list
  const contacts = allCards.map((card) => {
    const parts = card.name.trim().split(/\s+/);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";
    return {
      firstName,
      lastName,
      linkedinUrl: card.linkedinUrl,
      position: card.headline || undefined,
      companyId,
      email: null,
      company: null,
    };
  });

  try {
    const result = await gqlRequest(
      `mutation ImportContacts($contacts: [ContactInput!]!) {
        importContacts(contacts: $contacts) { success imported failed errors }
      }`,
      { contacts },
    );

    const res = result.data?.importContacts;
    if (res) {
      console.log(`[BrowsePeople] Imported ${res.imported}, failed ${res.failed}`);
      await notifyWebApp("peopleScrapeComplete", {
        imported: res.imported,
        failed: res.failed,
      });
    } else {
      const errMsg = result.errors?.[0]?.message ?? "GraphQL error";
      console.error("[BrowsePeople] GQL error:", errMsg);
      await notifyWebApp("peopleScrapeError", { error: errMsg });
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[BrowsePeople] Import error:", errMsg);
    await notifyWebApp("peopleScrapeError", { error: errMsg });
  }
}

export async function importPeopleFromCurrentPage(
  tabId: number,
  companyName: string,
  companyLinkedinUrl: string,
) {
  console.log(`[ImportPeople] Starting for "${companyName}" on tab ${tabId}`);

  try {
    // Verify tab is still alive before starting
    if (!(await isTabAlive(tabId))) {
      console.warn("[ImportPeople] Tab no longer exists, aborting");
      return;
    }

    // Ensure we're on the /people/ page
    const tab = await chrome.tabs.get(tabId);
    const currentUrl = tab.url || "";
    if (!currentUrl.includes("/people")) {
      const peopleUrl = companyLinkedinUrl.replace(/\/$/, "") + "/people/";
      await safeTabUpdate(tabId, { url: peopleUrl });
      await waitForTabLoad(tabId);
      // LinkedIn SPA needs extra time to hydrate the people list
      await randomDelay(4000);
    } else {
      await randomDelay(2500);
    }

    const blocker2 = await detectPeoplePageBlocker(tabId);
    if (blocker2) {
      console.warn(`[ImportPeople] ${blocker2}`);
      await safeSendMessage(tabId, {
        action: "importPeopleError",
        error: `${blocker2}. Make sure you are logged in.`,
      });
      return;
    }

    peopleCancelled = false;
    const allCards: PersonCard[] = [];
    const seen = new Set<string>();
    const MAX_ROUNDS = 15;
    let consecutiveEmptyRounds = 0;

    for (let round = 0; round < MAX_ROUNDS; round++) {
      if (peopleCancelled) break;

      // Check tab still exists each round
      if (!(await isTabAlive(tabId))) {
        console.warn("[ImportPeople] Tab closed during scrape, aborting");
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

      console.log(`[ImportPeople] Round ${round + 1}: +${newCount} new (total ${allCards.length})`);

      await safeSendMessage(tabId, {
        action: "importPeopleProgress",
        message: `Collecting... ${allCards.length} found`,
      });

      const clickedMore = await clickShowMorePeople(tabId);
      if (clickedMore) {
        consecutiveEmptyRounds = 0;
        await randomDelay(2500);
      } else if (newCount === 0) {
        consecutiveEmptyRounds++;
        // Break after 2 consecutive empty rounds to handle slow loading
        if (consecutiveEmptyRounds >= 2) break;
        await randomDelay(1500);
      } else {
        consecutiveEmptyRounds = 0;
      }
    }

    if (allCards.length === 0) {
      await safeSendMessage(tabId, {
        action: "importPeopleError",
        error: "No people found. Make sure you are logged in.",
      });
      return;
    }

    console.log(`[ImportPeople] Collected ${allCards.length} people — importing...`);

    await safeSendMessage(tabId, {
      action: "importPeopleProgress",
      message: `Importing ${allCards.length} contacts...`,
    });

    const contactInputs = allCards.map((card) => ({
      name: card.name,
      linkedinUrl: card.linkedinUrl,
      workEmail: null,
      headline: card.headline || null,
    }));

    const result = await gqlRequest(
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

    const res = result.data?.importCompanyWithContacts;
    if (res?.success) {
      console.log(`[ImportPeople] Imported ${res.contactsImported}, skipped ${res.contactsSkipped}`);
      await safeSendMessage(tabId, {
        action: "importPeopleDone",
        imported: res.contactsImported,
        skipped: res.contactsSkipped,
        companyId: res.company?.id,
      });
    } else {
      const errMsg = res?.errors?.[0] || result.errors?.[0]?.message || "Import failed";
      console.error("[ImportPeople] Error:", errMsg);
      await safeSendMessage(tabId, {
        action: "importPeopleError",
        error: errMsg,
      });
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[ImportPeople] Unexpected error:", errMsg);
    await safeSendMessage(tabId, {
      action: "importPeopleError",
      error: errMsg,
    });
  }
}
