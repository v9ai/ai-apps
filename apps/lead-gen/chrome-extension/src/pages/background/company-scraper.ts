// ── Full Company Profile Scraper ─────────────────────────────────────
// Orchestrates scraping all LinkedIn company tabs: About → Posts → Jobs → People

import { extractCompanyData, saveCompanyBatch } from "./company-browsing";
import { extractPeopleCards, scrollPeoplePage, clickShowMorePeople, type PersonCard } from "./people-scraping";
import { randomDelay, waitForTabLoad, isTabAlive, safeTabUpdate, safeSendMessage } from "./tab-utils";
import { gqlRequest } from "../../services/graphql";
import { searchJobs, getJobPostingDetail, type VoyagerJobCard } from "../../services/voyager-jobs";
import { discoverHiringContacts } from "../../services/voyager-hiring";

// ── Cancellation ────────────────────────────────────────────────────

let cancelled = false;

export function setCompanyScraperCancelled(value: boolean) {
  cancelled = value;
}

// ── Helpers ─────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`[CompanyScraper] ${msg}`);
}

async function reportProgress(tabId: number, message: string) {
  log(message);
  try { chrome.runtime.sendMessage({ action: "companyScrapingProgress", message }); } catch { /* popup closed */ }
  await safeSendMessage(tabId, { action: "companyScrapingProgress", message });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Extract LinkedIn numeric company ID from the current page DOM. */
function extractNumericId(tabId: number): Promise<string | null> {
  return chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        // 1. data-urn attributes
        const urnEl = document.querySelector(
          '[data-urn*="urn:li:fsd_company:"], [data-urn*="urn:li:company:"]',
        );
        if (urnEl) {
          const m = (urnEl.getAttribute("data-urn") || "").match(/urn:li:(?:fsd_)?company:(\d+)/);
          if (m) return m[1];
        }
        // 2. embedded JSON in script tags
        for (const script of document.querySelectorAll("script")) {
          const t = script.textContent || "";
          const m = t.match(/"companyId"\s*:\s*(\d+)/) ||
            t.match(/"objectUrn"\s*:\s*"urn:li:(?:fsd_)?company:(\d+)"/) ||
            t.match(/urn:li:(?:fsd_)?company:(\d+)/);
          if (m) return m[1] || m[2];
        }
        // 3. meta/link tags
        for (const el of document.querySelectorAll('meta[content*="company"], link[href*="company"]')) {
          const val = el.getAttribute("content") || el.getAttribute("href") || "";
          const m = val.match(/company[:/](\d+)/);
          if (m) return m[1];
        }
        return null;
      },
    })
    .then((r) => (r?.[0]?.result as string | null) ?? null)
    .catch(() => null);
}

/** Derive a usable company name: prefer extracted data, fall back to URL slug. */
function resolveCompanyName(name: string | undefined, baseUrl: string): string {
  if (name) return name;
  const slug = baseUrl.split("/company/")[1] || "";
  // Convert slug "acme-corp" → "Acme Corp"
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Unknown";
}

// ── Types ───────────────────────────────────────────────────────────

export interface CompanyScraperResult {
  companyName: string | null;
  aboutSaved: boolean;
  postsSaved: number;
  jobsSaved: number;
  hiringContactsSaved: number;
  peopleSaved: number;
  errors: string[];
}

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

// ── Main orchestrator ───────────────────────────────────────────────

export async function scrapeCompanyFull(tabId: number): Promise<CompanyScraperResult> {
  cancelled = false;
  const result: CompanyScraperResult = {
    companyName: null,
    aboutSaved: false,
    postsSaved: 0,
    jobsSaved: 0,
    hiringContactsSaved: 0,
    peopleSaved: 0,
    errors: [],
  };

  try {
    // ── Resolve base URL ────────────────────────────────────────────

    const tab = await chrome.tabs.get(tabId);
    const currentUrl = tab.url || "";
    const companyMatch = currentUrl.match(/(https:\/\/www\.linkedin\.com\/company\/[^/?#]+)/);
    if (!companyMatch) {
      result.errors.push("Not on a LinkedIn company page");
      await reportProgress(tabId, "Error: not on a LinkedIn company page");
      return result;
    }
    const baseUrl = companyMatch[1].replace(/\/$/, "");
    log(`Base URL: ${baseUrl}`);

    // ── Phase 1: About ────────────────────────────────────────────

    const companyData = await phaseAbout(tabId, baseUrl, currentUrl, result);

    if (cancelled) { await reportProgress(tabId, "Cancelled after Phase 1"); return result; }

    // Resolve company DB ID (non-blocking — null is fine)
    let companyId: number | null = null;
    if (companyData?.name) {
      try {
        const res = await gqlRequest(
          `query FindCompanyByName($name: String) {
            findCompany(name: $name) { found company { id name } }
          }`,
          { name: companyData.name },
        );
        companyId = res.data?.findCompany?.company?.id ?? null;
      } catch { /* non-critical */ }
    }

    // ── Phase 2: Posts ────────────────────────────────────────────

    await phasePosts(tabId, baseUrl, companyId, result);

    if (cancelled) { await reportProgress(tabId, "Cancelled after Phase 2"); return result; }

    // ── Phase 3: Jobs + Hiring Contacts ───────────────────────────

    await phaseJobs(tabId, baseUrl, companyData, companyId, result);

    if (cancelled) { await reportProgress(tabId, "Cancelled after Phase 3"); return result; }

    // ── Phase 4: People ───────────────────────────────────────────

    await phasePeople(tabId, baseUrl, companyData, result);

    // ── Summary ───────────────────────────────────────────────────

    const summary = [
      `Company: ${result.companyName || "unknown"}`,
      `About: ${result.aboutSaved ? "saved" : "failed"}`,
      `Posts: ${result.postsSaved}`,
      `Jobs: ${result.jobsSaved}`,
      `Hiring: ${result.hiringContactsSaved}`,
      `People: ${result.peopleSaved}`,
      result.errors.length > 0 ? `Errors: ${result.errors.length}` : "",
    ].filter(Boolean).join(" | ");

    await reportProgress(tabId, `Done — ${summary}`);
    try { chrome.runtime.sendMessage({ action: "companyScrapingDone", result }); } catch { /* popup closed */ }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Fatal: ${msg}`);
    log(`Fatal error: ${msg}`);
    try { chrome.runtime.sendMessage({ action: "companyScrapingDone", result }); } catch { /* */ }
  }

  return result;
}

// ── Phase 1: About ──────────────────────────────────────────────────

async function phaseAbout(
  tabId: number,
  baseUrl: string,
  currentUrl: string,
  result: CompanyScraperResult,
) {
  await reportProgress(tabId, "Phase 1/4: About — extracting company data…");

  try {
    if (!currentUrl.includes("/about")) {
      await safeTabUpdate(tabId, { url: `${baseUrl}/about/` });
      await waitForTabLoad(tabId);
      await randomDelay(3000);
    }

    const data = await extractCompanyData(tabId);
    if (!data?.name) {
      result.errors.push("Phase 1: failed to extract company data");
      await reportProgress(tabId, "Phase 1/4: About — FAILED");
      return null;
    }

    result.companyName = data.name;

    await saveCompanyBatch([{
      name: data.name,
      website: data.website || undefined,
      linkedin_url: data.linkedinUrl || undefined,
      description: data.description || undefined,
      location: data.location || undefined,
      industry: data.industry || undefined,
      size: data.size || undefined,
    }]);
    result.aboutSaved = true;
    await reportProgress(tabId, `Phase 1/4: About — extracted ${data.name}`);
    return data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Phase 1: ${msg}`);
    await reportProgress(tabId, `Phase 1/4: About — error: ${msg}`);
    return null;
  }
}

// ── Phase 2: Posts ──────────────────────────────────────────────────

async function phasePosts(
  tabId: number,
  baseUrl: string,
  companyId: number | null,
  result: CompanyScraperResult,
) {
  await reportProgress(tabId, "Phase 2/4: Posts — navigating…");

  try {
    await safeTabUpdate(tabId, { url: `${baseUrl}/posts/` });
    await waitForTabLoad(tabId);
    await randomDelay(3000);

    if (cancelled) return;
    if (!(await isTabAlive(tabId))) { result.errors.push("Phase 2: tab closed"); return; }

    const posts = await scrapeCompanyPosts(tabId);
    log(`Extracted ${posts.length} posts`);

    const inputs = posts
      .filter((p) => p.postUrl)
      .map((p) => ({
        url: p.postUrl!,
        type: "post" as const,
        companyId,
        content: p.postText || null,
        authorName: p.authorName || null,
        authorUrl: p.authorUrl || null,
        postedAt: p.postedDate || null,
        rawData: {
          reactions: p.reactionsCount,
          comments: p.commentsCount,
          reposts: p.repostsCount,
          mediaType: p.mediaType,
          isRepost: p.isRepost,
          originalAuthor: p.originalAuthor,
          authorSubtitle: p.authorSubtitle,
        },
      }));

    if (inputs.length > 0) {
      const res = await gqlRequest(
        `mutation UpsertCompanyPosts($inputs: [UpsertLinkedInPostInput!]!) {
          upsertLinkedInPosts(inputs: $inputs) { success inserted updated errors }
        }`,
        { inputs },
      );
      result.postsSaved = res.data?.upsertLinkedInPosts?.inserted ?? 0;
    }

    await reportProgress(tabId, `Phase 2/4: Posts — saved ${result.postsSaved} of ${posts.length} posts`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Phase 2: ${msg}`);
    await reportProgress(tabId, `Phase 2/4: Posts — error: ${msg}`);
  }
}

// ── Phase 3: Jobs + Hiring Contacts ─────────────────────────────────

interface CompanyDataLike {
  name?: string;
  linkedinUrl?: string;
  linkedinNumericId?: string;
  website?: string;
}

async function phaseJobs(
  tabId: number,
  baseUrl: string,
  companyData: CompanyDataLike | null,
  companyId: number | null,
  result: CompanyScraperResult,
) {
  await reportProgress(tabId, "Phase 3/4: Jobs — resolving company ID…");

  try {
    // Try multiple strategies for numeric ID
    let numericId = companyData?.linkedinNumericId || null;

    // Fallback: try current page (may still be on /posts/ from Phase 2)
    if (!numericId) {
      numericId = await extractNumericId(tabId);
      if (numericId) log(`Numeric ID from current page: ${numericId}`);
    }

    // Fallback: navigate to company home and try again
    if (!numericId) {
      await safeTabUpdate(tabId, { url: baseUrl });
      await waitForTabLoad(tabId);
      await randomDelay(2000);
      numericId = await extractNumericId(tabId);
      if (numericId) log(`Numeric ID from company home: ${numericId}`);
    }

    if (!numericId) {
      result.errors.push("Phase 3: no numeric ID found — skipping jobs");
      await reportProgress(tabId, "Phase 3/4: Jobs — skipped (no numeric ID)");
      return;
    }

    if (cancelled) return;

    // Fetch job cards via Voyager API
    await reportProgress(tabId, "Phase 3/4: Jobs — fetching via Voyager API…");
    const page1 = await searchJobs({ company: [numericId] }, { count: 25, start: 0 });
    let allJobs: VoyagerJobCard[] = [...page1.jobs];

    if (page1.paging.total > 25 && !cancelled) {
      await randomDelay(500);
      const page2 = await searchJobs({ company: [numericId] }, { count: 25, start: 25 });
      allJobs.push(...page2.jobs);
    }

    log(`Found ${allJobs.length} jobs (total: ${page1.paging.total})`);

    // Fetch full description for top 10
    const details = new Map<string, string>();
    for (const job of allJobs.slice(0, 10)) {
      if (cancelled) break;
      try {
        const detail = await getJobPostingDetail(job.jobPostingId);
        if (detail.fullDescription) details.set(job.jobPostingId, detail.fullDescription);
        await randomDelay(400);
      } catch (err) {
        log(`Job detail ${job.jobPostingId} failed: ${err}`);
      }
    }

    // Save jobs
    const jobInputs = allJobs.map((job) => ({
      url: `https://www.linkedin.com/jobs/view/${job.jobPostingId}/`,
      type: "job" as const,
      companyId,
      title: job.title,
      content: details.get(job.jobPostingId) || job.descriptionSnippet || null,
      location: job.formattedLocation || null,
      employmentType: job.employmentType || null,
      postedAt: job.listedAt || null,
      rawData: {
        easyApply: job.easyApply,
        applicantCount: job.applicantCount,
        workplaceType: job.workplaceType,
        salary: job.formattedSalary,
        state: job.state,
        experienceLevel: job.experienceLevel,
      },
    }));

    if (jobInputs.length > 0) {
      const res = await gqlRequest(
        `mutation UpsertCompanyJobs($inputs: [UpsertLinkedInPostInput!]!) {
          upsertLinkedInPosts(inputs: $inputs) { success inserted updated errors }
        }`,
        { inputs: jobInputs },
      );
      result.jobsSaved = res.data?.upsertLinkedInPosts?.inserted ?? 0;
    }

    // Discover hiring contacts
    if (!cancelled) {
      try {
        const hiring = await discoverHiringContacts(numericId, {
          maxJobs: 10,
          fetchHiringTeams: true,
          companyName: companyData?.name,
          onProgress: (step, count) => log(`Hiring: ${step} (${count})`),
        });

        const contactInputs = [
          ...hiring.hiringContacts.map((c) => ({
            name: `${c.firstName} ${c.lastName}`.trim(),
            linkedinUrl: c.linkedinUrl || null,
            workEmail: null,
            headline: c.title || null,
          })),
          ...hiring.recruiters.map((r) => ({
            name: `${r.firstName} ${r.lastName}`.trim(),
            linkedinUrl: r.linkedinUrl || null,
            workEmail: null,
            headline: r.headline || null,
          })),
        ].filter((c) => c.name);

        if (contactInputs.length > 0) {
          const name = resolveCompanyName(companyData?.name, baseUrl);
          const res = await gqlRequest(
            `mutation ImportHiringContacts($input: ImportCompanyWithContactsInput!) {
              importCompanyWithContacts(input: $input) { success contactsImported contactsSkipped errors }
            }`,
            {
              input: {
                companyName: name,
                linkedinUrl: companyData?.linkedinUrl || baseUrl,
                website: companyData?.website || null,
                contacts: contactInputs,
              },
            },
          );
          result.hiringContactsSaved = res.data?.importCompanyWithContacts?.contactsImported ?? 0;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Hiring: ${msg}`);
        log(`Hiring error: ${msg}`);
      }
    }

    await reportProgress(
      tabId,
      `Phase 3/4: Jobs — ${result.jobsSaved} jobs, ${result.hiringContactsSaved} hiring contacts`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Phase 3: ${msg}`);
    await reportProgress(tabId, `Phase 3/4: Jobs — error: ${msg}`);
  }
}

// ── Phase 4: People ─────────────────────────────────────────────────

async function phasePeople(
  tabId: number,
  baseUrl: string,
  companyData: CompanyDataLike | null,
  result: CompanyScraperResult,
) {
  await reportProgress(tabId, "Phase 4/4: People — navigating…");

  try {
    await safeTabUpdate(tabId, { url: `${baseUrl}/people/` });
    await waitForTabLoad(tabId);
    await randomDelay(3000);

    if (cancelled) return;
    if (!(await isTabAlive(tabId))) { result.errors.push("Phase 4: tab closed"); return; }

    const allCards: PersonCard[] = [];
    const seen = new Set<string>();
    const MAX_ROUNDS = 15;
    let consecutiveEmpty = 0;

    for (let round = 0; round < MAX_ROUNDS; round++) {
      if (cancelled) break;
      if (!(await isTabAlive(tabId))) break;

      await scrollPeoplePage(tabId);
      await randomDelay(1500);

      const cards = await extractPeopleCards(tabId);
      let newCount = 0;
      for (const card of cards) {
        if (card.linkedinUrl && !seen.has(card.linkedinUrl)) {
          seen.add(card.linkedinUrl);
          allCards.push(card);
          newCount++;
        }
      }

      log(`People round ${round + 1}: +${newCount} (total ${allCards.length})`);

      const clickedMore = await clickShowMorePeople(tabId);
      if (clickedMore) {
        consecutiveEmpty = 0;
        await randomDelay(2000);
      } else if (newCount === 0) {
        consecutiveEmpty++;
        if (consecutiveEmpty >= 2) break;
        await randomDelay(1500);
      } else {
        consecutiveEmpty = 0;
      }
    }

    if (allCards.length > 0) {
      const name = resolveCompanyName(companyData?.name, baseUrl);
      const contactInputs = allCards.map((card) => ({
        name: card.name,
        linkedinUrl: card.linkedinUrl,
        workEmail: null,
        headline: card.headline || null,
      }));

      const res = await gqlRequest(
        `mutation ImportCompanyPeople($input: ImportCompanyWithContactsInput!) {
          importCompanyWithContacts(input: $input) { success contactsImported contactsSkipped errors }
        }`,
        {
          input: {
            companyName: name,
            linkedinUrl: companyData?.linkedinUrl || baseUrl,
            website: companyData?.website || null,
            contacts: contactInputs,
          },
        },
      );
      result.peopleSaved = res.data?.importCompanyWithContacts?.contactsImported ?? 0;
    }

    await reportProgress(tabId, `Phase 4/4: People — imported ${result.peopleSaved} of ${allCards.length} found`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Phase 4: ${msg}`);
    await reportProgress(tabId, `Phase 4/4: People — error: ${msg}`);
  }
}

// ── Post extraction (Phase 2 DOM scraper) ───────────────────────────

async function scrapeCompanyPosts(tabId: number): Promise<ExtractedPost[]> {
  // Expand truncated posts
  await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: () => {
      document.querySelectorAll<HTMLElement>("button, a").forEach((el) => {
        const t = el.textContent?.trim().toLowerCase() || "";
        if ((t === "see more" || t === "…see more" || t === "...see more") && el.offsetParent !== null) {
          el.click();
        }
      });
    },
  }).catch(() => {});
  await sleep(800);

  // Scroll to load more posts (max 3 stale rounds)
  let prevHeight = 0;
  let stale = 0;
  while (stale < 3) {
    if (cancelled) break;

    const h = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => { window.scrollTo(0, document.body.scrollHeight); return document.body.scrollHeight; },
    }).then((r) => r?.[0]?.result ?? 0).catch(() => 0);

    await sleep(2000);

    if (h === prevHeight) stale++;
    else stale = 0;
    prevHeight = h;

    // Expand newly visible posts
    await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        document.querySelectorAll<HTMLElement>("button, a").forEach((el) => {
          const t = el.textContent?.trim().toLowerCase() || "";
          if ((t === "see more" || t === "…see more" || t === "...see more") && el.offsetParent !== null) el.click();
        });
      },
    }).catch(() => {});
    await sleep(300);
  }

  // Extract posts
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: () => {
      const posts: Array<{
        postUrl: string | null; postText: string; postedDate: string | null;
        reactionsCount: number; commentsCount: number; repostsCount: number;
        mediaType: string; isRepost: boolean; originalAuthor: string | null;
        authorName: string | null; authorUrl: string | null; authorSubtitle: string | null;
      }> = [];

      document.querySelectorAll(".feed-shared-update-v2, .occludable-update").forEach((el) => {
        if (el.querySelector(".feed-shared-update-v2__ad-badge")) return;
        if (el.querySelector('[data-test-id="feed-shared-update-v2__sponsored"]')) return;

        const textEl = el.querySelector(
          ".feed-shared-update-v2__description, .update-components-text, .feed-shared-text__text-view, .feed-shared-inline-show-more-text",
        );
        const postText = textEl?.textContent?.trim() || "";

        const timeEl = el.querySelector("time");
        const postedDate = timeEl?.getAttribute("datetime") ||
          el.querySelector(".update-components-actor__sub-description")?.textContent?.trim() || null;

        const parseCount = (sel: string, keyword: RegExp) => {
          const found = sel
            ? el.querySelector(sel)
            : Array.from(el.querySelectorAll("button, a")).find(
                (b) => keyword.test(b.textContent || "") && /\d/.test(b.textContent || ""),
              );
          return parseInt((found?.textContent || "0").replace(/[^0-9]/g, "")) || 0;
        };

        const reactionsCount = parseCount(
          ".social-details-social-counts__reactions-count, [data-test-id='social-actions__reaction-count']",
          /reaction/i,
        );
        const commentsCount = parseCount("", /comment/i);
        const repostsCount = parseCount("", /repost/i);

        let mediaType = "none";
        if (el.querySelector("video, .update-components-linkedin-video")) mediaType = "video";
        else if (el.querySelector(".update-components-article")) mediaType = "article";
        else if (el.querySelector(".update-components-document")) mediaType = "document";
        else if (el.querySelector(".update-components-poll")) mediaType = "poll";
        else if (el.querySelector(".feed-shared-image, .update-components-image, .ivm-image-view-model")) mediaType = "image";

        const headerEl = el.querySelector(".update-components-header__text-view, .update-components-header");
        const isRepost = /reposted/i.test(headerEl?.textContent || "");
        const originalAuthor = isRepost
          ? (el.querySelector(".update-components-actor__name")?.textContent?.trim() || null)
          : null;

        const authorName = el.querySelector(".update-components-actor__name")?.textContent?.trim() || null;
        const authorLinkEl = el.querySelector<HTMLAnchorElement>(
          ".update-components-actor__container-link, .update-components-actor__meta-link",
        );
        const authorUrl = authorLinkEl?.href?.split("?")[0] || null;
        const authorSubtitle = el.querySelector(
          ".update-components-actor__description, .update-components-actor__subtitle",
        )?.textContent?.trim() || null;

        const urn = el.getAttribute("data-urn") || el.querySelector("[data-urn]")?.getAttribute("data-urn");
        const postUrl = urn ? `https://www.linkedin.com/feed/update/${urn}/` : null;

        posts.push({
          postUrl, postText, postedDate, reactionsCount, commentsCount, repostsCount,
          mediaType, isRepost, originalAuthor, authorName, authorUrl, authorSubtitle,
        });
      });

      return posts;
    },
  });

  return (results?.[0]?.result ?? []) as ExtractedPost[];
}
