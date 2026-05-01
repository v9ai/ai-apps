// ── Batch Full-Company Scraper ───────────────────────────────────────
// Drives scrapeCompanyFull across N companies sequentially. The web app
// hands us a queue (companyId, name, linkedinUrl); we open each company's
// LinkedIn page in a background tab, run the existing 4-phase orchestrator
// (About → Posts → Jobs → People), close the tab, pace, advance.

import {
  scrapeCompanyFull,
  setCompanyScraperCancelled,
  setBatchProgressContext,
  type CompanyScraperResult,
} from "./company-scraper";
import { randomDelay, waitForTabLoad } from "./tab-utils";
import { GRAPHQL_URL } from "../../services/graphql";

export interface BatchCompany {
  companyId: number;
  name: string;
  linkedinUrl: string;
}

export interface BatchCompanyResult {
  companyId: number;
  name: string;
  succeeded: boolean;
  scrape?: CompanyScraperResult;
  error?: string;
}

let batchCancelled = false;

export function setBatchCancelled(value: boolean) {
  batchCancelled = value;
}

async function notifyWebApp(action: string, data: Record<string, unknown>) {
  try {
    const appOrigin = new URL(GRAPHQL_URL).origin;
    const tabs = await chrome.tabs.query({ url: [`${appOrigin}/*`] });
    for (const tab of tabs) {
      if (!tab.id) continue;
      chrome.tabs.sendMessage(tab.id, {
        source: "lead-gen-bg",
        action,
        ...data,
      }).catch(() => { /* content script may not be present */ });
    }
  } catch { /* ignore */ }
}

async function runOne(company: BatchCompany, idx: number, total: number): Promise<BatchCompanyResult> {
  let tabId: number | undefined;
  try {
    const tab = await chrome.tabs.create({ url: company.linkedinUrl, active: false });
    tabId = tab.id;
    if (!tabId) throw new Error("Failed to open tab");

    await waitForTabLoad(tabId);
    await randomDelay(2500);

    setCompanyScraperCancelled(false);
    setBatchProgressContext({ idx, total, companyName: company.name });

    const scrape = await scrapeCompanyFull(tabId);

    return {
      companyId: company.companyId,
      name: company.name,
      succeeded: scrape.errors.length === 0,
      scrape,
    };
  } catch (err) {
    return {
      companyId: company.companyId,
      name: company.name,
      succeeded: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    setBatchProgressContext(null);
    if (tabId !== undefined) {
      chrome.tabs.remove(tabId).catch(() => { /* already closed */ });
    }
  }
}

export async function scrapeCompanyFullBatch(companies: BatchCompany[]): Promise<void> {
  batchCancelled = false;
  const total = companies.length;
  const results: BatchCompanyResult[] = [];

  for (let i = 0; i < companies.length; i++) {
    if (batchCancelled) break;
    const company = companies[i];
    const idx = i + 1;

    await notifyWebApp("companyBatchProgress", {
      idx,
      total,
      companyName: company.name,
      phaseMessage: "Opening LinkedIn…",
    });

    const result = await runOne(company, idx, total);
    results.push(result);

    if (batchCancelled) break;

    // Pace between companies to avoid LinkedIn rate-limit / detection.
    if (i < companies.length - 1) {
      await randomDelay(8000);
    }
  }

  const succeeded = results.filter((r) => r.succeeded).length;
  const failed = results.length - succeeded;

  await notifyWebApp("companyBatchComplete", {
    total,
    processed: results.length,
    succeeded,
    failed,
    cancelled: batchCancelled,
    results: results.map((r) => ({
      companyId: r.companyId,
      name: r.name,
      succeeded: r.succeeded,
      error: r.error,
      peopleSaved: r.scrape?.peopleSaved ?? 0,
      postsSaved: r.scrape?.postsSaved ?? 0,
      jobsSaved: r.scrape?.jobsSaved ?? 0,
    })),
  });
}
