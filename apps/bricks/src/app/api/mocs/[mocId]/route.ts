import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.REBRICKABLE_API_KEY;
const BASE = "https://rebrickable.com/api/v3/lego";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ mocId: string }> }
) {
  if (!API_KEY) {
    return NextResponse.json({ error: "Rebrickable API key not configured" }, { status: 500 });
  }

  const { mocId } = await params;
  const headers = { Authorization: `key ${API_KEY}` };
  const search = req.nextUrl.searchParams;

  // If caller passed MOC metadata via query params, use it directly
  const name = search.get("name");
  const designer = search.get("designer");
  if (name && designer) {
    // Try to fetch parts (may fail with 403 on free API keys)
    const partsRes = await fetch(`${BASE}/mocs/${mocId}/parts/?page_size=100`, { headers }).catch(() => null);

    let parts: {
      partNum: string;
      name: string;
      imageUrl: string | null;
      colorId: number;
      colorName: string;
      colorRgb: string;
      quantity: number;
      isSpare: boolean;
    }[] = [];
    let partsCount = 0;

    if (partsRes?.ok) {
      const partsData = await partsRes.json();
      partsCount = partsData.count ?? 0;
      parts = (partsData.results ?? []).map(
        (p: {
          part: { part_num: string; name: string; part_img_url: string | null };
          color: { id: number; name: string; rgb: string };
          quantity: number;
          is_spare: boolean;
        }) => ({
          partNum: p.part.part_num,
          name: p.part.name,
          imageUrl: p.part.part_img_url,
          colorId: p.color.id,
          colorName: p.color.name,
          colorRgb: p.color.rgb,
          quantity: p.quantity,
          isSpare: p.is_spare,
        })
      );
    }

    return NextResponse.json({
      mocId,
      name,
      year: search.get("year") ? Number(search.get("year")) : null,
      numParts: search.get("numParts") ? Number(search.get("numParts")) : null,
      imageUrl: search.get("imageUrl") || `https://cdn.rebrickable.com/media/mocs/${mocId.toLowerCase()}.jpg`,
      mocUrl: search.get("mocUrl") || `https://rebrickable.com/mocs/${mocId}/`,
      designer,
      parts,
      partsCount,
    });
  }

  // Fallback: no metadata passed — try to find MOC via search
  // Unfortunately, Rebrickable has no direct MOC detail endpoint.
  // We can only get MOCs via set alternates. Return basic info from the CDN.
  return NextResponse.json({
    mocId,
    name: mocId,
    year: null,
    numParts: null,
    imageUrl: `https://cdn.rebrickable.com/media/mocs/${mocId.toLowerCase()}.jpg`,
    mocUrl: `https://rebrickable.com/mocs/${mocId}/`,
    designer: null,
    parts: [],
    partsCount: 0,
  });
}
