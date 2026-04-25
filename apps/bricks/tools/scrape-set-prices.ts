/**
 * BrickEconomy price scraper.
 *
 * Usage:
 *   pnpm prices:scrape -- --part 94925 [--force] [--limit 10]
 *
 * Enumerates every set containing the given part via Rebrickable, then
 * visits each set's BrickEconomy page with Playwright and upserts retail
 * + current market value into `set_prices_cache`. BrickEconomy serves
 * prices in the visitor's locale currency, so we extract whichever of
 * USD/EUR/GBP is rendered and store it in the matching column.
 */
import { chromium, type Browser, type Page } from "playwright";
import { neon } from "@neondatabase/serverless";

const REBRICKABLE_BASE = "https://rebrickable.com/api/v3/lego/parts";
const BRICKECONOMY_BASE = "https://www.brickeconomy.com";
const PAGE_SIZE = 1000;
const TTL_DAYS = 30;
const NAV_DELAY_MS = 900;
const NAV_JITTER_MS = 600;

interface CliArgs {
  part: string;
  force: boolean;
  limit: number | null;
}

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = { part: "", force: false, limit: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--part") out.part = argv[++i] ?? "";
    else if (a === "--force") out.force = true;
    else if (a === "--limit") out.limit = Number(argv[++i] ?? "");
  }
  if (!out.part) {
    console.error("Usage: scrape-set-prices --part <partNum> [--force] [--limit N]");
    process.exit(1);
  }
  return out;
}

interface RbSet {
  set_num: string;
  name: string;
  year: number;
  num_parts: number;
}

async function enumerateSets(partNum: string, apiKey: string): Promise<RbSet[]> {
  const headers = { Authorization: `key ${apiKey}` };
  const colorsRes = await fetch(
    `${REBRICKABLE_BASE}/${partNum}/colors/?page_size=${PAGE_SIZE}`,
    { headers },
  );
  if (!colorsRes.ok) throw new Error(`Rebrickable colors ${colorsRes.status}`);
  const colorsData = (await colorsRes.json()) as {
    results?: { color_id: number }[];
  };
  const colors = colorsData.results ?? [];

  const seen = new Map<string, RbSet>();
  for (const c of colors) {
    let url: string | null = `${REBRICKABLE_BASE}/${partNum}/colors/${c.color_id}/sets/?page_size=${PAGE_SIZE}`;
    while (url) {
      const r: Response = await fetch(url, { headers });
      if (!r.ok) break;
      const d = (await r.json()) as { results?: RbSet[]; next: string | null };
      for (const s of d.results ?? []) {
        if (!seen.has(s.set_num)) seen.set(s.set_num, s);
      }
      url = d.next;
    }
  }
  return Array.from(seen.values());
}

interface ScrapedPrice {
  setNum: string;
  usdRetail: number | null;
  gbpRetail: number | null;
  eurRetail: number | null;
  usdMarket: number | null;
  gbpMarket: number | null;
  eurMarket: number | null;
  found: boolean;
}

const NULL_PRICE = (setNum: string): ScrapedPrice => ({
  setNum,
  usdRetail: null,
  gbpRetail: null,
  eurRetail: null,
  usdMarket: null,
  gbpMarket: null,
  eurMarket: null,
  found: false,
});

const toCents = (raw: string | null | undefined): number | null => {
  if (!raw) return null;
  // Strip thousands separators (could be , or .) and normalize decimal to "."
  const stripped = raw.replace(/[\s,](?=\d{3}\b)/g, "");
  const n = parseFloat(stripped.replace(/,/g, "."));
  if (!isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
};

type Currency = "USD" | "GBP" | "EUR";

function detectCurrency(text: string): Currency {
  const usd = (text.match(/\$/g) ?? []).length;
  const gbp = (text.match(/£/g) ?? []).length;
  const eur = (text.match(/€/g) ?? []).length;
  if (gbp >= usd && gbp >= eur && gbp > 0) return "GBP";
  if (eur >= usd && eur > 0) return "EUR";
  return "USD";
}

interface PriceTuple {
  retail: number | null;
  market: number | null;
}

function extractPrices(text: string): { currency: Currency; tuple: PriceTuple } {
  const currency = detectCurrency(text);
  const sym = currency === "USD" ? "\\$" : currency === "GBP" ? "£" : "€";

  // Number capture: 1-3 digits, optional thousands group, optional decimals.
  const NUM = `([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?|[0-9]+(?:[.,][0-9]{2})?)`;

  const grab = (re: RegExp): string | null => {
    const m = text.match(re);
    return m ? m[1] : null;
  };

  // Retail: structured "Retail [sym]X" / "MSRP [sym]X" / description text.
  const retail =
    toCents(grab(new RegExp(`Retail\\s*price\\s*${sym}\\s*${NUM}`, "i"))) ??
    toCents(grab(new RegExp(`Retail\\s*${sym}\\s*${NUM}`, "i"))) ??
    toCents(grab(new RegExp(`available at retail for\\s*${sym}\\s*${NUM}`, "i"))) ??
    toCents(grab(new RegExp(`(?:original\\s+)?retail price of\\s*${sym}\\s*${NUM}`, "i"))) ??
    toCents(grab(new RegExp(`originally retailed for\\s*${sym}\\s*${NUM}`, "i"))) ??
    toCents(grab(new RegExp(`had an MSRP of\\s*${sym}\\s*${NUM}`, "i"))) ??
    toCents(grab(new RegExp(`MSRP[^${sym}]{0,20}${sym}\\s*${NUM}`, "i"))) ??
    toCents(grab(new RegExp(`launched at\\s*${sym}\\s*${NUM}`, "i")));

  // Market value: prefer description sentences (most accurate), then structured.
  const market =
    toCents(grab(new RegExp(`(?:currently\\s+)?valued at(?:\\s+around)?\\s*${sym}\\s*${NUM}`, "i"))) ??
    toCents(grab(new RegExp(`average\\s*(?:below MSRP\\s*)?at\\s*${sym}\\s*${NUM}`, "i"))) ??
    toCents(grab(new RegExp(`current value\\s*${sym}\\s*${NUM}`, "i"))) ??
    toCents(grab(new RegExp(`Sealed\\s+Value\\s*${sym}\\s*${NUM}`, "i"))) ??
    toCents(grab(new RegExp(`Value\\s*${sym}\\s*${NUM}`, "i")));

  return { currency, tuple: { retail, market } };
}

async function scrapeSet(page: Page, setNum: string): Promise<ScrapedPrice> {
  const searchUrl = `${BRICKECONOMY_BASE}/search?query=${encodeURIComponent(setNum)}`;
  try {
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 25_000 });
  } catch {
    return NULL_PRICE(setNum);
  }

  const setLink = await page
    .locator(`a[href*="/set/${setNum}/"]`)
    .first()
    .getAttribute("href")
    .catch(() => null);

  if (!setLink) return NULL_PRICE(setNum);

  const target = setLink.startsWith("http") ? setLink : `${BRICKECONOMY_BASE}${setLink}`;
  try {
    await page.goto(target, { waitUntil: "domcontentloaded", timeout: 25_000 });
  } catch {
    return NULL_PRICE(setNum);
  }

  // Best-effort: wait briefly for the pricing area to populate.
  await page.locator("body").waitFor({ timeout: 5_000 }).catch(() => {});

  const fullText = await page.locator("body").innerText().catch(() => "");
  if (!fullText) return NULL_PRICE(setNum);

  // Strip everything from the Minifigs / related-sets sections onward — those
  // contain "Value $X" rows for individual figs and other sets that would
  // otherwise be mistaken for this set's market value.
  const cutMarkers = [
    /\bMinifigs\b/i,
    /\bSets in\b/i,
    /\bRelated [Ss]ets\b/i,
    /\bSimilar [Ss]ets\b/i,
    /\bRecommended\b/i,
  ];
  let text = fullText;
  let earliest = text.length;
  for (const re of cutMarkers) {
    const m = text.match(re);
    if (m && m.index !== undefined && m.index < earliest) earliest = m.index;
  }
  text = text.slice(0, earliest);

  const { currency, tuple } = extractPrices(text);
  const out = NULL_PRICE(setNum);
  if (currency === "USD") {
    out.usdRetail = tuple.retail;
    out.usdMarket = tuple.market;
  } else if (currency === "GBP") {
    out.gbpRetail = tuple.retail;
    out.gbpMarket = tuple.market;
  } else {
    out.eurRetail = tuple.retail;
    out.eurMarket = tuple.market;
  }
  out.found = tuple.retail !== null || tuple.market !== null;
  return out;
}

function jitterDelay(): number {
  return NAV_DELAY_MS + Math.floor(Math.random() * NAV_JITTER_MS);
}

async function loadEnv(): Promise<{ db: ReturnType<typeof neon>; apiKey: string }> {
  const databaseUrl = process.env.DATABASE_URL;
  const apiKey = process.env.REBRICKABLE_API_KEY;
  if (!databaseUrl) throw new Error("DATABASE_URL missing");
  if (!apiKey) throw new Error("REBRICKABLE_API_KEY missing");
  return { db: neon(databaseUrl), apiKey };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { db, apiKey } = await loadEnv();

  console.log(`Enumerating sets for part ${args.part}…`);
  const allSets = await enumerateSets(args.part, apiKey);
  console.log(`  → ${allSets.length} unique sets`);

  const setNums = allSets.map((s) => s.set_num);

  let toScrape: string[];
  if (args.force) {
    toScrape = setNums;
  } else {
    const ttlMs = TTL_DAYS * 24 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - ttlMs).toISOString();
    const placeholders = setNums.map((_, i) => `$${i + 2}`).join(",");
    const cached = (await db.query(
      `SELECT set_num FROM set_prices_cache WHERE updated_at >= $1 AND set_num IN (${placeholders})`,
      [cutoff, ...setNums],
    )) as { set_num: string }[];
    const fresh = new Set(cached.map((r) => r.set_num));
    toScrape = setNums.filter((n) => !fresh.has(n));
  }

  if (args.limit !== null) toScrape = toScrape.slice(0, args.limit);
  console.log(`  → ${toScrape.length} to scrape (force=${args.force})`);
  if (toScrape.length === 0) return;

  const browser: Browser = await chromium.launch({ headless: true });
  // Force a US locale so BrickEconomy serves prices in USD instead of falling
  // back to the host machine's geo-IP (which yields EUR for EU runs and leaves
  // usd_retail / usd_market columns empty).
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    locale: "en-US",
    timezoneId: "America/New_York",
    extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
  });
  const page = await ctx.newPage();

  let okCount = 0;
  let missCount = 0;
  for (let i = 0; i < toScrape.length; i++) {
    const setNum = toScrape[i];
    let result: ScrapedPrice;
    try {
      result = await scrapeSet(page, setNum);
    } catch (err) {
      console.warn(`  ! ${setNum} threw: ${(err as Error).message}`);
      result = NULL_PRICE(setNum);
    }
    if (result.found) okCount++;
    else missCount++;

    await db.query(
      `INSERT INTO set_prices_cache
         (set_num, usd_retail, gbp_retail, eur_retail,
          usd_market, gbp_market, eur_market,
          source, found, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'brickeconomy', $8, NOW())
       ON CONFLICT (set_num) DO UPDATE SET
         usd_retail = EXCLUDED.usd_retail,
         gbp_retail = EXCLUDED.gbp_retail,
         eur_retail = EXCLUDED.eur_retail,
         usd_market = EXCLUDED.usd_market,
         gbp_market = EXCLUDED.gbp_market,
         eur_market = EXCLUDED.eur_market,
         source = EXCLUDED.source,
         found = EXCLUDED.found,
         updated_at = NOW()`,
      [
        result.setNum,
        result.usdRetail,
        result.gbpRetail,
        result.eurRetail,
        result.usdMarket,
        result.gbpMarket,
        result.eurMarket,
        result.found,
      ],
    );

    const tag = result.found ? "✓" : "·";
    const r =
      result.usdRetail ?? result.eurRetail ?? result.gbpRetail;
    const m =
      result.usdMarket ?? result.eurMarket ?? result.gbpMarket;
    const fmt = (c: number | null) => (c == null ? "—" : (c / 100).toFixed(2));
    console.log(
      `  [${i + 1}/${toScrape.length}] ${tag} ${setNum.padEnd(10)} retail=${fmt(r)}  value=${fmt(m)}`,
    );

    await new Promise((r) => setTimeout(r, jitterDelay()));
  }

  await browser.close();
  console.log(`Done. ${okCount} priced, ${missCount} not found.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
