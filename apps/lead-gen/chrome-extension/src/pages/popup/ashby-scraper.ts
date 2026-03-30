import { insertJobsBatch } from "../../services/job-inserter";
import { isExcludedLocation } from "../../lib/location-filter";

interface AshbyScraperResult {
  success: boolean;
  message: string;
  jobsCollected?: number;
  pagesScraped?: number;
}

/**
 * Scrapes Ashby job board links from Google search results,
 * visits each board, and extracts job listings.
 */
export async function scrapeAshbyJobsWithPagination(
  tabId: number,
  onProgress?: (status: string) => void,
): Promise<AshbyScraperResult> {
  try {
    if (onProgress) onProgress("Extracting Ashby job board links from Google results...");

    // Extract ashbyhq.com links from the Google search results page
    const linksResult = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const links: string[] = [];
        document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((a) => {
          const href = a.href;
          if (href.includes("ashbyhq.com") && !links.includes(href)) {
            links.push(href);
          }
        });
        return links;
      },
    });

    const ashbyUrls: string[] = linksResult?.[0]?.result ?? [];

    if (ashbyUrls.length === 0) {
      return {
        success: false,
        message: "No Ashby job board links found on this page.",
      };
    }

    if (onProgress) onProgress(`Found ${ashbyUrls.length} Ashby boards. Scraping jobs...`);

    const allJobs: any[] = [];
    let pagesScraped = 0;

    for (let i = 0; i < ashbyUrls.length; i++) {
      const boardUrl = ashbyUrls[i];
      if (onProgress) {
        onProgress(`Scraping board ${i + 1}/${ashbyUrls.length}... (${allJobs.length} jobs so far)`);
      }

      // Navigate to the Ashby board
      await chrome.tabs.update(tabId, { url: boardUrl });
      await new Promise((r) => setTimeout(r, 3000));

      // Extract jobs from the Ashby page
      const jobsResult = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const jobs: Array<{
            title: string;
            company: string;
            url: string;
            location?: string;
            description?: string;
          }> = [];

          // Ashby boards list jobs as clickable links/cards
          // Common selectors for Ashby job boards
          const jobElements = document.querySelectorAll(
            'a[href*="/jobs/"], [data-testid="job-posting"], .ashby-job-posting-brief-list a'
          );

          // Try to extract company name from page
          const companyName =
            document.querySelector("title")?.textContent?.replace(/\s*-\s*jobs?.*$/i, "").trim() ||
            document.querySelector("h1")?.textContent?.trim() ||
            new URL(window.location.href).hostname.split(".")[0] || "Unknown";

          jobElements.forEach((el) => {
            const anchor = el.tagName === "A" ? (el as HTMLAnchorElement) : el.querySelector("a");
            if (!anchor) return;

            const url = anchor.href;
            if (!url || jobs.some((j) => j.url === url)) return;

            const titleEl =
              el.querySelector("h3") ||
              el.querySelector("[data-testid='job-posting-name']") ||
              el;
            const title = titleEl?.textContent?.trim() || "";
            if (!title) return;

            const locationEl =
              el.querySelector("[data-testid='job-posting-location']") ||
              el.querySelector(".ashby-job-posting-brief-list__location") ||
              el.querySelector("span:last-child");
            const location = locationEl?.textContent?.trim() || "";

            jobs.push({
              title,
              company: companyName,
              url,
              location: location || undefined,
            });
          });

          return jobs;
        },
      });

      const pageJobs = jobsResult?.[0]?.result ?? [];
      if (pageJobs.length > 0) {
        allJobs.push(...pageJobs);
        pagesScraped++;
      }
    }

    if (allJobs.length === 0) {
      return {
        success: false,
        message: `Visited ${ashbyUrls.length} Ashby boards but found no jobs.`,
      };
    }

    // Filter excluded locations
    const filtered = allJobs.filter((job) => !isExcludedLocation(job));
    const excluded = allJobs.length - filtered.length;
    if (excluded > 0) {
      console.log(`[Ashby Scraper] Filtered out ${excluded} excluded-location jobs`);
    }

    if (onProgress) onProgress(`Found ${filtered.length} jobs. Saving to database...`);

    const jobsWithMeta = filtered.map((job: any) => ({
      ...job,
      sourceType: "ashby",
      sourceCategory: "job_board",
      guid: job.url,
      keywords: ["ashby"],
    }));

    const result = await insertJobsBatch(jobsWithMeta, "ashby");

    return {
      success: result.success,
      message: result.message,
      jobsCollected: result.jobsCollected,
      pagesScraped,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to scrape Ashby jobs",
    };
  }
}
