import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.REBRICKABLE_API_KEY;
const BASE = "https://rebrickable.com/api/v3/lego/parts";
const PAGE_SIZE = 20;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ partNum: string }> }
) {
  if (!API_KEY) {
    return NextResponse.json({ error: "Rebrickable API key not configured" }, { status: 500 });
  }

  const { partNum } = await params;
  const colorId = req.nextUrl.searchParams.get("colorId");
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1", 10);

  if (!colorId) {
    return NextResponse.json({ error: "colorId query parameter is required" }, { status: 400 });
  }

  const res = await fetch(
    `${BASE}/${partNum}/colors/${colorId}/sets/?page=${page}&page_size=${PAGE_SIZE}`,
    { headers: { Authorization: `key ${API_KEY}` } }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "No sets found" }, { status: 404 });
  }

  const data = await res.json();

  const sets = (data.results ?? []).map(
    (s: { set_num: string; name: string; year: number; num_parts: number; set_img_url: string | null; theme_id: number }) => ({
      setNum: s.set_num,
      name: s.name,
      year: s.year,
      numParts: s.num_parts,
      imageUrl: s.set_img_url,
    })
  );

  return NextResponse.json({
    count: data.count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    sets,
  });
}
