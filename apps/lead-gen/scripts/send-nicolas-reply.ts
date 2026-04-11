import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";

const sql = neon(process.env.NEON_DATABASE_URL!);
const resend = new Resend(process.env.RESEND_API_KEY);

const CPN_TAG = '["cpn-outreach"]';

const subject = "Re: Claude Partner Network — Nicolas";
const text = `Hi Nicolas,

Fair reaction — cold email about an AI partner program from a stranger, I'd think the same thing. So let me make this verifiable.

Who I am: Vadim Nicolai, independent dev. My site is vadim.blog, GitHub is github.com/v9ai. I used Claude Code to find people building with Anthropic tools on GitHub — that's how I found your profile.

What the program is: Anthropic launched the Claude Partner Network in March 2026. It's public — you can see it at anthropic.com/news/claude-partner-network. They committed $100M to it for 2026. The idea is simple: Anthropic builds the model, partners (consultants, architects, dev shops) help enterprise customers deploy it. Partners get certified, listed in Anthropic's directory, and get co-sell opportunities where Anthropic sends enterprise deals your way.

Who runs it: Steve Corfield (Head of Global BD & Partnerships) runs the overall strategy. Karl Kadon (Global Head of Partner Experience) joined two weeks ago from Databricks to run the partner training and onboarding side — he's the one who emailed me. Both verifiable on LinkedIn.

Who's already in: Accenture (training 30,000 people on Claude), Deloitte, Cognizant (350,000 associates), Infosys. But the program is open to any firm at any scale — that includes independents and small consultancies.

Why you: You're a consultant (Gluendo) and CTO (Barbacane) who's "200% into Claude" — that's literally the profile they're looking for. Someone who can take Claude from proof-of-concept to production for clients.

What I'm doing: I applied independently, got accepted, and was asked to put together a cohort to go through the training path together. That's it — I'm not Anthropic staff, not getting paid for this, just coordinating a group.

Verify it yourself:
- Program page: claude.com/partners
- Registration: partnerportal.anthropic.com/s/partner-registration
- First certification (Claude Certified Architect): anthropic.com/learn
- Karl Kadon's LinkedIn: linkedin.com/in/karlkadon

If you're interested, I'll loop you in when the training path details drop. Should be this week.

Vadim
vadim.blog`;

async function main() {
  // Find the original email
  const rows = await sql`
    SELECT ce.id as email_id, c.id as contact_id, c.first_name, c.last_name, c.email
    FROM contact_emails ce
    JOIN contacts c ON c.id = ce.contact_id
    WHERE c.email = 'ndreno@gmail.com'
      AND ce.tags LIKE '%needs_response%'
    ORDER BY ce.created_at DESC LIMIT 1
  `;

  if (rows.length === 0) {
    console.log("No needs_response email found for ndreno@gmail.com");
    process.exit(1);
  }

  const row = rows[0];
  const name = `${row.first_name} ${row.last_name ?? ""}`.trim();
  console.log(`Sending to: ${name} <${row.email}>`);
  console.log(`Subject: ${subject}`);

  const result = await resend.emails.send({
    from: "Vadim Nicolai <contact@vadim.blog>",
    to: row.email,
    subject,
    text,
  });

  if (result.error) {
    console.log(`✗ Failed: ${result.error.message}`);
    process.exit(1);
  }

  console.log(`✓ Sent (${result.data?.id})`);

  // Insert follow-up email row
  await sql`
    INSERT INTO contact_emails (contact_id, resend_id, from_email, to_emails, subject, text_content,
      status, sent_at, tags, recipient_name, parent_email_id, sequence_type, sequence_number, created_at, updated_at)
    VALUES (${row.contact_id}, ${result.data?.id ?? ""}, 'contact@vadim.blog', ${JSON.stringify([row.email])},
      ${subject}, ${text}, 'sent', now()::text, '["cpn-outreach","cpn-followup-1"]', ${name},
      ${row.email_id}, 'followup_1', '1', now()::text, now()::text)
  `;

  // Clear needs_response tag
  await sql`
    UPDATE contact_emails
    SET tags = ${CPN_TAG},
        followup_status = 'completed',
        updated_at = now()::text
    WHERE id = ${row.email_id}
  `;

  console.log(`✓ DB updated`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
