import { insertJobsBatch } from "../../services/job-inserter";
import { isExcludedLocation } from "../../lib/location-filter";
import {
  sleep,
  waitForTabComplete,
  ensureContentScriptInjected,
} from "../../lib/scraper-utils";

interface AshbyScraperResult {
  success: boolean;
  message: string;
  jobsCollected?: number;
  pagesScraped?: number;
}

type ExtractJobsResponse = { jobs: any[] };
type PaginationInfoResponse = {
  paginationInfo: {
    currentPage: number;
    currentStart: number;
    hasNext: boolean;
    nextUrl?: string;
  } | null;
};

async function sendMessageWithRetry<T>(
  tabId: number,
  message: Record<string, unknown>,
  attempts = 30,
  delayMs = 250,
): Promise<T> {
  await ensureContentScriptInjected(tabId);

  let lastErr: unknown = null;

  for (let i = 0; i < attempts; i++) {
    try {
      return (await chrome.tabs.sendMessage(tabId, message)) as T;
    } catch (err) {
      lastErr = err;
      await sleep(delayMs);
    }
  }

  throw lastErr ?? new Error("sendMessage failed (content script not ready)");
}

// Scrape only the current page (no auto-pagination)
export async function scrapeAshbyJobsSinglePage(
  tabId: number,
  onProgress?: (status: string) => void,
): Promise<AshbyScraperResult> {
  try {
    console.log("[Ashby Scraper] Starting single-page scraper");
    onProgress?.("🔍 Extracting jobs from current page...");

    await waitForTabComplete(tabId);

    // Extract jobs from current page
    const extract = await sendMessageWithRetry<ExtractJobsResponse>(tabId, {
      action: "extractJobs",
    });

    const jobs = extract?.jobs ?? [];
    console.log(`[Ashby Scraper] Found ${jobs.length} jobs on current page`);

    if (jobs.length === 0) {
      return {
        success: false,
        message: "No jobs found on current page",
        jobsCollected: 0,
        pagesScraped: 1,
      };
    }

    onProgress?.(`💾 Saving ${jobs.length} jobs to database...`);

    const saveResult = await saveJobsToDatabase(jobs);
    console.log("[Ashby Scraper] Save result:", saveResult);

    // Check if there's a next page
    const pagination = await sendMessageWithRetry<PaginationInfoResponse>(
      tabId,
      { action: "getPaginationInfo" },
    );
    const hasNext = pagination?.paginationInfo?.hasNext ?? false;

    return {
      success: saveResult.success,
      message: `${saveResult.message}${hasNext ? " • Click again for next page" : ""}`,
      jobsCollected: saveResult.jobsCollected,
      pagesScraped: 1,
    };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error ? err.message : "Failed to scrape current page",
    };
  }
}

// Get pagination info and navigate to next page with automatic timing
async function checkAndNavigateToNextPage(
  tabId: number,
  currentPageNum: number,
): Promise<{
  hasNext: boolean;
  nextUrl?: string;
  navigated: boolean;
}> {
  console.log(`[Ashby Scraper] Checking pagination for page ${currentPageNum}`);

  const pagination = await sendMessageWithRetry<PaginationInfoResponse>(tabId, {
    action: "getPaginationInfo",
  });

  const info = pagination?.paginationInfo;
  console.log(`[Ashby Scraper] Page ${currentPageNum} pagination info:`, info);

  if (info?.hasNext && info.nextUrl) {
    console.log(
      `[Ashby Scraper] Navigating to page ${currentPageNum + 1}: ${info.nextUrl}`,
    );

    await chrome.tabs.update(tabId, { url: info.nextUrl });
    await sleep(1200); // Wait for navigation to start

    return {
      hasNext: true,
      nextUrl: info.nextUrl,
      navigated: true,
    };
  }

  console.log(`[Ashby Scraper] No more pages after page ${currentPageNum}`);
  return {
    hasNext: false,
    navigated: false,
  };
}

export async function scrapeAshbyJobsWithPagination(
  tabId: number,
  onProgress?: (status: string) => void,
): Promise<AshbyScraperResult> {
  try {
    console.log("[Ashby Scraper] Starting auto-pagination scraper");
    onProgress?.("🔍 Preparing scraper...");

    let currentPageNum = 1;
    let totalJobsCollected = 0;
    let totalPagesScraped = 0;
    const allSeenUrls = new Set<string>();
    let hasMore = true;

    // Auto-loop through all pages
    while (hasMore) {
      console.log(`[Ashby Scraper] Processing page ${currentPageNum}`);
      onProgress?.(`📄 Page ${currentPageNum}: Loading...`);

      await waitForTabComplete(tabId, 30000);
      await sleep(800); // Extra delay for Google search to render

      // Extract jobs from current page
      console.log(
        `[Ashby Scraper] Extracting jobs from page ${currentPageNum}`,
      );
      onProgress?.(`📄 Page ${currentPageNum}: Extracting jobs...`);

      const extract = await sendMessageWithRetry<ExtractJobsResponse>(tabId, {
        action: "extractJobs",
      });

      const jobs = extract?.jobs ?? [];
      console.log(
        `[Ashby Scraper] Found ${jobs.length} jobs on page ${currentPageNum}`,
      );

      // Dedup by URL (across all pages)
      const pageUniqueJobs: any[] = [];
      let pageDuplicates = 0;
      for (const job of jobs) {
        if (!job?.url) continue;
        if (allSeenUrls.has(job.url)) {
          pageDuplicates++;
          continue;
        }
        allSeenUrls.add(job.url);
        pageUniqueJobs.push(job);
      }

      console.log(
        `[Ashby Scraper] Page ${currentPageNum}: ${pageUniqueJobs.length} unique jobs (${pageDuplicates} duplicates)`,
      );

      // Save jobs from this page
      if (pageUniqueJobs.length > 0) {
        console.log(
          `[Ashby Scraper] Saving ${pageUniqueJobs.length} unique jobs from page ${currentPageNum}...`,
        );
        onProgress?.(
          `💾 Page ${currentPageNum}: Saving ${pageUniqueJobs.length} jobs... (${totalJobsCollected + pageUniqueJobs.length} total)`,
        );

        const saveResult = await saveJobsToDatabase(pageUniqueJobs);
        console.log(
          `[Ashby Scraper] Page ${currentPageNum} save result:`,
          saveResult,
        );

        if (saveResult.success) {
          totalJobsCollected += pageUniqueJobs.length;
        }
      } else {
        onProgress?.(`⏭️ Page ${currentPageNum}: No new jobs (all duplicates)`);
      }

      totalPagesScraped++;

      // Navigate to next page if available
      const navResult = await checkAndNavigateToNextPage(tabId, currentPageNum);

      if (navResult.navigated) {
        onProgress?.(
          `➡️ Moving to page ${currentPageNum + 1}... (${totalJobsCollected} jobs so far)`,
        );
        currentPageNum++;
      } else {
        hasMore = false;
      }
    }

    const finalMessage =
      totalJobsCollected > 0
        ? `✅ Completed! Saved ${totalJobsCollected} unique jobs from ${totalPagesScraped} pages`
        : `⚠️ No jobs found across ${totalPagesScraped} pages`;

    return {
      success: totalJobsCollected > 0,
      message: finalMessage,
      jobsCollected: totalJobsCollected,
      pagesScraped: totalPagesScraped,
    };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error ? err.message : "Failed to scrape Ashby jobs",
    };
  }
}

async function saveJobsToDatabase(
  jobs: any[],
): Promise<{ success: boolean; message: string; jobsCollected: number }> {
  // Filter out excluded locations (India, Pakistan, etc.) before saving
  const filtered = jobs.filter((job) => !isExcludedLocation(job));
  const excluded = jobs.length - filtered.length;
  if (excluded > 0) {
    console.log(`[Ashby Scraper] Filtered out ${excluded} excluded-location jobs`);
  }

  console.log(`[Ashby Scraper] Saving ${filtered.length} jobs via worker...`);

  // Prepare jobs with Ashby-specific fields
  const jobsWithMeta = filtered.map((job) => ({
    ...job,
    // company will be extracted from URL by backend if missing
    sourceType: "ashby",
    sourceCategory: "job_board",
    guid: job.url,
    keywords: ["ashby", "ashbyhq"],
    status: job.archived ? "archived" : "new",
  }));

  // Use the new worker-based inserter
  return await insertJobsBatch(jobsWithMeta, "ashby");
}
