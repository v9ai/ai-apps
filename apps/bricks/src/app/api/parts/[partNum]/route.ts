import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.REBRICKABLE_API_KEY;
const BASE = "https://rebrickable.com/api/v3/lego/parts";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ partNum: string }> }
) {
  if (!API_KEY) {
    return NextResponse.json({ error: "Rebrickable API key not configured" }, { status: 500 });
  }

  const { partNum } = await params;
  const headers = { Authorization: `key ${API_KEY}` };

  const res = await fetch(`${BASE}/${partNum}/`, { headers });

  if (!res.ok) {
    return NextResponse.json({ error: "Part not found" }, { status: 404 });
  }

  const data = await res.json();

  // Fetch available colors for this part
  let colors: { id: number; name: string; rgb: string; imageUrl: string | null }[] = [];
  try {
    const colorsRes = await fetch(`${BASE}/${partNum}/colors/`, { headers });
    if (colorsRes.ok) {
      const colorsData = await colorsRes.json();
      colors = (colorsData.results ?? []).map(
        (c: { color_id: number; color_name: string; part_img_url: string | null; elements: string[]; num_sets: number }) => ({
          id: c.color_id,
          name: c.color_name,
          imageUrl: c.part_img_url,
          numSets: c.num_sets,
        })
      );
    }
  } catch {
    // colors are optional, continue without them
  }

  return NextResponse.json({
    partNum: data.part_num,
    name: data.name,
    imageUrl: data.part_img_url,
    categoryId: data.part_cat_id,
    externalIds: data.external_ids,
    colors,
  });
}
