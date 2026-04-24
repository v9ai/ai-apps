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
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ partNum: string }> }
) {
  if (!API_KEY) {
    return NextResponse.json({ error: "Rebrickable API key not configured" }, { status: 500 });
  }

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
    const fresh = new Map<string, typeof cached[number]>();
    for (const row of cached) {
      if (now - row.updatedAt.getTime() < ttlMs) {
        fresh.set(row.setNum, row);
      }
    }

    for (const [setNum, row] of fresh) {
      const entry = byNum.get(setNum);
      if (entry) {
        entry.usdRetail = row.usdRetail;
        entry.gbpRetail = row.gbpRetail;
        entry.eurRetail = row.eurRetail;
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
              usdRetail: sql`excluded.usd_retail`,
              gbpRetail: sql`excluded.gbp_retail`,
              eurRetail: sql`excluded.eur_retail`,
              bricklinkId: sql`excluded.bricklink_id`,
              found: sql`excluded.found`,
              updatedAt: sql`excluded.updated_at`,
            },
          })
          .catch(() => {});

        for (const p of fetched) {
          const entry = byNum.get(p.setNum);
          if (entry) {
            entry.usdRetail = p.usdRetail;
            entry.gbpRetail = p.gbpRetail;
            entry.eurRetail = p.eurRetail;
          }
        }
      }
    }
  }

  const sets = orderBy(
    Array.from(byNum.values()),
    [
      (s: AggregatedSet) => (s.usdRetail ?? Number.POSITIVE_INFINITY),
      "year",
      "numParts",
    ],
    ["asc", "desc", "desc"]
  );

  return NextResponse.json({ count: sets.length, sets });
}
