console.log(
  "Google Search scraper content script loaded:",
  window.location.href,
);

function isGoogleSearchPage(): boolean {
  try {
    const url = new URL(window.location.href);
    const isSearch = url.pathname === "/search";
    const isGoogle =
      url.hostname === "google.com" ||
      url.hostname.endsWith(".google.com") ||
      url.hostname.startsWith("google.") ||
      url.hostname.includes(".google.");
    console.log("[Google Search Helper] isGoogleSearchPage check:", {
      hostname: url.hostname,
      pathname: url.pathname,
      isGoogle,
      isSearch,
      result: isGoogle && isSearch,
    });
    return isGoogle && isSearch;
  } catch {
    console.log("[Google Search Helper] isGoogleSearchPage check failed");
    return false;
  }
}

function isJobSearchQuery(): boolean {
  const href = window.location.href.toLowerCase();
  const searchParams = new URL(window.location.href).searchParams;
  const query = searchParams.get("q") || "";

  // Check if it's a job-related search
  const result =
    href.includes("workable.com") ||
    href.includes("ashbyhq.com") ||
    href.includes("greenhouse.io") ||
    href.includes("lever.co") ||
    href.includes("jobs.") ||
    query.toLowerCase().includes("remote") ||
    query.toLowerCase().includes("developer") ||
    query.toLowerCase().includes("engineer");

  console.log("[Google Search Helper] isJobSearchQuery check:", {
    href: href.substring(0, 100),
    query: query.substring(0, 50),
    result,
  });
  return result;
}

function extractCompanyFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Extract company name from various job board URLs
    if (hostname.includes("workable.com")) {
      // Extract from path like /view/company-name-job-title
      const match = url.match(/workable\.com\/view\/([^/]+)/);
      if (match) {
        const parts = match[1].split("-");
        return parts
          .slice(0, 3)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
      }
    }

    if (hostname.includes("ashbyhq.com")) {
      // Ashby URLs can be:
      // - https://jobs.ashbyhq.com/CompanyName/...
      // - https://jobs.ashbyhq.com/company-name/...
      // Extract the company slug from the path (first segment after domain)
      const match = url.match(/ashbyhq\.com\/([^/?]+)/);
      if (match && match[1]) {
        // Capitalize each word in the company slug
        return match[1]
          .split(/[-_]/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
      }
    }

    if (hostname.includes("greenhouse.io")) {
      const match = url.match(/boards\.greenhouse\.io\/([^/?]+)/);
      if (match) {
        return match[1]
          .split(/[-_]/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
      }
    }

    // Generic fallback - use domain name
    const domain = hostname
      .replace(/^(www\.|jobs\.|careers\.|apply\.)/, "")
      .split(".")[0];
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  } catch {
    return "Unknown Company";
  }
}

function extractJobDataFromGoogle() {
  console.log("[Google Search Helper] Starting job extraction");
  console.log("[Google Search Helper] URL:", window.location.href);

  if (!isGoogleSearchPage()) {
    console.log("[Google Search Helper] Not a Google search page");
    return [];
  }

  // Find all search result cards
  const searchResults = Array.from(
    document.querySelectorAll("div.g, div.tF2Cxc, div[data-sokoban-container]"),
  );

  console.log(
    `[Google Search Helper] Found ${searchResults.length} search result cards`,
  );

  const seenUrls = new Set<string>();
  const jobs: any[] = [];

  searchResults.forEach((resultCard, index) => {
    const card = resultCard as HTMLElement;

    // Find the main link (h3 parent or first link)
    const titleLink = card
      .querySelector("h3")
      ?.closest("a") as HTMLAnchorElement | null;
    const mainLink =
      titleLink || (card.querySelector("a") as HTMLAnchorElement | null);

    if (!mainLink) {
      console.log(
        `[Google Search Helper] Result ${index + 1} - No main link found`,
      );
      return;
    }

    const url = mainLink.href;

    // Skip Google's own pages, cached pages, and duplicates
    if (
      url.includes("google.com") ||
      url.includes("webcache") ||
      seenUrls.has(url)
    ) {
      return;
    }

    seenUrls.add(url);

    // Extract title from h3
    const titleEl = card.querySelector("h3") as HTMLElement | null;
    const title =
      titleEl?.textContent?.trim() || mainLink.textContent?.trim() || "";

    if (!title) {
      console.log(
        `[Google Search Helper] Result ${index + 1} - No title found`,
      );
      return;
    }

    console.log(
      `[Google Search Helper] Result ${index + 1} - Processing: "${title}"`,
    );
    console.log(`[Google Search Helper] Result ${index + 1} - URL: ${url}`);

    // Extract company from URL (more reliable for ATS platforms like Ashby)
    const companyFromUrl = extractCompanyFromUrl(url);

    // For Ashby URLs, always use URL-extracted company name
    // Citation often shows "Ashby" (the ATS platform) instead of actual company
    const isAshbyUrl = url.includes("ashbyhq.com");

    let company: string;
    if (isAshbyUrl && companyFromUrl !== "Unknown Company") {
      company = companyFromUrl;
    } else {
      // For other job boards, try citation first, then URL
      const citationEl = card.querySelector(
        ".VuuXrf, cite",
      ) as HTMLElement | null;
      company = citationEl?.textContent?.trim() || companyFromUrl;
    }

    // Extract description/snippet
    const descEl = card.querySelector(
      ".VwiC3b, .yXK7lf, .s, [data-sncf='1']",
    ) as HTMLElement | null;
    const description = descEl?.textContent?.trim() || "";

    // Extract posted date if available
    const dateEl = card.querySelector(".f, .LEwnzc") as HTMLElement | null;
    const postedDate = dateEl?.textContent?.trim() || "";

    // Check if archived/closed
    const text = card.textContent || "";
    const archived =
      text.includes("No longer accepting") ||
      text.includes("Position closed") ||
      text.includes("Closed") ||
      /\bclosed\b/i.test(text);

    const job = {
      title,
      company,
      url,
      description,
      location: description.includes("Remote") ? "Remote" : "Unknown",
      postedDate,
      archived,
      source: "google_search",
    };

    console.log(
      `[Google Search Helper] Result ${index + 1} - Extracted job:`,
      job,
    );
    jobs.push(job);
  });

  console.log(`[Google Search Helper] Total jobs extracted: ${jobs.length}`);
  return jobs;
}

function getPaginationInfo() {
  console.log("[Google Search Helper] getPaginationInfo called");

  if (!isGoogleSearchPage()) {
    console.log(
      "[Google Search Helper] Not a Google search page, returning null",
    );
    return null;
  }

  const url = new URL(window.location.href);
  const start = parseInt(url.searchParams.get("start") || "0", 10);
  const currentStart = Number.isFinite(start) ? start : 0;
  const currentPage = Math.floor(currentStart / 10) + 1;

  const nextBtn = document.querySelector("#pnnext") as HTMLAnchorElement | null;
  const nextUrl = nextBtn?.href || undefined;

  console.log("[Google Search Helper] Pagination info:", {
    currentPage,
    currentStart,
    hasNext: !!nextUrl,
    nextUrl,
    nextBtnFound: !!nextBtn,
  });

  return {
    currentPage,
    currentStart,
    hasNext: !!nextUrl,
    nextUrl,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log("[Google Search Helper] Message received:", message);

  try {
    if (message?.action === "ping") {
      sendResponse({ ok: true });
      return true;
    }

    if (message?.action === "extractJobs") {
      console.log("[Google Search Helper] Extracting jobs...");
      const jobs = extractJobDataFromGoogle();
      console.log("[Google Search Helper] Sending response with jobs:", jobs);
      sendResponse({ jobs });
      return true;
    }

    if (message?.action === "getPaginationInfo") {
      console.log("[Google Search Helper] Getting pagination info...");
      const info = getPaginationInfo();
      console.log("[Google Search Helper] Sending pagination info:", info);
      sendResponse({ paginationInfo: info });
      return true;
    }

    console.log("[Google Search Helper] Unknown action:", message?.action);
    sendResponse({ ok: false, error: "Unknown action" });
    return true;
  } catch (err) {
    console.error("[Google Search Helper] Error:", err);
    sendResponse({
      ok: false,
      error: err instanceof Error ? err.message : "Content script error",
    });
    return true;
  }
});
