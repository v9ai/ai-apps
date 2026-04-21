import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { auth } from "@/lib/auth/server";
import { runAnalysis } from "@/lib/competitors/run";

export const runtime = "nodejs";
export const maxDuration = 300;

async function authorize(request: NextRequest): Promise<boolean> {
  const internalSecret = request.headers.get("x-internal-secret");
  const expected = process.env.INTERNAL_WORKER_SECRET ?? "";
  if (expected && internalSecret && internalSecret === expected) return true;

  const session = await auth.api.getSession({ headers: request.headers });
  return Boolean(session?.user?.id && isAdminEmail(session.user.email));
}

export async function POST(request: NextRequest) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { analysisId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const analysisId = typeof body.analysisId === "number" ? body.analysisId : null;
  if (!analysisId) {
    return NextResponse.json({ error: "Missing analysisId" }, { status: 400 });
  }

  runAnalysis(analysisId).catch((err) => {
    console.error("[api/competitors/scrape] runAnalysis failed", err);
  });

  return NextResponse.json({ ok: true, analysisId, status: "scraping" });
}
