import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { auth } from "@/lib/auth/server";
import { runGraph, LangGraphError } from "@/lib/langgraph-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type QaTabSummary = {
  total: number;
  false_positive: number;
  weak: number;
  clean: number;
  by_reason: Record<string, number>;
  tab: string;
};

type QaTabResult = {
  summary?: QaTabSummary;
  qa_issues?: string[];
  _error?: string;
};

/**
 * POST /api/admin/qa-tab
 *
 * Runs the company_qa LangGraph against the given UI tab — verifies each
 * matching company on four axes (taxonomy, data quality, category, ICP fit)
 * and persists a verdict to companies.qa_verdict.
 *
 * Body: { tab?: string; limit?: number; companyIds?: number[] }
 *   - tab defaults to "sales-tech".
 *   - limit clamps server-side to [1, 200].
 *
 * Server-side wrapper because LANGGRAPH_AUTH_TOKEN is server-only.
 */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { tab?: unknown; limit?: unknown; companyIds?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const tab = typeof body.tab === "string" && body.tab.trim()
    ? body.tab.trim()
    : "sales-tech";
  const limit =
    typeof body.limit === "number" && Number.isFinite(body.limit)
      ? Math.max(1, Math.min(Math.floor(body.limit), 200))
      : 25;
  const companyIds = Array.isArray(body.companyIds)
    ? body.companyIds
        .map((v) => Number(v))
        .filter((n) => Number.isInteger(n) && n > 0)
    : undefined;

  try {
    const result = await runGraph<QaTabResult>(
      "company_qa",
      {
        tab,
        limit,
        ...(companyIds && companyIds.length > 0 ? { company_ids: companyIds } : {}),
      },
      // The graph runs one DeepSeek call per company sequentially. Budget
      // ~6s/company for cold container + retries, capped at the Vercel 300s
      // ceiling for serverless functions.
      { timeoutMs: Math.min(300_000, 30_000 + limit * 6_000) },
    );
    if (result._error) {
      return NextResponse.json(
        { error: "graph_error", detail: result._error },
        { status: 502 },
      );
    }
    return NextResponse.json({
      summary: result.summary ?? null,
      qa_issues: result.qa_issues ?? [],
    });
  } catch (err) {
    if (err instanceof LangGraphError) {
      const status = err.kind === "auth" ? 502 : err.kind === "timeout" ? 504 : 502;
      return NextResponse.json(
        { error: err.kind, detail: err.bodyText, assistantId: err.assistantId },
        { status },
      );
    }
    return NextResponse.json(
      { error: "unknown", detail: String(err) },
      { status: 500 },
    );
  }
}
