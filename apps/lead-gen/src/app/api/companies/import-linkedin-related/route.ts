import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { sql } from "drizzle-orm";
import { isAdminEmail } from "@/lib/admin";
import { auth } from "@/lib/auth/server";
import { parseRelatedCompanies } from "@/lib/linkedin/parse-related-companies";

/** Map LinkedIn industry labels to DB category enum values. */
const INDUSTRY_TO_CATEGORY: Record<string, string> = {
  "staffing and recruiting": "STAFFING",
  "business consulting and services": "CONSULTANCY",
  "it services and it consulting": "CONSULTANCY",
  "management consulting": "CONSULTANCY",
};

function inferCategory(industry: string): string {
  return INDUSTRY_TO_CATEGORY[industry.toLowerCase()] ?? "UNKNOWN";
}

/**
 * POST /api/companies/import-linkedin-related
 *
 * Accepts raw HTML from LinkedIn's "Pages people also viewed" / "Find related"
 * modal, parses company cards, filters by industry, and upserts into DB.
 *
 * Body: { html: string, industryFilter?: string }
 *   - html: the innerHTML of the modal
 *   - industryFilter: e.g. "Staffing and Recruiting" (case-insensitive, optional)
 *
 * When industryFilter is provided, only matching companies are imported and the
 * rest are returned in the `excluded` array. When omitted, all companies are imported.
 */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { html, industryFilter } = body as {
    html: string;
    industryFilter?: string;
  };

  if (!html || typeof html !== "string") {
    return NextResponse.json(
      { error: "Request body must include `html` (string)" },
      { status: 400 },
    );
  }

  const parsed = parseRelatedCompanies(html, industryFilter);

  if (parsed.companies.length === 0) {
    return NextResponse.json({
      imported: 0,
      skipped: 0,
      excluded: parsed.filtered.map((c) => ({ name: c.name, industry: c.industry })),
      total: parsed.total,
    });
  }

  const toInsert = parsed.companies.map((c) => ({
    key: c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name: c.name,
    linkedin_url: c.linkedinUrl || null,
    logo_url: c.logoUrl,
    industry: c.industry,
    category: inferCategory(c.industry) as "STAFFING" | "CONSULTANCY" | "AGENCY" | "PRODUCT" | "UNKNOWN",
  }));

  let inserted: { id: number; key: string }[];
  try {
    inserted = await db
      .insert(companies)
      .values(toInsert)
      .onConflictDoUpdate({
        target: companies.key,
        set: {
          linkedin_url: sql`COALESCE(${companies.linkedin_url}, excluded.linkedin_url)`,
          logo_url: sql`COALESCE(${companies.logo_url}, excluded.logo_url)`,
          industry: sql`COALESCE(excluded.industry, ${companies.industry})`,
          category: sql`CASE WHEN ${companies.category} = 'UNKNOWN' THEN excluded.category ELSE ${companies.category} END`,
          updated_at: sql`now()::text`,
        },
      })
      .returning({ id: companies.id, key: companies.key });
  } catch (err) {
    console.error("[import-linkedin-related] DB insert failed:", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }

  return NextResponse.json({
    imported: inserted.length,
    skipped: parsed.companies.length - inserted.length,
    excluded: parsed.filtered.map((c) => ({ name: c.name, industry: c.industry })),
    total: parsed.total,
    companies: inserted,
  });
}
