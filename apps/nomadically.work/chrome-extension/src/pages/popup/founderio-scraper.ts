import { insertJobsBatch } from "../../services/job-inserter";

interface FounderioScraperResult {
  success: boolean;
  message: string;
  jobsCollected?: number;
  pagesScraped?: number;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForTabComplete(tabId: number, timeoutMs = 25000) {
  const start = Date.now();

  // Quick check
  const t = await chrome.tabs.get(tabId);
  if (t.status === "complete") return;

  await new Promise<void>((resolve, reject) => {
    const onUpdated = (updatedTabId: number, info: any) => {
      if (updatedTabId !== tabId) return;
      if (info.status === "complete") {
        cleanup();
        resolve();
      }
    };

    const timer = setInterval(async () => {
      if (Date.now() - start > timeoutMs) {
        cleanup();
        reject(new Error("Timeout waiting for tab to finish loading"));
        return;
      }

      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab.status === "complete") {
          cleanup();
          resolve();
        }
      } catch {
        // ignore
      }
    }, 250);

    function cleanup() {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      clearInterval(timer);
    }

    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

async function ensureContentScriptInjected(tabId: number): Promise<void> {
  try {
    // Try to ping the content script
    await chrome.tabs.sendMessage(tabId, { action: "ping" });
  } catch (err) {
    // Content script not loaded, inject it programmatically
    console.log("[Founderio Scraper] Content script not found, injecting...");
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["src/pages/content/index.tsx"],
      });
      // Wait for it to initialize
      await sleep(1000);
    } catch (injectErr) {
      console.error(
        "[Founderio Scraper] Failed to inject content script:",
        injectErr,
      );
      throw new Error(
        "Failed to inject content script. Please refresh the page.",
      );
    }
  }
}

async function saveJobsToDatabase(
  jobs: any[],
  source: string,
): Promise<{ success: boolean; message: string }> {
  if (jobs.length === 0) {
    return { success: false, message: "No jobs to save" };
  }

  console.log(`[Founderio Scraper] Saving ${jobs.length} jobs via worker...`);

  // Prepare jobs with Founderio-specific metadata
  const jobsWithMeta = jobs.map((job) => ({
    title: job.title || "Untitled",
    company: job.company,
    url: job.url || "",
    location: job.location,
    description: job.description,
    salary: job.salary,
    employmentType: job.jobType,
    remoteFriendly: job.isRemote,
    sourceType: source,
    sourceCategory: "job_board",
    guid: job.url || undefined,
    keywords: ["founderio"],
    status: "new",
    sourceDetail: JSON.stringify({
      jobType: job.jobType,
      isRemote: job.isRemote,
      isPro: job.isPro,
      logoUrl: job.logoUrl,
      companyUrl: job.companyUrl,
      jobId: job.jobId,
      companyId: job.companyId,
    }),
  }));

  // Use the new worker-based inserter
  const result = await insertJobsBatch(jobsWithMeta, source);

  return {
    success: result.success,
    message: result.message,
  };
}

export async function scrapeFounderioJobsSinglePage(
  tabId: number,
  onProgress?: (status: string) => void,
): Promise<FounderioScraperResult> {
  try {
    if (onProgress) onProgress("Ensuring content script is loaded...");
    await ensureContentScriptInjected(tabId);

    if (onProgress) onProgress("Extracting jobs from current page...");

    const response = await chrome.tabs.sendMessage(tabId, {
      action: "extractJobs",
    });

    if (!response || !response.jobs || response.jobs.length === 0) {
      return {
        success: false,
        message: "No jobs found on this page.",
      };
    }

    if (onProgress)
      onProgress(`Found ${response.jobs.length} jobs. Saving to database...`);

    const result = await saveJobsToDatabase(response.jobs, "founderio");

    return {
      success: result.success,
      message: result.message,
      jobsCollected: response.jobs.length,
      pagesScraped: 1,
    };
  } catch (error) {
    console.error("[Founderio Scraper] Error:", error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function scrapeFounderioJobsWithPagination(
  tabId: number,
  maxPages?: number,
  onProgress?: (status: string) => void,
): Promise<FounderioScraperResult> {
  try {
    if (onProgress) onProgress("Ensuring content script is loaded...");
    await ensureContentScriptInjected(tabId);

    if (onProgress) onProgress("Checking pagination info...");

    const paginationResponse = await chrome.tabs.sendMessage(tabId, {
      action: "getPaginationInfo",
    });

    if (!paginationResponse || !paginationResponse.paginationInfo) {
      // No pagination, just scrape current page
      return scrapeFounderioJobsSinglePage(tabId, onProgress);
    }

    const { currentPage, totalPages, hasNext } =
      paginationResponse.paginationInfo;

    const pagesToScrape = maxPages
      ? Math.min(maxPages, totalPages - currentPage + 1)
      : totalPages - currentPage + 1;

    if (onProgress) {
      onProgress(
        `Found ${totalPages} total pages. Will scrape ${pagesToScrape} page(s) starting from page ${currentPage}...`,
      );
    }

    const allJobs: any[] = [];
    let pagesScraped = 0;

    // Scrape current page first
    if (onProgress) onProgress(`Scraping page ${currentPage}/${totalPages}...`);

    const currentPageResponse = await chrome.tabs.sendMessage(tabId, {
      action: "extractJobs",
    });

    if (currentPageResponse?.jobs) {
      allJobs.push(...currentPageResponse.jobs);
      pagesScraped++;
      if (onProgress)
        onProgress(
          `Page ${currentPage} complete. Collected ${allJobs.length} jobs so far.`,
        );
    }

    // Scrape additional pages if requested
    let remainingPages = pagesToScrape - 1;
    let hasMorePages = hasNext;

    while (remainingPages > 0 && hasMorePages) {
      if (onProgress)
        onProgress(
          `Navigating to next page... (${pagesScraped + 1}/${pagesToScrape})`,
        );

      // Click next page
      const nextPageResponse = await chrome.tabs.sendMessage(tabId, {
        action: "clickNextPage",
      });

      if (!nextPageResponse?.success) {
        if (onProgress) onProgress("Failed to navigate to next page");
        break;
      }

      // Wait for page to load
      if (onProgress) onProgress("Waiting for page to load...");
      await waitForTabComplete(tabId);
      await sleep(2000); // Additional wait for content to render

      // Extract jobs from new page
      const newPage = currentPage + pagesScraped;
      if (onProgress) onProgress(`Scraping page ${newPage}/${totalPages}...`);

      const jobsResponse = await chrome.tabs.sendMessage(tabId, {
        action: "extractJobs",
      });

      if (jobsResponse?.jobs && jobsResponse.jobs.length > 0) {
        allJobs.push(...jobsResponse.jobs);
        pagesScraped++;
        if (onProgress)
          onProgress(
            `Page ${newPage} complete. Collected ${allJobs.length} jobs so far.`,
          );
      }

      // Check if there are more pages
      const newPaginationResponse = await chrome.tabs.sendMessage(tabId, {
        action: "getPaginationInfo",
      });

      hasMorePages = newPaginationResponse?.paginationInfo?.hasNext || false;
      remainingPages--;
    }

    if (allJobs.length === 0) {
      return {
        success: false,
        message: "No jobs found across all pages.",
      };
    }

    if (onProgress)
      onProgress(
        `Scraping complete. Saving ${allJobs.length} jobs to database...`,
      );

    const result = await saveJobsToDatabase(allJobs, "founderio");

    return {
      success: result.success,
      message: `${result.message} (${pagesScraped} pages scraped)`,
      jobsCollected: allJobs.length,
      pagesScraped,
    };
  } catch (error) {
    console.error("[Founderio Scraper] Error:", error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function navigateToNextPage(
  tabId: number,
): Promise<{ success: boolean; message: string }> {
  try {
    await ensureContentScriptInjected(tabId);

    const response = await chrome.tabs.sendMessage(tabId, {
      action: "clickNextPage",
    });

    if (response?.success) {
      await waitForTabComplete(tabId);
      return {
        success: true,
        message: "Successfully navigated to next page",
      };
    }

    return {
      success: false,
      message: "Failed to navigate to next page",
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
