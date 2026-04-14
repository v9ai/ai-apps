// ── Full Company Profile Scraper ─────────────────────────────────────
// Orchestrates scraping all LinkedIn company tabs: About → Posts → Jobs → People
// Phase functions are exported so find-related BFS crawl can call them per-company.

import { extractCompanyData, saveCompanyBatch, resolveNumericIdViaVoyager } from "./company-browsing";
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

// External log callback — when set, phase function logs go into the BFS crawl log
let externalLog: ((msg: string) => void) | null = null;

export function setExternalLog(fn: ((msg: string) => void) | null) {
  externalLog = fn;
}

function log(msg: string) {
  console.log(`[CompanyScraper] ${msg}`);
  if (externalLog) externalLog(`[Scraper] ${msg}`);
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
export function extractNumericId(tabId: number): Promise<string | null> {
  return chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        const urnEl = document.querySelector(
          '[data-urn*="urn:li:fsd_company:"], [data-urn*="urn:li:company:"]',
        );
        if (urnEl) {
          const m = (urnEl.getAttribute("data-urn") || "").match(/urn:li:(?:fsd_)?company:(\d+)/);
          if (m) return m[1];
        }
        for (const script of document.querySelectorAll("script")) {
          const t = script.textContent || "";
          const m = t.match(/"companyId"\s*:\s*(\d+)/) ||
            t.match(/"objectUrn"\s*:\s*"urn:li:(?:fsd_)?company:(\d+)"/) ||
            t.match(/urn:li:(?:fsd_)?company:(\d+)/);
          if (m) return m[1] || m[2];
        }
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

/** Derive a usable company name from extracted data or URL slug. */
export function resolveCompanyName(name: string | undefined, baseUrl: string): string {
  if (name) return name;
  const slug = baseUrl.split("/company/")[1] || "";
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

export interface CompanyContext {
  name?: string;
  linkedinUrl?: string;
  linkedinNumericId?: string;
  website?: string;
}

export interface PhasePostsResult { saved: number; updated: number; total: number; error?: string }
export interface PhaseJobsResult { jobsSaved: number; jobsUpdated: number; hiringContactsSaved: number; error?: string }
export interface PhasePeopleResult { saved: number; total: number; error?: string }

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

// ── Phase: Posts ─────────────────────────────────────────────────────

export async function scrapePosts(
  tabId: number,
  baseUrl: string,
  companyId: number | null,
): Promise<PhasePostsResult> {
  try {
    await safeTabUpdate(tabId, { url: `${baseUrl}/posts/` });
    await waitForTabLoad(tabId);
    await randomDelay(3000);

    if (cancelled || !(await isTabAlive(tabId))) return { saved: 0, updated: 0, total: 0 };

    const posts = await scrapeCompanyPosts(tabId);
    log(`Extracted ${posts.length} posts from ${baseUrl}`);

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

    let saved = 0;
    let updated = 0;
    if (inputs.length > 0) {
      const res = await gqlRequest(
        `mutation UpsertCompanyPosts($inputs: [UpsertLinkedInPostInput!]!) {
          upsertLinkedInPosts(inputs: $inputs) { success inserted updated errors }
        }`,
        { inputs },
      );
      saved = res.data?.upsertLinkedInPosts?.inserted ?? 0;
      updated = res.data?.upsertLinkedInPosts?.updated ?? 0;
    }

    return { saved, updated, total: posts.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Posts error: ${msg}`);
    return { saved: 0, updated: 0, total: 0, error: msg };
  }
}

// ── Phase: Jobs + Hiring Contacts ───────────────────────────────────

export async function scrapeJobs(
  tabId: number,
  baseUrl: string,
  company: CompanyContext | null,
  companyId: number | null,
): Promise<PhaseJobsResult> {
  try {
    // Resolve numeric ID — try multiple strategies
    let numericId = company?.linkedinNumericId || null;

    if (!numericId) {
      numericId = await extractNumericId(tabId);
      if (numericId) log(`Numeric ID from current page: ${numericId}`);
    }

    if (!numericId) {
      await safeTabUpdate(tabId, { url: baseUrl });
      await waitForTabLoad(tabId);
      await randomDelay(2000);
      numericId = await extractNumericId(tabId);
      if (numericId) log(`Numeric ID from company home: ${numericId}`);
    }

    // Strategy 4: Voyager API lookup by slug
    if (!numericId) {
      const slug = baseUrl.match(/\/company\/([^/]+)/)?.[1];
      if (slug) {
        numericId = await resolveNumericIdViaVoyager(slug);
        if (numericId) log(`Numeric ID from Voyager lookup (slug "${slug}"): ${numericId}`);
      }
    }

    if (!numericId) {
      log(`No numeric ID for ${company?.name || baseUrl} — skipping jobs`);
      return { jobsSaved: 0, jobsUpdated: 0, hiringContactsSaved: 0, error: "no numeric ID" };
    }

    if (cancelled) return { jobsSaved: 0, jobsUpdated: 0, hiringContactsSaved: 0 };

    // Fetch job cards via Voyager API (up to 50)
    const page1 = await searchJobs({ company: [numericId] }, { count: 25, start: 0 });
    const allJobs: VoyagerJobCard[] = [...page1.jobs];

    if (page1.paging.total > 25 && !cancelled) {
      await randomDelay(500);
      const page2 = await searchJobs({ company: [numericId] }, { count: 25, start: 25 });
      allJobs.push(...page2.jobs);
    }

    log(`Found ${allJobs.length} jobs (total: ${page1.paging.total}) for ${company?.name || numericId}`);

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
    let jobsSaved = 0;
    let jobsUpdated = 0;
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
      jobsSaved = res.data?.upsertLinkedInPosts?.inserted ?? 0;
      jobsUpdated = res.data?.upsertLinkedInPosts?.updated ?? 0;
    }

    // Discover hiring contacts
    let hiringContactsSaved = 0;
    if (!cancelled) {
      try {
        const hiring = await discoverHiringContacts(numericId, {
          maxJobs: 10,
          fetchHiringTeams: true,
          companyName: company?.name,
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
          const name = resolveCompanyName(company?.name, baseUrl);
          const res = await gqlRequest(
            `mutation ImportHiringContacts($input: ImportCompanyWithContactsInput!) {
              importCompanyWithContacts(input: $input) { success contactsImported contactsSkipped errors }
            }`,
            {
              input: {
                companyName: name,
                linkedinUrl: company?.linkedinUrl || baseUrl,
                website: company?.website || null,
                contacts: contactInputs,
              },
            },
          );
          hiringContactsSaved = res.data?.importCompanyWithContacts?.contactsImported ?? 0;
        }
      } catch (err) {
        log(`Hiring error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return { jobsSaved, jobsUpdated, hiringContactsSaved };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Jobs error: ${msg}`);
    return { jobsSaved: 0, jobsUpdated: 0, hiringContactsSaved: 0, error: msg };
  }
}

// ── Phase: People ───────────────────────────────────────────────────

export async function scrapePeople(
  tabId: number,
  baseUrl: string,
  company: CompanyContext | null,
  companyId: number | null = null,
): Promise<PhasePeopleResult> {
  try {
    await safeTabUpdate(tabId, { url: `${baseUrl}/people/` });
    await waitForTabLoad(tabId);
    await randomDelay(3000);

    if (cancelled || !(await isTabAlive(tabId))) return { saved: 0, total: 0 };

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

    let saved = 0;
    if (allCards.length > 0) {
      const name = resolveCompanyName(company?.name, baseUrl);
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
            companyId: companyId ?? undefined,
            linkedinUrl: company?.linkedinUrl || baseUrl,
            website: company?.website || null,
            contacts: contactInputs,
          },
        },
      );
      saved = res.data?.importCompanyWithContacts?.contactsImported ?? 0;
    }

    return { saved, total: allCards.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`People error: ${msg}`);
    return { saved: 0, total: 0, error: msg };
  }
}

// ── Main orchestrator (standalone full-company scrape) ──────────────

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

    // Phase 1: About
    await reportProgress(tabId, "Phase 1/4: About — extracting…");
    let companyData: CompanyContext | null = null;
    try {
      if (!currentUrl.includes("/about")) {
        await safeTabUpdate(tabId, { url: `${baseUrl}/about/` });
        await waitForTabLoad(tabId);
        await randomDelay(3000);
      }
      const data = await extractCompanyData(tabId);
      if (data?.name) {
        companyData = data;
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
        await reportProgress(tabId, `Phase 1/4: About — ${data.name}`);
      } else {
        result.errors.push("Phase 1: no data extracted");
        await reportProgress(tabId, "Phase 1/4: About — FAILED");
      }
    } catch (err) {
      result.errors.push(`Phase 1: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (cancelled) { await reportProgress(tabId, "Cancelled"); return result; }

    // Resolve DB company ID
    let companyId: number | null = null;
    if (companyData?.name) {
      try {
        const res = await gqlRequest(
          `query FindCompany($name: String, $linkedinUrl: String) {
            findCompany(name: $name, linkedinUrl: $linkedinUrl) { found company { id name } }
          }`,
          { name: companyData.name, linkedinUrl: companyData.linkedinUrl },
        );
        companyId = res.data?.findCompany?.company?.id ?? null;
      } catch { /* non-critical */ }
    }

    // Phase 2: Posts
    await reportProgress(tabId, "Phase 2/4: Posts…");
    const postsResult = await scrapePosts(tabId, baseUrl, companyId);
    result.postsSaved = postsResult.saved;
    if (postsResult.error) result.errors.push(`Posts: ${postsResult.error}`);
    await reportProgress(tabId, `Phase 2/4: Posts — ${postsResult.saved}/${postsResult.total}`);

    if (cancelled) { await reportProgress(tabId, "Cancelled"); return result; }

    // Phase 3: Jobs
    await reportProgress(tabId, "Phase 3/4: Jobs…");
    const jobsResult = await scrapeJobs(tabId, baseUrl, companyData, companyId);
    result.jobsSaved = jobsResult.jobsSaved;
    result.hiringContactsSaved = jobsResult.hiringContactsSaved;
    if (jobsResult.error) result.errors.push(`Jobs: ${jobsResult.error}`);
    await reportProgress(tabId, `Phase 3/4: Jobs — ${jobsResult.jobsSaved} jobs, ${jobsResult.hiringContactsSaved} hiring`);

    if (cancelled) { await reportProgress(tabId, "Cancelled"); return result; }

    // Phase 4: People
    await reportProgress(tabId, "Phase 4/4: People…");
    const peopleResult = await scrapePeople(tabId, baseUrl, companyData, companyId);
    result.peopleSaved = peopleResult.saved;
    if (peopleResult.error) result.errors.push(`People: ${peopleResult.error}`);
    await reportProgress(tabId, `Phase 4/4: People — ${peopleResult.saved}/${peopleResult.total}`);

    // Summary
    const summary = [
      `${result.companyName || "unknown"}`,
      `posts:${result.postsSaved}`,
      `jobs:${result.jobsSaved}`,
      `hiring:${result.hiringContactsSaved}`,
      `people:${result.peopleSaved}`,
      result.errors.length > 0 ? `errors:${result.errors.length}` : "",
    ].filter(Boolean).join(" | ");
    await reportProgress(tabId, `Done — ${summary}`);
    try { chrome.runtime.sendMessage({ action: "companyScrapingDone", result }); } catch { /* */ }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Fatal: ${msg}`);
    log(`Fatal: ${msg}`);
  }

  return result;
}

// ── Post DOM scraper ────────────────────────────────────────────────

async function scrapeCompanyPosts(tabId: number): Promise<ExtractedPost[]> {
  // Expand truncated posts
  await chrome.scripting.executeScript({
    target: { tabId }, world: "MAIN",
    func: () => {
      document.querySelectorAll<HTMLElement>("button, a").forEach((el) => {
        const t = el.textContent?.trim().toLowerCase() || "";
        if ((t === "see more" || t === "…see more" || t === "...see more") && el.offsetParent !== null) el.click();
      });
    },
  }).catch(() => {});
  await sleep(800);

  // Scroll to load posts — stop early if bottom posts are older than 1 year
  let prevHeight = 0;
  let stale = 0;
  while (stale < 3) {
    if (cancelled) break;

    // Check if last visible posts are older than 1 year — stop scrolling
    const hitOldPosts = await chrome.scripting.executeScript({
      target: { tabId }, world: "MAIN",
      func: () => {
        const posts = document.querySelectorAll(".feed-shared-update-v2, .occludable-update");
        if (posts.length === 0) return false;
        // Check the last few posts for age
        const last = Array.from(posts).slice(-3);
        for (const el of last) {
          const subDesc = el.querySelector(".update-components-actor__sub-description")?.textContent?.trim() || "";
          const m = subDesc.match(/(\d+)(yr|y)\b/i);
          if (m && parseInt(m[1]) >= 1) return true;
        }
        return false;
      },
    }).then((r) => r?.[0]?.result ?? false).catch(() => false);

    if (hitOldPosts) {
      log("Posts scroll stopped — hit posts older than 1 year");
      break;
    }

    const h = await chrome.scripting.executeScript({
      target: { tabId }, world: "MAIN",
      func: () => { window.scrollTo(0, document.body.scrollHeight); return document.body.scrollHeight; },
    }).then((r) => r?.[0]?.result ?? 0).catch(() => 0);
    await sleep(2000);
    if (h === prevHeight) stale++; else stale = 0;
    prevHeight = h;

    await chrome.scripting.executeScript({
      target: { tabId }, world: "MAIN",
      func: () => {
        document.querySelectorAll<HTMLElement>("button, a").forEach((el) => {
          const t = el.textContent?.trim().toLowerCase() || "";
          if ((t === "see more" || t === "…see more" || t === "...see more") && el.offsetParent !== null) el.click();
        });
      },
    }).catch(() => {});
    await sleep(300);
  }

  // Extract — skip posts older than 1 year
  const results = await chrome.scripting.executeScript({
    target: { tabId }, world: "MAIN",
    func: () => {
      // Parse LinkedIn relative dates ("5mo", "1yr", "3w", "2d", "5h") into approximate months
      function parseRelativeAgeMonths(text: string): number | null {
        if (!text) return null;
        const m = text.match(/(\d+)\s*(yr|y|mo|w|d|h|m)\b/i);
        if (!m) return null;
        const n = parseInt(m[1]);
        const unit = m[2].toLowerCase();
        if (unit === "yr" || unit === "y") return n * 12;
        if (unit === "mo") return n;
        if (unit === "w") return n / 4.3;
        if (unit === "d") return n / 30;
        if (unit === "h" || unit === "m") return 0;
        return null;
      }

      const MAX_AGE_MONTHS = 12;
      let totalOnPage = 0;
      let filteredByAge = 0;

      const posts: Array<{
        postUrl: string | null; postText: string; postedDate: string | null;
        reactionsCount: number; commentsCount: number; repostsCount: number;
        mediaType: string; isRepost: boolean; originalAuthor: string | null;
        authorName: string | null; authorUrl: string | null; authorSubtitle: string | null;
      }> = [];

      document.querySelectorAll(".feed-shared-update-v2, .occludable-update").forEach((el) => {
        if (el.querySelector(".feed-shared-update-v2__ad-badge")) return;
        if (el.querySelector('[data-test-id="feed-shared-update-v2__sponsored"]')) return;
        totalOnPage++;

        // Check post age — skip if older than 1 year
        const subDescText = el.querySelector(".update-components-actor__sub-description")?.textContent?.trim() || "";
        const ageMonths = parseRelativeAgeMonths(subDescText);
        if (ageMonths !== null && ageMonths > MAX_AGE_MONTHS) { filteredByAge++; return; }

        // Also check <time datetime="..."> if present
        const timeEl = el.querySelector("time");
        if (timeEl) {
          const dt = timeEl.getAttribute("datetime");
          if (dt) {
            const postDate = new Date(dt);
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            if (postDate < oneYearAgo) { filteredByAge++; return; }
          }
        }

        const postText = el.querySelector(
          ".feed-shared-update-v2__description, .update-components-text, .feed-shared-text__text-view, .feed-shared-inline-show-more-text",
        )?.textContent?.trim() || "";

        const postedDate = timeEl?.getAttribute("datetime") || subDescText || null;

        const parseBtn = (kw: RegExp) => {
          const b = Array.from(el.querySelectorAll("button, a")).find(
            (b) => kw.test(b.textContent || "") && /\d/.test(b.textContent || ""),
          );
          return parseInt((b?.textContent || "0").replace(/[^0-9]/g, "")) || 0;
        };
        const reactionsCount = parseInt(
          (el.querySelector('.social-details-social-counts__reactions-count, [data-test-id="social-actions__reaction-count"]')?.textContent || "0").replace(/[^0-9]/g, ""),
        ) || 0;
        const commentsCount = parseBtn(/comment/i);
        const repostsCount = parseBtn(/repost/i);

        let mediaType = "none";
        if (el.querySelector("video, .update-components-linkedin-video")) mediaType = "video";
        else if (el.querySelector(".update-components-article")) mediaType = "article";
        else if (el.querySelector(".update-components-document")) mediaType = "document";
        else if (el.querySelector(".update-components-poll")) mediaType = "poll";
        else if (el.querySelector(".feed-shared-image, .update-components-image, .ivm-image-view-model")) mediaType = "image";

        const isRepost = /reposted/i.test(
          el.querySelector(".update-components-header__text-view, .update-components-header")?.textContent || "",
        );
        const originalAuthor = isRepost ? el.querySelector(".update-components-actor__name")?.textContent?.trim() || null : null;
        const authorName = el.querySelector(".update-components-actor__name")?.textContent?.trim() || null;
        const authorUrl = el.querySelector<HTMLAnchorElement>(
          ".update-components-actor__container-link, .update-components-actor__meta-link",
        )?.href?.split("?")[0] || null;
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
      return { posts, totalOnPage, filteredByAge };
    },
  });

  const raw = results?.[0]?.result as { posts: ExtractedPost[]; totalOnPage: number; filteredByAge: number } | undefined;
  if (raw && raw.filteredByAge > 0) {
    log(`Posts: ${raw.totalOnPage} on page, ${raw.filteredByAge} filtered (>1yr), ${raw.posts.length} kept`);
  }
  return raw?.posts ?? [];
}
