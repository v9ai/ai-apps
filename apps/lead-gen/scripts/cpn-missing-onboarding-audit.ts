#!/usr/bin/env npx tsx
/**
 * Deep-check each of the ~41 "interested but not onboarded" contacts.
 * For each, report: DNC flag, bounced, last outbound subject, any @vadim.blog
 * mention in the thread, and the classifying inbound excerpt.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.NEON_DATABASE_URL!);

type Row = {
  id: number;
  name: string;
  email: string;
  dnc: boolean;
  bounced: boolean;
  last_out_subject: string | null;
  last_out_id: number | null;
  vadim_blog_mentions: number;
  classify_excerpt: string | null;
};

async function main() {
  const rows = (await sql`
    WITH interested AS (
      SELECT DISTINCT c.id
      FROM contacts c
      JOIN contact_emails ce ON ce.contact_id = c.id
      WHERE ce.tags LIKE '%cpn-outreach%'
        AND ce.reply_received = true
        AND ce.reply_classification ILIKE 'interested%'
    ),
    onboarded AS (
      SELECT DISTINCT contact_id
      FROM contact_emails
      WHERE subject = 'Your @vadim.blog email is ready - start the courses'
        AND status IN ('sent','delivered')
    )
    SELECT
      c.id,
      trim(c.first_name || ' ' || COALESCE(c.last_name,'')) AS name,
      c.email,
      c.do_not_contact AS dnc,
      (c.bounced_emails IS NOT NULL
        AND c.bounced_emails::text NOT IN ('[]','null','')) AS bounced,
      (SELECT ce.subject FROM contact_emails ce
        WHERE ce.contact_id = c.id AND ce.status IN ('sent','delivered')
        ORDER BY ce.id DESC LIMIT 1) AS last_out_subject,
      (SELECT ce.id FROM contact_emails ce
        WHERE ce.contact_id = c.id AND ce.status IN ('sent','delivered')
        ORDER BY ce.id DESC LIMIT 1) AS last_out_id,
      (SELECT COUNT(*)::int FROM contact_emails ce
        WHERE ce.contact_id = c.id
          AND (ce.text_content ILIKE '%@vadim.blog%'
               OR ce.subject ILIKE '%@vadim.blog%')) AS vadim_blog_mentions,
      (SELECT LEFT(regexp_replace(re.body_text, '\\s+', ' ', 'g'), 140)
        FROM received_emails re
        JOIN contact_emails ce ON ce.reply_received_email_id = re.id
        WHERE ce.contact_id = c.id
          AND ce.reply_classification ILIKE 'interested%'
        ORDER BY ce.id DESC LIMIT 1) AS classify_excerpt
    FROM contacts c
    WHERE c.id IN (SELECT id FROM interested)
      AND c.id NOT IN (SELECT contact_id FROM onboarded)
    ORDER BY c.first_name NULLS LAST, c.last_name NULLS LAST
  `) as unknown as Row[];

  console.log(`Total missing onboarding: ${rows.length}\n`);
  console.log(
    "id     | name                              | email                                     | dnc | bnc | vb# | last_out_subject                                         | classify_excerpt",
  );
  console.log("-".repeat(220));
  for (const r of rows) {
    console.log(
      [
        String(r.id).padEnd(6),
        (r.name || "").padEnd(33).slice(0, 33),
        (r.email || "").padEnd(41).slice(0, 41),
        r.dnc ? "Y  " : "   ",
        r.bounced ? "Y  " : "   ",
        String(r.vadim_blog_mentions).padEnd(3),
        (r.last_out_subject || "").padEnd(56).slice(0, 56),
        (r.classify_excerpt || "").slice(0, 120),
      ].join(" | "),
    );
  }

  const actionable = rows.filter((r) => !r.dnc && !r.bounced);
  console.log(`\nActionable (not DNC, not bounced): ${actionable.length}`);
  console.log(`Blocked (DNC or bounced):          ${rows.length - actionable.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
