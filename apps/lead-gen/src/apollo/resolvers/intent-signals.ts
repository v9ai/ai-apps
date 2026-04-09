import { eq, and, desc, gte, count, sql } from "drizzle-orm";
import { db } from "@/db";
import { companies, intentSignals } from "@/db/schema";
import type { IntentSignal, Company } from "@/db/schema";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";

// ── Helpers ────────────────────────────────────────────────────

function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/** Exponential decay: e^(-ln2/halfLife * daysSince) */
function computeFreshness(detectedAt: string, decayDays: number): number {
  const daysSince = (Date.now() - new Date(detectedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (decayDays <= 0) return 0;
  const k = 0.693 / decayDays;
  return Math.exp(-k * daysSince);
}

const INTENT_WEIGHTS: Record<string, number> = {
  hiring_intent: 30,
  tech_adoption: 20,
  growth_signal: 25,
  budget_cycle: 15,
  leadership_change: 5,
  product_launch: 5,
};

function computeIntentScore(signals: Array<{ signal_type: string; confidence: number; detected_at: string; decay_days: number }>): number {
  if (signals.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [signalType, weight] of Object.entries(INTENT_WEIGHTS)) {
    const best = signals
      .filter(s => s.signal_type === signalType)
      .reduce((max, s) => {
        const freshness = computeFreshness(s.detected_at, s.decay_days);
        return Math.max(max, s.confidence * freshness);
      }, 0);

    weightedSum += best * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
}

// Map GraphQL enum to DB value
function mapSignalTypeToDb(gqlType: string | undefined | null): string | undefined {
  if (!gqlType) return undefined;
  return gqlType.toLowerCase();
}

// ── Resolvers ──────────────────────────────────────────────────

export const intentSignalResolvers = {
  Query: {
    async intentSignals(
      _parent: unknown,
      args: { companyId: number; signalType?: string; limit?: number; offset?: number },
      _context: GraphQLContext,
    ) {
      const conditions = [eq(intentSignals.company_id, args.companyId)];
      const dbSignalType = mapSignalTypeToDb(args.signalType);
      if (dbSignalType) {
        conditions.push(eq(intentSignals.signal_type, dbSignalType as IntentSignal["signal_type"]));
      }

      const [signals, countResult] = await Promise.all([
        db
          .select()
          .from(intentSignals)
          .where(and(...conditions))
          .orderBy(desc(intentSignals.detected_at))
          .limit(args.limit ?? 50)
          .offset(args.offset ?? 0),
        db
          .select({ count: count() })
          .from(intentSignals)
          .where(and(...conditions)),
      ]);

      return {
        signals,
        totalCount: countResult[0]?.count ?? 0,
      };
    },

    async companiesByIntent(
      _parent: unknown,
      args: { threshold: number; signalType?: string; limit?: number; offset?: number },
      _context: GraphQLContext,
    ) {
      const rows = await db
        .select()
        .from(companies)
        .where(gte(companies.intent_score, args.threshold))
        .orderBy(desc(companies.intent_score))
        .limit((args.limit ?? 20) + 1)
        .offset(args.offset ?? 0);

      const hasMore = rows.length > (args.limit ?? 20);
      if (hasMore) rows.pop();

      return { companies: rows, totalCount: rows.length };
    },

    async intentDashboard(_parent: unknown, _args: unknown, _context: GraphQLContext) {
      const [totalResult, companiesResult, byTypeResult, recentSignals] = await Promise.all([
        db.select({ count: count() }).from(intentSignals),
        db.select({ count: count() }).from(companies).where(gte(companies.intent_score, 10)),
        db
          .select({
            signal_type: intentSignals.signal_type,
            count: count(),
          })
          .from(intentSignals)
          .groupBy(intentSignals.signal_type),
        db
          .select()
          .from(intentSignals)
          .orderBy(desc(intentSignals.created_at))
          .limit(10),
      ]);

      const topCompanies = await db
        .select()
        .from(companies)
        .where(gte(companies.intent_score, 10))
        .orderBy(desc(companies.intent_score))
        .limit(10);

      return {
        totalSignals: totalResult[0]?.count ?? 0,
        companiesWithIntent: companiesResult[0]?.count ?? 0,
        topIntentCompanies: topCompanies,
        signalsByType: byTypeResult.map(r => ({
          signalType: r.signal_type.toUpperCase(),
          count: r.count,
        })),
        recentSignals,
      };
    },
  },

  Mutation: {
    async detectIntentSignals(
      _parent: unknown,
      args: { companyId: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      // For now, return a stub — actual detection happens via the CLI/script
      return {
        success: true,
        message: "Use `make intent-detect` or the Rust CLI for batch detection",
        signalsDetected: 0,
        intentScore: null,
      };
    },

    async batchDetectIntent(
      _parent: unknown,
      args: { companyIds: number[] },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      return {
        success: true,
        processed: args.companyIds.length,
        signalsDetected: 0,
        errors: ["Use `make intent-detect` or the Rust CLI for batch detection"],
      };
    },

    async refreshIntentScores(_parent: unknown, _args: unknown, context: GraphQLContext) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      // Refresh all company intent scores based on current signals with decay
      const allCompaniesWithSignals = await db
        .select({ company_id: intentSignals.company_id })
        .from(intentSignals)
        .groupBy(intentSignals.company_id);

      let updated = 0;
      for (const { company_id } of allCompaniesWithSignals) {
        const signals = await db
          .select()
          .from(intentSignals)
          .where(eq(intentSignals.company_id, company_id));

        const score = computeIntentScore(signals);
        const topSignal = signals.reduce<(IntentSignal & { eff: number }) | null>((best, s) => {
          const eff = s.confidence * computeFreshness(s.detected_at, s.decay_days);
          return eff > (best?.eff ?? 0) ? { ...s, eff } : best;
        }, null);

        await db
          .update(companies)
          .set({
            intent_score: score,
            intent_score_updated_at: new Date().toISOString(),
            intent_signals_count: signals.length,
            intent_top_signal: topSignal ? JSON.stringify({
              signal_type: topSignal.signal_type,
              confidence: topSignal.confidence,
              freshness: computeFreshness(topSignal.detected_at, topSignal.decay_days),
            }) : null,
          })
          .where(eq(companies.id, company_id));

        updated++;
      }

      return { success: true, companiesUpdated: updated };
    },
  },

  IntentSignal: {
    companyId: (parent: IntentSignal) => parent.company_id,
    signalType: (parent: IntentSignal) => parent.signal_type?.toUpperCase(),
    sourceType: (parent: IntentSignal) => parent.source_type,
    sourceUrl: (parent: IntentSignal) => parent.source_url,
    rawText: (parent: IntentSignal) => parent.raw_text,
    evidence: (parent: IntentSignal) => safeJsonParse(parent.evidence, []),
    detectedAt: (parent: IntentSignal) => parent.detected_at,
    decaysAt: (parent: IntentSignal) => parent.decays_at,
    decayDays: (parent: IntentSignal) => parent.decay_days,
    freshness: (parent: IntentSignal) => computeFreshness(parent.detected_at, parent.decay_days),
    modelVersion: (parent: IntentSignal) => parent.model_version,
    createdAt: (parent: IntentSignal) => parent.created_at,
  },

  Company: {
    intentScore: (parent: Company) => parent.intent_score ?? 0,
    intentScoreUpdatedAt: (parent: Company) => parent.intent_score_updated_at,
    intentSignalsCount: (parent: Company) => parent.intent_signals_count ?? 0,
    async intentScoreDetails(parent: Company) {
      const signals = await db
        .select()
        .from(intentSignals)
        .where(eq(intentSignals.company_id, parent.id));

      if (signals.length === 0) return null;

      const categoryScores: Record<string, number> = {};
      for (const [signalType] of Object.entries(INTENT_WEIGHTS)) {
        categoryScores[signalType] = signals
          .filter(s => s.signal_type === signalType)
          .reduce((max, s) => {
            const eff = s.confidence * computeFreshness(s.detected_at, s.decay_days);
            return Math.max(max, eff);
          }, 0);
      }

      return {
        overall: parent.intent_score ?? 0,
        hiring: categoryScores.hiring_intent ?? 0,
        tech: categoryScores.tech_adoption ?? 0,
        growth: categoryScores.growth_signal ?? 0,
        budget: categoryScores.budget_cycle ?? 0,
        leadership: categoryScores.leadership_change ?? 0,
        product: categoryScores.product_launch ?? 0,
        signalCount: signals.length,
        updatedAt: parent.intent_score_updated_at,
      };
    },
  },
};
