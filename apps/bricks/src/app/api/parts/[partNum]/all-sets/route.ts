import { NextRequest, NextResponse } from "next/server";
import orderBy from "lodash/orderBy";

const API_KEY = process.env.REBRICKABLE_API_KEY;
const PARTS_BASE = "https://rebrickable.com/api/v3/lego/parts";
const PAGE_SIZE = 1000;

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
        });
      }
    }
  }

  const sets = orderBy(
    Array.from(byNum.values()),
    ["year", "numParts"],
    ["desc", "desc"]
  );

  return NextResponse.json({ count: sets.length, sets });
}
