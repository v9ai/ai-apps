// Google Search / Ashby job scraper

function isGoogleSearchPage(): boolean {
  try {
    const url = new URL(window.location.href);
    const isSearch = url.pathname === "/search";
    const isGoogle =
      url.hostname === "google.com" ||
      url.hostname.endsWith(".google.com") ||
      url.hostname.startsWith("google.") ||
      url.hostname.includes(".google.");
    return isGoogle && isSearch;
  } catch {
    return false;
  }
}

function isJobSearchQuery(): boolean {
  const href = window.location.href.toLowerCase();
  const searchParams = new URL(window.location.href).searchParams;
  const query = searchParams.get("q") || "";

  return (
    href.includes("workable.com") ||
    href.includes("ashbyhq.com") ||
    href.includes("greenhouse.io") ||
    href.includes("lever.co") ||
    href.includes("jobs.") ||
    query.toLowerCase().includes("remote") ||
    query.toLowerCase().includes("developer") ||
    query.toLowerCase().includes("engineer")
  );
}

function extractCompanyFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    if (hostname.includes("workable.com")) {
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
      const match = url.match(/ashbyhq\.com\/([^/?]+)/);
      if (match && match[1]) {
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

    const domain = hostname
      .replace(/^(www\.|jobs\.|careers\.|apply\.)/, "")
      .split(".")[0];
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  } catch {
    return "Unknown Company";
  }
}

function extractJobDataFromGoogle() {
  if (!isGoogleSearchPage()) return [];

  const searchResults = Array.from(
    document.querySelectorAll("div.g, div.tF2Cxc, div[data-sokoban-container]"),
  );

  const seenUrls = new Set<string>();
  const jobs: any[] = [];

  searchResults.forEach((resultCard) => {
    const card = resultCard as HTMLElement;

    const titleLink = card
      .querySelector("h3")
      ?.closest("a") as HTMLAnchorElement | null;
    const mainLink =
      titleLink || (card.querySelector("a") as HTMLAnchorElement | null);

    if (!mainLink) return;

    const url = mainLink.href;

    if (
      url.includes("google.com") ||
      url.includes("webcache") ||
      seenUrls.has(url)
    ) {
      return;
    }

    seenUrls.add(url);

    const titleEl = card.querySelector("h3") as HTMLElement | null;
    const title =
      titleEl?.textContent?.trim() || mainLink.textContent?.trim() || "";

    if (!title) return;

    const companyFromUrl = extractCompanyFromUrl(url);
    const isAshbyUrl = url.includes("ashbyhq.com");

    let company: string;
    if (isAshbyUrl && companyFromUrl !== "Unknown Company") {
      company = companyFromUrl;
    } else {
      const citationEl = card.querySelector(
        ".VuuXrf, cite",
      ) as HTMLElement | null;
      company = citationEl?.textContent?.trim() || companyFromUrl;
    }

    const descEl = card.querySelector(
      ".VwiC3b, .yXK7lf, .s, [data-sncf='1']",
    ) as HTMLElement | null;
    const description = descEl?.textContent?.trim() || "";

    const dateEl = card.querySelector(".f, .LEwnzc") as HTMLElement | null;
    const postedDate = dateEl?.textContent?.trim() || "";

    const text = card.textContent || "";
    const archived =
      text.includes("No longer accepting") ||
      text.includes("Position closed") ||
      text.includes("Closed") ||
      /\bclosed\b/i.test(text);

    jobs.push({
      title,
      company,
      url,
      description,
      location: description.includes("Remote") ? "Remote" : "Unknown",
      postedDate,
      archived,
      source: "google_search",
    });
  });

  return jobs;
}

function getPaginationInfo() {
  if (!isGoogleSearchPage()) return null;

  const url = new URL(window.location.href);
  const start = parseInt(url.searchParams.get("start") || "0", 10);
  const currentStart = Number.isFinite(start) ? start : 0;
  const currentPage = Math.floor(currentStart / 10) + 1;

  const nextBtn = document.querySelector("#pnnext") as HTMLAnchorElement | null;
  const nextUrl = nextBtn?.href || undefined;

  return {
    currentPage,
    currentStart,
    hasNext: !!nextUrl,
    nextUrl,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isGoogleSearchPage()) return false;

  try {
    if (message?.action === "ping") {
      sendResponse({ ok: true });
      return true;
    }

    if (message?.action === "extractJobs") {
      const jobs = extractJobDataFromGoogle();
      sendResponse({ jobs });
      return true;
    }

    if (message?.action === "getPaginationInfo") {
      const info = getPaginationInfo();
      sendResponse({ paginationInfo: info });
      return true;
    }

    return false;
  } catch (err) {
    console.error("[Google Search Helper] Error:", err);
    sendResponse({
      ok: false,
      error: err instanceof Error ? err.message : "Content script error",
    });
    return true;
  }
});
