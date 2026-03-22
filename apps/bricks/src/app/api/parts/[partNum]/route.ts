import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.REBRICKABLE_API_KEY;
const PARTS_BASE = "https://rebrickable.com/api/v3/lego/parts";
const SETS_BASE = "https://rebrickable.com/api/v3/lego/sets";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ partNum: string }> }
) {
  if (!API_KEY) {
    return NextResponse.json({ error: "Rebrickable API key not configured" }, { status: 500 });
  }

  const { partNum } = await params;
  const headers = { Authorization: `key ${API_KEY}` };

  // Try as a part first
  const res = await fetch(`${PARTS_BASE}/${partNum}/`, { headers });

  if (res.ok) {
    const data = await res.json();

    // Fetch available colors for this part
    let colors: { id: number; name: string; rgb: string; imageUrl: string | null }[] = [];
    try {
      const colorsRes = await fetch(`${PARTS_BASE}/${partNum}/colors/`, { headers });
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

  // Fallback: try as a set (e.g. SPIKE Prime motors like 45607)
  const setRes = await fetch(`${SETS_BASE}/${partNum}-1/`, { headers });
  if (setRes.ok) {
    const setData = await setRes.json();
    return NextResponse.json({
      partNum: setData.set_num.replace(/-1$/, ""),
      name: setData.name,
      imageUrl: setData.set_img_url,
      categoryId: null,
      externalIds: null,
      colors: [],
      isSet: true,
    });
  }

  return NextResponse.json({ error: "Part not found" }, { status: 404 });
}
