/**
 * Batch intent signal detection for companies.
 *
 * Queries company data from Neon, sends through local Qwen model
 * (mlx_lm.server on port 8080 with intent-signal adapter), and
 * stores detected signals in the intent_signals table.
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
  linkedinPosts,
  intentSignals,
} from "@/db/schema";
import { eq, and, desc, inArray, isNull, sql } from "drizzle-orm";

// ── Config ──────────────────────────────────────────────────────

const LLM_BASE_URL =
  process.env.LLM_BASE_URL ?? "http://localhost:8080/v1";
const LLM_MODEL =
  process.env.LLM_MODEL ?? "mlx-community/Qwen2.5-3B-Instruct-4bit";

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

const VALID_SIGNAL_TYPES = new Set([
  "hiring_intent",
  "tech_adoption",
  "growth_signal",
  "budget_cycle",
  "leadership_change",
  "product_launch",
]);

const INTENT_WEIGHTS: Record<string, number> = {
  hiring_intent: 30,
  tech_adoption: 20,
  growth_signal: 25,
  budget_cycle: 15,
  leadership_change: 5,
  product_launch: 5,
  competitor_mention: 40,
};

// ── Helpers ─────────────────────────────────────────────────────

function computeFreshness(detectedAt: string, decayDays: number): number {
  const daysSince =
    (Date.now() - new Date(detectedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (decayDays <= 0) return 0;
  const k = 0.693 / decayDays;
  return Math.exp(-k * daysSince);
}

function computeIntentScore(
  signals: Array<{
    signal_type: string;
    confidence: number;
    detected_at: string;
    decay_days: number;
  }>,
): number {
  if (signals.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [signalType, weight] of Object.entries(INTENT_WEIGHTS)) {
    const best = signals
      .filter((s) => s.signal_type === signalType)
      .reduce((max, s) => {
        const f = computeFreshness(s.detected_at, s.decay_days);
        return Math.max(max, s.confidence * f);
      }, 0);

    weightedSum += best * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
}

async function callLocalLLM(userText: string): Promise<string> {
  const resp = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userText },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    }),
  });

  if (!resp.ok) {
    throw new Error(`LLM API ${resp.status}: ${await resp.text()}`);
  }

  const body = (await resp.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return body.choices[0]?.message?.content ?? "";
}

function stripMarkdownFences(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```json")) s = s.slice(7);
  else if (s.startsWith("```")) s = s.slice(3);
  if (s.endsWith("```")) s = s.slice(0, -3);
  return s.trim();
}

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
    db
      .select({ content: linkedinPosts.content })
      .from(linkedinPosts)
      .where(eq(linkedinPosts.company_id, companyId))
      .orderBy(desc(linkedinPosts.created_at))
      .limit(5),
  ]);

  const texts: string[] = [];
  for (const s of snapshots) {
    if (s.text_sample) texts.push(s.text_sample.slice(0, 2000));
  }
  for (const f of facts) {
    if (f.value_text) texts.push(f.value_text.slice(0, 1000));
  }
  for (const p of posts) {
    if (p.content) texts.push(p.content.slice(0, 1000));
  }

  return texts;
}

// ── Detect signals for one company ─────────────────────────────

interface DetectedSignal {
  signal_type: string;
  confidence: number;
  evidence: string[];
  decay_days: number;
}

async function detectForCompany(
  company: { id: number; name: string; key: string },
  texts: string[],
): Promise<DetectedSignal[]> {
  if (texts.length === 0) return [];

  const combinedText = texts.join("\n\n---\n\n").slice(0, 3000);
  const userText = `Company: ${company.name} (${company.key})\n\nContent:\n${combinedText}`;

  const raw = await callLocalLLM(userText);
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
    const r = await fetch(`${LLM_BASE_URL}/models`);
    if (!r.ok) throw new Error(`${r.status}`);
  } catch {
    console.error(
      `ERROR: Cannot reach LLM at ${LLM_BASE_URL}. Start with: make intent-serve`,
    );
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
        for (const signal of signals) {
          const decayDays = signal.decay_days ?? 30;
          const decaysAt = new Date(
            Date.now() + decayDays * 24 * 60 * 60 * 1000,
          ).toISOString();

          await db.insert(intentSignals).values({
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
          });
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
