const fs = require("fs");
const { neon } = require("@neondatabase/serverless");

const DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Missing NEON_DATABASE_URL");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function run() {
  const raw = fs.readFileSync("/tmp/received-list.json", "utf8");
  const emails = JSON.parse(raw);
  console.log(`Loaded ${emails.length} emails from Resend`);

  // Batch insert in chunks of 50
  const BATCH = 50;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < emails.length; i += BATCH) {
    const batch = emails.slice(i, i + BATCH);

    const values = batch
      .map((e) => {
        const esc = (s) => (s ? s.replace(/'/g, "''") : "");
        const resendId = esc(e.id);
        const fromEmail = e.from ? `'${esc(e.from)}'` : "NULL";
        const toEmails = `'${esc(JSON.stringify(e.to || []))}'`;
        const ccEmails = `'${esc(JSON.stringify(e.cc || []))}'`;
        const replyTo = `'${esc(JSON.stringify(e.reply_to || []))}'`;
        const subject = e.subject ? `'${esc(e.subject)}'` : "NULL";
        const messageId = e.message_id ? `'${esc(e.message_id)}'` : "NULL";
        const attachments = `'${esc(JSON.stringify(e.attachments || []))}'`;
        const receivedAt = `'${esc(e.created_at)}'`;
        const now = `'${new Date().toISOString()}'`;

        return `('${resendId}', ${fromEmail}, ${toEmails}, ${ccEmails}, ${replyTo}, ${subject}, ${messageId}, NULL, NULL, ${attachments}, ${receivedAt}, ${now}, ${now})`;
      })
      .join(",\n");

    const query = `
      INSERT INTO received_emails (resend_id, from_email, to_emails, cc_emails, reply_to_emails, subject, message_id, html_content, text_content, attachments, received_at, created_at, updated_at)
      VALUES ${values}
      ON CONFLICT (resend_id) DO NOTHING;
    `;

    try {
      const result = await sql(query);
      inserted += batch.length;
    } catch (err) {
      console.error(`Batch ${i / BATCH + 1} error:`, err.message);
      // Try one by one for this batch
      for (const e of batch) {
        try {
          const esc = (s) => (s ? s.replace(/'/g, "''") : "");
          await sql`
            INSERT INTO received_emails (resend_id, from_email, to_emails, cc_emails, reply_to_emails, subject, message_id, html_content, text_content, attachments, received_at, created_at, updated_at)
            VALUES (${e.id}, ${e.from || null}, ${JSON.stringify(e.to || [])}, ${JSON.stringify(e.cc || [])}, ${JSON.stringify(e.reply_to || [])}, ${e.subject || null}, ${e.message_id || null}, ${null}, ${null}, ${JSON.stringify(e.attachments || [])}, ${e.created_at}, ${new Date().toISOString()}, ${new Date().toISOString()})
            ON CONFLICT (resend_id) DO NOTHING
          `;
          inserted++;
        } catch (err2) {
          skipped++;
          console.error(`  Skip ${e.id}: ${err2.message.slice(0, 80)}`);
        }
      }
    }

    if ((i / BATCH + 1) % 10 === 0) {
      console.log(`Progress: ${inserted + skipped}/${emails.length}`);
    }
  }

  console.log(`\nDone: ${inserted} inserted, ${skipped} skipped`);
}

run().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
