import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.REBRICKABLE_API_KEY;
const BASE = "https://rebrickable.com/api/v3/lego";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ setNum: string }> }
) {
  if (!API_KEY) {
    return NextResponse.json({ error: "Rebrickable API key not configured" }, { status: 500 });
  }

  const { setNum } = await params;
  const headers = { Authorization: `key ${API_KEY}` };

  // Fetch set details
  const setRes = await fetch(`${BASE}/sets/${setNum}/`, { headers });
  if (!setRes.ok) {
    return NextResponse.json({ error: "Set not found" }, { status: 404 });
  }
  const setData = await setRes.json();

  // Fetch theme name and parts + alternates in parallel
  const [themeRes, partsRes, altsRes] = await Promise.all([
    fetch(`${BASE}/themes/${setData.theme_id}/`, { headers }).catch(() => null),
    fetch(`${BASE}/sets/${setNum}/parts/?page_size=100`, { headers }).catch(() => null),
    fetch(`${BASE}/sets/${setNum}/alternates/?page_size=50`, { headers }).catch(() => null),
  ]);

  let themeName = "Unknown";
  if (themeRes?.ok) {
    const themeData = await themeRes.json();
    themeName = themeData.name;
  }

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

  let mocs: {
    mocId: string;
    name: string;
    year: number;
    numParts: number;
    imageUrl: string | null;
    mocUrl: string;
    designer: string;
  }[] = [];

  if (altsRes?.ok) {
    const altsData = await altsRes.json();
    mocs = (altsData.results ?? []).map(
      (m: {
        set_num: string;
        name: string;
        year: number;
        num_parts: number;
        moc_img_url: string | null;
        moc_url: string;
        designer_name: string;
      }) => ({
        mocId: m.set_num,
        name: m.name,
        year: m.year,
        numParts: m.num_parts,
        imageUrl: m.moc_img_url,
        mocUrl: m.moc_url,
        designer: m.designer_name,
      })
    );
  }

  return NextResponse.json({
    setNum: setData.set_num,
    name: setData.name,
    year: setData.year,
    themeId: setData.theme_id,
    themeName,
    numParts: setData.num_parts,
    imageUrl: setData.set_img_url,
    setUrl: setData.set_url,
    parts,
    partsCount,
    mocs,
  });
}
