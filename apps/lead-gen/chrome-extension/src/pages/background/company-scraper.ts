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

// ── Progress helpers ────────────────────────────────────────────────

function log(msg: string) {
  console.log(`[CompanyScraper] ${msg}`);
}

async function reportProgress(tabId: number, message: string) {
  log(message);
  try {
    chrome.runtime.sendMessage({ action: "companyScrapingProgress", message });
  } catch { /* popup may be closed */ }
  await safeSendMessage(tabId, { action: "companyScrapingProgress", message });
}

// ── Main orchestrator ───────────────────────────────────────────────

export interface CompanyScraperResult {
  companyName: string | null;
  aboutSaved: boolean;
  postsSaved: number;
  jobsSaved: number;
  hiringContactsSaved: number;
  peopleSaved: number;
  errors: string[];
}

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

  // Determine the base company URL from current tab
  const tab = await chrome.tabs.get(tabId);
  const currentUrl = tab.url || "";
  const companyMatch = currentUrl.match(/(https:\/\/www\.linkedin\.com\/company\/[^/?#]+)/);
  if (!companyMatch) {
    const err = "Not on a LinkedIn company page";
    await reportProgress(tabId, `Error: ${err}`);
    result.errors.push(err);
    return result;
  }
  const baseUrl = companyMatch[1].replace(/\/$/, "");
  log(`Base URL: ${baseUrl}`);

  // ── Phase 1: About ──────────────────────────────────────────────

  await reportProgress(tabId, "Phase 1/4: About — extracting company data…");

  // Navigate to /about/ if not already there
  const aboutUrl = `${baseUrl}/about/`;
  if (!currentUrl.includes("/about")) {
    await safeTabUpdate(tabId, { url: aboutUrl });
    await waitForTabLoad(tabId);
    await randomDelay(3000);
  }

  const companyData = await extractCompanyData(tabId);
  if (!companyData || !companyData.name) {
    result.errors.push("Failed to extract company data from About page");
    await reportProgress(tabId, "Phase 1/4: About — FAILED (no data extracted)");
  } else {
    result.companyName = companyData.name;

    const saved = await saveCompanyBatch([{
      name: companyData.name,
      website: companyData.website || undefined,
      linkedin_url: companyData.linkedinUrl || undefined,
      description: companyData.description || undefined,
      location: companyData.location || undefined,
      industry: companyData.industry || undefined,
    }]);
    result.aboutSaved = saved > 0;
    await reportProgress(tabId, `Phase 1/4: About — extracted ${companyData.name}`);
  }

  if (cancelled) {
    await reportProgress(tabId, "Cancelled after Phase 1");
    return result;
  }

  // We need the company ID from the database for later phases
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
    } catch {
      // Non-critical — posts/jobs can still be saved without companyId
    }
  }

  // ── Phase 2: Posts ──────────────────────────────────────────────

  await reportProgress(tabId, "Phase 2/4: Posts — navigating…");

  const postsUrl = `${baseUrl}/posts/`;
  await safeTabUpdate(tabId, { url: postsUrl });
  await waitForTabLoad(tabId);
  await randomDelay(3000);

  if (cancelled) {
    await reportProgress(tabId, "Cancelled before Posts scraping");
    return result;
  }

  try {
    const posts = await scrapeCompanyPosts(tabId);
    if (posts.length > 0) {
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
    }
    await reportProgress(tabId, `Phase 2/4: Posts — saved ${result.postsSaved} posts`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Posts: ${msg}`);
    await reportProgress(tabId, `Phase 2/4: Posts — error: ${msg}`);
  }

  if (cancelled) {
    await reportProgress(tabId, "Cancelled after Phase 2");
    return result;
  }

  // ── Phase 3: Jobs (Voyager API — no navigation needed) ─────────

  await reportProgress(tabId, "Phase 3/4: Jobs — fetching via Voyager API…");

  let numericId = companyData?.linkedinNumericId || null;

  // Fallback: try to extract numeric ID from the current page DOM if About page missed it
  if (!numericId) {
    try {
      const idResults = await chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        func: () => {
          // Strategy 1: data-urn attributes
          const urnEl = document.querySelector(
            '[data-urn*="urn:li:fsd_company:"], [data-urn*="urn:li:company:"]'
          );
          if (urnEl) {
            const m = (urnEl.getAttribute("data-urn") || "").match(/urn:li:(?:fsd_)?company:(\d+)/);
            if (m) return m[1];
          }
          // Strategy 2: script tags
          for (const script of document.querySelectorAll("script")) {
            const t = script.textContent || "";
            const m = t.match(/"companyId"\s*:\s*(\d+)/) || t.match(/urn:li:(?:fsd_)?company:(\d+)/);
            if (m) return m[1];
          }
          // Strategy 3: meta tags
          for (const el of document.querySelectorAll('meta[content*="company"], link[href*="company"]')) {
            const val = el.getAttribute("content") || el.getAttribute("href") || "";
            const m = val.match(/company[:/](\d+)/);
            if (m) return m[1];
          }
          return null;
        },
      });
      numericId = (idResults?.[0]?.result as string | null) ?? null;
      if (numericId) log(`Fallback numeric ID extraction succeeded: ${numericId}`);
    } catch {
      // Non-critical
    }
  }

  if (!numericId) {
    result.errors.push("Jobs: no LinkedIn numeric ID — skipping Voyager API");
    await reportProgress(tabId, "Phase 3/4: Jobs — skipped (no numeric ID)");
  } else {
    try {
      // Fetch job cards (up to 50)
      const page1 = await searchJobs({ company: [numericId] }, { count: 25, start: 0 });
      let allJobs: VoyagerJobCard[] = [...page1.jobs];
      if (page1.paging.total > 25) {
        const page2 = await searchJobs({ company: [numericId] }, { count: 25, start: 25 });
        allJobs = [...allJobs, ...page2.jobs];
      }

      log(`Found ${allJobs.length} jobs for company ${numericId}`);

      // Fetch full details for top 10 jobs
      const detailJobs: Array<VoyagerJobCard & { fullDescription: string }> = [];
      for (const job of allJobs.slice(0, 10)) {
        try {
          const detail = await getJobPostingDetail(job.jobPostingId);
          detailJobs.push(detail);
          await randomDelay(500); // Respect rate limits
        } catch (err) {
          log(`Failed to get detail for job ${job.jobPostingId}: ${err}`);
        }
      }

      // Save jobs as linkedin_posts with type "job"
      const jobInputs = allJobs.map((job) => {
        const detail = detailJobs.find((d) => d.jobPostingId === job.jobPostingId);
        return {
          url: `https://www.linkedin.com/jobs/view/${job.jobPostingId}/`,
          type: "job" as const,
          companyId,
          title: job.title,
          content: detail?.fullDescription || job.descriptionSnippet || null,
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
        };
      });

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
      try {
        const hiring = await discoverHiringContacts(numericId, {
          maxJobs: 10,
          fetchHiringTeams: true,
          companyName: companyData?.name,
          onProgress: (step, count) => log(`Hiring: ${step} (${count})`),
        });

        if (hiring.hiringContacts.length > 0 || hiring.recruiters.length > 0) {
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
          ];

          if (contactInputs.length > 0) {
            const hiringCompanyName = companyData?.name || baseUrl.split("/company/")[1] || "Unknown";
            const res = await gqlRequest(
              `mutation ImportHiringContacts($input: ImportCompanyWithContactsInput!) {
                importCompanyWithContacts(input: $input) {
                  success contactsImported contactsSkipped errors
                }
              }`,
              {
                input: {
                  companyName: hiringCompanyName,
                  linkedinUrl: companyData?.linkedinUrl || baseUrl,
                  website: companyData?.website || null,
                  contacts: contactInputs,
                },
              },
            );
            result.hiringContactsSaved = res.data?.importCompanyWithContacts?.contactsImported ?? 0;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Hiring contacts: ${msg}`);
        log(`Hiring contacts error: ${msg}`);
      }

      await reportProgress(tabId, `Phase 3/4: Jobs — ${result.jobsSaved} jobs, ${result.hiringContactsSaved} hiring contacts`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Jobs: ${msg}`);
      await reportProgress(tabId, `Phase 3/4: Jobs — error: ${msg}`);
    }
  }

  if (cancelled) {
    await reportProgress(tabId, "Cancelled after Phase 3");
    return result;
  }

  // ── Phase 4: People ─────────────────────────────────────────────

  await reportProgress(tabId, "Phase 4/4: People — navigating…");

  const peopleUrl = `${baseUrl}/people/`;
  await safeTabUpdate(tabId, { url: peopleUrl });
  await waitForTabLoad(tabId);
  await randomDelay(3000);

  if (cancelled) {
    await reportProgress(tabId, "Cancelled before People scraping");
    return result;
  }

  try {
    const allCards: PersonCard[] = [];
    const seen = new Set<string>();
    const MAX_ROUNDS = 15;

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

      log(`People round ${round + 1}: +${newCount} new (total ${allCards.length})`);

      const clickedMore = await clickShowMorePeople(tabId);
      if (clickedMore) {
        await randomDelay(2000);
      } else if (newCount === 0) {
        break;
      }
    }

    // Derive company name: prefer Phase 1 data, fall back to slug from URL
    const companyName = companyData?.name || baseUrl.split("/company/")[1] || "Unknown";
    const companyLinkedinUrl = companyData?.linkedinUrl || baseUrl;

    if (allCards.length > 0) {
      const contactInputs = allCards.map((card) => ({
        name: card.name,
        linkedinUrl: card.linkedinUrl,
        workEmail: null,
        headline: card.headline || null,
      }));

      const res = await gqlRequest(
        `mutation ImportCompanyPeople($input: ImportCompanyWithContactsInput!) {
          importCompanyWithContacts(input: $input) {
            success contactsImported contactsSkipped errors
          }
        }`,
        {
          input: {
            companyName,
            linkedinUrl: companyLinkedinUrl,
            website: companyData?.website || null,
            contacts: contactInputs,
          },
        },
      );
      result.peopleSaved = res.data?.importCompanyWithContacts?.contactsImported ?? 0;
    }

    await reportProgress(tabId, `Phase 4/4: People — imported ${result.peopleSaved} contacts`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`People: ${msg}`);
    await reportProgress(tabId, `Phase 4/4: People — error: ${msg}`);
  }

  // ── Done ────────────────────────────────────────────────────────

  const summary = [
    `Company: ${result.companyName || "unknown"}`,
    `About: ${result.aboutSaved ? "saved" : "failed"}`,
    `Posts: ${result.postsSaved}`,
    `Jobs: ${result.jobsSaved}`,
    `Hiring contacts: ${result.hiringContactsSaved}`,
    `People: ${result.peopleSaved}`,
    result.errors.length > 0 ? `Errors: ${result.errors.length}` : "",
  ].filter(Boolean).join(" | ");

  await reportProgress(tabId, `Done — ${summary}`);

  try {
    chrome.runtime.sendMessage({ action: "companyScrapingDone", result });
  } catch { /* popup may be closed */ }

  return result;
}

// ── Phase 2 helper: Extract posts from company /posts/ page ─────────

interface ExtractedCompanyPost {
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

async function scrapeCompanyPosts(tabId: number): Promise<ExtractedCompanyPost[]> {
  // Click "see more" buttons to expand post text
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
  await new Promise((r) => setTimeout(r, 800));

  // Scroll until no new content loads (max 5 stale rounds)
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

    await new Promise((r) => setTimeout(r, 2000));

    if (currentHeight === previousHeight) {
      staleCount++;
    } else {
      staleCount = 0;
    }
    previousHeight = currentHeight;

    // Expand any new "see more" buttons
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
    await new Promise((r) => setTimeout(r, 300));
  }

  // Extract all posts from the feed
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
        // Skip ads
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

  const posts = (results?.[0]?.result ?? []) as ExtractedCompanyPost[];
  log(`Extracted ${posts.length} posts from company page`);
  return posts;
}
