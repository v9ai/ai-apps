/**
 * Delete contacts matching specific tags, or run the ML deletion pipeline.
 *
 * Usage:
 *   pnpm clean:contacts <tag1> [tag2 ...]         # delete contacts with tag (OR)
 *   pnpm clean:contacts <tag1> --dry-run          # preview only
 *
 *   pnpm clean:contacts --ml                      # ML pipeline: score → flag → purge
 *   pnpm clean:contacts --ml --threshold 0.60     # custom threshold (default 0.50)
 *   pnpm clean:contacts --ml --dry-run            # ML preview only
 *
 *   make clean-contacts                           # same as --ml
 */

import { config } from "dotenv";
config({ path: ".env.local" });

// ── Inline ML deletion scoring (mirrors contacts.ts:computeDeletionScore) ───

function parseJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface DbContact {
  id: number;
  email: string | null;
  nb_status: string | null;
  nb_result: string | null;
  email_verified: boolean | null;
  bounced_emails: string | null;
  do_not_contact: boolean | null;
  last_contacted_at: string | null;
  created_at: string;
  linkedin_url: string | null;
  github_handle: string | null;
  department: string | null;
  authority_score: number | null;
  position: string | null;
  tags: string | null;
  deletion_reasons: string | null;
  [key: string]: unknown;
}

function computeDeletionScore(
  contact: DbContact,
  outboundEmailCount: number = 0,
  anyReply: boolean = false,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const msPerDay = 86_400_000;
  const now = Date.now();

  // 1. Email invalidity (0.25)
  const INVALID_NB = new Set(["invalid", "disposable", "unknown", "catchall"]);
  if (!contact.email) {
    score += 0.25; reasons.push("No email address");
  } else if (contact.nb_status && INVALID_NB.has(contact.nb_status)) {
    score += 0.25; reasons.push(`NeverBounce status: ${contact.nb_status}`);
  } else if (contact.email_verified === false && contact.nb_status) {
    score += 0.15; reasons.push("Email not verified");
  }

  // 2. Email bounce (0.20)
  const bounced = parseJsonArray(contact.bounced_emails);
  const emailBounced = !!contact.email && bounced.includes(contact.email);
  const nbFail = contact.nb_result === "failed" || contact.nb_result === "fail";
  if (emailBounced || nbFail) {
    score += 0.20;
    reasons.push(emailBounced ? "Primary email is in bounced list" : `NeverBounce result: ${contact.nb_result}`);
  }

  // 3. Staleness (0.15)
  const createdMs = new Date(contact.created_at).getTime();
  const lastMs = contact.last_contacted_at ? new Date(contact.last_contacted_at).getTime() : 0;
  const daysSinceCreated = Math.floor((now - createdMs) / msPerDay);
  const daysSinceContacted = lastMs ? Math.floor((now - lastMs) / msPerDay) : 0;
  if (lastMs && daysSinceContacted > 180 && !anyReply) {
    score += 0.15; reasons.push(`Last contacted ${daysSinceContacted} days ago with no reply`);
  } else if (!lastMs && daysSinceCreated > 365) {
    score += 0.10; reasons.push(`Never contacted, created ${daysSinceCreated} days ago`);
  }

  // 4. Data incompleteness (0.10)
  if (!contact.email && !contact.linkedin_url && !contact.github_handle) {
    score += 0.10; reasons.push("No email, LinkedIn URL, or GitHub — no reachability vector");
  }

  // 5. Low relevance (0.10)
  const authority = contact.authority_score ?? 0;
  if (new Set(["HR/Recruiting", "Other"]).has(contact.department ?? "") && authority < 0.30) {
    score += 0.10; reasons.push(`Low-relevance dept '${contact.department}' with authority ${authority.toFixed(2)}`);
  }

  // 6. DNC flag (0.08)
  if ((contact.do_not_contact as unknown) === true || (contact.do_not_contact as unknown) === 1) {
    score += 0.08; reasons.push("Marked do-not-contact");
  }

  // 7. Outreach exhaustion (0.07)
  if (outboundEmailCount > 3 && !anyReply) {
    score += 0.07; reasons.push(`${outboundEmailCount} outbound emails with no reply`);
  }

  // 8. Low authority (0.03)
  if (authority < 0.15) {
    score += 0.03; reasons.push(`Very low authority score (${authority.toFixed(2)})`);
  }

  // 9. No position (0.01)
  if (!contact.position?.trim()) {
    score += 0.01; reasons.push("No job title");
  }

  // 10. Tag signals (0.01)
  const STALE_TAGS = new Set(["archived", "stale", "left-company", "wrong-person"]);
  const staleTag = parseJsonArray(contact.tags).find((t) => STALE_TAGS.has(t.toLowerCase()));
  if (staleTag) {
    score += 0.01; reasons.push(`Tag '${staleTag}' signals stale contact`);
  }

  return { score: Math.min(Math.round(score * 100) / 100, 1.0), reasons };
}

// ── ML Pipeline ──────────────────────────────────────────────────────────────

async function runML(threshold: number, dryRun: boolean) {
  const { db } = await import("@/db");
  const { contacts, contactEmails } = await import("@/db/schema");
  const { eq, and, inArray, count, sql } = await import("drizzle-orm");

  console.log(`\n═══ ML Contact Deletion Pipeline (threshold: ${threshold}) ═══\n`);

  // Step 1: Load all contacts
  const rows = await db.select().from(contacts) as DbContact[];
  console.log(`Loaded ${rows.length} contacts`);

  // Step 2: Batch-load email summaries
  const contactIds = rows.map((c) => c.id);
  const summaries = await db
    .select({
      contact_id: contactEmails.contact_id,
      total: count(contactEmails.id),
      any_reply: sql<boolean>`bool_or(${contactEmails.reply_received})`,
    })
    .from(contactEmails)
    .where(inArray(contactEmails.contact_id, contactIds))
    .groupBy(contactEmails.contact_id);

  const summaryMap = new Map(summaries.map((s) => [s.contact_id, s]));

  // Step 3: Score all contacts
  const scored = rows.map((c) => {
    const s = summaryMap.get(c.id);
    return { ...c, ...computeDeletionScore(c, s?.total ?? 0, s?.any_reply ?? false) };
  });

  const aboveThreshold = scored.filter((c) => c.score >= threshold);
  const scoreDistribution = {
    "≥0.75 (purge)": scored.filter((c) => c.score >= 0.75).length,
    "0.50–0.74 (flag)": scored.filter((c) => c.score >= 0.50 && c.score < 0.75).length,
    "0.35–0.49 (review)": scored.filter((c) => c.score >= 0.35 && c.score < 0.50).length,
    "<0.35 (keep)": scored.filter((c) => c.score < 0.35).length,
  };

  console.log("\nScore distribution:");
  for (const [bucket, n] of Object.entries(scoreDistribution)) {
    console.log(`  ${bucket}: ${n}`);
  }
  console.log(`\nContacts to flag (score ≥ ${threshold}): ${aboveThreshold.length}`);

  if (aboveThreshold.length > 0) {
    console.log("\nSample flagged contacts:");
    for (const c of aboveThreshold.slice(0, 8)) {
      const contact = c as DbContact & { score: number; reasons: string[] };
      const name = `${(contact as any).first_name ?? ""} ${(contact as any).last_name ?? ""}`.trim();
      console.log(`  [${contact.score.toFixed(2)}] ${name} <${contact.email ?? "no email"}> — ${contact.reasons.slice(0, 2).join("; ")}`);
    }
    if (aboveThreshold.length > 8) console.log(`  ... and ${aboveThreshold.length - 8} more`);
  }

  if (dryRun) {
    console.log("\n[DRY RUN] Writing scores without flagging or deleting.");
    // Still write scores for visibility
    const now = new Date().toISOString();
    for (const c of scored) {
      await db
        .update(contacts)
        .set({ deletion_score: c.score, deletion_reasons: JSON.stringify(c.reasons), updated_at: now })
        .where(eq(contacts.id, c.id));
    }
    console.log(`Scores written for ${scored.length} contacts. Re-run without --dry-run to flag and purge.`);
    return;
  }

  // Step 4: Write scores
  const now = new Date().toISOString();
  for (const c of scored) {
    await db
      .update(contacts)
      .set({ deletion_score: c.score, deletion_reasons: JSON.stringify(c.reasons), updated_at: now })
      .where(eq(contacts.id, c.id));
  }
  console.log(`\n✓ Scored ${scored.length} contacts`);

  // Step 5: Flag contacts above threshold
  if (aboveThreshold.length > 0) {
    const flagIds = aboveThreshold.map((c) => c.id);
    await db
      .update(contacts)
      .set({ to_be_deleted: true, deletion_flagged_at: now, updated_at: now })
      .where(inArray(contacts.id, flagIds));
    console.log(`✓ Flagged ${flagIds.length} contacts for deletion`);
  }

  // Step 6: Purge flagged contacts
  const toDelete = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(eq(contacts.to_be_deleted, true));

  if (toDelete.length === 0) {
    console.log("✓ Nothing to purge");
  } else {
    const purgeIds = toDelete.map((r) => r.id);
    const batchSize = 500;
    let purged = 0;
    for (let i = 0; i < purgeIds.length; i += batchSize) {
      const batch = purgeIds.slice(i, i + batchSize);
      await db.delete(contacts).where(inArray(contacts.id, batch));
      purged += batch.length;
      if (purgeIds.length > batchSize) console.log(`  Purging ${purged}/${purgeIds.length}...`);
    }
    console.log(`✓ Purged ${purged} contacts`);
  }

  console.log("\n═══ Done ═══");
}

// ── Tag-based deletion ───────────────────────────────────────────────────────

async function runTagDelete(tags: string[], dryRun: boolean) {
  const { db } = await import("@/db");
  const { contacts } = await import("@/db/schema");
  const { sql, inArray } = await import("drizzle-orm");

  const conditions = tags.map((t) => sql`${contacts.tags}::jsonb @> ${JSON.stringify([t])}::jsonb`);
  const where = conditions.length === 1
    ? conditions[0]
    : sql.join(conditions, sql` OR `);

  const matched = await db
    .select({ id: contacts.id, first_name: contacts.first_name, last_name: contacts.last_name, email: contacts.email, company: contacts.company, tags: contacts.tags })
    .from(contacts)
    .where(where);

  console.log(`\nFound ${matched.length} contacts matching tags: ${tags.join(", ")}`);
  if (matched.length === 0) { console.log("Nothing to delete."); return; }

  for (const c of matched.slice(0, 5)) {
    console.log(`  ${c.first_name} ${c.last_name} <${c.email ?? "no email"}> @ ${c.company ?? "?"} — tags: ${c.tags}`);
  }
  if (matched.length > 5) console.log(`  ... and ${matched.length - 5} more`);

  if (dryRun) { console.log("\n[DRY RUN] No contacts deleted."); return; }

  const ids = matched.map((c) => c.id);
  const batchSize = 500;
  let deleted = 0;
  for (let i = 0; i < ids.length; i += batchSize) {
    await db.delete(contacts).where(inArray(contacts.id, ids.slice(i, i + batchSize)));
    deleted += Math.min(batchSize, ids.length - i);
    if (ids.length > batchSize) console.log(`  Deleted ${deleted}/${ids.length}...`);
  }
  console.log(`\nDeleted ${deleted} contacts.`);
}

// ── Entry point ──────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const mlMode = args.includes("--ml");

  if (mlMode) {
    const thresholdIdx = args.indexOf("--threshold");
    const threshold = thresholdIdx !== -1 ? parseFloat(args[thresholdIdx + 1]) : 0.50;
    await runML(threshold, dryRun);
    return;
  }

  const tags = args.filter((a) => !a.startsWith("--"));
  if (tags.length === 0) {
    console.error("Usage:");
    console.error("  pnpm clean:contacts <tag1> [tag2 ...] [--dry-run]   tag-based deletion");
    console.error("  pnpm clean:contacts --ml [--threshold 0.50] [--dry-run]   ML pipeline");
    console.error("  make clean-contacts                                   ML pipeline");
    process.exit(1);
  }

  await runTagDelete(tags, dryRun);
}

main().catch((e) => {
  console.error("clean-contacts failed:", e);
  process.exit(1);
});
