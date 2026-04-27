import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.REBRICKABLE_API_KEY;
const SETS_BASE = "https://rebrickable.com/api/v3/lego/sets";

interface RebrickableMoc {
  set_num: string;
  name: string;
  year: number;
  num_parts: number;
  moc_img_url: string | null;
  moc_url: string;
  designer_name: string;
  designer_url: string;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ partNum: string }> }
) {
  if (!API_KEY) {
    return NextResponse.json({ error: "Rebrickable API key not configured" }, { status: 500 });
  }

  await params; // consume params

  const body = await _req.json();
  const setNums: string[] = body.setNums ?? [];

  if (setNums.length === 0) {
    return NextResponse.json({ mocs: [] });
  }

  // Fetch MOC alternates for each set in parallel. Dedupe first, then cap at 50
  // to keep the fan-out bounded against Rebrickable rate limits.
  const headers = { Authorization: `key ${API_KEY}` };
  const batch = Array.from(new Set(setNums)).slice(0, 50);

  const results = await Promise.allSettled(
    batch.map(async (setNum) => {
      const res = await fetch(
        `${SETS_BASE}/${setNum}/alternates/?page_size=100`,
        { headers }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results ?? []) as RebrickableMoc[];
    })
  );

  // Flatten and deduplicate by MOC set_num
  const seen = new Set<string>();
  const mocs: {
    mocId: string;
    name: string;
    year: number;
    numParts: number;
    imageUrl: string | null;
    mocUrl: string;
    designer: string;
  }[] = [];

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const m of result.value) {
      if (seen.has(m.set_num)) continue;
      seen.add(m.set_num);
      mocs.push({
        mocId: m.set_num,
        name: m.name,
        year: m.year,
        numParts: m.num_parts,
        imageUrl: m.moc_img_url,
        mocUrl: m.moc_url,
        designer: m.designer_name,
      });
    }
  }

  return NextResponse.json({ mocs });
}
