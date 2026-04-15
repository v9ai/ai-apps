import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { opportunities } from "@/db/schema";
import { isAdminEmail } from "@/lib/admin";
import { auth } from "@/lib/auth/server";
import { evaluateScoring } from "@/lib/ml/eval-metrics";
import {
  extractOpportunityFeatures,
  labelFromTags,
  formatAsJsonl,
  computeSourceBreakdown,
  type OpportunityEvalReport,
} from "@/lib/ml/opportunity-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/opportunities/eval
 *
 * Returns evaluation metrics for the opportunity golden dataset.
 *
 * Query params:
 *   format=jsonl   → JSONL file download
 *   format=metrics → JSON eval report (default)
 *   threshold=50   → score threshold for binary classification (default: 50)
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "metrics";
  const threshold = Number(searchParams.get("threshold") ?? "50") / 100; // normalize to 0-1

  const rows = await db
    .select({
      id: opportunities.id,
      score: opportunities.score,
      source: opportunities.source,
      tags: opportunities.tags,
      reward_usd: opportunities.reward_usd,
      company_id: opportunities.company_id,
      contact_id: opportunities.contact_id,
      first_seen: opportunities.first_seen,
      created_at: opportunities.created_at,
    })
    .from(opportunities);

  // Extract features and labels
  const features: number[][] = [];
  const scores: number[] = [];
  const labels: boolean[] = [];
  const lines: string[] = [];

  for (const row of rows) {
    const feat = extractOpportunityFeatures(row);
    const label = labelFromTags(row.tags);
    features.push(feat);
    scores.push(feat[0]); // score_norm is feature[0]
    labels.push(label === 1.0);
    lines.push(formatAsJsonl(feat, label));
  }

  // JSONL export
  if (format === "jsonl") {
    return new NextResponse(lines.join("\n") + "\n", {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'attachment; filename="opp_golden_dataset.jsonl"',
      },
    });
  }

  // Metrics report
  const scoring = evaluateScoring(scores, labels, threshold);
  const sourceBreakdown = computeSourceBreakdown(rows);

  const report: OpportunityEvalReport = {
    scoring,
    sourceBreakdown,
    goldenCount: labels.filter(Boolean).length,
    excludedCount: labels.filter((l) => !l).length,
    nullScoreCount: rows.filter((r) => r.score == null).length,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(report);
}
