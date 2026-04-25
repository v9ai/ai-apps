import { NextRequest, NextResponse } from "next/server";
import orderBy from "lodash/orderBy";
import { inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { setPricesCache } from "@/lib/schema";
import { fetchBricksetPrices } from "@/lib/brickset";

const API_KEY = process.env.REBRICKABLE_API_KEY;
const PARTS_BASE = "https://rebrickable.com/api/v3/lego/parts";
const PAGE_SIZE = 1000;
const CACHE_TTL_DAYS = 30;
const NOT_FOUND_RETRY_TTL_DAYS = Number(process.env.BRICKSET_RETRY_TTL_DAYS ?? 7);

interface RbSet {
  set_num: string;
  name: string;
  year: number;
  num_parts: number;
  set_img_url: string | null;
}

interface AggregatedSet {
  setNum: string;
  name: string;
  year: number;
  numParts: number;
  imageUrl: string | null;
  colors: { id: number; name: string }[];
  usdRetail: number | null;
  gbpRetail: number | null;
  eurRetail: number | null;
  usdMarket: number | null;
  gbpMarket: number | null;
  eurMarket: number | null;
  // Single-value fields the UI sorts and renders on. Cents.
  // `displayPrice` is the most-relevant available price (market preferred over
  // retail) in the priority order USD → EUR → GBP. `displayCurrency` tells the
  // UI which symbol to render. Both are null when no price is known.
  displayPrice: number | null;
  displayCurrency: "USD" | "EUR" | "GBP" | null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ partNum: string }> }
) {
  if (!API_KEY) {
    return NextResponse.json({ error: "Rebrickable API key not configured" }, { status: 500 });
  }

  const sortParam = req.nextUrl.searchParams.get("sort");
  type SortKey = "priceAsc" | "priceDesc" | "partsAsc" | "partsDesc";
  const sort: SortKey =
    sortParam === "priceDesc" || sortParam === "partsAsc" || sortParam === "partsDesc"
      ? sortParam
      : "priceAsc";

  const { partNum } = await params;
  const headers = { Authorization: `key ${API_KEY}` };

  const colorsRes = await fetch(`${PARTS_BASE}/${partNum}/colors/?page_size=${PAGE_SIZE}`, { headers });
  if (!colorsRes.ok) {
    return NextResponse.json({ count: 0, sets: [] });
  }
  const colorsData = await colorsRes.json();
  const colors: { color_id: number; color_name: string }[] = colorsData.results ?? [];

  async function fetchAllPages(colorId: number): Promise<RbSet[]> {
    const out: RbSet[] = [];
    let url: string | null = `${PARTS_BASE}/${partNum}/colors/${colorId}/sets/?page_size=${PAGE_SIZE}`;
    while (url) {
      const r: Response = await fetch(url, { headers });
      if (!r.ok) break;
      const d: { results?: RbSet[]; next: string | null } = await r.json();
      out.push(...(d.results ?? []));
      url = d.next;
    }
    return out;
  }

  const perColor = await Promise.all(
    colors.map(async (c) => ({ color: c, sets: await fetchAllPages(c.color_id) }))
  );

  const byNum = new Map<string, AggregatedSet>();
  for (const { color, sets } of perColor) {
    for (const s of sets) {
      const existing = byNum.get(s.set_num);
      if (existing) {
        existing.colors.push({ id: color.color_id, name: color.color_name });
      } else {
        byNum.set(s.set_num, {
          setNum: s.set_num,
          name: s.name,
          year: s.year,
          numParts: s.num_parts,
          imageUrl: s.set_img_url,
          colors: [{ id: color.color_id, name: color.color_name }],
          usdRetail: null,
          gbpRetail: null,
          eurRetail: null,
          usdMarket: null,
          gbpMarket: null,
          eurMarket: null,
          displayPrice: null,
          displayCurrency: null,
        });
      }
    }
  }

  const allSetNums = Array.from(byNum.keys());

  if (allSetNums.length > 0) {
    const cached = await db
      .select()
      .from(setPricesCache)
      .where(inArray(setPricesCache.setNum, allSetNums));

    const now = Date.now();
    const ttlMs = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
    const retryMs = NOT_FOUND_RETRY_TTL_DAYS * 24 * 60 * 60 * 1000;
    const fresh = new Map<string, typeof cached[number]>();
    // Stale not-found rows that we'll re-probe via Brickset; tracked so the
    // in-memory entry can carry forward any market data already on the row.
    const stale = new Map<string, typeof cached[number]>();
    for (const row of cached) {
      const age = now - row.updatedAt.getTime();
      const isFresh = row.found ? age < ttlMs : age < retryMs;
      if (isFresh) fresh.set(row.setNum, row);
      else stale.set(row.setNum, row);
    }

    for (const [setNum, row] of fresh) {
      const entry = byNum.get(setNum);
      if (entry) {
        entry.usdRetail = row.usdRetail;
        entry.gbpRetail = row.gbpRetail;
        entry.eurRetail = row.eurRetail;
        entry.usdMarket = row.usdMarket;
        entry.gbpMarket = row.gbpMarket;
        entry.eurMarket = row.eurMarket;
      }
    }

    const missing = allSetNums.filter((n) => !fresh.has(n));
    if (missing.length > 0 && process.env.BRICKSET_API_KEY) {
      const fetched = await fetchBricksetPrices(missing);
      if (fetched.length > 0) {
        await db
          .insert(setPricesCache)
          .values(
            fetched.map((p) => ({
              setNum: p.setNum,
              usdRetail: p.usdRetail,
              gbpRetail: p.gbpRetail,
              eurRetail: p.eurRetail,
              bricklinkId: p.bricklinkId,
              found: p.found,
              updatedAt: new Date(),
            }))
          )
          .onConflictDoUpdate({
            target: setPricesCache.setNum,
            set: {
              // COALESCE preserves prior non-null values (e.g. EUR market/retail
              // populated by the BrickEconomy scraper) when Brickset returns
              // partial data — avoids regressing rows that already had prices.
              usdRetail: sql`COALESCE(${setPricesCache.usdRetail}, excluded.usd_retail)`,
              gbpRetail: sql`COALESCE(${setPricesCache.gbpRetail}, excluded.gbp_retail)`,
              eurRetail: sql`COALESCE(${setPricesCache.eurRetail}, excluded.eur_retail)`,
              bricklinkId: sql`COALESCE(${setPricesCache.bricklinkId}, excluded.bricklink_id)`,
              found: sql`${setPricesCache.found} OR excluded.found`,
              updatedAt: sql`excluded.updated_at`,
            },
          })
          .catch(() => {});

        for (const p of fetched) {
          const entry = byNum.get(p.setNum);
          if (!entry) continue;
          const prev = stale.get(p.setNum);
          if (prev) {
            entry.usdMarket = prev.usdMarket;
            entry.gbpMarket = prev.gbpMarket;
            entry.eurMarket = prev.eurMarket;
            entry.usdRetail = prev.usdRetail;
            entry.gbpRetail = prev.gbpRetail;
            entry.eurRetail = prev.eurRetail;
          }
          entry.usdRetail = entry.usdRetail ?? p.usdRetail;
          entry.gbpRetail = entry.gbpRetail ?? p.gbpRetail;
          entry.eurRetail = entry.eurRetail ?? p.eurRetail;
        }
      }
    }
  }

  // Pick the single best price for each set: market preferred (more relevant
  // than launch-day retail) and USD preferred to keep one currency dominant
  // when the user has a mixed cache.
  const pickDisplay = (s: AggregatedSet): { price: number | null; currency: "USD" | "EUR" | "GBP" | null } => {
    if (s.usdMarket != null) return { price: s.usdMarket, currency: "USD" };
    if (s.eurMarket != null) return { price: s.eurMarket, currency: "EUR" };
    if (s.gbpMarket != null) return { price: s.gbpMarket, currency: "GBP" };
    if (s.usdRetail != null) return { price: s.usdRetail, currency: "USD" };
    if (s.eurRetail != null) return { price: s.eurRetail, currency: "EUR" };
    if (s.gbpRetail != null) return { price: s.gbpRetail, currency: "GBP" };
    return { price: null, currency: null };
  };
  for (const entry of byNum.values()) {
    const pick = pickDisplay(entry);
    entry.displayPrice = pick.price;
    entry.displayCurrency = pick.currency;
  }

  // Null prices always sink to the bottom regardless of direction so the user
  // never has to scroll past "unknown" rows to find priced ones.
  const NULL_RANK = Number.POSITIVE_INFINITY;
  const priceKey = (s: AggregatedSet, dir: "asc" | "desc") =>
    s.displayPrice == null
      ? NULL_RANK
      : dir === "asc"
        ? s.displayPrice
        : -s.displayPrice;

  const values = Array.from(byNum.values());
  const sets =
    sort === "partsAsc" || sort === "partsDesc"
      ? orderBy(
          values,
          ["numParts", "year", (s: AggregatedSet) => priceKey(s, "asc")],
          [sort === "partsAsc" ? "asc" : "desc", "desc", "asc"],
        )
      : orderBy(
          values,
          [(s: AggregatedSet) => priceKey(s, sort === "priceDesc" ? "desc" : "asc"), "year", "numParts"],
          ["asc", "desc", "desc"],
        );

  return NextResponse.json({ count: sets.length, sort, sets });
}
