import { insertJobsBatch } from "../../services/job-inserter";
import { isExcludedLocation } from "../../lib/location-filter";

interface LinkedInScraperResult {
  success: boolean;
  message: string;
  jobsCollected?: number;
  pagesScraped?: number;
}

export async function scrapeLinkedInJobsWithPagination(
  tabId: number,
  onProgress?: (status: string) => void,
): Promise<LinkedInScraperResult> {
  try {
    // Set up progress listener
    const progressListener = (message: any) => {
      if (message.action === "paginationProgress" && onProgress) {
        onProgress(
          `Scraping page ${message.currentPage}/${message.totalPages}... (${message.jobsCollected} jobs collected)`,
        );
      }
    };
    chrome.runtime.onMessage.addListener(progressListener);

    // Check pagination info first
    let paginationResponse;
    try {
      paginationResponse = await chrome.tabs.sendMessage(tabId, {
        action: "getPaginationInfo",
      });
    } catch (err) {
      // Content script not loaded, return error
      chrome.runtime.onMessage.removeListener(progressListener);
      return {
        success: false,
        message:
          "Content script not loaded. Please reload the page and try again.",
      };
    }

    const hasPagination = paginationResponse?.paginationInfo;

    // If no pagination, just extract current page
    if (!hasPagination) {
      chrome.runtime.onMessage.removeListener(progressListener);
      const response = await chrome.tabs.sendMessage(tabId, {
        action: "extractJobs",
      });

      if (!response || !response.jobs || response.jobs.length === 0) {
        return {
          success: false,
          message: "No jobs found on this page.",
        };
      }

      // Save single page jobs
      const result = await saveJobsToDatabase(response.jobs, "linkedin");
      return {
        success: result.success,
        message: result.message,
        jobsCollected: response.jobs.length,
        pagesScraped: 1,
      };
    }

    // Has pagination - scrape all pages
    const { currentPage, totalPages } = paginationResponse.paginationInfo;
    if (onProgress) {
      onProgress(
        `Found ${totalPages} pages. Starting from page ${currentPage}...`,
      );
    }

    // Start paginated extraction
    const response = await chrome.tabs.sendMessage(tabId, {
      action: "extractJobsWithPagination",
    });

    chrome.runtime.onMessage.removeListener(progressListener);

    if (!response?.success) {
      return {
        success: false,
        message: response?.error || "Unknown error during pagination",
      };
    }

    const allJobs = response.jobs || [];

    if (allJobs.length === 0) {
      return {
        success: false,
        message: "No jobs found across all pages.",
      };
    }

    if (onProgress) {
      onProgress(
        `Scraped ${response.pagesScraped} pages. Found ${allJobs.length} jobs. Saving to database...`,
      );
    }

    // Save to database
    const result = await saveJobsToDatabase(allJobs, "linkedin");

    return {
      success: result.success,
      message: result.message,
      jobsCollected: result.jobsCollected,
      pagesScraped: response.pagesScraped,
    };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error ? err.message : "Failed to scrape LinkedIn jobs",
    };
  }
}

async function saveJobsToDatabase(
  jobs: any[],
  sourceType: string,
): Promise<{ success: boolean; message: string; jobsCollected: number }> {
  // Filter out excluded locations (India, Pakistan, etc.) before saving
  const filtered = jobs.filter((job) => !isExcludedLocation(job));
  const excluded = jobs.length - filtered.length;
  if (excluded > 0) {
    console.log(`[LinkedIn Scraper] Filtered out ${excluded} excluded-location jobs`);
  }

  console.log(`[LinkedIn Scraper] Saving ${filtered.length} jobs via worker...`);

  // Prepare jobs with LinkedIn-specific metadata
  const jobsWithMeta = filtered.map((job: any) => ({
    ...job,
    sourceType: sourceType,
    sourceCategory: "job_board",
    guid: job.url,
    keywords: [sourceType],
    status: job.archived ? "archived" : "new",
  }));

  // Use the new worker-based inserter
  return await insertJobsBatch(jobsWithMeta, sourceType);
}
