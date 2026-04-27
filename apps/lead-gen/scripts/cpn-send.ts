#!/usr/bin/env npx tsx
/**
 * CPN one-shot: set forwarding alias (optional) + send a CPN template to a single
 * contact, then log to contact_emails.
 *
 * Usage:
 *   pnpm exec tsx scripts/cpn-send.ts \
 *     --template <cpn_followup|cpn_training_path|cpn_email_ready|cpn_waiting_reply> \
 *     (--id <contact_id> | --email <contact_email>) \
 *     [--alias <alias>]   # required for cpn_email_ready unless contact already has one
 *     [--auto]            # send without confirmation prompt
 *     [--dry-run]         # print, do not write or send
 *     [--force]           # bypass idempotency (resend even if same template was sent)
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createInterface } from "readline";
import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import {
  buildCpnFollowup,
  buildCpnTrainingPath,
  buildCpnEmailReady,
  buildCpnWaitingReply,
  FROM,
} from "@/lib/email/cpn-followup";

const ALIAS_DOMAIN = "vadim.blog";
const RESERVED = new Set([
  "contact",
  "postmaster",
  "abuse",
  "hostmaster",
  "admin",
  "noreply",
  "no-reply",
]);

type TemplateName =
  | "cpn_followup"
  | "cpn_training_path"
  | "cpn_email_ready"
  | "cpn_waiting_reply";

interface TemplateMeta {
  tagsJson: string;
  tagMatch: string;
  sequenceType: string;
  sequenceNumber: string;
}

const TEMPLATE_META: Record<TemplateName, TemplateMeta> = {
  cpn_followup: {
    tagsJson: '["cpn-outreach","cpn-followup-1"]',
    tagMatch: "cpn-followup-1",
    sequenceType: "followup_1",
    sequenceNumber: "1",
  },
  cpn_training_path: {
    tagsJson: '["cpn-outreach","cpn-training-path"]',
    tagMatch: "cpn-training-path",
    sequenceType: "followup_2",
    sequenceNumber: "2",
  },
  cpn_email_ready: {
    tagsJson: '["cpn-outreach","cpn-email-ready"]',
    tagMatch: "cpn-email-ready",
    sequenceType: "followup_3",
    sequenceNumber: "3",
  },
  cpn_waiting_reply: {
    tagsJson: '["cpn-outreach","cpn-waiting-reply"]',
    tagMatch: "cpn-waiting-reply",
    sequenceType: "followup_2_reminder",
    sequenceNumber: "2",
  },
};

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function flagValue(name: string): string | null {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return null;
  const raw = process.argv[idx + 1];
  return raw && !raw.startsWith("--") ? raw : null;
}

function sanitizeAlias(raw: string): string {
  return raw
    .trim()
    .replace(/[^A-Za-z0-9._-]/g, "")
    .slice(0, 64);
}

function die(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

const sql = neon(process.env.NEON_DATABASE_URL ?? die("NEON_DATABASE_URL not set"));
const resend = new Resend(process.env.RESEND_API_KEY ?? die("RESEND_API_KEY not set"));

interface Contact {
  id: number;
  first_name: string;
  last_name: string | null;
  email: string;
  forwarding_alias: string | null;
  do_not_contact: boolean | null;
}

async function loadContact(idArg: string | null, emailArg: string | null): Promise<Contact> {
  if (idArg) {
    const id = parseInt(idArg, 10);
    if (!Number.isFinite(id)) die(`--id must be a number, got ${idArg}`);
    const rows = (await sql`
      SELECT id, first_name, last_name, email, forwarding_alias, do_not_contact
      FROM contacts WHERE id = ${id} LIMIT 1
    `) as unknown as Contact[];
    if (rows.length === 0) die(`No contact with id=${id}`);
    return rows[0];
  }
  if (emailArg) {
    const rows = (await sql`
      SELECT id, first_name, last_name, email, forwarding_alias, do_not_contact
      FROM contacts WHERE lower(email) = lower(${emailArg}) LIMIT 1
    `) as unknown as Contact[];
    if (rows.length === 0) die(`No contact with email=${emailArg}`);
    return rows[0];
  }
  die("--id or --email is required");
}

async function ensureAlias(
  contact: Contact,
  aliasArg: string | null,
  templateName: TemplateName,
  dryRun: boolean,
): Promise<{ alias: string | null; wrote: boolean }> {
  const wantsAlias = templateName === "cpn_email_ready" || aliasArg !== null;
  if (!wantsAlias) return { alias: contact.forwarding_alias, wrote: false };

  let alias = aliasArg ? sanitizeAlias(aliasArg) : null;

  if (!alias && contact.forwarding_alias) {
    alias = contact.forwarding_alias;
  }

  if (templateName === "cpn_email_ready" && !alias) {
    die("cpn_email_ready requires --alias (contact has no existing forwarding_alias)");
  }
  if (!alias) return { alias: contact.forwarding_alias, wrote: false };

  if (RESERVED.has(alias.toLowerCase())) die(`Alias '${alias}' is reserved`);

  if (
    contact.forwarding_alias &&
    aliasArg !== null &&
    contact.forwarding_alias.toLowerCase() !== alias.toLowerCase()
  ) {
    die(
      `Contact already has forwarding_alias='${contact.forwarding_alias}' but --alias='${alias}' was passed. Pick one (omit --alias to use existing, or change the existing alias separately).`,
    );
  }

  if (alias.toLowerCase() !== (contact.forwarding_alias ?? "").toLowerCase()) {
    const clash = (await sql`
      SELECT id FROM contacts
      WHERE lower(forwarding_alias) = lower(${alias}) AND id <> ${contact.id}
      LIMIT 1
    `) as unknown as { id: number }[];
    if (clash.length > 0) die(`Alias '${alias}' is already used by contact ${clash[0].id}`);
  }

  if (alias === contact.forwarding_alias) {
    return { alias, wrote: false };
  }

  if (dryRun) {
    console.log(`  [dry-run] would set forwarding_alias='${alias}' on contact ${contact.id}`);
    return { alias, wrote: false };
  }

  await sql`
    UPDATE contacts
    SET forwarding_alias = ${alias}, updated_at = now()::text
    WHERE id = ${contact.id}
  `;
  return { alias, wrote: true };
}

function buildEmail(
  templateName: TemplateName,
  firstName: string,
  contactEmail: string,
  alias: string | null,
): { subject: string; text: string; to: string } {
  switch (templateName) {
    case "cpn_followup": {
      const { subject, text } = buildCpnFollowup(firstName);
      return { subject, text, to: contactEmail };
    }
    case "cpn_training_path": {
      const { subject, text } = buildCpnTrainingPath(firstName);
      return { subject, text, to: contactEmail };
    }
    case "cpn_waiting_reply": {
      const { subject, text } = buildCpnWaitingReply(firstName);
      return { subject, text, to: contactEmail };
    }
    case "cpn_email_ready": {
      if (!alias) die("cpn_email_ready needs an alias");
      const aliasEmail = `${alias}@${ALIAS_DOMAIN}`;
      const { subject, text } = buildCpnEmailReady(firstName, aliasEmail, contactEmail);
      return { subject, text, to: aliasEmail };
    }
  }
}

async function findParentEmailId(contactId: number): Promise<number | null> {
  const rows = (await sql`
    SELECT id FROM contact_emails
    WHERE contact_id = ${contactId} AND tags LIKE '%cpn-outreach%'
    ORDER BY id DESC
    LIMIT 1
  `) as unknown as { id: number }[];
  return rows.length > 0 ? rows[0].id : null;
}

async function alreadySent(contactId: number, tagMatch: string): Promise<boolean> {
  const rows = (await sql`
    SELECT id FROM contact_emails
    WHERE contact_id = ${contactId}
      AND tags LIKE ${"%" + tagMatch + "%"}
      AND resend_id IS NOT NULL
      AND resend_id <> ''
    LIMIT 1
  `) as unknown as { id: number }[];
  return rows.length > 0;
}

async function main() {
  const templateArg = flagValue("template") as TemplateName | null;
  if (!templateArg || !(templateArg in TEMPLATE_META)) {
    die(
      `--template required, one of: ${Object.keys(TEMPLATE_META).join(", ")}`,
    );
  }
  const templateName = templateArg;

  const idArg = flagValue("id");
  const emailArg = flagValue("email");
  const aliasArg = flagValue("alias");
  const dryRun = flag("dry-run");
  const autoSend = flag("auto");
  const force = flag("force");

  const contact = await loadContact(idArg, emailArg);
  if (contact.do_not_contact) die(`Contact ${contact.id} is marked do_not_contact`);
  if (!contact.email) die(`Contact ${contact.id} has no email`);

  const meta = TEMPLATE_META[templateName];

  if (!force && (await alreadySent(contact.id, meta.tagMatch))) {
    console.log(
      `Already sent template '${templateName}' to contact ${contact.id} (tag ${meta.tagMatch}). Use --force to resend.`,
    );
    return;
  }

  const { alias, wrote: aliasWrote } = await ensureAlias(contact, aliasArg, templateName, dryRun);

  const firstName = contact.first_name?.trim() || "there";
  const fullName = `${contact.first_name} ${contact.last_name ?? ""}`.trim();
  const { subject, text, to } = buildEmail(templateName, firstName, contact.email, alias);

  const parentEmailId = await findParentEmailId(contact.id);

  console.log(`\n── CPN send ──`);
  console.log(`  Contact:  [${contact.id}] ${fullName} <${contact.email}>`);
  if (alias) {
    const aliasMsg = aliasWrote
      ? `${alias}@${ALIAS_DOMAIN} (newly set)`
      : `${alias}@${ALIAS_DOMAIN}`;
    console.log(`  Alias:    ${aliasMsg}`);
  }
  console.log(`  Template: ${templateName}`);
  console.log(`  To:       ${to}`);
  console.log(`  Subject:  ${subject}`);
  console.log(`  Parent:   ${parentEmailId ?? "(none)"}`);
  console.log(`  Tags:     ${meta.tagsJson}`);
  console.log(`\n${text.split("\n").map((l) => `  ${l}`).join("\n")}\n`);

  if (dryRun) {
    console.log("[dry-run] no Resend call, no DB insert. Exiting.");
    return;
  }

  if (!autoSend) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));
    const answer = (await ask("[S]end / [Q]uit? ")).trim().toLowerCase();
    rl.close();
    if (answer === "q" || (answer && answer !== "s")) {
      console.log("Cancelled.");
      return;
    }
  }

  const result = await resend.emails.send({ from: FROM, to, subject, text });
  if (result.error) die(`Resend failed: ${result.error.message}`);
  const resendId = result.data?.id ?? "";

  await sql`
    INSERT INTO contact_emails
      (contact_id, resend_id, from_email, to_emails, subject, text_content, status,
       sent_at, tags, recipient_name, parent_email_id, sequence_type, sequence_number,
       created_at, updated_at)
    VALUES
      (${contact.id}, ${resendId}, 'contact@vadim.blog',
       ${JSON.stringify([to])}, ${subject}, ${text}, 'sent',
       now()::text, ${meta.tagsJson}, ${fullName}, ${parentEmailId},
       ${meta.sequenceType}, ${meta.sequenceNumber}, now()::text, now()::text)
  `;

  console.log(`✓ Sent (resend_id=${resendId}), logged to contact_emails.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
