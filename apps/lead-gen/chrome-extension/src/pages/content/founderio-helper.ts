// Founderio job scraper

function isFounderioJobsPage(): boolean {
  try {
    const url = new URL(window.location.href);
    const isFounderio =
      url.hostname === "www.founderio.com" || url.hostname === "founderio.com";
    return isFounderio;
  } catch {
    return false;
  }
}

function extractFounderioJobData() {
  if (!isFounderioJobsPage()) return [];

  const jobCards = document.querySelectorAll(".card.card-bordered");
  const jobs: any[] = [];

  jobCards.forEach((card) => {
    try {
      const cardElement = card as HTMLElement;

      const titleLink = cardElement.querySelector(
        'a[href^="/job/"]',
      ) as HTMLAnchorElement;
      const title = titleLink?.textContent?.trim() || "";
      const jobUrl = titleLink?.href || "";
      const jobId = jobUrl.match(/\/job\/(\d+)/)?.[1] || "";

      const companyLink = cardElement.querySelector(
        'a[href^="/startup/"]',
      ) as HTMLAnchorElement;

      let companyName = "";
      if (companyLink) {
        const rawText = companyLink.textContent?.trim() || "";
        companyName = rawText
          .replace(/[\u{1F680}]/gu, "")
          .replace(/Startup Icon/g, "")
          .replace(/\s+/g, " ")
          .trim();
      }

      const companyUrl = companyLink?.href || "";
      const companyId = companyUrl.match(/\/startup\/(\d+)/)?.[1] || "";

      const logoImg = cardElement.querySelector(
        ".avatar-img",
      ) as HTMLImageElement;
      const logoUrl = logoImg?.getAttribute("data-src") || logoImg?.src || "";

      const descElement = cardElement.querySelector(
        ".line-clamp-2",
      ) as HTMLElement;
      const description = descElement?.textContent?.trim() || "";

      const locationBadge = cardElement.querySelector(
        ".list-inline-item .bi-geo-alt-fill",
      );
      const location = locationBadge?.parentElement?.textContent?.trim() || "";

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

      const hasProBadge =
        cardElement.querySelector('.avatar-status[src*="top-vendor"]') !== null;
      const isPro =
        hasProBadge || cardElement.closest(".border-primary") !== null;

      if (title && jobUrl) {
        jobs.push({
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
        });
      }
    } catch (err) {
      console.error("[Founderio Helper] Error extracting job:", err);
    }
  });

  return jobs;
}

function getFounderioPaginationInfo() {
  if (!isFounderioJobsPage()) return null;

  const paginationText =
    document.querySelector(".text-muted.small")?.textContent?.trim() || "";
  const match = paginationText.match(/Page (\d+) of (\d+)/);

  if (!match) return null;

  const currentPage = parseInt(match[1], 10);
  const totalPages = parseInt(match[2], 10);

  const nextButton = document.querySelector(
    'a[onclick*="setPage(1)"]',
  ) as HTMLAnchorElement;
  const hasNext = nextButton !== null && currentPage < totalPages;

  return { currentPage, totalPages, hasNext };
}

async function clickFounderioNextPage(): Promise<boolean> {
  if (!isFounderioJobsPage()) return false;

  const pageInput = document.getElementById("page") as HTMLInputElement;
  if (!pageInput) return false;

  const currentPageValue = parseInt(pageInput.value || "0", 10);
  pageInput.value = (currentPageValue + 1).toString();

  const form = document.getElementById("jobAdsFilterForm") as HTMLFormElement;
  if (!form) return false;

  form.submit();
  return true;
}

// Message listener — only on Founderio pages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isFounderioJobsPage()) return false;

  if (message.action === "extractJobs") {
    sendResponse({ jobs: extractFounderioJobData() });
    return true;
  }

  if (message.action === "getPaginationInfo") {
    sendResponse({ paginationInfo: getFounderioPaginationInfo() });
    return true;
  }

  if (message.action === "clickNextPage") {
    clickFounderioNextPage().then((success) => sendResponse({ success }));
    return true;
  }

  if (message.action === "ping") {
    sendResponse({ pong: true });
    return true;
  }

  return false;
});

// Expose for popup/executeScript access
(window as any).extractFounderioJobData = extractFounderioJobData;
(window as any).getFounderioPaginationInfo = getFounderioPaginationInfo;
(window as any).clickFounderioNextPage = clickFounderioNextPage;
