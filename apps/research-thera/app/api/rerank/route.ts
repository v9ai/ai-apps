import { NextRequest, NextResponse } from "next/server";
import { rerankPassages } from "@/src/lib/transformers";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { query, papers } = body as {
    query: string;
    papers: Array<{ title?: string; abstract?: string; [key: string]: unknown }>;
  };

  if (!query || !Array.isArray(papers)) {
    return NextResponse.json(
      { error: "query (string) and papers (array) are required" },
      { status: 400 },
    );
  }

  const passages = papers.map((p) =>
    [p.title ?? "", p.abstract ?? ""].filter(Boolean).join(" ").slice(0, 512),
  );

  const results = await rerankPassages(query, passages);

  const ranked = results.map((r) => ({
    ...papers[r.index],
    rerankScore: r.score,
  }));

  return NextResponse.json({ ranked });
}
