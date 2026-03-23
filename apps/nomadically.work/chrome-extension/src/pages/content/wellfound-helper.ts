// Wellfound job scraper

function isWellfoundJobsPage(): boolean {
  try {
    const url = new URL(window.location.href);
    const isWellfound =
      url.hostname === "wellfound.com" ||
      url.hostname.endsWith(".wellfound.com");
    const isJobsPath =
      url.pathname === "/jobs" || url.pathname.startsWith("/jobs/");
    return isWellfound && isJobsPath;
  } catch {
    return false;
  }
}

interface WellfoundJob {
  title: string;
  company: string;
  location: string;
  compensation: string;
  link: string;
  description?: string;
  isActivelyHiring: boolean;
  badges: string[];
  postedDate: string;
  element?: Element;
}

function extractWellfoundJobs(): WellfoundJob[] {

  if (!isWellfoundJobsPage()) {
    return [];
  }

  const jobs: WellfoundJob[] = [];

  // Find all job listing containers
  const jobListContainers = document.querySelectorAll(
    '[data-testid="job-listing-list"]',
  );

  jobListContainers.forEach((container) => {
    const jobElements = container.querySelectorAll(".styles_component__Ey28k");

    jobElements.forEach((jobElement, jobIndex) => {
      try {
        // Extract job link
        const jobLink = jobElement.querySelector(
          "a.styles_jobLink__US40J",
        ) as HTMLAnchorElement;
        if (!jobLink) return;

        const href = jobLink.href;

        // Extract title
        const titleElement = jobElement.querySelector(".styles_title__xpQDw");
        const title = titleElement?.textContent?.trim() || "Unknown Title";

        // Extract location
        const locationElements = jobElement.querySelectorAll(
          ".styles_location__O9Z62",
        );
        const location =
          Array.from(locationElements)
            .map((el) => el.textContent?.trim())
            .filter(Boolean)
            .join(", ") || "Unknown Location";

        // Extract compensation
        const compensationElement = jobElement.querySelector(
          ".styles_compensation__3JnvU",
        );
        const compensation =
          compensationElement?.textContent?.trim() || "Not specified";

        // Extract company name from the parent company card
        const companyCard = jobElement.closest('[data-test="StartupResult"]');
        const companyNameElement =
          companyCard?.querySelector("h2.font-semibold");
        const company =
          companyNameElement?.textContent?.trim() || "Unknown Company";

        // Check if actively hiring
        const activelyHiring = !!companyCard?.querySelector(".text-pop-green");

        // Extract badges
        const badges: string[] = [];
        const badgeElements = jobElement.querySelectorAll(
          ".styles_tags__c_S1s span",
        );
        badgeElements.forEach((badge) => {
          const text = badge.textContent?.trim();
          if (text) badges.push(text);
        });

        // Extract posted date
        let postedDate = "Unknown";
        badgeElements.forEach((badge) => {
          const text = badge.textContent?.trim() || "";
          if (text.includes("Posted") || text.includes("ago")) {
            postedDate = text;
          }
        });

        const job: WellfoundJob = {
          title,
          company,
          location,
          compensation,
          link: href,
          isActivelyHiring: activelyHiring,
          badges,
          postedDate,
          element: jobElement,
        };

        jobs.push(job);
      } catch (error) {
        console.error(
          `[Wellfound Helper] Error extracting job ${jobIndex + 1}:`,
          error,
        );
      }
    });
  });

  return jobs;
}

// Function to click on a specific job's "Learn more" button
function clickLearnMoreButton(jobIndex: number): boolean {
  const jobs = extractWellfoundJobs();

  if (jobIndex < 0 || jobIndex >= jobs.length) {
    console.error(`[Wellfound Helper] Invalid job index: ${jobIndex}`);
    return false;
  }

  const job = jobs[jobIndex];
  if (!job.element) {
    console.error(`[Wellfound Helper] No element found for job ${jobIndex}`);
    return false;
  }

  // Find the Learn More button
  const learnMoreButton = job.element.querySelector(
    '[data-test="LearnMoreButton"]',
  ) as HTMLButtonElement;

  if (!learnMoreButton) {
    console.error(
      `[Wellfound Helper] No Learn More button found for job ${jobIndex}`,
    );
    return false;
  }

  learnMoreButton.click();
  return true;
}

// Function to scroll down on the page
function scrollDown(pixels: number = 300): void {
  window.scrollBy({
    top: pixels,
    behavior: "smooth",
  });
}

// Function to click on a job link directly (opens in new tab)
function clickJobLink(jobIndex: number): boolean {
  const jobs = extractWellfoundJobs();

  if (jobIndex < 0 || jobIndex >= jobs.length) {
    console.error(`[Wellfound Helper] Invalid job index: ${jobIndex}`);
    return false;
  }

  const job = jobs[jobIndex];

  window.open(job.link, "_blank");
  return true;
}

// Function to analyze jobs with DeepSeek and decide which to apply to
async function analyzeJobsWithDeepSeek(
  jobs: WellfoundJob[],
  criteria: string = "software engineer, full stack, remote",
): Promise<{ jobIndex: number; reasoning: string }[]> {

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
    // Call DeepSeek API through the extension's background/popup service
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


    // Try to extract JSON from the response
    const jsonMatch = accumulated.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return [];
  } catch (error) {
    console.error(
      "[Wellfound Helper] Error analyzing jobs with DeepSeek:",
      error,
    );
    return [];
  }
}

// Expose functions to be called from the extension popup
(window as any).wellfoundHelper = {
  extractJobs: extractWellfoundJobs,
  clickLearnMore: clickLearnMoreButton,
  clickJobLink: clickJobLink,
  scrollDown: scrollDown,
  analyzeWithDeepSeek: analyzeJobsWithDeepSeek,
  isWellfoundPage: isWellfoundJobsPage,
};

// Functions available via window.wellfoundHelper in content script context
