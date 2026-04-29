// ── Profile Browsing Engine ──────────────────────────────────────────

import { gqlRequest } from "../../services/graphql";
import { scrapeContactPostsSingle } from "../../services/post-scraper";
import { recordVisit, filterRecentlyVisited } from "../../services/visit-tracker";
import {
  recordBrowsemap,
  type BrowsemapRecommendation,
} from "../../services/browsemap-tracker";
import {
  getCachedSelfProfileSlug,
  slugFromLinkedInUrl,
} from "../../services/self-profile";
import { randomDelay, waitForTabLoad, clickSeeMore } from "./tab-utils";

const VISIT_SKIP_WINDOW_DAYS = 1;

let browseCancelled = false;

export function setBrowseCancelled(value: boolean) {
  browseCancelled = value;
}

function extractProfileData(tabId: number): Promise<{
  name: string;
  headline: string;
  location: string;
  linkedinUrl: string;
  pageTitle: string;
} | null> {
  return chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        // Name: try several selectors (LinkedIn rotates the top-card markup
        // between text-heading-xlarge, SDUI componentkey-prefixed h1s, and
        // plain `main h1`). Last-resort fallback parses document.title which
        // LinkedIn formats as "Name - Headline | LinkedIn" or "(N) Name | …".
        const nameSelectors = [
          "h1.text-heading-xlarge",
          "main h1.inline",
          "section h1",
          "main h1",
          "h1",
        ];
        let name = "";
        for (const sel of nameSelectors) {
          const el = document.querySelector(sel);
          const txt = el?.textContent?.trim();
          if (txt) { name = txt; break; }
        }
        if (!name && document.title) {
          // "(3) Vadim Nicolai - Software Engineer | LinkedIn" → "Vadim Nicolai"
          const t = document.title.replace(/^\(\d+\)\s*/, "");
          const cut = t.split(/\s[-|]\s/)[0]?.trim();
          if (cut && cut !== "LinkedIn") name = cut;
        }

        const headlineEl =
          document.querySelector(".text-body-medium.break-words") ||
          document.querySelector("main .text-body-medium") ||
          document.querySelector("section .text-body-medium");
        const locationEl =
          document.querySelector(
            "span.text-body-small.inline.t-black--light.break-words",
          ) ||
          document.querySelector("main .text-body-small.t-black--light");

        return {
          name,
          headline: headlineEl?.textContent?.trim() || "",
          location: locationEl?.textContent?.trim() || "",
          linkedinUrl: window.location.href.split("?")[0],
          pageTitle: document.title || "",
        };
      },
    })
    .then((results) => results?.[0]?.result ?? null)
    .catch(() => null);
}

export function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: "Unknown", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function parseHeadline(headline: string): {
  position: string;
  company: string;
} {
  // Try splitting on common separators: " at ", " @ ", " | "
  for (const sep of [" at ", " @ ", " | "]) {
    const idx = headline.toLowerCase().indexOf(sep);
    if (idx > 0) {
      return {
        position: headline.slice(0, idx).trim(),
        company: headline.slice(idx + sep.length).trim(),
      };
    }
  }
  return { position: headline, company: "" };
}

export interface FullProfileData {
  name: string;
  headline: string;
  location: string;
  linkedinUrl: string;
  about: string;
  currentCompany: string;
  currentCompanyLinkedinUrl: string;
}

export function extractFullProfileData(tabId: number): Promise<FullProfileData | null> {
  return chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        const nameEl =
          document.querySelector("h1.text-heading-xlarge") ||
          document.querySelector("h1");
        const headlineEl = document.querySelector(
          ".text-body-medium.break-words",
        );
        const locationEl = document.querySelector(
          "span.text-body-small.inline.t-black--light.break-words",
        );

        // About section — try multiple selectors LinkedIn has used
        const aboutSection =
          document.querySelector("#about")?.closest("section") ||
          document.querySelector("section.pv-about-section");
        let about = "";
        if (aboutSection) {
          const spans = aboutSection.querySelectorAll(
            ".display-flex .visually-hidden, .pv-shared-text-with-see-more span[aria-hidden='true']",
          );
          if (spans.length > 0) {
            about = Array.from(spans).map((s) => s.textContent?.trim()).filter(Boolean).join("\n");
          }
          if (!about) {
            const textEl = aboutSection.querySelector(".inline-show-more-text, .pv-shared-text-with-see-more");
            about = textEl?.textContent?.trim() || "";
          }
        }

        // Current company — try the top-card company link first
        let currentCompany = "";
        let currentCompanyLinkedinUrl = "";

        const companyLink = document.querySelector<HTMLAnchorElement>(
          'div.pv-text-details__right-panel a[href*="/company/"]',
        );
        if (companyLink) {
          currentCompany = companyLink.textContent?.trim() || "";
          currentCompanyLinkedinUrl = companyLink.href.split("?")[0].replace(/\/$/, "");
        }

        // Fallback: first experience entry
        if (!currentCompany) {
          const expSection =
            document.querySelector("#experience")?.closest("section");
          if (expSection) {
            const firstLink = expSection.querySelector<HTMLAnchorElement>(
              'a[href*="/company/"]',
            );
            if (firstLink) {
              currentCompany = firstLink.textContent?.trim() || "";
              currentCompanyLinkedinUrl = firstLink.href.split("?")[0].replace(/\/$/, "");
            }
          }
        }

        return {
          name: nameEl?.textContent?.trim() || "",
          headline: headlineEl?.textContent?.trim() || "",
          location: locationEl?.textContent?.trim() || "",
          linkedinUrl: window.location.href.split("?")[0],
          about,
          currentCompany,
          currentCompanyLinkedinUrl,
        };
      },
    })
    .then((results) => (results?.[0]?.result as FullProfileData | null) ?? null)
    .catch(() => null);
}

// Capture LinkedIn's "More profiles for you" sidebar (browsemap) — adjacent
// recruiters that LinkedIn co-recommends with the one we just visited.
// Stable hooks: section[componentkey^="profileAsideBrowsemap"], with a fallback
// to the h3 text. Class names rotate constantly, so we never match on them.
export async function extractBrowsemapSidebar(
  tabId: number,
): Promise<BrowsemapRecommendation[]> {
  const selfSlug = (await getCachedSelfProfileSlug()) ?? "";
  return chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      args: [selfSlug],
      func: (selfSlugArg: string) => {
        let section: Element | null = document.querySelector(
          'section[componentkey^="profileAsideBrowsemap"]',
        );
        if (!section) {
          const h3s = Array.from(document.querySelectorAll("h3"));
          const heading = h3s.find(
            (h) => h.textContent?.trim() === "More profiles for you",
          );
          section = heading?.closest("section") ?? null;
        }
        if (!section) return [];

        const anchors = Array.from(
          section.querySelectorAll<HTMLAnchorElement>('a[href*="/in/"]'),
        ).filter((a) => !a.href.includes("/overlay/"));

        const seen = new Set<string>();
        const out: Array<{
          profile_url: string;
          slug: string;
          name: string;
          headline: string | null;
          degree: string | null;
          is_verified: boolean;
          is_premium: boolean;
          avatar_url: string | null;
          position: number;
        }> = [];

        for (const a of anchors) {
          const profileUrl = a.href.split("?")[0].replace(/\/$/, "") + "/";
          if (seen.has(profileUrl)) continue;
          const slugMatch = profileUrl.match(/\/in\/([^/?]+)/);
          if (!slugMatch) continue;
          const slug = slugMatch[1];
          if (selfSlugArg && slug === selfSlugArg) continue;

          // Walk up to the row container (the wrapping div with the avatar +
          // text). The outer <a> wraps a <figure> + a text block with <p> tags.
          const card = a.closest("div, article, li") ?? a;

          // Name: prefer the inner <a> link text (excludes verified/premium spans)
          let name = "";
          const nameAnchor = a.querySelector<HTMLAnchorElement>("a[href*='/in/']");
          if (nameAnchor) {
            // Get only direct text nodes + linkified text, skip role=img spans
            const clone = nameAnchor.cloneNode(true) as HTMLElement;
            clone.querySelectorAll("span[role='img']").forEach((s) => s.remove());
            name = clone.textContent?.trim() ?? "";
          }
          if (!name) {
            // Fallback: first <p> text inside the anchor
            const firstP = a.querySelector("p");
            name = firstP?.textContent?.trim().replace(/\s+/g, " ") ?? "";
          }
          if (!name) continue;

          // Paragraphs inside the card. Order is: name-p, degree-p, headline-p
          const paragraphs = Array.from(card.querySelectorAll("p"))
            .map((p) => p.textContent?.trim() ?? "")
            .filter((t) => t.length > 0);

          const degreeP = paragraphs.find((t) => /^[·•]/.test(t));
          const degree = degreeP ? degreeP.replace(/^[·•]\s*/, "").trim() : null;

          // Headline: the longest paragraph that isn't the name and isn't the degree
          let headline: string | null = null;
          for (const t of paragraphs) {
            if (t === degreeP) continue;
            if (t === name) continue;
            if (t.startsWith(name)) continue; // sometimes name+verified concat
            if (!headline || t.length > headline.length) headline = t;
          }

          const isVerified = !!card.querySelector(
            "span[role='img'][aria-label='Verified']",
          );
          const isPremium = !!card.querySelector(
            "span[role='img'][aria-label='Premium']",
          );

          let avatarUrl: string | null = null;
          const img = card.querySelector<HTMLImageElement>("img");
          if (img && img.src && img.src.includes("media.licdn.com")) {
            avatarUrl = img.src;
          }

          seen.add(profileUrl);
          out.push({
            profile_url: profileUrl,
            slug,
            name,
            headline,
            degree,
            is_verified: isVerified,
            is_premium: isPremium,
            avatar_url: avatarUrl,
            position: out.length,
          });
        }

        return out;
      },
    })
    .then(
      (results) =>
        (results?.[0]?.result as BrowsemapRecommendation[] | undefined) ?? [],
    )
    .catch(() => [] as BrowsemapRecommendation[]);
}

// Recruitment definition mirrors backend/leadgen_agent/classify_recruitment_graph.py:
// agencies, staffing, executive search/headhunting, RPO, talent marketplaces.
// Used as a post-extraction double-check — content-side card text can match
// loosely (e.g. a feed post that quotes a recruiter), this gates the save
// on signal directly from the profile's own headline/current company.
const RECRUITMENT_SIGNAL = [
  /\brecruit(?:er|ers|ing|ment)?\b/i,
  /\btalent\s+(?:acquisition|partner|sourcer|sourcing|specialist|advisor|consultant|manager|lead)\b/i,
  /\bhead[\s-]?hunt(?:er|ing)?\b/i,
  /\bexec(?:utive)?\s+search\b/i,
  /\bsourcer\b/i,
  /\bstaffing\b/i,
  /\bplacement\s+(?:agency|consultant)\b/i,
  /\brpo\b/i,
  /\btalent\s+(?:marketplace|network)\b/i,
];

function recruiterSignalMatch(headline: string, company: string): RegExp | null {
  const blob = `${headline} ${company}`;
  for (const re of RECRUITMENT_SIGNAL) {
    if (re.test(blob)) return re;
  }
  return null;
}

export async function browseProfiles(
  tabId: number,
  profiles: string[],
  returnUrl: string,
  options?: { ignoreDedup?: boolean },
) {
  browseCancelled = false;
  let saved = 0;
  let skippedNonRecruiter = 0;
  let skippedNoData = 0;
  let skippedSaveFailed = 0;
  let skippedRecentlyVisited = 0;
  let postsScraped = 0;
  let postsScrapeFailed = 0;
  const runStart = Date.now();

  // Hard-exclude the active session's own profile. Content-script filter
  // already drops it at the source, but the Voyager all-pages traversal
  // reaches here without that filter — this is the single chokepoint.
  const selfSlug = await getCachedSelfProfileSlug();
  if (selfSlug) {
    const before = profiles.length;
    profiles = profiles.filter((url) => slugFromLinkedInUrl(url) !== selfSlug);
    if (before !== profiles.length) {
      console.log(
        `[BrowseProfiles] Pre-filtered self (${selfSlug}): ${before} → ${profiles.length} candidates`,
      );
    }
  } else {
    console.warn(
      `[BrowseProfiles] No cached self slug — cannot exclude self profile. Visit /feed/ once to seed cache.`,
    );
  }

  console.log(
    `[BrowseProfiles] === Starting recruiter loop: ${profiles.length} profiles, returnUrl=${returnUrl} ===`,
  );

  // Pre-flight dedup: ask D1 which of these URLs were visited within the
  // skip window. Any error returns an empty Set, so the loop falls back to
  // its old behavior (visit every profile). When ignoreDedup=true (Shift-click
  // escape hatch), skip the lookup entirely and visit every profile.
  let recentlyVisited: Set<string>;
  if (options?.ignoreDedup === true) {
    console.log(
      `[BrowseProfiles] ignoreDedup=true — skipping pre-flight visit lookup`,
    );
    recentlyVisited = new Set<string>();
  } else {
    recentlyVisited = await filterRecentlyVisited(
      profiles,
      VISIT_SKIP_WINDOW_DAYS,
    );
    console.log(
      `[BrowseProfiles] Pre-flight: ${recentlyVisited.size}/${profiles.length} visited within ${VISIT_SKIP_WINDOW_DAYS}d — will skip`,
    );
  }

  for (let i = 0; i < profiles.length; i++) {
    if (browseCancelled) {
      console.warn(`[BrowseProfiles] Cancelled at ${i}/${profiles.length}`);
      break;
    }

    const profileUrl = profiles[i];

    if (recentlyVisited.has(profileUrl)) {
      skippedRecentlyVisited++;
      console.log(
        `[BrowseProfiles] ── ${i + 1}/${profiles.length} ── ${profileUrl}\n` +
          `[BrowseProfiles]   ✗ Already visited within ${VISIT_SKIP_WINDOW_DAYS}d — skipping`,
      );
      continue;
    }
    const profileStart = Date.now();
    console.log(
      `[BrowseProfiles] ── ${i + 1}/${profiles.length} ── ${profileUrl}`,
    );

    // Navigate to profile
    try {
      await chrome.tabs.update(tabId, { url: profileUrl });
    } catch {
      console.warn("[BrowseProfiles] Tab closed during navigation, aborting");
      break;
    }
    await waitForTabLoad(tabId);
    console.log(`[BrowseProfiles]   ↳ Tab loaded, hydrating SPA…`);

    // Wait for LinkedIn SPA content to render
    await randomDelay(2500);

    // Expand "See more" sections
    const expanded = await clickSeeMore(tabId);
    if (expanded > 0) {
      console.log(`[BrowseProfiles]   ↳ Clicked ${expanded} "See more" buttons`);
      await randomDelay(800);
    }

    // Extract profile data
    const data = await extractProfileData(tabId);
    if (!data || !data.name) {
      skippedNoData++;
      // Don't recordVisit() here — no-data is a transient extraction failure
      // (auth wall, slow render, selector rot). Recording it would poison the
      // 24h dedup set and skip the URL on every subsequent run.
      console.warn(
        `[BrowseProfiles]   ✗ No name extracted — skipping (NOT recorded, will retry next run)\n` +
          `[BrowseProfiles]     pageTitle="${data?.pageTitle ?? "(no data)"}" headline="${data?.headline ?? ""}" url=${profileUrl}`,
      );
      await randomDelay(2000);
      continue;
    }

    const { firstName, lastName } = parseName(data.name);
    const { position, company } = parseHeadline(data.headline);
    console.log(
      `[BrowseProfiles]   ↳ Extracted: name="${data.name}" headline="${data.headline}" location="${data.location}" → parsed position="${position}" company="${company}"`,
    );

    // Send progress to content script (may fail if on profile page — that's fine)
    try {
      await chrome.tabs.sendMessage(tabId, {
        action: "browseProgress",
        current: i + 1,
        total: profiles.length,
        name: firstName,
      });
    } catch { /* content script not on search page */ }

    // Capture the "More profiles for you" sidebar — fire-and-forget so the
    // recruiter loop's pacing stays unchanged. Runs even on profiles we
    // ultimately skip below; LinkedIn's recommendation edge is still useful.
    extractBrowsemapSidebar(tabId)
      .then((recs) => {
        if (recs.length > 0) {
          console.log(
            `[BrowseProfiles]   ↳ Browsemap: captured ${recs.length} suggestions`,
          );
          void recordBrowsemap(profileUrl, recs);
        }
      })
      .catch(() => { /* swallow */ });

    // Stage 3 recruiter re-check removed: the upstream content-side filter
    // (linkedin-helper.ts RECRUITMENT_PATTERNS) is a strict superset of the
    // patterns we had here AND runs against the full card text (headline +
    // sub-headline + tags + sidebar context), whereas this gate could only
    // see `headline` (parseHeadline's `company` is just a slice of headline).
    // Net effect was zero true-positive recovery + false-negative loss on
    // creative headlines like "Helping AI startups hire fast". Trust Stage 1.
    console.log(
      `[BrowseProfiles]   ↳ headline="${data.headline}" — proceeding to save`,
    );

    // Save contact via GraphQL
    let newContactId: number | null = null;
    try {
      console.log(`[BrowseProfiles]   ↳ createContact → Neon (GraphQL)…`);
      const result = await gqlRequest(
        `mutation CreateContact($input: CreateContactInput!) {
          createContact(input: $input) { id firstName lastName }
        }`,
        {
          input: {
            firstName,
            lastName: lastName || undefined,
            linkedinUrl: data.linkedinUrl,
            position: position || undefined,
            tags: ["linkedin-browse", "ai-recruiter"],
          },
        },
      );

      if (result.data?.createContact?.id) {
        saved++;
        newContactId = Number(result.data.createContact.id);
        console.log(
          `[BrowseProfiles]   ✓ Saved contact id=${newContactId}: ${firstName} ${lastName}`,
        );
      } else if (result.errors) {
        skippedSaveFailed++;
        console.warn(
          `[BrowseProfiles]   ✗ createContact GQL error:`,
          result.errors[0].message,
        );
      } else {
        skippedSaveFailed++;
        console.warn(
          `[BrowseProfiles]   ✗ createContact returned no id (probably duplicate linkedin_url)`,
        );
      }
    } catch (err) {
      skippedSaveFailed++;
      console.error(
        `[BrowseProfiles]   ✗ createContact threw:`,
        err instanceof Error ? err.message : String(err),
      );
    }

    // Post-save: scrape recruiter's posts → D1 only (best effort, non-blocking).
    // scrapeContactPostsSingle() navigates to /recent-activity/all/, posts to
    // LINKEDIN_API/posts (Cloudflare Worker → D1), then pulls likes. If the
    // worker is unreachable, it bails early and we just continue the loop.
    if (newContactId !== null && !browseCancelled) {
      const postScrapeStart = Date.now();
      console.log(
        `[BrowseProfiles]   ↳ Scraping posts → D1 for contactId=${newContactId}…`,
      );
      try {
        await scrapeContactPostsSingle(
          tabId,
          newContactId,
          data.linkedinUrl,
          `${firstName} ${lastName}`.trim(),
        );
        postsScraped++;
        console.log(
          `[BrowseProfiles]   ✓ Post-scrape complete for contactId=${newContactId} in ${Date.now() - postScrapeStart}ms`,
        );
      } catch (err) {
        postsScrapeFailed++;
        console.warn(
          `[BrowseProfiles]   ✗ Post-scrape threw for ${data.name} — continuing:`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    // Audit: record the visit. ok=true if the contact landed; failures here
    // (createContact GQL error / duplicate URL) keep ok=false so a sooner
    // re-attempt is allowed once the issue is fixed.
    await recordVisit(
      newContactId,
      profileUrl,
      newContactId !== null,
      newContactId !== null ? undefined : "save-failed",
    );

    console.log(
      `[BrowseProfiles] ── Profile ${i + 1} done in ${Date.now() - profileStart}ms ──`,
    );

    // Dwell — remaining time up to ~5s total (already spent ~2.5s waiting for render)
    await randomDelay(2500);
  }

  // Navigate back to search results
  console.log(
    `[BrowseProfiles] Loop done — navigating back to ${returnUrl}`,
  );
  await chrome.tabs.update(tabId, { url: returnUrl });
  await waitForTabLoad(tabId);

  // Wait for content script to re-inject, then send done message
  await randomDelay(2000);
  try {
    await chrome.tabs.sendMessage(tabId, {
      action: "browseDone",
      saved,
    });
  } catch { /* content script may not be ready */ }

  const elapsedSec = Math.round((Date.now() - runStart) / 1000);
  console.log(
    `[BrowseProfiles] === Complete in ${elapsedSec}s ===\n  visited: ${profiles.length}\n  saved: ${saved}\n  skipped(recently-visited): ${skippedRecentlyVisited}\n  skipped(non-recruiter): ${skippedNonRecruiter}\n  skipped(no-data): ${skippedNoData}\n  skipped(save-failed): ${skippedSaveFailed}\n  posts-scraped: ${postsScraped}\n  posts-scrape-failed: ${postsScrapeFailed}`,
  );
}
