import { NextResponse } from "next/server";
import { Resend } from "resend";
import { db, contactEmails } from "@/db";
import { eq, and, isNull, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const maxDuration = 300;

const DAILY_LIMIT = 100;
const TAG = "cpn-outreach";

export async function GET(request: Request) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  // Pick next batch of scheduled cpn-outreach emails
  const batch = await db
    .select()
    .from(contactEmails)
    .where(
      and(
        eq(contactEmails.status, "scheduled"),
        eq(contactEmails.tags, JSON.stringify([TAG])),
      ),
    )
    .orderBy(contactEmails.id)
    .limit(DAILY_LIMIT);

  if (batch.length === 0) {
    return NextResponse.json({ message: "No emails to send", sent: 0 });
  }

  let sent = 0;
  let failed = 0;

  for (const email of batch) {
    const to = JSON.parse(email.to_emails)[0] as string;
    const result = await resend.emails.send({
      from: `Vadim Nicolai <${email.from_email}>`,
      to,
      subject: email.subject,
      text: email.text_content ?? "",
    });

    if (result.error) {
      failed++;
      await db
        .update(contactEmails)
        .set({
          status: "failed",
          error_message: result.error.message,
          updated_at: sql`now()::text`,
        })
        .where(eq(contactEmails.id, email.id));

      // Stop on quota hit
      if (result.error.name === "daily_quota_exceeded") break;
    } else {
      sent++;
      await db
        .update(contactEmails)
        .set({
          resend_id: result.data?.id ?? "",
          status: "sent",
          sent_at: new Date().toISOString(),
          updated_at: sql`now()::text`,
        })
        .where(eq(contactEmails.id, email.id));
    }
  }

  const remaining = await db
    .select({ count: sql<number>`count(*)` })
    .from(contactEmails)
    .where(
      and(
        eq(contactEmails.status, "scheduled"),
        eq(contactEmails.tags, JSON.stringify([TAG])),
      ),
    );

  return NextResponse.json({
    sent,
    failed,
    remaining: remaining[0]?.count ?? 0,
  });
}
