import { NextRequest, NextResponse } from "next/server";
import { fetchAshbyJobPostFromUrl, parseAshbyJobUrl } from "@/ingestion/ashby";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ASHBY_JOBS_DOMAIN } from "@/constants/ats";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { applicationId?: unknown };
    const { applicationId } = body;
    if (!applicationId) {
      return NextResponse.json({ error: "applicationId required" }, { status: 400 });
    }

    const [app] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, Number(applicationId)))
      .limit(1);

    if (!app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const jobUrl = app.job_id;
    if (!jobUrl) {
      return NextResponse.json({ error: "Application has no job URL" }, { status: 400 });
    }

    let hostname: string;
    try {
      hostname = new URL(jobUrl).hostname;
    } catch {
      return NextResponse.json({ error: "Invalid job URL" }, { status: 400 });
    }

    if (hostname !== ASHBY_JOBS_DOMAIN) {
      return NextResponse.json(
        { error: `Not an Ashby URL (got ${hostname})` },
        { status: 400 },
      );
    }

    const { boardName } = parseAshbyJobUrl(jobUrl);
    const posting = await fetchAshbyJobPostFromUrl(jobUrl, { includeCompensation: true });

    const updates: Partial<typeof applications.$inferInsert> = {
      updated_at: new Date().toISOString(),
    };

    if (posting.descriptionHtml || posting.descriptionPlain) {
      updates.job_description = posting.descriptionHtml ?? posting.descriptionPlain ?? undefined;
    }
    if (posting.title && !app.job_title) {
      updates.job_title = posting.title;
    }
    if (boardName && !app.company_name) {
      updates.company_name = boardName;
    }

    await db.update(applications).set(updates).where(eq(applications.id, app.id));

    return NextResponse.json({
      success: true,
      enriched: {
        jobTitle: posting.title,
        companyName: boardName,
        hasDescription: !!(posting.descriptionHtml || posting.descriptionPlain),
        location: posting.location,
        isRemote: posting.isRemote,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
