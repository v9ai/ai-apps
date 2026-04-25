import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { checkIsAdmin } from "@/lib/admin";
import { composeEmail } from "@/lib/langgraph-client";
import { db } from "@/db";
import { companies, contacts, replyDrafts } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface BatchError {
  contactId: number;
  error: string;
}

interface BatchResponse {
  generated: number;
  draftIds: number[];
  errors: BatchError[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { isAdmin, userId } = await checkIsAdmin();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let count = 5;
  try {
    const raw: unknown = await request.json().catch(() => null);
    if (raw !== null && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      if (typeof obj.count === "number" && Number.isFinite(obj.count)) {
        count = Math.floor(obj.count);
      }
    }
  } catch {
    // ignore — use default
  }
  count = Math.max(1, Math.min(10, count));

  // Pick candidates: contacts with email, not opted-out, no pending reply draft.
  const candidates = await db
    .select({
      id: contacts.id,
      first_name: contacts.first_name,
      last_name: contacts.last_name,
      email: contacts.email,
      company_name: companies.name,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.company_id, companies.id))
    .leftJoin(
      replyDrafts,
      and(
        eq(replyDrafts.contact_id, contacts.id),
        eq(replyDrafts.status, "pending"),
      ),
    )
    .where(
      and(
        isNotNull(contacts.email),
        eq(contacts.do_not_contact, false),
        isNull(replyDrafts.id),
      ),
    )
    .orderBy(
      sql`${contacts.authority_score} DESC NULLS LAST`,
      desc(contacts.id),
    )
    .limit(count);

  const draftIds: number[] = [];
  const errors: BatchError[] = [];

  // Sequential — never run lead-gen LangGraph requests in parallel against :8002.
  for (const candidate of candidates) {
    try {
      const recipientName = `${candidate.first_name ?? ""} ${candidate.last_name ?? ""}`.trim();
      const companyName = candidate.company_name ?? "";
      const instructions =
        "Brief warm cold-outreach email introducing Vadim's services. Ask for a 15-min intro call. Sign off as Vadim.";

      const result = await composeEmail({
        recipientName,
        companyName,
        instructions,
      });

      const [inserted] = await db
        .insert(replyDrafts)
        .values({
          received_email_id: null,
          contact_id: candidate.id,
          status: "pending",
          draft_type: "outreach",
          subject: result.subject,
          body_text: result.body,
          generation_model: "mistral-7b-instruct-v0.2",
          thread_context: JSON.stringify({ source: "cf-batch" }),
        })
        .returning({ id: replyDrafts.id });

      if (inserted?.id !== undefined) {
        draftIds.push(inserted.id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ contactId: candidate.id, error: msg });
    }
  }

  const response: BatchResponse = {
    generated: draftIds.length,
    draftIds,
    errors,
  };

  return NextResponse.json(response);
}
