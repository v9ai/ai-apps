/**
 * Batch intent signal detection for companies.
 *
 * Queries company data from Neon, sends through DeepSeek, and stores
 * detected signals in the intent_signals table.
 *
 * Usage:
 *   pnpm tsx scripts/detect-intent-signals.ts              # detect all
 *   pnpm tsx scripts/detect-intent-signals.ts --refresh-only  # refresh scores only
 *   pnpm tsx scripts/detect-intent-signals.ts --limit 50   # limit companies
 */

import { db } from "@/db";
import {
  companies,
  companySnapshots,
  companyFacts,
  intentSignals,
} from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { tagIntentSignalsProducts } from "./tag-intent-signals-products";
import {
  VALID_SIGNAL_TYPES,
  INTENT_WEIGHTS,
  computeFreshness,
  computeIntentScore,
  stripMarkdownFences,
  callLocalLLM,
  ensureLLMReachable,
  type DetectedSignal,
} from "@/lib/intent/detector";
import { listD1Posts } from "@/lib/posts-d1-client";

// ── Config ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You detect buying/hiring intent signals in B2B company content.
Analyze the text and identify all relevant signals.
Return JSON: {"signals": [{"signal_type": "...", "confidence": 0.0-1.0, "evidence": ["..."], "decay_days": N}]}

Signal types:
- hiring_intent (decay: 30): Company is actively hiring or growing team
- tech_adoption (decay: 60): Adopting new technology, migrating infrastructure
- growth_signal (decay: 45): Funding, revenue growth, expansion, M&A
- budget_cycle (decay: 90): Budget planning, vendor evaluation, procurement
- leadership_change (decay: 60): New executive hires, promotions
- product_launch (decay: 30): New product/feature announcements

If no signals detected, return: {"signals": []}
CRITICAL: Respond with ONLY a valid JSON object, no markdown.`;

// ── Gather text for a company ──────────────────────────────────

async function gatherCompanyText(companyId: number): Promise<string[]> {
  const [snapshots, facts, posts] = await Promise.all([
    db
      .select({ text_sample: companySnapshots.text_sample })
      .from(companySnapshots)
      .where(eq(companySnapshots.company_id, companyId))
      .limit(3),
    db
      .select({ value_text: companyFacts.value_text })
      .from(companyFacts)
      .where(
        and(
          eq(companyFacts.company_id, companyId),
          inArray(companyFacts.field, ["description", "services"]),
        ),
      )
      .limit(5),
    // Posts are now in Cloudflare D1; fetch via the edge worker.
    listD1Posts({ companyId, limit: 5 }).catch(() => []),
  ]);

  const texts: string[] = [];
  for (const s of snapshots) {
    if (s.text_sample) texts.push(s.text_sample.slice(0, 2000));
  }
  for (const f of facts) {
    if (f.value_text) texts.push(f.value_text.slice(0, 1000));
  }
  for (const p of posts) {
    const t = p.post_text ?? p.content;
    if (t) texts.push(t.slice(0, 1000));
  }

  return texts;
}

// ── Detect signals for one company ─────────────────────────────

async function detectForCompany(
  company: { id: number; name: string; key: string },
  texts: string[],
): Promise<DetectedSignal[]> {
  if (texts.length === 0) return [];

  const combinedText = texts.join("\n\n---\n\n").slice(0, 3000);
  const userText = `Company: ${company.name} (${company.key})\n\nContent:\n${combinedText}`;

  const raw = await callLocalLLM(SYSTEM_PROMPT, userText);
  const json = stripMarkdownFences(raw);

  const parsed = JSON.parse(json) as { signals: DetectedSignal[] };

  // Validate
  return (parsed.signals ?? []).filter(
    (s) =>
      VALID_SIGNAL_TYPES.has(s.signal_type) &&
      typeof s.confidence === "number" &&
      s.confidence > 0.3 &&
      s.confidence <= 1.0,
  );
}

// ── Refresh scores only ────────────────────────────────────────

async function refreshScoresOnly(): Promise<void> {
  console.log("Refreshing intent scores with decay...");

  const companiesWithSignals = await db
    .select({ company_id: intentSignals.company_id })
    .from(intentSignals)
    .groupBy(intentSignals.company_id);

  let updated = 0;
  for (const { company_id } of companiesWithSignals) {
    const signals = await db
      .select()
      .from(intentSignals)
      .where(eq(intentSignals.company_id, company_id));

    const score = computeIntentScore(signals);

    const topSignal = signals.reduce(
      (best, s) => {
        const eff = s.confidence * computeFreshness(s.detected_at, s.decay_days);
        return eff > (best?.eff ?? 0) ? { ...s, eff } : best;
      },
      null as any,
    );

    await db
      .update(companies)
      .set({
        intent_score: score,
        intent_score_updated_at: new Date().toISOString(),
        intent_signals_count: signals.length,
        intent_top_signal: topSignal
          ? JSON.stringify({
              signal_type: topSignal.signal_type,
              confidence: topSignal.confidence,
              freshness: computeFreshness(
                topSignal.detected_at,
                topSignal.decay_days,
              ),
            })
          : null,
      })
      .where(eq(companies.id, company_id));

    updated++;
  }

  console.log(`Refreshed ${updated} companies`);
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const refreshOnly = args.includes("--refresh-only");
  const limitArg = args.find((a) => a.startsWith("--limit"));
  const limit = limitArg
    ? parseInt(args[args.indexOf(limitArg) + 1] ?? "100", 10)
    : 100;

  if (refreshOnly) {
    await refreshScoresOnly();
    process.exit(0);
  }

  // Check LLM is reachable
  try {
    await ensureLLMReachable();
  } catch (e: any) {
    console.error(`ERROR: ${e.message}. Start with: make intent-serve`);
    process.exit(1);
  }

  // Get non-blocked companies
  const allCompanies = await db
    .select({ id: companies.id, name: companies.name, key: companies.key })
    .from(companies)
    .where(eq(companies.blocked, false))
    .orderBy(desc(companies.score))
    .limit(limit);

  console.log(
    `Processing ${allCompanies.length} companies (limit=${limit})...`,
  );

  let totalSignals = 0;
  let processed = 0;
  let errors = 0;

  for (const company of allCompanies) {
    try {
      const texts = await gatherCompanyText(company.id);
      if (texts.length === 0) {
        processed++;
        continue;
      }

      const signals = await detectForCompany(company, texts);

      if (signals.length > 0) {
        const now = new Date().toISOString();

        // Insert signals
        const insertedIds: number[] = [];
        for (const signal of signals) {
          const decayDays = signal.decay_days ?? 30;
          const decaysAt = new Date(
            Date.now() + decayDays * 24 * 60 * 60 * 1000,
          ).toISOString();

          const [inserted] = await db
            .insert(intentSignals)
            .values({
              company_id: company.id,
              signal_type: signal.signal_type as any,
              source_type: "company_snapshot" as any,
              raw_text: texts[0]?.slice(0, 500) ?? "",
              evidence: JSON.stringify(signal.evidence ?? []),
              confidence: signal.confidence,
              detected_at: now,
              decays_at: decaysAt,
              decay_days: decayDays,
              model_version: "intent-signal-v1",
            })
            .returning({ id: intentSignals.id });
          if (inserted) insertedIds.push(inserted.id);
        }

        if (insertedIds.length > 0) {
          try {
            await tagIntentSignalsProducts({ signalIds: insertedIds });
          } catch (tagErr: any) {
            console.error(`  ${company.key}: tagger error: ${tagErr.message}`);
          }
        }

        // Re-aggregate company intent score
        const allSignals = await db
          .select()
          .from(intentSignals)
          .where(eq(intentSignals.company_id, company.id));

        const score = computeIntentScore(allSignals);

        await db
          .update(companies)
          .set({
            intent_score: score,
            intent_score_updated_at: now,
            intent_signals_count: allSignals.length,
          })
          .where(eq(companies.id, company.id));

        totalSignals += signals.length;
        console.log(
          `  ${company.key}: ${signals.length} signals (score: ${score.toFixed(1)})`,
        );
      }

      processed++;
    } catch (e: any) {
      errors++;
      console.error(`  ${company.key}: ERROR: ${e.message}`);
    }
  }

  console.log(
    `\nDone. Processed: ${processed}, Signals: ${totalSignals}, Errors: ${errors}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
