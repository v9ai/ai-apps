import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.NEON_DATABASE_URL!);

const rows = (await sql`
  SELECT received_at, from_email, subject
  FROM received_emails
  WHERE (subject ILIKE '%completion of%' OR subject ILIKE '%registration for%')
    AND (
      matched_contact_id = (SELECT id FROM contacts WHERE lower(email) = 'gsilvainacio@gmail.com' LIMIT 1)
      OR to_emails::text ILIKE '%guinacio@vadim.blog%'
    )
  ORDER BY received_at ASC
`) as Array<{ received_at: string; from_email: string; subject: string }>;

for (const r of rows) console.log(r.received_at, "|", r.subject);
console.log(`\ntotal rows: ${rows.length}`);

const courses = [
  "Introduction to agent skills",
  "Building with the Claude API",
  "Introduction to Model Context Protocol",
  "Claude Code in Action",
];

console.log(`\n── Per-course check ──`);
let allComplete = true;
for (const c of courses) {
  const completion = rows.find((r) => r.subject.toLowerCase().includes(`completion of ${c.toLowerCase()}`));
  const registration = rows.find((r) => r.subject.toLowerCase().includes(`registration for ${c.toLowerCase()}`));
  const mark = completion ? "✓" : "✗";
  if (!completion) allComplete = false;
  console.log(
    `  ${mark} ${c}`,
    completion ? `  completed ${completion.received_at}` : "  NOT COMPLETED",
    registration ? `(registered ${registration.received_at})` : "(no registration)",
  );
}
console.log(`\n${allComplete ? "ALL 4 COMPLETE" : "INCOMPLETE"}`);
