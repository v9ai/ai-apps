// ── Company Browsing Engine ──────────────────────────────────────────

import { type CompanyData, isICPTarget } from "../../lib/icp-filter";
import { gqlRequest } from "../../services/graphql";
import { randomDelay, waitForTabLoad, clickSeeMore, safeTabUpdate } from "./tab-utils";

let companyCancelled = false;

export function setCompanyCancelled(value: boolean) {
  companyCancelled = value;
}

export function extractCompanyUrls(tabId: number): Promise<string[]> {
  return chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        const links: string[] = [];
        // LinkedIn company search result links
        document.querySelectorAll<HTMLAnchorElement>(
          'a[href*="/company/"]'
        ).forEach((a) => {
          const href = a.href.split("?")[0].replace(/\/$/, "");
          // Only company profile links, not /company/xxx/jobs etc.
          if (/\/company\/[^/]+$/.test(new URL(href).pathname) && !links.includes(href)) {
            links.push(href);
          }
        });
        return links;
      },
    })
    .then((results) => results?.[0]?.result ?? [])
    .catch(() => []);
}

export function extractCompanyData(tabId: number): Promise<CompanyData | null> {
  return chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        const getText = (sel: string) =>
          document.querySelector(sel)?.textContent?.trim() || "";

        // Company name
        const name =
          getText("h1.org-top-card-summary__title") ||
          getText("h1.top-card-layout__title") ||
          getText("h1");

        // Description — "About" section
        const description =
          getText("p.org-top-card-summary__tagline") ||
          getText("section.org-about-module p") ||
          getText('[data-test-id="about-us__description"]') ||
          "";

        // Details from the info strip
        const dtDds: Record<string, string> = {};
        document.querySelectorAll("dl.org-page-details__definition-list dt, dl.org-page-details__definition-list dd").forEach((el) => {
          if (el.tagName === "DT") {
            const key = el.textContent?.trim().toLowerCase() || "";
            const dd = el.nextElementSibling;
            if (dd && dd.tagName === "DD") {
              dtDds[key] = dd.textContent?.trim() || "";
            }
          }
        });

        // Fallback: scan all definition terms on the page
        if (Object.keys(dtDds).length === 0) {
          document.querySelectorAll("dt").forEach((dt) => {
            const key = dt.textContent?.trim().toLowerCase() || "";
            const dd = dt.nextElementSibling;
            if (dd?.tagName === "DD") {
              dtDds[key] = dd.textContent?.trim() || "";
            }
          });
        }

        // Also try the top card info items
        const infoItems: string[] = [];
        document.querySelectorAll(".org-top-card-summary-info-list__info-item").forEach((el) => {
          infoItems.push(el.textContent?.trim() || "");
        });

        const industry = dtDds["industry"] || dtDds["industries"] || infoItems[0] || "";
        const size =
          dtDds["company size"] ||
          dtDds["size"] ||
          infoItems.find((s) => /employees/i.test(s)) ||
          "";
        const location =
          dtDds["headquarters"] ||
          dtDds["location"] ||
          infoItems.find((s) => /,/.test(s) && !/employees/i.test(s)) ||
          "";

        // Website link
        const websiteLink = document.querySelector<HTMLAnchorElement>(
          'a[data-test-id="about-us__website"] , a.org-top-card-primary-actions__action--website, a.link-without-visited-state[href*="://"]'
        );
        const website = websiteLink?.href || "";

        // Extract LinkedIn numeric company ID
        let linkedinNumericId: string | undefined;

        // Strategy 1: data-urn attributes
        const urnEl = document.querySelector(
          '[data-urn*="urn:li:fsd_company:"], [data-urn*="urn:li:company:"]'
        );
        if (urnEl) {
          const urn = urnEl.getAttribute("data-urn") || "";
          const m = urn.match(/urn:li:(?:fsd_)?company:(\d+)/);
          if (m) linkedinNumericId = m[1];
        }

        // Strategy 2: embedded JSON in script tags
        if (!linkedinNumericId) {
          for (const script of document.querySelectorAll("script")) {
            const t = script.textContent || "";
            const m =
              t.match(/"companyId"\s*:\s*(\d+)/) ||
              t.match(/"objectUrn"\s*:\s*"urn:li:(?:fsd_)?company:(\d+)"/) ||
              t.match(/urn:li:(?:fsd_)?company:(\d+)/);
            if (m) {
              linkedinNumericId = m[1];
              break;
            }
          }
        }

        // Strategy 3: meta/link tags
        if (!linkedinNumericId) {
          for (const el of document.querySelectorAll(
            'meta[content*="company"], link[href*="company"]'
          )) {
            const val = el.getAttribute("content") || el.getAttribute("href") || "";
            const m = val.match(/company[:/](\d+)/);
            if (m) {
              linkedinNumericId = m[1];
              break;
            }
          }
        }

        // Diagnostic: which extraction strategy succeeded?
        const strategyUsed = linkedinNumericId
          ? (urnEl ? "data-urn" : "json-or-meta")
          : "NONE";
        console.log(
          `[extractCompanyData] ${name} — numericId: ${linkedinNumericId ?? "NONE"} (strategy: ${strategyUsed})`
        );

        return {
          name,
          website,
          description,
          industry,
          size,
          location,
          linkedinUrl: window.location.href.split("?")[0],
          linkedinNumericId,
        };
      },
    })
    .then((results) => results?.[0]?.result ?? null)
    .catch(() => null);
}

/**
 * Count remote job postings for a company by navigating to LinkedIn jobs search.
 * Only called for ICP-matching companies to avoid unnecessary page loads.
 * Uses DOM scraping as primary strategy with Voyager API as fallback.
 */
export interface RemoteJobsResult {
  count: number;
  status: "ok" | "no-results" | "no-selectors" | "login-wall" | "error";
  method?: "header" | "cards" | "voyager" | "none";
}

interface DOMScrapeResult extends RemoteJobsResult {
  diagnostics: {
    url: string;
    selectorsFound: string[];
    headerText: string | null;
    cardCount: number;
    jobLinkCount: number;
    htmlSnippet: string | null;
  };
}

async function scrapeJobCountFromDOM(tabId: number): Promise<DOMScrapeResult> {
  // Poll for job-related content to appear (up to 8s)
  const selectorReady = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: () => {
      return new Promise<boolean>((resolve) => {
        const selectors = [
          // Original selectors
          ".jobs-search-no-results-banner",
          ".jobs-search-results-list",
          ".scaffold-layout__list",
          "[data-job-id]",
          ".job-card-container",
          ".jobs-search-results-list__subtitle",
          // Wildcard class selectors (survive renames)
          "[class*='jobs-search-no-results']",
          "[class*='jobs-search-results']",
          "[class*='job-card']",
          // ARIA-based (most stable across redesigns)
          "[aria-label*='job'][role='list']",
          "[aria-label*='Jobs']",
          // Data attribute patterns
          "[data-entity-urn*='jobPosting']",
          "[data-view-name*='job']",
          // Structural: any job view link in main content
          "main a[href*='/jobs/view/']",
        ];
        let attempts = 0;
        const poll = () => {
          for (const sel of selectors) {
            if (document.querySelector(sel)) { resolve(true); return; }
          }
          if (++attempts < 16) setTimeout(poll, 500);
          else resolve(false);
        };
        poll();
      });
    },
  });

  const ready = selectorReady?.[0]?.result ?? false;
  if (!ready) {
    await randomDelay(2000);
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: (): DOMScrapeResult => {
      const url = window.location.href;
      const selectorsFound: string[] = [];

      // Detect login wall / redirect
      if (url.includes("/login") || url.includes("/authwall") || url.includes("/checkpoint")) {
        return {
          count: 0, status: "login-wall", method: "none",
          diagnostics: { url, selectorsFound, headerText: null, cardCount: 0, jobLinkCount: 0, htmlSnippet: null },
        };
      }

      // Check for "no results" banner (multiple generations)
      const noResultsSelectors = [
        ".jobs-search-no-results-banner",
        "[class*='jobs-search-no-results']",
        "[class*='no-results']",
      ];
      for (const sel of noResultsSelectors) {
        if (document.querySelector(sel)) selectorsFound.push(sel);
      }
      // Text-based fallback
      const noResultsTextEl = Array.from(document.querySelectorAll("main h2, main h3, main p")).find(
        (el) => /no (matching )?jobs|0 results/i.test(el.textContent || "")
      );
      if (selectorsFound.length > 0 || noResultsTextEl) {
        return {
          count: 0, status: "no-results", method: "none",
          diagnostics: {
            url, selectorsFound,
            headerText: noResultsTextEl?.textContent?.trim() || null,
            cardCount: 0, jobLinkCount: 0, htmlSnippet: null,
          },
        };
      }

      // Strategy 1: Parse "X results" text from header
      const headerCandidates = [
        ".jobs-search-results-list__subtitle",
        ".jobs-search-results-list__title-heading h1+span",
        ".jobs-search-results-list__title-heading small",
        "[class*='jobs-search'] h1+span",
        "[class*='jobs-search'] h1+small",
        "[class*='jobs-search-results'] [class*='subtitle']",
        "[class*='jobs-search-results'] [class*='count']",
        "[class*='results-context-header']",
        "header small",
        "header span",
      ];
      let headerText = "";
      for (const sel of headerCandidates) {
        const el = document.querySelector(sel);
        const t = el?.textContent?.trim() || "";
        if (/([\d,]+)\s+results?/i.test(t) || /showing\s+([\d,]+)/i.test(t) || /([\d,]+)\s+jobs?/i.test(t)) {
          headerText = t;
          selectorsFound.push(sel);
          break;
        }
      }
      // Text scan fallback: any element in top 300px with a count pattern
      if (!headerText) {
        const candidates = document.querySelectorAll("main span, main small, main p, main div");
        for (const el of candidates) {
          const rect = el.getBoundingClientRect();
          if (rect.top > 300) continue;
          const t = el.textContent?.trim() || "";
          if (/^([\d,]+)\s+results?$/i.test(t) || /^showing\s+([\d,]+)/i.test(t) || /^([\d,]+)\s+jobs?$/i.test(t)) {
            headerText = t;
            selectorsFound.push("text-scan");
            break;
          }
        }
      }

      const countMatch =
        headerText.match(/([\d,]+)\s+results?/i) ||
        headerText.match(/showing\s+([\d,]+)/i) ||
        headerText.match(/([\d,]+)\s+jobs?/i);
      if (countMatch) {
        return {
          count: parseInt(countMatch[1].replace(/,/g, ""), 10),
          status: "ok", method: "header",
          diagnostics: { url, selectorsFound, headerText, cardCount: 0, jobLinkCount: 0, htmlSnippet: null },
        };
      }

      // Strategy 2: Count job card elements (multiple selector generations)
      const cardSelectors = [
        "[data-job-id]",
        ".job-card-container",
        ".jobs-search-results__list-item",
        ".scaffold-layout__list-item",
        ".jobs-search-results-list li",
        "[class*='job-card-container']",
        "[class*='job-card']",
        "[data-entity-urn*='jobPosting']",
        "[data-view-name*='job-card']",
        "li[class*='jobs-search']",
      ];
      const cards = document.querySelectorAll(cardSelectors.join(", "));
      for (const sel of cardSelectors) {
        if (document.querySelector(sel)) selectorsFound.push(sel);
      }
      if (cards.length > 0) {
        return {
          count: cards.length, status: "ok", method: "cards",
          diagnostics: { url, selectorsFound, headerText: headerText || null, cardCount: cards.length, jobLinkCount: 0, htmlSnippet: null },
        };
      }

      // Strategy 3: Count unique /jobs/view/ links (most stable signal)
      const jobLinks = new Set<string>();
      document.querySelectorAll<HTMLAnchorElement>('main a[href*="/jobs/view/"]').forEach((a) => {
        const id = a.href.match(/\/jobs\/view\/(\d+)/)?.[1];
        if (id) jobLinks.add(id);
      });
      if (jobLinks.size > 0) {
        selectorsFound.push("a[href*='/jobs/view/']");
        return {
          count: jobLinks.size, status: "ok", method: "cards",
          diagnostics: { url, selectorsFound, headerText: headerText || null, cardCount: 0, jobLinkCount: jobLinks.size, htmlSnippet: null },
        };
      }

      // Nothing matched — capture HTML snippet for debugging
      const mainEl = document.querySelector("main");
      const htmlSnippet = mainEl?.innerHTML?.substring(0, 2000) || document.body.innerHTML.substring(0, 2000);

      return {
        count: 0, status: "no-selectors", method: "none",
        diagnostics: { url, selectorsFound, headerText: headerText || null, cardCount: 0, jobLinkCount: 0, htmlSnippet },
      };
    },
  });

  return results?.[0]?.result ?? {
    count: 0, status: "error", method: "none",
    diagnostics: { url: "", selectorsFound: [], headerText: null, cardCount: 0, jobLinkCount: 0, htmlSnippet: null },
  };
}

/**
 * Read LinkedIn CSRF token from the JSESSIONID cookie.
 * Same pattern as connection-scraper.ts.
 */
async function getLinkedInCsrfToken(): Promise<string> {
  const cookie = await chrome.cookies.get({
    url: "https://www.linkedin.com",
    name: "JSESSIONID",
  });
  if (!cookie?.value) {
    throw new Error("Not logged into LinkedIn — JSESSIONID cookie not found");
  }
  return cookie.value.replace(/^"|"$/g, "");
}

/**
 * Resolve a LinkedIn company slug (universalName) to a numeric ID via Voyager API.
 * Used as Strategy 4 when all DOM-based extraction strategies fail.
 */
export async function resolveNumericIdViaVoyager(slug: string): Promise<string | null> {
  try {
    const csrfToken = await getLinkedInCsrfToken();

    const url = new URL("https://www.linkedin.com/voyager/api/voyagerOrganizationDashCompanies");
    url.searchParams.set("decorationId", "com.linkedin.voyager.dash.deco.organization.MiniCompany-10");
    url.searchParams.set("q", "universalName");
    url.searchParams.set("universalName", slug);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort("Voyager slug lookup timed out after 10s"), 10_000);

    const res = await fetch(url.toString(), {
      headers: {
        "csrf-token": csrfToken,
        "x-restli-protocol-version": "2.0.0",
        Accept: "application/vnd.linkedin.normalized+json+2.1",
      },
      credentials: "include",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const data = await res.json();
    // entityUrn format: "urn:li:fsd_company:12345"
    const entityUrn: string | undefined =
      data?.data?.elements?.[0]?.entityUrn ??
      data?.elements?.[0]?.entityUrn;
    if (entityUrn) {
      const m = entityUrn.match(/(\d+)$/);
      if (m) return m[1];
    }

    // Also check included[] for company entities
    for (const inc of data?.included ?? []) {
      const urn: string = inc?.entityUrn ?? inc?.$id ?? "";
      const m = urn.match(/urn:li:(?:fsd_)?company:(\d+)/);
      if (m) return m[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Voyager API fallback for counting remote jobs.
 * Uses LinkedIn's internal API which is stable across DOM changes.
 */
async function countRemoteJobsViaVoyager(
  numericId: string,
): Promise<{ count: number; error: string | null }> {
  try {
    const csrfToken = await getLinkedInCsrfToken();

    const url = new URL("https://www.linkedin.com/voyager/api/voyagerJobsDashJobCards");
    url.searchParams.set("decorationId", "com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-227");
    url.searchParams.set("count", "1");
    url.searchParams.set("q", "jobSearch");
    url.searchParams.set("query", `(origin:JOB_SEARCH_PAGE_JOB_FILTER,selectedFilters:(company:List(${numericId}),workplaceType:List(2)),spellCorrectionEnabled:true)`);
    url.searchParams.set("locationUnion", "(geoId:92000000)");
    url.searchParams.set("start", "0");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort("Voyager remote jobs check timed out after 15s"), 15_000);

    const res = await fetch(url.toString(), {
      headers: {
        "csrf-token": csrfToken,
        "x-restli-protocol-version": "2.0.0",
        Accept: "application/vnd.linkedin.normalized+json+2.1",
      },
      credentials: "include",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.status === 401 || res.status === 403) {
      return { count: 0, error: `Auth error: ${res.status}` };
    }
    if (res.status === 429) {
      return { count: 0, error: "Rate limited (429)" };
    }
    if (res.status === 400) {
      // 400 = company has no jobs or invalid filter — treat as empty, not error
      return { count: 0, error: null };
    }
    if (!res.ok) {
      return { count: 0, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    const total = data?.paging?.total ?? data?.data?.paging?.total ?? 0;
    return { count: total, error: null };
  } catch (err) {
    return { count: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Voyager-first remote job counting — avoids tab navigation entirely when Voyager works.
 * Used by find-related BFS crawl where tab navigation is expensive (doubles per-company time).
 * Falls back to full DOM scraping only if Voyager fails.
 */
export async function countRemoteJobsVoyagerFirst(
  tabId: number,
  numericId: string,
): Promise<RemoteJobsResult> {
  try {
    // Try Voyager API first (no navigation needed)
    const voyagerResult = await countRemoteJobsViaVoyager(numericId);
    if (!voyagerResult.error) {
      console.log(`[countRemoteJobs] Voyager-first succeeded: ${voyagerResult.count} jobs`);
      return {
        count: voyagerResult.count,
        status: voyagerResult.count > 0 ? "ok" : "no-results",
        method: "voyager",
      };
    }
    console.log(`[countRemoteJobs] Voyager-first failed (${voyagerResult.error}), falling back to DOM...`);
  } catch (err) {
    console.log(`[countRemoteJobs] Voyager-first threw: ${err}, falling back to DOM...`);
  }

  // Fallback to full DOM scraping (navigates the tab)
  return countRemoteJobs(tabId, numericId);
}

export async function countRemoteJobs(
  tabId: number,
  numericId: string,
): Promise<RemoteJobsResult> {
  const jobsUrl = `https://www.linkedin.com/jobs/search/?f_C=${numericId}&f_WT=2&geoId=92000000`;

  try {
    await safeTabUpdate(tabId, { url: jobsUrl });
    await waitForTabLoad(tabId);

    // ── Step 1: DOM scraping (primary) ──
    const domResult = await scrapeJobCountFromDOM(tabId);

    // Log diagnostics
    const d = domResult.diagnostics;
    console.log(`[countRemoteJobs] DOM: status=${domResult.status} count=${domResult.count} method=${domResult.method}`);
    console.log(`[countRemoteJobs]   URL: ${d.url}`);
    console.log(`[countRemoteJobs]   Selectors found: [${d.selectorsFound.join(", ")}]`);
    if (d.headerText) console.log(`[countRemoteJobs]   Header text: "${d.headerText}"`);
    if (d.cardCount) console.log(`[countRemoteJobs]   Card count: ${d.cardCount}`);
    if (d.jobLinkCount) console.log(`[countRemoteJobs]   Job link count: ${d.jobLinkCount}`);
    if (d.htmlSnippet && domResult.status === "no-selectors") {
      console.log(`[countRemoteJobs]   HTML snippet: ${d.htmlSnippet.substring(0, 500)}`);
    }

    // If DOM scraping succeeded or found genuine no-results, return
    if (domResult.status === "ok" || domResult.status === "no-results") {
      return domResult;
    }

    // Login wall — Voyager won't help either
    if (domResult.status === "login-wall") {
      return domResult;
    }

    // ── Step 2: Voyager API fallback (for "no-selectors" case) ──
    console.log(`[countRemoteJobs] DOM returned "${domResult.status}" — trying Voyager API fallback...`);
    const voyagerResult = await countRemoteJobsViaVoyager(numericId);

    if (voyagerResult.error) {
      console.log(`[countRemoteJobs] Voyager fallback failed: ${voyagerResult.error}`);
      return domResult;
    }

    console.log(`[countRemoteJobs] Voyager fallback succeeded: ${voyagerResult.count} jobs`);
    return {
      count: voyagerResult.count,
      status: voyagerResult.count > 0 ? "ok" : "no-results",
      method: "voyager",
    };
  } catch (err) {
    console.error(`[countRemoteJobs] Unexpected error:`, err);
    return { count: 0, status: "error", method: "none" };
  }
}

function extractNextPageUrl(tabId: number): Promise<string | null> {
  return chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        const nextBtn = document.querySelector<HTMLButtonElement>(
          'button[aria-label="Next"]'
        );
        if (nextBtn && !nextBtn.disabled) {
          nextBtn.click();
          return window.location.href;
        }
        return null;
      },
    })
    .then((results) => results?.[0]?.result ?? null)
    .catch(() => null);
}

async function fetchExistingLinkedinUrls(urls: string[]): Promise<string[]> {
  if (!urls.length) return [];
  try {
    const result = await gqlRequest(
      `query ExistingCompanyLinkedinUrls($linkedinUrls: [String!]!) {
        existingCompanyLinkedinUrls(linkedinUrls: $linkedinUrls)
      }`,
      { linkedinUrls: urls },
    );
    if (result.errors) {
      console.warn("[BrowseCompanies] dedupe lookup errored:", result.errors[0].message);
      return [];
    }
    return result.data?.existingCompanyLinkedinUrls ?? [];
  } catch (err) {
    console.warn("[BrowseCompanies] dedupe lookup threw, falling back to no skip:", err);
    return [];
  }
}

export type CompanyImportBatchInput = {
  name: string;
  website?: string;
  linkedin_url?: string;
  description?: string;
  location?: string;
  industry?: string;
  size?: string;
  service_taxonomy?: string[];
};

export async function saveCompanyBatch(
  batch: Array<CompanyImportBatchInput>,
): Promise<number> {
  console.log(`[SaveBatch] ${batch.length} companies:`, batch.map(c => c.name).join(", "));
  try {
    const result = await gqlRequest(
      `mutation ImportCompanies($companies: [CompanyImportInput!]!) {
        importCompanies(companies: $companies) { success imported failed errors }
      }`,
      { companies: batch },
    );

    if (result.data?.importCompanies) {
      const { imported, failed, errors } = result.data.importCompanies;
      console.log(`[SaveBatch] Result: ${imported} imported, ${failed} failed`);
      if (failed > 0) {
        console.warn(`[SaveBatch] ${failed} failed:`, errors);
      }
      return imported;
    }
    if (result.errors) {
      console.error("[SaveBatch] GQL error:", result.errors[0].message);
    }
    return 0;
  } catch (err) {
    console.error("[SaveBatch] Save batch error:", err);
    return 0;
  }
}

export async function browseCompanies(tabId: number) {
  companyCancelled = false;
  let saved = 0;
  let filtered = 0;
  let totalProcessed = 0;
  let totalRemoteJobs = 0;
  let page = 1;
  const allCompanyUrls: string[] = [];
  const returnUrl = (await chrome.tabs.get(tabId)).url || "";

  // ── Phase 1: Collect company URLs from search results (all pages) ──
  console.log("[BrowseCompanies] Phase 1: Collecting company URLs...");

  while (!companyCancelled) {
    // Wait for page content to render
    await randomDelay(2000);

    // Scroll to bottom to load all results
    await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => window.scrollTo(0, document.body.scrollHeight),
    });
    await randomDelay(1500);

    const urls = await extractCompanyUrls(tabId);
    const newUrls = urls.filter((u) => !allCompanyUrls.includes(u));
    allCompanyUrls.push(...newUrls);

    console.log(`[BrowseCompanies] Page ${page}: found ${newUrls.length} new companies (total: ${allCompanyUrls.length})`);

    // Try next page
    const hasNext = await extractNextPageUrl(tabId);
    if (!hasNext) break;

    page++;
    await waitForTabLoad(tabId);
    await randomDelay(2000);
  }

  // ── Pre-flight: skip URLs already in the DB ──
  const existing = await fetchExistingLinkedinUrls(allCompanyUrls);
  const existingSet = new Set(existing.map((u) => u.replace(/\/$/, "")));
  const toVisit = allCompanyUrls.filter((u) => !existingSet.has(u.replace(/\/$/, "")));
  const skippedCount = allCompanyUrls.length - toVisit.length;

  console.log(
    `[BrowseCompanies] Phase 2: Visiting ${toVisit.length} new companies (${skippedCount} already imported)...`,
  );

  // ── Phase 2: Visit each company and extract data ──
  const batch: Array<{
    name: string;
    website?: string;
    linkedin_url?: string;
    description?: string;
    location?: string;
    industry?: string;
  }> = [];

  for (let i = 0; i < toVisit.length; i++) {
    if (companyCancelled) break;

    const companyUrl = toVisit[i];
    console.log(`[BrowseCompanies] ${i + 1}/${toVisit.length}: ${companyUrl}`);

    // Navigate to company "about" page for richer data
    const aboutUrl = companyUrl.replace(/\/$/, "") + "/about/";
    try {
      await chrome.tabs.update(tabId, { url: aboutUrl });
    } catch {
      console.warn("[BrowseCompanies] Tab closed during navigation, aborting");
      break;
    }
    await waitForTabLoad(tabId);
    await randomDelay(2500);

    // Click "See more" if present
    await clickSeeMore(tabId);
    await randomDelay(500);

    const data = await extractCompanyData(tabId);
    totalProcessed++;

    if (data && data.name) {
      const icp = isICPTarget(data);
      if (!icp.target) {
        filtered++;
        console.log(`[BrowseCompanies] SKIP: ${data.name} (${icp.reason}) | ${data.industry} | ${data.size}`);
        continue;
      }

      // Check remote job postings (boost signal, not a gate)
      let remoteJobCount = -1;
      if (data.linkedinNumericId) {
        console.log(`[BrowseCompanies] Checking remote jobs for ${data.name} (ID: ${data.linkedinNumericId})...`);
        const jobResult = await countRemoteJobs(tabId, data.linkedinNumericId);
        remoteJobCount = jobResult.count;
        totalRemoteJobs += Math.max(0, remoteJobCount);
        if (jobResult.status === "login-wall") {
          console.log(`[BrowseCompanies] ${data.name} — ⛔ LOGIN WALL — cannot check remote jobs`);
        } else if (jobResult.status === "no-selectors") {
          console.log(`[BrowseCompanies] ${data.name} — ⚠️ NO SELECTORS MATCHED — LinkedIn DOM may have changed`);
        } else if (remoteJobCount > 0) {
          console.log(`[BrowseCompanies] ${data.name} — 🎯✅ CONFIRMED — ${remoteJobCount} active remote jobs (via ${jobResult.method})`);
        } else {
          console.log(`[BrowseCompanies] ${data.name} — 🎯⚠️ UNCONFIRMED — no active remote jobs`);
        }
      } else {
        console.log(`[BrowseCompanies] No numeric ID for ${data.name}, skipping job count`);
      }

      const jobLabel = remoteJobCount > 0 ? `Remote Jobs: ${remoteJobCount}` : "";

      batch.push({
        name: data.name,
        website: data.website || undefined,
        linkedin_url: data.linkedinUrl || undefined,
        description: [data.description, data.industry ? `Industry: ${data.industry}` : "", data.size ? `Size: ${data.size}` : "", jobLabel]
          .filter(Boolean)
          .join("\n") || undefined,
        location: data.location || undefined,
        industry: data.industry || undefined,
      });

      console.log(
        `[BrowseCompanies] Extracted: ${data.name} | ${data.industry} | ${data.size} | ${data.location}`,
      );
    }

    // Save in batches of 10
    if (batch.length >= 10) {
      const result = await saveCompanyBatch(batch.splice(0));
      saved += result;
    }

    // Dwell
    await randomDelay(1500);
  }

  // Save remaining
  if (batch.length > 0) {
    const result = await saveCompanyBatch(batch.splice(0));
    saved += result;
  }

  // Navigate back to search results
  await chrome.tabs.update(tabId, { url: returnUrl });
  await waitForTabLoad(tabId);

  console.log(
    `[BrowseCompanies] Complete. Saved ${saved}/${totalProcessed} companies (${skippedCount} skipped as duplicates, ${filtered} filtered, ${totalRemoteJobs} remote jobs found) from ${page} page(s).`,
  );
}
