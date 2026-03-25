import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { isAdminEmail } from "@/lib/admin";
import { auth } from "@/lib/auth/server";

/**
 * POST /api/companies/bulk-import
 * Admin-only bulk import of companies via JSON body.
 */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const items = Array.isArray(body) ? body : body.companies;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "Request body must be an array of companies or { companies: [...] }" },
      { status: 400 },
    );
  }

  const inserted = await db
    .insert(companies)
    .values(
      items.map((c: any) => ({
        key: c.key,
        name: c.name,
        logo_url: c.logo_url ?? null,
        website: c.website ?? null,
        description: c.description ?? null,
      })),
    )
    .onConflictDoNothing({ target: companies.key })
    .returning({ id: companies.id, key: companies.key });

  return NextResponse.json({
    imported: inserted.length,
    skipped: items.length - inserted.length,
  });
}
