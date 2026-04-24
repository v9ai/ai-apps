import chunk from "lodash/chunk";

const BRICKSET_BASE = "https://brickset.com/api/v3.asmx";
const CONCURRENCY = 10;

export interface BricksetPrice {
  setNum: string;
  usdRetail: number | null;
  gbpRetail: number | null;
  eurRetail: number | null;
  bricklinkId: number | null;
  found: boolean;
}

interface BricksetSet {
  setID?: number;
  number?: string;
  numberVariant?: number;
  LEGOCom?: {
    US?: { retailPrice?: number };
    UK?: { retailPrice?: number };
    DE?: { retailPrice?: number };
  };
  extendedData?: { BrickLinkItemId?: number };
}

/** Convert "10323-1" → {"setNumber":"10323-1"} query param for Brickset. */
async function fetchOne(apiKey: string, setNum: string): Promise<BricksetPrice> {
  const params = encodeURIComponent(JSON.stringify({ setNumber: setNum }));
  const url = `${BRICKSET_BASE}/getSets?apiKey=${encodeURIComponent(apiKey)}&userHash=&params=${params}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { setNum, usdRetail: null, gbpRetail: null, eurRetail: null, bricklinkId: null, found: false };
    }
    const data: { status: string; sets?: BricksetSet[] } = await res.json();
    const hit = data.sets?.[0];
    if (!hit) {
      return { setNum, usdRetail: null, gbpRetail: null, eurRetail: null, bricklinkId: null, found: false };
    }
    const toCents = (v: number | undefined) =>
      typeof v === "number" && isFinite(v) ? Math.round(v * 100) : null;
    return {
      setNum,
      usdRetail: toCents(hit.LEGOCom?.US?.retailPrice),
      gbpRetail: toCents(hit.LEGOCom?.UK?.retailPrice),
      eurRetail: toCents(hit.LEGOCom?.DE?.retailPrice),
      bricklinkId: hit.extendedData?.BrickLinkItemId ?? null,
      found: true,
    };
  } catch {
    return { setNum, usdRetail: null, gbpRetail: null, eurRetail: null, bricklinkId: null, found: false };
  }
}

/** Fetch retail prices for many set numbers with bounded concurrency. */
export async function fetchBricksetPrices(setNums: string[]): Promise<BricksetPrice[]> {
  const apiKey = process.env.BRICKSET_API_KEY;
  if (!apiKey) return [];
  const out: BricksetPrice[] = [];
  for (const batch of chunk(setNums, CONCURRENCY)) {
    const results = await Promise.all(batch.map((n) => fetchOne(apiKey, n)));
    out.push(...results);
  }
  return out;
}
