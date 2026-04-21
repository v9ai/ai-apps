import { chromium, type Browser } from "playwright";
import { generateDeepSeek } from "@/lib/deepseek";
import { ScrapedCompetitorSchema, type ScrapedCompetitor } from "./schemas";

const PRICING_PATH_CANDIDATES = ["/pricing", "/plans", "/price"];
const INTEGRATIONS_PATH_CANDIDATES = ["/integrations", "/integrate", "/connect"];

const MAX_PAGE_TEXT_CHARS = 15_000;
const PAGE_TIMEOUT_MS = 20_000;

type FetchedPage = { url: string; kind: "landing" | "pricing" | "integrations"; text: string };

function normalizeUrl(raw: string): string {
  return raw.replace(/\/+$/, "");
}

function tryPathVariants(baseUrl: string, paths: string[]): string[] {
  const base = normalizeUrl(baseUrl);
  return paths.map((p) => `${base}${p}`);
}

async function fetchPageText(browser: Browser, url: string, timeoutMs = PAGE_TIMEOUT_MS): Promise<string | null> {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    viewport: { width: 1366, height: 900 },
  });
  try {
    const page = await context.newPage();
    const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    if (!resp || !resp.ok()) return null;
    await page.waitForTimeout(800);
    const raw = await page.evaluate(() => {
      const clone = document.body.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("script,style,noscript,svg").forEach((el) => el.remove());
      return clone.innerText;
    });
    return raw.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").slice(0, MAX_PAGE_TEXT_CHARS);
  } catch {
    return null;
  } finally {
    await context.close();
  }
}

async function tryFetchFirst(browser: Browser, urls: string[]): Promise<FetchedPage | null> {
  for (const url of urls) {
    const text = await fetchPageText(browser, url);
    if (text && text.length > 200) {
      return { url, kind: "pricing", text };
    }
  }
  return null;
}

const EXTRACT_PROMPT = `You extract competitor product information from website text.

Return STRICT JSON matching this exact shape — no prose, no code fences:
{
  "description": "short description of the product" | null,
  "positioningHeadline": "hero headline (H1)" | null,
  "positioningTagline": "sub-headline / value prop" | null,
  "targetAudience": "who the product is for" | null,
  "logoUrl": "https://…/logo.png" | null,
  "pricingTiers": [
    {
      "tierName": "Starter",
      "monthlyPriceUsd": 49 | null,
      "annualPriceUsd": 490 | null,
      "seatPriceUsd": null,
      "currency": "USD",
      "includedLimits": {"contacts": 10000, "emails": 5000} | null,
      "isCustomQuote": false
    }
  ],
  "features": [
    { "tierName": "Pro" | null, "featureText": "LinkedIn enrichment", "category": "enrichment" | null }
  ],
  "integrations": [
    { "integrationName": "Salesforce", "integrationUrl": null, "category": "crm" | null }
  ]
}

Rules:
- If the page is not about pricing/features, return empty arrays.
- "isCustomQuote": true only when the tier says "Contact sales", "Custom", "Let's talk", etc.
- Prices must be NUMBERS in USD. Convert if shown in other currencies using a reasonable estimate and note the original in the tier name (e.g. "Pro (€49 ≈ $53)").
- "tierName" on a feature = which tier includes it; null if it's a global/all-plans feature.
- Drop duplicates. Keep feature_text short (< 80 chars).
- If a field is unknown, use null — never invent values.`;

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    if (first >= 0 && last > first) {
      return JSON.parse(candidate.slice(first, last + 1));
    }
    throw new Error(`Could not parse JSON from scrape LLM output: ${candidate.slice(0, 200)}`);
  }
}

function mergeScraped(into: ScrapedCompetitor, patch: ScrapedCompetitor): ScrapedCompetitor {
  const dedupKey = (s: string) => s.toLowerCase().trim();
  const featureKey = (f: { featureText: string; tierName?: string | null }) =>
    `${dedupKey(f.featureText)}|${f.tierName ?? ""}`;
  const integrationKey = (i: { integrationName: string }) => dedupKey(i.integrationName);
  const tierKey = (t: { tierName: string }) => dedupKey(t.tierName);

  const existingFeatures = new Set(into.features.map(featureKey));
  const existingIntegrations = new Set(into.integrations.map(integrationKey));
  const existingTiers = new Set(into.pricingTiers.map(tierKey));

  return {
    description: into.description ?? patch.description,
    positioningHeadline: into.positioningHeadline ?? patch.positioningHeadline,
    positioningTagline: into.positioningTagline ?? patch.positioningTagline,
    targetAudience: into.targetAudience ?? patch.targetAudience,
    logoUrl: into.logoUrl ?? patch.logoUrl,
    pricingTiers: [
      ...into.pricingTiers,
      ...patch.pricingTiers.filter((t) => !existingTiers.has(tierKey(t))),
    ],
    features: [
      ...into.features,
      ...patch.features.filter((f) => !existingFeatures.has(featureKey(f))),
    ],
    integrations: [
      ...into.integrations,
      ...patch.integrations.filter((i) => !existingIntegrations.has(integrationKey(i))),
    ],
  };
}

async function extractFromPage(page: FetchedPage): Promise<ScrapedCompetitor> {
  const prompt = `${EXTRACT_PROMPT}

Page URL: ${page.url}
Page kind: ${page.kind}

--- PAGE TEXT START ---
${page.text}
--- PAGE TEXT END ---

Return the JSON now.`;

  const raw = await generateDeepSeek({
    promptText: prompt,
    promptType: "text",
    temperature: 0.1,
    max_tokens: 4096,
  });

  return ScrapedCompetitorSchema.parse(extractJson(raw));
}

export async function scrapeCompetitor(url: string): Promise<ScrapedCompetitor> {
  const browser = await chromium.launch({ headless: true });
  try {
    const landingText = await fetchPageText(browser, url);
    const landing: FetchedPage | null = landingText
      ? { url, kind: "landing", text: landingText }
      : null;

    const pricing = await tryFetchFirst(browser, tryPathVariants(url, PRICING_PATH_CANDIDATES));
    const integrations = await tryFetchFirst(browser, tryPathVariants(url, INTEGRATIONS_PATH_CANDIDATES));

    const pages = [landing, pricing, integrations].filter((p): p is FetchedPage => p !== null);
    if (pages.length === 0) {
      throw new Error("No pages could be fetched");
    }

    let merged: ScrapedCompetitor = {
      description: null,
      positioningHeadline: null,
      positioningTagline: null,
      targetAudience: null,
      logoUrl: null,
      pricingTiers: [],
      features: [],
      integrations: [],
    };

    for (const page of pages) {
      try {
        const extracted = await extractFromPage(page);
        merged = mergeScraped(merged, extracted);
      } catch (err) {
        console.warn(`[scrapeCompetitor] extract failed for ${page.url}:`, err);
      }
    }

    return merged;
  } finally {
    await browser.close();
  }
}
