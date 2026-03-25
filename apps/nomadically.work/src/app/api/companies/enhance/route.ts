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

  const body = await request.json();
  const { companyId, data } = body;

  if (!companyId || !data) {
    return NextResponse.json(
      { error: "Missing companyId or data" },
      { status: 400 },
    );
  }

  const updated = await db
    .update(companies)
    .set({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .where(eq(companies.id, companyId))
    .returning();

  if (!updated.length) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, company: updated[0] });
}
