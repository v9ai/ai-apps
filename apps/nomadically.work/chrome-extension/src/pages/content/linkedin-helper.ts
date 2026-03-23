// LinkedIn Job Helper — salary extraction + Block Company button

// LinkedIn job helper — salary extraction + Block Company button

// ── Blocked Companies Cache ───────────────────────────────────────────

const blockedCompaniesSet = new Set<string>();

function loadBlockedCompanies() {
  chrome.runtime.sendMessage(
    { action: "getBlockedCompanies" },
    (response) => {
      if (chrome.runtime.lastError || !response?.success) return;
      for (const c of response.companies) {
        blockedCompaniesSet.add(c.name.toLowerCase());
      }
    },
  );
}

function isCompanyBlocked(name: string): boolean {
  return blockedCompaniesSet.has(name.toLowerCase());
}

// ── Block Company Button ──────────────────────────────────────────────

const BLOCK_BTN_ATTR = "data-nomad-block-btn";

function createBlockButton(companyName: string): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.setAttribute(BLOCK_BTN_ATTR, "true");

  const alreadyBlocked = isCompanyBlocked(companyName);

  btn.textContent = alreadyBlocked ? "Blocked" : "Block Company";
  btn.title = alreadyBlocked ? `${companyName} is blocked` : `Block ${companyName}`;
  btn.disabled = alreadyBlocked;
  Object.assign(btn.style, {
    marginLeft: "8px",
    padding: "2px 8px",
    fontSize: "11px",
    fontWeight: "600",
    fontFamily: "system-ui, sans-serif",
    color: "#fff",
    backgroundColor: alreadyBlocked ? "#6b7280" : "#dc2626",
    border: "none",
    borderRadius: "4px",
    cursor: alreadyBlocked ? "default" : "pointer",
    lineHeight: "18px",
    verticalAlign: "middle",
    zIndex: "9999",
    position: "relative",
  });
  if (!alreadyBlocked) {
    btn.addEventListener("mouseenter", () => {
      btn.style.backgroundColor = "#b91c1c";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.backgroundColor = "#dc2626";
    });
  }
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    btn.textContent = "Blocking...";
    btn.disabled = true;

    chrome.runtime.sendMessage(
      { action: "blockCompany", companyName },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("[Nomad] Message error:", chrome.runtime.lastError.message);
          btn.textContent = "Error";
          btn.style.backgroundColor = "#ef4444";
          btn.disabled = false;
          setTimeout(() => {
            btn.textContent = "Block Company";
            btn.style.backgroundColor = "#dc2626";
          }, 2000);
          return;
        }
        if (response?.success) {
          blockedCompaniesSet.add(companyName.toLowerCase());
          markAllButtonsBlocked(companyName);
          dismissJobCard(btn);
        } else {
          console.error("[Nomad] Block failed:", response?.error);
          btn.textContent = "Failed";
          btn.style.backgroundColor = "#ef4444";
          btn.disabled = false;
          setTimeout(() => {
            btn.textContent = "Block Company";
            btn.style.backgroundColor = "#dc2626";
          }, 2000);
        }
      },
    );
  });
  return btn;
}

function markAllButtonsBlocked(companyName: string) {
  document.querySelectorAll(`[${BLOCK_BTN_ATTR}]`).forEach((el) => {
    const btn = el as HTMLButtonElement;
    if (btn.title.toLowerCase().includes(companyName.toLowerCase())) {
      btn.textContent = "Blocked";
      btn.style.backgroundColor = "#6b7280";
      btn.style.cursor = "default";
      btn.disabled = true;
    }
  });
}

function dismissJobCard(btn: HTMLElement) {
  const card = btn.closest(".job-card-container, .base-card");
  if (!card) return;
  const dismissBtn = card.querySelector(
    'button[aria-label*="Dismiss"], button.job-card-container__action',
  ) as HTMLButtonElement | null;
  if (dismissBtn) {
    setTimeout(() => dismissBtn.click(), 500);
  }
}

function injectBlockButtons() {
  // ── Logged-in view: job cards ──
  document.querySelectorAll(".job-card-container").forEach((card) => {
    if (card.querySelector(`[${BLOCK_BTN_ATTR}]`)) return;
    const companyEl = card.querySelector(
      ".artdeco-entity-lockup__subtitle, .job-card-container__primary-description",
    );
    if (!companyEl) return;
    const companyName = companyEl.textContent?.trim() || "Unknown";
    companyEl.appendChild(createBlockButton(companyName));
  });

  // ── Logged-in view: detail panel top card ──
  const detailCompany = document.querySelector(
    ".job-details-jobs-unified-top-card__company-name",
  );
  if (detailCompany && !detailCompany.querySelector(`[${BLOCK_BTN_ATTR}]`)) {
    const name = detailCompany.textContent?.trim() || "Unknown";
    detailCompany.appendChild(createBlockButton(name));
  }

  // ── Public view: job cards ──
  document.querySelectorAll(".base-card.job-search-card").forEach((card) => {
    if (card.querySelector(`[${BLOCK_BTN_ATTR}]`)) return;
    const companyEl = card.querySelector(
      "h4.base-search-card__subtitle",
    );
    if (!companyEl) return;
    const companyName = companyEl.textContent?.trim() || "Unknown";
    companyEl.appendChild(createBlockButton(companyName));
  });
}

function observeBlockButtons() {
  if (!window.location.hostname.includes("linkedin.com")) return;

  // Fetch blocked companies first, then inject buttons
  loadBlockedCompanies();
  setTimeout(injectBlockButtons, 1500);

  // Re-inject on DOM changes (job list scroll, detail panel switch)
  const obs = new MutationObserver(() => {
    injectBlockButtons();
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

observeBlockButtons();

// Wait for the page to be fully loaded
function waitForElement(selector: string, timeout = 5000): Promise<Element> {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

// Click on the second salary UL for each job
function clickSalaryMetadata() {
  // Find all job card containers
  const jobCards = document.querySelectorAll(".job-card-container");

  console.log(`Found ${jobCards.length} job cards`);

  jobCards.forEach((jobCard, index) => {
    // Find all UL elements with the specific class within this job card
    const metadataUls = jobCard.querySelectorAll(
      "ul.job-card-container__metadata-wrapper",
    );

    if (metadataUls.length >= 2) {
      const salaryUl = metadataUls[1]; // Second UL contains salary info
      const salaryText = salaryUl.textContent?.trim();

      console.log(`Job ${index + 1} salary:`, salaryText);

      // You can click or extract data here
      // For now, let's just highlight it
      (salaryUl as HTMLElement).style.border = "2px solid #0a66c2";
      (salaryUl as HTMLElement).style.borderRadius = "4px";
      (salaryUl as HTMLElement).style.padding = "4px";

      // If you want to actually click it:
      // (salaryUl as HTMLElement).click();
    }
  });
}

// Function to extract job data including salary
function extractJobData() {
  console.log("extractJobData called");
  console.log("Current URL:", window.location.href);

  // Detect the page type
  const isLinkedIn = window.location.hostname.includes("linkedin.com");

  // Check if we're on Google search results
  const isGoogleSearch =
    window.location.hostname.includes("google.com") &&
    window.location.pathname.includes("/search");

  // Check if we're on Founderio
  const isFounderio =
    window.location.hostname.includes("founderio.com") &&
    (window.location.pathname === "/jobs" ||
      window.location.pathname.startsWith("/job/"));

  // Check if we're on Google search results for Ashby jobs
  const isGoogleAshbySearch =
    isGoogleSearch &&
    (window.location.search.includes("ashbyhq.com") ||
      document.body.textContent?.includes("jobs.ashbyhq.com"));

  const isAshby =
    isGoogleAshbySearch ||
    window.location.hostname.includes("ashbyhq.com") ||
    window.location.hostname.includes(".ashbyhq.com");

  const genericJobsCount = document.querySelectorAll(
    '[data-provides="search-result"]',
  ).length;

  console.log("Is LinkedIn:", isLinkedIn);
  console.log("Is Google Search:", isGoogleSearch);
  console.log("Is Founderio:", isFounderio);
  console.log("Is Google Ashby Search:", isGoogleAshbySearch);
  console.log("Is Ashby:", isAshby);
  console.log("Generic jobs count:", genericJobsCount);

  // Handle Google Search pages - delegate to Google Search Helper
  if (isGoogleSearch) {
    console.log("Deferring to Google Search Helper");
    // Return empty array - the Google Search Helper will handle this
    return [];
  }

  if (isFounderio) {
    console.log("Using extractFounderioJobData");
    // Use the Founderio extractor from founderio-helper.ts
    const founderioExtractor = (window as any).extractFounderioJobData;
    if (founderioExtractor) {
      return founderioExtractor();
    } else {
      console.warn("Founderio extractor not loaded");
      return [];
    }
  } else if (isAshby && !isGoogleSearch) {
    console.log("Using extractAshbyJobData");
    // Use the Ashby extractor from ashby-helper.ts
    const ashbyExtractor = (window as any).extractAshbyJobData;
    if (ashbyExtractor) {
      return ashbyExtractor();
    } else {
      console.warn("Ashby extractor not loaded");
      return [];
    }
  } else if (genericJobsCount > 0) {
    console.log("Using extractGenericJobData");
    return extractGenericJobData();
  } else if (isLinkedIn) {
    console.log("Using extractLinkedInJobData");
    return extractLinkedInJobData();
  }

  console.log("No matching extractor found, returning empty array");
  return [];
}

// Extract LinkedIn job data
function extractLinkedInJobData() {
  const jobCards = document.querySelectorAll(".job-card-container");
  console.log(`LinkedIn: Found ${jobCards.length} job cards`);
  const jobs: any[] = [];

  jobCards.forEach((jobCard, index) => {
    const titleElement = jobCard.querySelector(".job-card-list__title--link");
    const companyElement = jobCard.querySelector(
      ".artdeco-entity-lockup__subtitle",
    );
    const metadataUls = jobCard.querySelectorAll(
      "ul.job-card-container__metadata-wrapper",
    );

    // Check if job is closed/archived (indicated by specific classes or text)
    const isArchived =
      jobCard.querySelector(".job-card-container__footer-item--closed") !==
        null ||
      jobCard.querySelector('[data-control-name*="closed"]') !== null ||
      jobCard.textContent?.includes("No longer accepting applications") ||
      jobCard.classList.contains("job-card-container--closed");

    const jobData: any = {
      title: titleElement?.textContent?.trim(),
      company: companyElement?.textContent?.trim(),
      url: (titleElement as HTMLAnchorElement)?.href,
      archived: isArchived,
    };

    // First UL - location
    if (metadataUls[0]) {
      jobData.location = metadataUls[0].textContent?.trim();
    }

    // Second UL - salary
    if (metadataUls[1]) {
      jobData.salary = metadataUls[1].textContent?.trim();
    }

    if (jobData.title) {
      jobs.push(jobData);
      console.log(`LinkedIn job ${index + 1}:`, jobData);
    }
  });

  console.log(`LinkedIn: Extracted ${jobs.length} jobs`);
  return jobs;
}

// Function to get LinkedIn pagination info
function getLinkedInPaginationInfo() {
  const paginationState = document.querySelector(
    ".jobs-search-pagination__page-state",
  );
  if (!paginationState) return null;

  const text = paginationState.textContent?.trim() || "";
  const match = text.match(/Page (\d+) of (\d+)/);

  if (!match) return null;

  return {
    currentPage: parseInt(match[1]),
    totalPages: parseInt(match[2]),
  };
}

// Function to click specific page number on LinkedIn
async function clickLinkedInPageNumber(pageNumber: number): Promise<boolean> {
  console.log(`Attempting to click page ${pageNumber}`);

  // Find the button with the specific page number
  const pageButtons = document.querySelectorAll(
    ".jobs-search-pagination__indicator button",
  );

  let targetButton: HTMLButtonElement | null = null;

  for (const button of Array.from(pageButtons)) {
    const ariaLabel = button.getAttribute("aria-label");
    if (ariaLabel === `Page ${pageNumber}`) {
      targetButton = button as HTMLButtonElement;
      break;
    }
  }

  if (!targetButton) {
    console.log(`Page ${pageNumber} button not found, trying Next button`);
    // Fallback to Next button
    const nextButton = document.querySelector(
      'button[aria-label="View next page"]',
    ) as HTMLButtonElement;

    if (!nextButton || nextButton.disabled) {
      console.log("Next button not available");
      return false;
    }

    targetButton = nextButton;
  }

  // Get current job count to detect when new jobs load
  const currentJobCount = document.querySelectorAll(
    ".job-card-container",
  ).length;

  targetButton.click();
  console.log(`Clicked page ${pageNumber} button`);

  // Wait for new jobs to load (check for changes in job cards)
  let attempts = 0;
  const maxAttempts = 15; // 15 seconds max

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const newJobCount = document.querySelectorAll(".job-card-container").length;

    // Check if page changed by looking at pagination state or job count change
    const paginationInfo = getLinkedInPaginationInfo();
    if (paginationInfo && paginationInfo.currentPage === pageNumber) {
      console.log(`Successfully navigated to page ${pageNumber}`);
      // Wait a bit more for all content to load
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return true;
    }

    attempts++;
  }

  console.log(`Timeout waiting for page ${pageNumber} to load`);
  return true; // Continue anyway
}

// Extract generic job board data (Greenhouse, Wellfound, etc.)
function extractGenericJobData() {
  const jobCards = document.querySelectorAll('[data-provides="search-result"]');
  console.log(`Generic: Found ${jobCards.length} job cards`);
  const jobs: any[] = [];

  jobCards.forEach((jobCard, index) => {
    const titleElement = jobCard.querySelector(".section-title");
    const companyElement = jobCard.querySelector(".company-logo + .flex .body");
    const locationTags = jobCard.querySelectorAll(".tag-text");
    const linkElement = jobCard.querySelector('a[href*="job"]');
    const dateElement = jobCard.querySelector(".body__secondary");

    // Check if job is archived/closed
    const isArchived =
      jobCard.querySelector('[data-archived="true"]') !== null ||
      jobCard.textContent?.includes("No longer accepting") ||
      jobCard.textContent?.includes("Position closed") ||
      jobCard.classList.contains("closed") ||
      jobCard.classList.contains("archived");

    console.log(`Generic job ${index + 1} elements:`, {
      titleElement,
      companyElement,
      linkElement,
      locationTags: locationTags.length,
      isArchived,
    });

    const jobData: any = {
      title: titleElement?.textContent?.trim(),
      company: companyElement?.textContent?.trim(),
      url: (linkElement as HTMLAnchorElement)?.href,
      location: Array.from(locationTags)
        .map((tag) => tag.textContent?.trim())
        .filter(Boolean)
        .join(", "),
      postedDate: dateElement?.textContent?.trim(),
      archived: isArchived,
    };

    if (jobData.title) {
      jobs.push(jobData);
      console.log(`Generic job ${index + 1}:`, jobData);
    } else {
      console.log(`Generic job ${index + 1}: Skipped (no title)`);
    }
  });

  console.log(`Generic: Extracted ${jobs.length} jobs`);
  return jobs;
}

// Function to click the second job post
function clickSecondJobPost() {
  const jobCards = document.querySelectorAll(".job-card-container");

  if (jobCards.length >= 2) {
    const secondJobCard = jobCards[1];
    const link = secondJobCard.querySelector(
      ".job-card-list__title--link",
    ) as HTMLElement;

    if (link) {
      console.log("Clicking second job post:", link.textContent?.trim());
      link.click();
      return { success: true, title: link.textContent?.trim() };
    }
  }

  return { success: false, error: "Second job post not found" };
}

// Listen for messages from popup — only respond on relevant sites
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "ping") {
    sendResponse({ ok: true });
    return true;
  }

  // Guard: only handle job-related messages on supported sites
  const hostname = window.location.hostname;
  const isSupportedSite =
    hostname.includes("linkedin.com") ||
    hostname.includes("google.com") ||
    hostname.includes("ashbyhq.com") ||
    hostname.includes("greenhouse.io") ||
    hostname.includes("lever.co") ||
    hostname.includes("wellfound.com") ||
    hostname.includes("founderio.com") ||
    hostname.includes("workable.com");

  if (!isSupportedSite) return false;

  if (message.action === "navigateToPage") {
    // Handle Google Ashby pagination navigation
    const { pageNumber } = message;
    const ashbyPageNavigator = (window as any).clickAshbyPageNumber;

    if (ashbyPageNavigator) {
      ashbyPageNavigator(pageNumber);
      sendResponse({ success: true });
    } else {
      sendResponse({
        success: false,
        error: "Ashby navigation function not loaded",
      });
    }
    return true;
  }

  if (message.action === "extractJobs") {
    // Check if this is a Google search - let Google Search Helper (ashby-helper.ts) handle it
    const isGoogleSearch =
      window.location.hostname.includes("google.com") &&
      window.location.pathname.includes("/search");

    if (isGoogleSearch) {
      // Don't respond - let Google Search Helper (ashby-helper.ts) handle this
      console.log("LinkedIn helper: Detected Google search, skipping");
      return false;
    }

    const jobs = extractJobData();
    console.log(`Sending ${jobs.length} jobs back to popup`);
    sendResponse({ jobs });
    return true;
  }

  if (message.action === "extractJobsWithPagination") {
    (async () => {
      try {
        // Check if we're on Google search for Ashby
        const isGoogleAshbySearch =
          window.location.hostname.includes("google.com") &&
          window.location.pathname.includes("/search") &&
          (window.location.search.includes("ashbyhq.com") ||
            document.body.textContent?.includes("jobs.ashbyhq.com"));

        if (isGoogleAshbySearch) {
          // Handle Ashby (Google search) pagination differently
          const ashbyPaginationGetter = (window as any).getAshbyPaginationInfo;
          const ashbyExtractor = (window as any).extractAshbyJobData;
          const ashbyPageClicker = (window as any).clickAshbyPageNumber;

          if (!ashbyPaginationGetter || !ashbyExtractor || !ashbyPageClicker) {
            sendResponse({
              success: false,
              error: "Ashby helper functions not loaded",
            });
            return;
          }

          const allJobs: any[] = [];
          const paginationInfo = ashbyPaginationGetter();

          if (!paginationInfo) {
            sendResponse({
              success: false,
              error: "No pagination found on Google search results",
            });
            return;
          }

          const { currentPage, totalPages } = paginationInfo;
          const startPage = currentPage;

          // Extract jobs from current page
          const currentJobs = ashbyExtractor();
          allJobs.push(...currentJobs);

          // Send progress update
          chrome.runtime.sendMessage({
            action: "paginationProgress",
            currentPage: startPage,
            totalPages,
            jobsCollected: allJobs.length,
          });

          // Navigate through remaining pages (limit to avoid too many pages)
          const maxPagesToScrape = Math.min(totalPages, startPage + 4); // Scrape up to 5 pages
          for (let page = startPage + 1; page <= maxPagesToScrape; page++) {
            console.log(`\nNavigating to page ${page}/${totalPages}...`);

            const success = await ashbyPageClicker(page);

            if (!success) {
              console.log(`Failed to navigate to page ${page}, stopping`);
              break;
            }

            // Wait longer for Google to fully load the new page
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Extract jobs from new page
            const pageJobs = ashbyExtractor();
            console.log(`Extracted ${pageJobs.length} jobs from page ${page}`);
            allJobs.push(...pageJobs);

            // Send progress update
            chrome.runtime.sendMessage({
              action: "paginationProgress",
              currentPage: page,
              totalPages,
              jobsCollected: allJobs.length,
            });
          }

          sendResponse({
            success: true,
            jobs: allJobs,
            totalPages,
            pagesScraped: maxPagesToScrape - startPage + 1,
          });
          return;
        }

        // LinkedIn pagination handling
        const allJobs: any[] = [];
        const paginationInfo = getLinkedInPaginationInfo();

        if (!paginationInfo) {
          sendResponse({
            success: false,
            error:
              "No pagination found. Are you on a LinkedIn jobs search page?",
          });
          return;
        }

        const { currentPage, totalPages } = paginationInfo;
        const startPage = currentPage;

        // Extract jobs from current page
        const currentJobs = extractLinkedInJobData();
        allJobs.push(...currentJobs);

        // Send progress update
        chrome.runtime.sendMessage({
          action: "paginationProgress",
          currentPage: startPage,
          totalPages,
          jobsCollected: allJobs.length,
        });

        // Navigate through remaining pages
        for (let page = startPage + 1; page <= totalPages; page++) {
          console.log(`\nScraping page ${page}/${totalPages}...`);

          const success = await clickLinkedInPageNumber(page);

          if (!success) {
            console.log(`Failed to navigate to page ${page}, stopping`);
            break;
          }

          // Wait a bit for content to fully render
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Extract jobs from new page
          const pageJobs = extractLinkedInJobData();
          console.log(`Extracted ${pageJobs.length} jobs from page ${page}`);
          allJobs.push(...pageJobs);

          // Send progress update
          chrome.runtime.sendMessage({
            action: "paginationProgress",
            currentPage: page,
            totalPages,
            jobsCollected: allJobs.length,
          });
        }

        sendResponse({
          success: true,
          jobs: allJobs,
          totalPages,
          pagesScraped: totalPages - startPage + 1,
        });
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    })();
    return true; // Keep message channel open for async response
  }

  if (message.action === "getPaginationInfo") {
    // Check if we're on Google search for Ashby
    const isGoogleAshbySearch =
      window.location.hostname.includes("google.com") &&
      window.location.pathname.includes("/search") &&
      (window.location.search.includes("ashbyhq.com") ||
        document.body.textContent?.includes("jobs.ashbyhq.com"));

    if (isGoogleAshbySearch) {
      const ashbyPaginationGetter = (window as any).getAshbyPaginationInfo;
      if (ashbyPaginationGetter) {
        const paginationInfo = ashbyPaginationGetter();
        console.log("Sending Ashby pagination info:", paginationInfo);
        sendResponse({ paginationInfo });
      } else {
        sendResponse({ paginationInfo: null });
      }
    } else {
      const paginationInfo = getLinkedInPaginationInfo();
      console.log("Sending LinkedIn pagination info:", paginationInfo);
      sendResponse({ paginationInfo });
    }
    return true;
  }

  if (message.action === "goToNextPage") {
    // Check if we're on Google search for Ashby
    const isGoogleAshbySearch =
      window.location.hostname.includes("google.com") &&
      window.location.pathname.includes("/search") &&
      (window.location.search.includes("ashbyhq.com") ||
        document.body.textContent?.includes("jobs.ashbyhq.com"));

    if (isGoogleAshbySearch) {
      const ashbyNextPageClicker = (window as any).clickAshbyNextPage;
      if (ashbyNextPageClicker) {
        ashbyNextPageClicker()
          .then(() => sendResponse({ success: true }))
          .catch((err: Error) =>
            sendResponse({ success: false, error: err.message }),
          );
      } else {
        sendResponse({
          success: false,
          error: "Ashby next page function not found",
        });
      }
    } else {
      const info = getLinkedInPaginationInfo();
      if (info) {
        clickLinkedInPageNumber(info.currentPage + 1)
          .then((ok) => sendResponse({ success: ok }))
          .catch((err: Error) =>
            sendResponse({ success: false, error: err.message }),
          );
      } else {
        sendResponse({ success: false, error: "No pagination info" });
      }
    }
    return true;
  }

  if (message.action === "highlightSalaries") {
    clickSalaryMetadata();
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "clickSecondJob") {
    const result = clickSecondJobPost();
    sendResponse(result);
    return true;
  }

  return true;
});

// Auto-run when on LinkedIn jobs page
if (
  window.location.hostname.includes("linkedin.com") &&
  window.location.pathname.includes("/jobs")
) {
  waitForElement(".job-card-container")
    .then(() => {
      console.log("LinkedIn jobs page detected, highlighting salaries...");
      setTimeout(clickSalaryMetadata, 1000);
    })
    .catch((err) => console.log("No job cards found:", err.message));
}

// Watch for new job cards being loaded (infinite scroll)
const observer = new MutationObserver(() => {
  const jobCards = document.querySelectorAll(".job-card-container");
  if (jobCards.length > 0) {
    clickSalaryMetadata();
  }
});

if (window.location.hostname.includes("linkedin.com")) {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

export {};
