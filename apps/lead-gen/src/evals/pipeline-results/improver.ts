import { eq, and, lt, isNull, ne, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { companies, contacts, contactEmails } from "@/db/schema";
import { classifyAiNative } from "@/evals/ai-classifier";
import type {
  StageResult,
  Improvement,
  ImprovementPriority,
  ApplyResult,
} from "./schema";

// ---------------------------------------------------------------------------
// Analyze stage results → ranked improvements
// ---------------------------------------------------------------------------

export function diagnose(stages: StageResult[]): Improvement[] {
  const improvements: Improvement[] = [];

  for (const stage of stages) {
    for (const chk of stage.checks) {
      if (chk.severity === "OK") continue;

      const priority: ImprovementPriority =
        chk.severity === "CRITICAL" ? "HIGH" : "MEDIUM";

      switch (`${stage.stage}:${chk.name}`) {
        // -- Discovery --
        case "discovery:website-coverage":
        case "discovery:description-coverage":
          improvements.push({
            action: "FILL_GAPS",
            priority,
            stage: "discovery",
            description: `${chk.detail} — fill missing ${chk.name.replace("-coverage", "")} fields`,
            affectedCount: 0, // populated by applier
            expectedLift: (chk.threshold - chk.metric) * 0.8,
            targetIds: [],
          });
          break;

        case "discovery:staleness":
          improvements.push({
            action: "FLAG_STALE",
            priority,
            stage: "discovery",
            description: `${chk.detail} — flag for re-crawl or removal`,
            affectedCount: 0,
            expectedLift: chk.metric * 0.5,
            targetIds: [],
          });
          break;

        // -- Enrichment --
        case "enrichment:category-coverage":
          improvements.push({
            action: "RE_ENRICH",
            priority,
            stage: "enrichment",
            description: `${chk.detail} — re-enrich UNKNOWN companies`,
            affectedCount: 0,
            expectedLift: (chk.threshold - chk.metric) * 0.6,
            targetIds: [],
          });
          break;

        case "enrichment:ai-classification":
        case "enrichment:avg-confidence":
          improvements.push({
            action: "RE_ENRICH",
            priority,
            stage: "enrichment",
            description: `${chk.detail} — re-classify with updated AI classifier`,
            affectedCount: 0,
            expectedLift: (chk.threshold - chk.metric) * 0.5,
            targetIds: [],
          });
          break;

        case "enrichment:services-coverage":
          improvements.push({
            action: "FILL_GAPS",
            priority: "LOW",
            stage: "enrichment",
            description: `${chk.detail} — extract services from descriptions`,
            affectedCount: 0,
            expectedLift: 0.1,
            targetIds: [],
          });
          break;

        // -- Contacts --
        case "contacts:contact-coverage":
          improvements.push({
            action: "EXPAND_CONTACTS",
            priority,
            stage: "contacts",
            description: `${chk.detail} — discover contacts for uncovered companies`,
            affectedCount: 0,
            expectedLift: (chk.threshold - chk.metric) * 0.4,
            targetIds: [],
          });
          break;

        case "contacts:email-verified":
          improvements.push({
            action: "RE_VERIFY",
            priority,
            stage: "contacts",
            description: `${chk.detail} — re-verify unverified contacts`,
            affectedCount: 0,
            expectedLift: (chk.threshold - chk.metric) * 0.6,
            targetIds: [],
          });
          break;

        case "contacts:bounce-rate":
          improvements.push({
            action: "PAUSE_DOMAIN",
            priority: "HIGH",
            stage: "contacts",
            description: `${chk.detail} — pause outreach to high-bounce domains`,
            affectedCount: 0,
            expectedLift: chk.metric * 0.7,
            targetIds: [],
          });
          break;

        // -- Outreach --
        case "outreach:reply-rate":
        case "outreach:open-rate":
          improvements.push({
            action: "BOOST_OUTREACH",
            priority,
            stage: "outreach",
            description: `${chk.detail} — re-draft low-performing email templates`,
            affectedCount: 0,
            expectedLift: 0.05,
            targetIds: [],
          });
          break;

        case "outreach:error-rate":
          improvements.push({
            action: "PAUSE_DOMAIN",
            priority: "HIGH",
            stage: "outreach",
            description: `${chk.detail} — investigate delivery errors`,
            affectedCount: 0,
            expectedLift: chk.metric * 0.5,
            targetIds: [],
          });
          break;
      }
    }
  }

  // Deduplicate by action+stage, keep highest priority
  const seen = new Map<string, Improvement>();
  for (const imp of improvements) {
    const key = `${imp.action}:${imp.stage}`;
    const existing = seen.get(key);
    if (!existing || priorityRank(imp.priority) > priorityRank(existing.priority)) {
      seen.set(key, imp);
    }
  }

  return [...seen.values()].sort(
    (a, b) => priorityRank(b.priority) - priorityRank(a.priority),
  );
}

function priorityRank(p: ImprovementPriority): number {
  return p === "HIGH" ? 3 : p === "MEDIUM" ? 2 : 1;
}

// ---------------------------------------------------------------------------
// Hydrate improvements with target IDs (pre-apply)
// ---------------------------------------------------------------------------

export async function hydrate(improvements: Improvement[]): Promise<Improvement[]> {
  for (const imp of improvements) {
    switch (imp.action) {
      case "RE_ENRICH": {
        const rows = await db
          .select({ id: companies.id })
          .from(companies)
          .where(eq(companies.category, "UNKNOWN"))
          .limit(100);
        imp.targetIds = rows.map((r) => r.id);
        imp.affectedCount = rows.length;
        break;
      }
      case "FLAG_STALE": {
        const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
        const rows = await db
          .select({ id: companies.id })
          .from(companies)
          .where(lt(companies.updated_at, cutoff))
          .limit(200);
        imp.targetIds = rows.map((r) => r.id);
        imp.affectedCount = rows.length;
        break;
      }
      case "RE_VERIFY": {
        const rows = await db
          .select({ id: contacts.id })
          .from(contacts)
          .where(eq(contacts.email_verified, false))
          .limit(100);
        imp.targetIds = rows.map((r) => r.id);
        imp.affectedCount = rows.length;
        break;
      }
      case "EXPAND_CONTACTS": {
        // Companies with enrichment but no contacts
        const rows = await db.execute(sql`
          select c.id from companies c
          where c.category != 'UNKNOWN'
            and not exists (
              select 1 from contacts ct where ct.company_id = c.id
            )
          limit 100
        `);
        const ids = (rows.rows as Array<{ id: number }>).map((r) => r.id);
        imp.targetIds = ids;
        imp.affectedCount = ids.length;
        break;
      }
      case "FILL_GAPS": {
        const rows = await db
          .select({ id: companies.id })
          .from(companies)
          .where(isNull(companies.website))
          .limit(100);
        imp.targetIds = rows.map((r) => r.id);
        imp.affectedCount = rows.length;
        break;
      }
      case "PAUSE_DOMAIN": {
        // Contacts with bounced emails
        const rows = await db
          .select({ id: contacts.id })
          .from(contacts)
          .where(
            and(
              ne(contacts.bounced_emails, "[]"),
              eq(contacts.do_not_contact, false),
            ),
          );
        imp.targetIds = rows.map((r) => r.id);
        imp.affectedCount = rows.length;
        break;
      }
    }
  }

  // Drop improvements with 0 affected rows
  return improvements.filter((imp) => imp.affectedCount > 0);
}

// ---------------------------------------------------------------------------
// Apply a single improvement
// ---------------------------------------------------------------------------

export async function applyImprovement(imp: Improvement): Promise<ApplyResult> {
  const result: ApplyResult = {
    action: imp.action,
    applied: 0,
    skipped: 0,
    errors: [],
  };

  if (imp.targetIds.length === 0) {
    result.skipped = imp.affectedCount;
    return result;
  }

  switch (imp.action) {
    case "RE_ENRICH": {
      // Re-run AI classifier on UNKNOWN companies
      for (const id of imp.targetIds) {
        try {
          const [company] = await db
            .select({ key: companies.key, name: companies.name, description: companies.description })
            .from(companies)
            .where(eq(companies.id, id));

          if (!company) { result.skipped++; continue; }

          const slug = [company.key, company.name, company.description ?? ""]
            .join(" ")
            .slice(0, 500);
          const classification = classifyAiNative(slug);

          await db
            .update(companies)
            .set({
              ai_tier: classification.tier,
              ai_classification_confidence: classification.confidence,
              ai_classification_reason: classification.reasons.join("; "),
              updated_at: new Date().toISOString(),
            })
            .where(eq(companies.id, id));

          result.applied++;
        } catch (e) {
          result.errors.push(`company ${id}: ${(e as Error).message}`);
        }
      }
      break;
    }

    case "FLAG_STALE": {
      // Mark stale companies with score penalty
      try {
        await db
          .update(companies)
          .set({
            score: 0.3,
            score_reasons: JSON.stringify(["flagged-stale-by-pipeline-check"]),
            updated_at: new Date().toISOString(),
          })
          .where(inArray(companies.id, imp.targetIds));
        result.applied = imp.targetIds.length;
      } catch (e) {
        result.errors.push((e as Error).message);
      }
      break;
    }

    case "PAUSE_DOMAIN": {
      // Set do_not_contact on high-bounce contacts
      try {
        await db
          .update(contacts)
          .set({
            do_not_contact: true,
            updated_at: new Date().toISOString(),
          })
          .where(inArray(contacts.id, imp.targetIds));
        result.applied = imp.targetIds.length;
      } catch (e) {
        result.errors.push((e as Error).message);
      }
      break;
    }

    // These actions need external systems (LLM, email verifier, web scraper)
    // so we only report what needs to be done — actual execution is delegated
    case "RE_VERIFY":
    case "EXPAND_CONTACTS":
    case "FILL_GAPS":
    case "BOOST_OUTREACH":
    case "DEDUP": {
      result.skipped = imp.targetIds.length;
      result.errors.push(
        `${imp.action} requires external service — ${imp.targetIds.length} targets identified for manual/agent execution`,
      );
      break;
    }
  }

  return result;
}
