import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdminEmail } from "@/lib/admin";
import { auth } from "@/lib/auth/server";

/**
 * POST /api/companies/enhance
 * Admin-only company data enhancement.
 */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { companyId?: unknown; data?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { companyId, data } = body;

  if (!companyId || !data || typeof data !== "object" || Array.isArray(data)) {
    return NextResponse.json(
      { error: "Missing companyId or data" },
      { status: 400 },
    );
  }

  // Allow-list the fields that may be updated to prevent column injection.
  const d = data as Record<string, unknown>;
  const safeUpdate: Record<string, unknown> = {};
  const allowed = [
    "name", "logo_url", "website", "description",
    "category", "ai_tier", "employee_count", "location",
    "linkedin_url", "twitter_url", "github_url",
    "funding_stage", "founded_year", "notes",
  ] as const;
  for (const key of allowed) {
    if (key in d) safeUpdate[key] = d[key];
  }

  let updated: (typeof companies.$inferSelect)[];
  try {
    updated = await db
      .update(companies)
      .set({
        ...safeUpdate,
        updated_at: new Date().toISOString(),
      })
      .where(eq(companies.id, companyId as number))
      .returning();
  } catch (err) {
    console.error("[enhance] DB update failed:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  if (!updated.length) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, company: updated[0] });
}
