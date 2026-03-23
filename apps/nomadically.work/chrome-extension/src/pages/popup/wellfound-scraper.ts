/**
 * Wellfound Job Scraper
 *
 * This module provides functions to scrape job listings from Wellfound.com
 * and use DeepSeek AI to intelligently decide which jobs to apply to.
 */

export interface WellfoundJob {
  title: string;
  company: string;
  location: string;
  compensation: string;
  link: string;
  isActivelyHiring: boolean;
  badges: string[];
  postedDate: string;
}

export interface WellfoundJobRecommendation {
  jobIndex: number;
  reasoning: string;
}

/**
 * Scrape Wellfound jobs from the current page
 */
export async function scrapeWellfoundJobs(): Promise<WellfoundJob[]> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.id) {
    throw new Error("No active tab found");
  }

  if (!tab.url?.includes("wellfound.com")) {
    throw new Error("Please navigate to Wellfound.com jobs page");
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      // This function runs in the content script isolated world
      const wellfoundHelper = (window as any).wellfoundHelper;

      if (!wellfoundHelper) {
        console.error(
          "[Wellfound Scraper] Helper not found in content script world!",
        );
        throw new Error(
          "Wellfound helper not loaded. Please refresh the page and try again.",
        );
      }

      console.log("[Wellfound Scraper] Helper found, extracting jobs...");
      const jobs = wellfoundHelper.extractJobs();
      console.log(`[Wellfound Scraper] Extracted ${jobs.length} jobs`);
      return jobs;
    },
  });

  if (!results || results.length === 0) {
    throw new Error("Script execution failed - no results returned");
  }

  if (!results[0].result) {
    console.error("Script execution error:", results[0]);
    throw new Error("Failed to scrape jobs - check console for details");
  }

  return results[0].result as WellfoundJob[];
}

/**
 * Analyze jobs with DeepSeek and get recommendations
 */
export async function analyzeJobsWithDeepSeek(
  criteria: string = "software engineer, full stack, remote",
): Promise<WellfoundJobRecommendation[]> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.id) {
    throw new Error("No active tab found");
  }

  if (!tab.url?.includes("wellfound.com")) {
    throw new Error("Please navigate to Wellfound.com jobs page");
  }

  // First, extract jobs from the page
  const jobs = await scrapeWellfoundJobs();

  if (jobs.length === 0) {
    return [];
  }

  // Prepare job summaries for DeepSeek
  const jobSummaries = jobs.map((job, index) => ({
    index,
    title: job.title,
    company: job.company,
    location: job.location,
    compensation: job.compensation,
    badges: job.badges.join(", "),
    postedDate: job.postedDate,
    isActivelyHiring: job.isActivelyHiring,
  }));

  const prompt = `You are a job application assistant. Analyze the following job listings and rank them based on how well they match these criteria: "${criteria}".

Job Listings:
${JSON.stringify(jobSummaries, null, 2)}

For each job that matches the criteria well, provide:
1. The job index
2. A brief reasoning (1-2 sentences) why it's a good match

Return your response as a JSON array of objects with this structure:
[
  {
    "jobIndex": 0,
    "reasoning": "This job is a great match because..."
  }
]

Only include jobs that are good matches. If no jobs match well, return an empty array.`;

  try {
    // Call DeepSeek API from extension context (no CORS issues)
    const response = await fetch("http://localhost:3000/api/deepseek", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        model: "deepseek-chat",
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
      }
    }

    console.log("[Wellfound Scraper] DeepSeek response:", accumulated);

    // Try to extract JSON from the response
    const jsonMatch = accumulated.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const recommendations = JSON.parse(jsonMatch[0]);
      console.log("[Wellfound Scraper] Recommendations:", recommendations);
      return recommendations;
    }

    console.warn(
      "[Wellfound Scraper] Could not parse JSON from DeepSeek response",
    );
    return [];
  } catch (error) {
    console.error(
      "[Wellfound Scraper] Error analyzing jobs with DeepSeek:",
      error,
    );
    throw error;
  }
}

/**
 * Analyze filtered jobs with DeepSeek (with original indices)
 */
async function analyzeFilteredJobsWithDeepSeek(
  filteredJobs: Array<WellfoundJob & { originalIndex: number }>,
  criteria: string,
): Promise<WellfoundJobRecommendation[]> {
  const jobsForPrompt = filteredJobs
    .map((job, idx) => {
      return `Job ${idx}:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Salary: ${job.salary || "Not specified"}
Tags: ${job.badges?.join(", ") || "None"}`;
    })
    .join("\n\n");

  const prompt = `I am looking for: ${criteria}

Here are developer/engineer jobs (pre-filtered):
${jobsForPrompt}

Analyze and recommend which jobs match my criteria best. Return ONLY a JSON array of objects with:
- jobIndex (the number from "Job X" above)
- score (1-100)
- reasoning (brief explanation)

Format: [{"jobIndex": 0, "score": 95, "reasoning": "..."}, ...]`;

  try {
    const response = await fetch("http://localhost:3000/api/deepseek-json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "deepseek-chat",
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();

    // Try to extract JSON from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const recommendations = JSON.parse(jsonMatch[0]);
      // Map back to original job indices
      const mappedRecommendations = recommendations.map((rec: any) => ({
        ...rec,
        jobIndex: filteredJobs[rec.jobIndex]?.originalIndex ?? rec.jobIndex,
      }));
      console.log(
        "[Wellfound Scraper] Recommendations:",
        mappedRecommendations,
      );
      return mappedRecommendations;
    }

    console.warn(
      "[Wellfound Scraper] Could not parse JSON from DeepSeek response",
    );
    return [];
  } catch (error) {
    console.error(
      "[Wellfound Scraper] Error analyzing jobs with DeepSeek:",
      error,
    );
    throw error;
  }
}

/**
 * Inject helper functions directly into MAIN world
 */
async function injectHelperIntoMainWorld(tabId: number): Promise<void> {
  console.log("[Wellfound Scraper] Injecting helper into MAIN world");

  await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: () => {
      if ((window as any).wellfoundHelper) {
        console.log("[MAIN WORLD] Helper already exists");
        return;
      }

      console.log("[MAIN WORLD] Creating helper functions");

      // Define clickLearnMore directly in MAIN world
      const clickLearnMore = (jobIndex: number) => {
        console.log(
          `[MAIN WORLD] clickLearnMore called with index: ${jobIndex}`,
        );

        const jobListContainers = document.querySelectorAll(
          '[data-testid="job-listing-list"]',
        );
        const allJobElements: Element[] = [];

        jobListContainers.forEach((container) => {
          const jobElements = container.querySelectorAll(
            ".styles_component__Ey28k",
          );
          allJobElements.push(...Array.from(jobElements));
        });

        console.log(
          `[MAIN WORLD] Found ${allJobElements.length} total job elements`,
        );

        if (jobIndex < 0 || jobIndex >= allJobElements.length) {
          console.error(
            `[MAIN WORLD] Invalid job index: ${jobIndex} (total: ${allJobElements.length})`,
          );
          return false;
        }

        const jobElement = allJobElements[jobIndex];
        const titleElement = jobElement.querySelector(".styles_title__xpQDw");
        const title = titleElement?.textContent?.trim() || "Unknown";

        const learnMoreButton = jobElement.querySelector(
          '[data-test="LearnMoreButton"]',
        ) as HTMLButtonElement;

        if (!learnMoreButton) {
          console.error(
            `[MAIN WORLD] No Learn More button found for job ${jobIndex}: ${title}`,
          );
          return false;
        }

        console.log(`[MAIN WORLD] Found button for: ${title}`);
        console.log(`[MAIN WORLD] Button element:`, learnMoreButton);
        console.log(`[MAIN WORLD] Button disabled:`, learnMoreButton.disabled);

        learnMoreButton.click();
        console.log(`[MAIN WORLD] ✓ Click executed for ${title}`);

        return true;
      };

      const scrollDown = (pixels: number = 300) => {
        console.log(`[MAIN WORLD] Scrolling down ${pixels}px`);
        window.scrollBy({ top: pixels, behavior: "smooth" });
      };

      const fillCoverLetterAndApply = (coverLetter: string) => {
        console.log(`[MAIN WORLD] Filling cover letter and applying`);

        // Find the textarea
        const textarea = document.querySelector(
          'textarea[name="userNote"]',
        ) as HTMLTextAreaElement;
        if (!textarea) {
          console.error("[MAIN WORLD] Cover letter textarea not found");
          return false;
        }

        // Fill the textarea
        textarea.value = coverLetter;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        textarea.dispatchEvent(new Event("change", { bubbles: true }));
        console.log("[MAIN WORLD] ✓ Cover letter filled");

        // Wait a bit then click Apply
        setTimeout(() => {
          const applyButton = document.querySelector(
            'button[data-test="JobDescriptionSlideIn--SubmitButton"]',
          ) as HTMLButtonElement;
          if (!applyButton) {
            console.error("[MAIN WORLD] Apply button not found");
            return;
          }

          console.log("[MAIN WORLD] Clicking Apply button");
          applyButton.click();
          console.log("[MAIN WORLD] ✓ Application submitted");
        }, 500);

        return true;
      };

      // Expose helper on window
      (window as any).wellfoundHelper = {
        clickLearnMore: clickLearnMore,
        scrollDown: scrollDown,
        fillCoverLetterAndApply: fillCoverLetterAndApply,
      };

      console.log(
        "[MAIN WORLD] ✓ Helper created and exposed on window.wellfoundHelper",
      );
    },
  });
}

/**
 * Ensure helper is loaded in the page
 */
async function ensureHelperLoaded(tabId: number): Promise<void> {
  console.log("[Wellfound Scraper] Ensuring helper is loaded");

  // Always inject fresh to avoid stale references
  await injectHelperIntoMainWorld(tabId);

  // Verify it loaded
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: () => {
      return !!(window as any).wellfoundHelper;
    },
  });

  if (!results || !results[0]?.result) {
    throw new Error("Failed to inject helper into page");
  }

  console.log("[Wellfound Scraper] ✓ Helper confirmed loaded");
}

/**
 * Click "Learn More" button for a specific job
 */
export async function clickLearnMore(jobIndex: number): Promise<boolean> {
  console.log(
    `[Wellfound Scraper] clickLearnMore called with jobIndex: ${jobIndex}`,
  );

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.id) {
    throw new Error("No active tab found");
  }

  console.log(`[Wellfound Scraper] Tab ID: ${tab.id}`);

  // Ensure helper is loaded
  await ensureHelperLoaded(tab.id);
  console.log(`[Wellfound Scraper] Helper loaded confirmed`);

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    args: [jobIndex],
    func: (jobIndex: number) => {
      console.log(`[MAIN WORLD] Executing click for job index: ${jobIndex}`);
      const wellfoundHelper = (window as any).wellfoundHelper;

      if (!wellfoundHelper) {
        console.error(`[MAIN WORLD] Helper not found!`);
        throw new Error(
          "Wellfound helper not loaded. Please refresh the page.",
        );
      }

      console.log(`[MAIN WORLD] Helper found, calling clickLearnMore`);
      const result = wellfoundHelper.clickLearnMore(jobIndex);
      console.log(`[MAIN WORLD] clickLearnMore returned:`, result);
      return result;
    },
  });

  console.log(`[Wellfound Scraper] Script execution results:`, results);

  if (!results || results.length === 0) {
    throw new Error("Failed to click Learn More");
  }

  console.log(`[Wellfound Scraper] Click result: ${results[0].result}`);
  return results[0].result as boolean;
}

/**
 * Scroll down on the page
 */
export async function scrollDown(pixels: number = 300): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.id) {
    throw new Error("No active tab found");
  }

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    args: [pixels],
    func: (pixels: number) => {
      const wellfoundHelper = (window as any).wellfoundHelper;

      if (!wellfoundHelper) {
        throw new Error(
          "Wellfound helper not loaded. Please refresh the page.",
        );
      }

      wellfoundHelper.scrollDown(pixels);
    },
  });
}

/**
 * Open job link in new tab
 */
export async function openJobLink(jobIndex: number): Promise<boolean> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.id) {
    throw new Error("No active tab found");
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [jobIndex],
    func: (jobIndex: number) => {
      const wellfoundHelper = (window as any).wellfoundHelper;

      if (!wellfoundHelper) {
        throw new Error(
          "Wellfound helper not loaded. Please refresh the page.",
        );
      }

      return wellfoundHelper.clickJobLink(jobIndex);
    },
  });

  if (!results || results.length === 0) {
    throw new Error("Failed to open job link");
  }

  return results[0].result as boolean;
}

/**
 * Filter jobs by title using DeepSeek
 * Returns only jobs that are developer/engineer related
 */
async function filterJobsByTitle(
  jobs: WellfoundJob[],
): Promise<WellfoundJob[]> {
  console.log("[Wellfound Scraper] Filtering jobs by title...");

  const jobTitles = jobs.map((j, idx) => `${idx}: ${j.title}`).join("\n");

  const prompt = `Analyze these job titles and return ONLY the job numbers (indices) that are related to software developer, software engineer, frontend, backend, fullstack, web developer, mobile developer, DevOps, or similar technical engineering roles.

Job Titles:
${jobTitles}

Return ONLY a JSON array of numbers, like: [0, 3, 7, 12]
Do not include any explanation, just the JSON array.`;

  try {
    const response = await fetch("http://localhost:3000/api/deepseek-json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "deepseek-chat",
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();

    // Parse JSON array from response
    const match = content.match(/\[[\d,\s]+\]/);
    if (!match) {
      console.error("[Wellfound Scraper] Could not parse indices:", content);
      return jobs; // Return all jobs if parsing fails
    }

    const indices = JSON.parse(match[0]) as number[];
    const filtered = indices
      .filter((idx) => idx >= 0 && idx < jobs.length)
      .map((idx) => jobs[idx]);

    console.log(
      `[Wellfound Scraper] Filtered from ${jobs.length} to ${filtered.length} developer/engineer jobs`,
    );
    return filtered;
  } catch (error) {
    console.error("[Wellfound Scraper] Error filtering jobs:", error);
    return jobs; // Return all jobs if error occurs
  }
}

/**
 * Analyze a single job with DeepSeek to check if it's relevant
 */
async function analyzeSingleJob(
  job: WellfoundJob,
  criteria: string,
): Promise<{ isRelevant: boolean; reasoning: string }> {
  const jobDescription = `Job:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Salary: ${job.compensation || "Not specified"}
Tags: ${job.badges?.join(", ") || "None"}`;

  const prompt = `I am looking for: ${criteria}

${jobDescription}

Is this job a good match for my criteria? Respond with ONLY a JSON object in this exact format:
{"isRelevant": true/false, "reasoning": "brief explanation"}`;

  try {
    const response = await fetch("http://localhost:3000/api/deepseek-json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "deepseek-chat",
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();

    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        isRelevant: result.isRelevant || false,
        reasoning: result.reasoning || "No reasoning provided",
      };
    }

    return { isRelevant: false, reasoning: "Could not parse response" };
  } catch (error) {
    console.error("[Wellfound Scraper] Error analyzing single job:", error);
    return { isRelevant: false, reasoning: "Error analyzing job" };
  }
}

/**
 * Auto-apply to recommended jobs
 * Analyzes jobs one by one with DeepSeek and clicks Learn More if relevant
 */
export async function autoApplyToRecommendedJobs(
  criteria: string,
  maxJobs: number = 5,
  onProgress?: (message: string) => void,
): Promise<{
  totalJobs: number;
  recommendations: WellfoundJobRecommendation[];
  opened: number;
}> {
  console.log("[Wellfound Scraper] Starting auto-apply process");
  onProgress?.("🔍 Scraping jobs from page...");

  // First, scrape all jobs
  const allJobs = await scrapeWellfoundJobs();
  console.log(`[Wellfound Scraper] Found ${allJobs.length} jobs`);

  if (allJobs.length === 0) {
    throw new Error("No jobs found on the page");
  }

  onProgress?.(`Found ${allJobs.length} jobs, filtering by title...`);

  // Step 1: Filter jobs by title (developer/engineer related)
  const jobs = await filterJobsByTitle(allJobs);
  console.log(
    `[Wellfound Scraper] ${jobs.length} developer/engineer jobs after filtering`,
  );

  if (jobs.length === 0) {
    throw new Error("No developer/engineer jobs found on the page");
  }

  onProgress?.(
    `Found ${jobs.length} developer/engineer jobs, analyzing one by one...`,
  );

  // Step 2: Analyze jobs one by one
  const recommendations: WellfoundJobRecommendation[] = [];
  let clicked = 0;

  for (let i = 0; i < jobs.length && clicked < maxJobs; i++) {
    const job = jobs[i];
    const originalIndex = allJobs.indexOf(job);

    onProgress?.(
      `🔍 Analyzing job ${i + 1}/${jobs.length}: ${job.title} at ${job.company}`,
    );
    console.log(
      `[Wellfound Scraper] Analyzing job ${i + 1}: ${job.title} at ${job.company}`,
    );

    const analysis = await analyzeSingleJob(job, criteria);

    if (analysis.isRelevant) {
      console.log(
        `[Wellfound Scraper] ✓ Job is relevant: ${analysis.reasoning}`,
      );
      recommendations.push({
        jobIndex: originalIndex,
        reasoning: analysis.reasoning,
      });

      try {
        onProgress?.(`✓ Match found! Clicking Learn More for: ${job.title}`);
        await clickLearnMore(originalIndex);
        clicked++;

        // Wait for the job details panel to load
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Extract job details and generate cover letter
        onProgress?.(`📝 Generating cover letter for: ${job.title}`);

        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tab.id) {
          const jobDetails = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              const description =
                document
                  .querySelector("#job-description")
                  ?.textContent?.trim() ||
                document
                  .querySelector(".styles_description__xjvTf")
                  ?.textContent?.trim() ||
                document
                  .querySelector('[class*="description"]')
                  ?.textContent?.trim() ||
                "";
              return description;
            },
          });

          const description = jobDetails[0].result;

          if (description) {
            const coverLetter = await generateCoverLetter(
              job.title,
              job.company,
              description,
            );

            onProgress?.(`✍️ Submitting application for: ${job.title}`);
            await fillCoverLetterAndApply(coverLetter);

            onProgress?.(`✅ Applied to: ${job.title}`);

            // Wait before moving to next job
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }

        // Scroll down after clicking
        await scrollDown(300);

        // Wait a bit before next analysis
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (error) {
        console.error(
          `[Wellfound Scraper] Error clicking job ${originalIndex}:`,
          error,
        );
        onProgress?.(`❌ Error applying to: ${job.title}`);
      }
    } else {
      console.log(
        `[Wellfound Scraper] ✗ Job not relevant: ${analysis.reasoning}`,
      );
    }

    // Small delay between analyses
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return {
    totalJobs: allJobs.length,
    recommendations,
    opened: clicked,
  };
}

/**
 * Auto-apply to recommended jobs (OLD BATCH METHOD - kept for reference)
 * Analyzes jobs with DeepSeek and opens the top matches
 */
export async function autoApplyToRecommendedJobsBatch(
  criteria: string,
  maxJobs: number = 5,
): Promise<{
  totalJobs: number;
  recommendations: WellfoundJobRecommendation[];
  opened: number;
}> {
  console.log("[Wellfound Scraper] Starting auto-apply process");

  // First, scrape all jobs
  const allJobs = await scrapeWellfoundJobs();
  console.log(`[Wellfound Scraper] Found ${allJobs.length} jobs`);

  if (allJobs.length === 0) {
    throw new Error("No jobs found on the page");
  }

  // Step 1: Filter jobs by title (developer/engineer related)
  const jobs = await filterJobsByTitle(allJobs);
  console.log(
    `[Wellfound Scraper] ${jobs.length} developer/engineer jobs after filtering`,
  );

  if (jobs.length === 0) {
    throw new Error("No developer/engineer jobs found on the page");
  }

  // Step 2: Analyze with DeepSeek
  console.log("[Wellfound Scraper] Analyzing filtered jobs with DeepSeek...");
  // We need to pass the filtered jobs to the analysis
  const filteredJobsForAnalysis = jobs.map((job, idx) => ({
    ...job,
    originalIndex: allJobs.indexOf(job),
  }));

  const recommendations = await analyzeFilteredJobsWithDeepSeek(
    filteredJobsForAnalysis,
    criteria,
  );
  console.log(
    `[Wellfound Scraper] Got ${recommendations.length} recommendations`,
  );

  if (recommendations.length === 0) {
    return {
      totalJobs: allJobs.length,
      recommendations: [],
      opened: 0,
    };
  }

  // Click Learn More for top N recommended jobs and scroll down after each
  const toClick = recommendations.slice(0, maxJobs);
  let clicked = 0;

  for (const rec of toClick) {
    try {
      const job = allJobs[rec.jobIndex];
      console.log(
        `[Wellfound Scraper] Clicking Learn More for job ${rec.jobIndex}: ${job?.title || "Unknown"}`,
      );
      await clickLearnMore(rec.jobIndex);
      clicked++;

      // Scroll down after clicking
      console.log(
        `[Wellfound Scraper] Scrolling down after clicking job ${rec.jobIndex}`,
      );
      await scrollDown(300);

      // Wait a bit between clicks
      await new Promise((resolve) => setTimeout(resolve, 1200));
    } catch (error) {
      console.error(
        `[Wellfound Scraper] Error clicking job ${rec.jobIndex}:`,
        error,
      );
    }
  }

  return {
    totalJobs: allJobs.length,
    recommendations,
    opened: clicked,
  };
}

/**
 * Generate a cover letter using DeepSeek
 */
export async function generateCoverLetter(
  jobTitle: string,
  company: string,
  jobDescription: string,
): Promise<string> {
  console.log(
    `[Wellfound Scraper] Generating cover letter for ${jobTitle} at ${company}`,
  );

  const response = await fetch("http://localhost:3000/api/deepseek-json", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        {
          role: "user",
          content: `Write a very short (2-3 sentences max) cover letter for this job application:

Job Title: ${jobTitle}
Company: ${company}
Job Description: ${jobDescription}

The candidate is Vadim Nicolai, a senior full-stack engineer with 5+ years experience in Ruby on Rails, React, real-time systems, and scaling production applications.

Make it concise, professional, and enthusiastic. Focus on relevant skills and experience.`,
        },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.statusText}`);
  }

  const data = await response.json();
  const coverLetter = data.choices[0].message.content.trim();
  console.log(`[Wellfound Scraper] Generated cover letter: ${coverLetter}`);
  return coverLetter;
}

/**
 * Fill cover letter and submit application
 */
export async function fillCoverLetterAndApply(
  coverLetter: string,
): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.id) {
    throw new Error("No active tab found");
  }

  await ensureHelperLoaded(tab.id);

  console.log(
    `[Wellfound Scraper] Filling cover letter and submitting application`,
  );

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    func: (coverLetterText: string) => {
      const helper = (window as any).wellfoundHelper;
      if (!helper) {
        throw new Error("Wellfound helper not loaded");
      }
      return helper.fillCoverLetterAndApply(coverLetterText);
    },
    args: [coverLetter],
  });

  if (!results || !results[0]?.result) {
    throw new Error("Failed to fill cover letter and apply");
  }

  console.log(`[Wellfound Scraper] ✓ Application submitted`);
}
