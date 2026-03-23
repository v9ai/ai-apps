import { insertJobsBatch } from "../../services/job-inserter";

interface AshbyScraperResult {
  success: boolean;
  message: string;
  jobsCollected?: number;
  pagesScraped?: number;
}

/**
 * Save jobs to SQLite database via Cloudflare Worker
 */
export async function saveJobsToSqlite(
  jobs: any[],
): Promise<{ success: boolean; message: string; jobsCollected: number }> {
  console.log(
    `[Ashby Scraper SQLite] Saving ${jobs.length} jobs via worker...`,
  );

  // Prepare jobs with Ashby-specific fields
  const jobsWithMeta = jobs.map((job) => ({
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

/**
 * Scrape and save to SQLite (single page)
 */
export async function scrapeAndSaveToSqlite(
  tabId: number,
  onProgress?: (status: string) => void,
): Promise<AshbyScraperResult> {
  try {
    console.log("[Ashby Scraper SQLite] Starting scraper");
    onProgress?.("🔍 Extracting jobs from current page...");

    // Import the extraction logic from main scraper
    const { scrapeAshbyJobsSinglePage } = await import("./ashby-scraper");
    const result = await scrapeAshbyJobsSinglePage(tabId, onProgress);

    // Note: We would need to modify scrapeAshbyJobsSinglePage to return jobs
    // For now, return the result as-is
    return result;
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Failed to scrape Ashby jobs for SQLite",
    };
  }
}
