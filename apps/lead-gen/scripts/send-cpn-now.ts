import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";

async function main() {
  const sql = neon(process.env.NEON_DATABASE_URL!);
  const resend = new Resend(process.env.RESEND_API_KEY);

  const rows = await sql`
    SELECT DISTINCT ON (to_emails) id, to_emails, subject, text_content
    FROM contact_emails
    WHERE tags = '["cpn-outreach"]' AND status = 'scheduled'
    ORDER BY to_emails, id
  `;

  console.log(`Unique to send: ${rows.length}`);

  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    const to = JSON.parse(row.to_emails)[0];
    const result = await resend.emails.send({
      from: "Vadim Nicolai <contact@vadim.blog>",
      to,
      subject: row.subject,
      text: row.text_content,
    });

    if (result.error) {
      failed++;
      await sql`UPDATE contact_emails SET status = 'failed', error_message = ${result.error.message}, updated_at = now()::text WHERE id = ${row.id}`;
      if (result.error.name === "daily_quota_exceeded") {
        console.log(`\nQuota hit at ${sent} sent, ${failed} failed`);
        break;
      }
    } else {
      sent++;
      await sql`UPDATE contact_emails SET resend_id = ${result.data?.id ?? ""}, status = 'sent', sent_at = now()::text, updated_at = now()::text WHERE id = ${row.id}`;
    }

    if ((sent + failed) % 50 === 0) {
      process.stdout.write(`  [${sent + failed}/${rows.length}] sent=${sent} failed=${failed}\n`);
    }
  }

  // Mark dupes as sent
  await sql`
    UPDATE contact_emails SET status = 'sent', updated_at = now()::text
    WHERE tags = '["cpn-outreach"]' AND status = 'scheduled'
    AND to_emails IN (SELECT to_emails FROM contact_emails WHERE tags = '["cpn-outreach"]' AND status = 'sent')
  `;

  console.log(`\nDone: ${sent} sent, ${failed} failed, ${rows.length} total`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
