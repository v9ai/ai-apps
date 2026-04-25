/**
 * BrickEconomy price scraper.
 *
 * Usage:
 *   pnpm prices:scrape -- --part 94925 [--force] [--limit 10]
 *
 * Enumerates every set containing the given part via Rebrickable, then
 * visits each set's BrickEconomy page with Playwright and upserts retail +
 * current market value into `set_prices_cache`.
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

const toCents = (v: string | null | undefined): number | null => {
  if (!v) return null;
  const n = parseFloat(v.replace(/,/g, ""));
  if (!isFinite(n)) return null;
  return Math.round(n * 100);
};

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

  let landed = false;
  if (setLink) {
    try {
      const target = setLink.startsWith("http") ? setLink : `${BRICKECONOMY_BASE}${setLink}`;
      await page.goto(target, { waitUntil: "domcontentloaded", timeout: 25_000 });
      landed = true;
    } catch {
      landed = false;
    }
  }
  if (!landed) {
    return NULL_PRICE(setNum);
  }

  const text = await page.locator("body").innerText().catch(() => "");
  if (!text) return NULL_PRICE(setNum);

  const grab = (re: RegExp): string | null => {
    const m = text.match(re);
    return m ? m[1] : null;
  };

  // Retail prices: BrickEconomy renders rows like "Retail (US) $24.99".
  const usdRetail = toCents(grab(/Retail\s*\(US\)\s*\$([0-9.,]+)/i));
  const gbpRetail = toCents(grab(/Retail\s*\(UK\)\s*£([0-9.,]+)/i));
  const eurRetail = toCents(
    grab(/Retail\s*\(DE\)\s*€([0-9.,]+)/i) ||
      grab(/Retail\s*\(EU\)\s*€([0-9.,]+)/i),
  );

  // Current market value (sealed). Patterns vary: "Value $42.50", "Current Value $42.50".
  const usdMarket = toCents(
    grab(/(?:Current\s+)?Value\s*\$([0-9.,]+)/i) ||
      grab(/Sealed\s+Value\s*\$([0-9.,]+)/i),
  );
  const gbpMarket = toCents(grab(/(?:Current\s+)?Value\s*£([0-9.,]+)/i));
  const eurMarket = toCents(grab(/(?:Current\s+)?Value\s*€([0-9.,]+)/i));

  const found =
    usdRetail !== null ||
    gbpRetail !== null ||
    eurRetail !== null ||
    usdMarket !== null ||
    gbpMarket !== null ||
    eurMarket !== null;

  return {
    setNum,
    usdRetail,
    gbpRetail,
    eurRetail,
    usdMarket,
    gbpMarket,
    eurMarket,
    found,
  };
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
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
  });
  const page = await ctx.newPage();

  let okCount = 0;
  let missCount = 0;
  for (let i = 0; i < toScrape.length; i++) {
    const setNum = toScrape[i];
    const result = await scrapeSet(page, setNum);
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
    const usd = result.usdRetail !== null ? `$${(result.usdRetail / 100).toFixed(2)}` : "—";
    const mkt = result.usdMarket !== null ? `$${(result.usdMarket / 100).toFixed(2)}` : "—";
    console.log(`  [${i + 1}/${toScrape.length}] ${tag} ${setNum}  retail=${usd}  value=${mkt}`);

    await new Promise((r) => setTimeout(r, jitterDelay()));
  }

  await browser.close();
  console.log(`Done. ${okCount} priced, ${missCount} not found.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
