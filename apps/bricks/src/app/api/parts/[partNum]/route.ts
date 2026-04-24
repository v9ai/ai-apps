import { NextRequest, NextResponse } from "next/server";
import orderBy from "lodash/orderBy";

const API_KEY = process.env.REBRICKABLE_API_KEY;
const PARTS_BASE = "https://rebrickable.com/api/v3/lego/parts";
const SETS_BASE = "https://rebrickable.com/api/v3/lego/sets";

/** Common Rebrickable variant suffixes — many parts like 3040 exist only as 3040a/3040b. */
const VARIANT_SUFFIXES = ["b", "a", "c", "d"];

async function fetchPart(partNum: string, headers: Record<string, string>) {
  const res = await fetch(`${PARTS_BASE}/${partNum}/`, { headers });
  if (res.ok) return res.json();
  return null;
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

  // Try exact part number, then common variant suffixes (3040 → 3040b, 3040a…)
  let data = await fetchPart(partNum, headers);
  if (!data && /^\d+$/.test(partNum)) {
    for (const suffix of VARIANT_SUFFIXES) {
      data = await fetchPart(`${partNum}${suffix}`, headers);
      if (data) break;
    }
  }

  if (data) {
    const resolvedNum = data.part_num as string;

    // Fetch available colors for this part
    let colors: { id: number; name: string; imageUrl: string | null; numSets: number }[] = [];
    try {
      const colorsRes = await fetch(`${PARTS_BASE}/${resolvedNum}/colors/`, { headers });
      if (colorsRes.ok) {
        const colorsData = await colorsRes.json();
        const mapped = (colorsData.results ?? []).map(
          (c: { color_id: number; color_name: string; part_img_url: string | null; elements: string[]; num_sets: number }) => ({
            id: c.color_id,
            name: c.color_name,
            imageUrl: c.part_img_url
              ?? (c.elements?.length
                ? `https://cdn.rebrickable.com/media/parts/elements/${c.elements[0]}.jpg`
                : null),
            numSets: c.num_sets,
          })
        );
        colors = orderBy(mapped, ["numSets"], ["desc"]);
      }
    } catch {
      // colors are optional, continue without them
    }

    return NextResponse.json({
      partNum: resolvedNum,
      name: data.name,
      imageUrl: data.part_img_url
        ?? colors.find((c: { imageUrl: string | null }) => c.imageUrl)?.imageUrl
        ?? null,
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
