// Founderio job scraper

function isFounderioJobsPage(): boolean {
  try {
    const url = new URL(window.location.href);
    const isFounderio =
      url.hostname === "www.founderio.com" || url.hostname === "founderio.com";
    const isJobsPage =
      url.pathname === "/jobs" || url.pathname.startsWith("/job/");
    console.log("[Founderio Helper] isFounderioJobsPage check:", {
      hostname: url.hostname,
      pathname: url.pathname,
      isFounderio,
      isJobsPage,
      result: isFounderio && (isJobsPage || url.pathname === "/jobs"),
    });
    return isFounderio;
  } catch {
    console.log("[Founderio Helper] isFounderioJobsPage check failed");
    return false;
  }
}

function extractFounderioJobData() {
  console.log("[Founderio Helper] Starting job extraction");
  console.log("[Founderio Helper] URL:", window.location.href);

  if (!isFounderioJobsPage()) {
    return [];
  }

  // Find all job cards on the page
  const jobCards = document.querySelectorAll(".card.card-bordered");
  console.log(`[Founderio Helper] Found ${jobCards.length} job cards`);

  const jobs: any[] = [];

  jobCards.forEach((card, index) => {
    try {
      const cardElement = card as HTMLElement;

      // Extract job title and URL
      const titleLink = cardElement.querySelector(
        'a[href^="/job/"]',
      ) as HTMLAnchorElement;
      const title = titleLink?.textContent?.trim() || "";
      const jobUrl = titleLink?.href || "";
      const jobId = jobUrl.match(/\/job\/(\d+)/)?.[1] || "";

      // Extract company name and URL
      const companyLink = cardElement.querySelector(
        'a[href^="/startup/"]',
      ) as HTMLAnchorElement;

      // Clean up company name - remove icon text and extra whitespace
      let companyName = "";
      if (companyLink) {
        // Get text content and clean it up
        const rawText = companyLink.textContent?.trim() || "";
        // Remove the rocket icon text and extra spaces
        companyName = rawText
          .replace(/[\u{1F680}]/gu, "") // Remove rocket emoji
          .replace(/Startup Icon/g, "")
          .replace(/\s+/g, " ")
          .trim();
      }

      const companyUrl = companyLink?.href || "";
      const companyId = companyUrl.match(/\/startup\/(\d+)/)?.[1] || "";

      // Extract company logo
      const logoImg = cardElement.querySelector(
        ".avatar-img",
      ) as HTMLImageElement;
      const logoUrl = logoImg?.getAttribute("data-src") || logoImg?.src || "";

      // Extract description
      const descElement = cardElement.querySelector(
        ".line-clamp-2",
      ) as HTMLElement;
      const description = descElement?.textContent?.trim() || "";

      // Extract location
      const locationBadge = cardElement.querySelector(
        ".list-inline-item .bi-geo-alt-fill",
      );
      const location = locationBadge?.parentElement?.textContent?.trim() || "";

      // Extract job type (Co-Founder, Employee, etc.)
      const badges = cardElement.querySelectorAll(".list-inline-item");
      let jobType = "";
      let isRemote = false;

      badges.forEach((badge) => {
        const badgeText = badge.textContent?.trim() || "";
        if (
          badgeText.includes("Co-Founder") ||
          badgeText.includes("Employee")
        ) {
          jobType = badgeText;
        }
        if (badgeText.includes("Remote") || badgeText.includes("Homeoffice")) {
          isRemote = true;
        }
      });

      // Check if it's a Pro Startup-Job (has the special badge)
      const hasProBadge =
        cardElement.querySelector('.avatar-status[src*="top-vendor"]') !== null;
      const isPro =
        hasProBadge || cardElement.closest(".border-primary") !== null;

      // Build the job object
      const job = {
        title,
        company: companyName,
        url: jobUrl,
        companyUrl,
        description,
        location,
        jobType,
        isRemote,
        isPro,
        logoUrl,
        jobId,
        companyId,
        source: "founderio",
      };

      console.log(`[Founderio Helper] Job ${index + 1}:`, job);

      // Debug logging for company extraction
      if (!companyName) {
        console.warn(
          `[Founderio Helper] Job ${index + 1} - No company name found. Link:`,
          companyLink,
        );
        console.warn(
          `[Founderio Helper] Job ${index + 1} - Link text:`,
          companyLink?.textContent,
        );
      }

      // Only add if we have at least a title and URL
      if (title && jobUrl) {
        jobs.push(job);
      } else {
        console.log(
          `[Founderio Helper] Job ${index + 1} - Skipping: missing title or URL`,
        );
      }
    } catch (err) {
      console.error(
        `[Founderio Helper] Error extracting job ${index + 1}:`,
        err,
      );
    }
  });

  console.log(`[Founderio Helper] Total jobs extracted: ${jobs.length}`);
  return jobs;
}

function getFounderioPaginationInfo() {
  console.log("[Founderio Helper] getFounderioPaginationInfo called");

  if (!isFounderioJobsPage()) {
    return null;
  }

  // Find pagination info: "Page 1 of 871"
  const paginationText =
    document.querySelector(".text-muted.small")?.textContent?.trim() || "";
  const match = paginationText.match(/Page (\d+) of (\d+)/);

  if (!match) {
    console.log("[Founderio Helper] No pagination found");
    return null;
  }

  const currentPage = parseInt(match[1], 10);
  const totalPages = parseInt(match[2], 10);

  // Check if there's a next page button
  const nextButton = document.querySelector(
    'a[onclick*="setPage(1)"]',
  ) as HTMLAnchorElement;
  const hasNext = nextButton !== null && currentPage < totalPages;

  const info = {
    currentPage,
    totalPages,
    hasNext,
  };

  console.log("[Founderio Helper] Pagination info:", info);
  return info;
}

async function clickFounderioNextPage(): Promise<boolean> {
  if (!isFounderioJobsPage()) {
    return false;
  }

  // The page uses a JavaScript function setPage(delta) to navigate
  // We need to increment the page value and submit the form
  const pageInput = document.getElementById("page") as HTMLInputElement;
  if (!pageInput) {
    console.log("[Founderio Helper] Page input not found");
    return false;
  }

  const currentPageValue = parseInt(pageInput.value || "0", 10);
  const newPageValue = currentPageValue + 1;

  console.log(
    `[Founderio Helper] Setting page from ${currentPageValue} to ${newPageValue}`,
  );

  // Set the new page value
  pageInput.value = newPageValue.toString();

  // Submit the form
  const form = document.getElementById("jobAdsFilterForm") as HTMLFormElement;
  if (!form) {
    console.log("[Founderio Helper] Form not found");
    return false;
  }

  console.log("[Founderio Helper] Submitting form for next page");
  form.submit();

  return true;
}

// Set up message listener — only on Founderio pages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isFounderioJobsPage()) return false;

  if (message.action === "extractJobs") {
    const jobs = extractFounderioJobData();
    sendResponse({ jobs });
    return true;
  }

  if (message.action === "getPaginationInfo") {
    const paginationInfo = getFounderioPaginationInfo();
    sendResponse({ paginationInfo });
    return true;
  }

  if (message.action === "clickNextPage") {
    clickFounderioNextPage().then((success) => {
      sendResponse({ success });
    });
    return true;
  }

  if (message.action === "ping") {
    sendResponse({ pong: true });
    return true;
  }

  return false;
});

// Make functions available globally for testing
(window as any).extractFounderioJobData = extractFounderioJobData;
(window as any).getFounderioPaginationInfo = getFounderioPaginationInfo;
(window as any).clickFounderioNextPage = clickFounderioNextPage;

