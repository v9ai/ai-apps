/**
 * GraphQL resolvers for SalesCue ML modules.
 * Delegates to the Python FastAPI service via src/lib/salescue/client.ts.
 */

import { salescue } from "@/lib/salescue/client";
import { isAdminEmail } from "@/lib/admin";
import type { GraphQLContext } from "../context";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Map snake_case Python result to camelCase GraphQL fields */
function mapScoreResult(r: Record<string, unknown>) {
  return {
    label: r.label,
    score: r.score,
    confidence: r.confidence,
    signals: (r.signals as Array<Record<string, unknown>>).map((s) => ({
      signal: s.signal,
      category: s.category,
      strength: s.strength,
      causalImpact: s.causal_impact,
      attendedPositions: s.attended_positions,
      attributionType: s.attribution_type,
    })),
    categories: r.categories,
    nSignalsDetected: r.n_signals_detected,
  };
}

function mapIntentResult(r: Record<string, unknown>) {
  const traj = r.trajectory as Record<string, unknown> | null;
  return {
    stage: r.stage,
    confidence: r.confidence,
    distribution: r.distribution,
    trajectory: traj
      ? {
          daysToPurchase: traj.days_to_purchase,
          direction: traj.direction,
          velocity: traj.velocity,
          acceleration: traj.acceleration,
          currentIntensity: traj.current_intensity,
        }
      : null,
    dataPoints: r.data_points,
  };
}

function mapReplyResult(r: Record<string, unknown>) {
  return {
    active: r.active,
    scores: r.scores,
    evidence: r.evidence,
    primary: r.primary,
    configurationScore: r.configuration_score,
    alternativeConfigs: r.alternative_configs,
  };
}

function mapSentimentResult(r: Record<string, unknown>) {
  return {
    sentiment: r.sentiment,
    intent: r.intent,
    confidence: r.confidence,
    inverted: r.inverted,
    interactionWeight: r.interaction_weight,
    contextGate: r.context_gate,
    evidence: r.evidence,
    interpretation: r.interpretation,
  };
}

function mapTriggersResult(r: Record<string, unknown>) {
  const mapEvent = (e: Record<string, unknown>) => ({
    type: e.type,
    confidence: e.confidence,
    freshness: e.freshness,
    fresh: e.fresh,
    displacementDays: e.displacement_days,
    displacementCi: e.displacement_ci,
    displacementUncertainty: e.displacement_uncertainty,
    temporalFeatures: {
      todaySignal: (e.temporal_features as Record<string, unknown>).today_signal,
      recentSignal: (e.temporal_features as Record<string, unknown>).recent_signal,
      pastSignal: (e.temporal_features as Record<string, unknown>).past_signal,
    },
  });
  return {
    events: (r.events as Array<Record<string, unknown>>).map(mapEvent),
    primary: r.primary ? mapEvent(r.primary as Record<string, unknown>) : null,
  };
}

function mapIcpResult(r: Record<string, unknown>) {
  return {
    score: r.score,
    qualified: r.qualified,
    dimensions: r.dimensions,
    dealbreakers: r.dealbreakers,
    missing: r.missing,
  };
}

function mapSpamResult(r: Record<string, unknown>) {
  return {
    spamScore: r.spam_score,
    spamCategory: r.spam_category,
    categoryScores: r.category_scores,
    aiRisk: r.ai_risk,
    deliverability: r.deliverability,
    provider: r.provider,
    providerScores: r.provider_scores,
    riskLevel: r.risk_level,
    riskFactors: r.risk_factors,
    gateDecision: r.gate_decision,
    gateConfidence: r.gate_confidence,
    aspectScores: r.aspect_scores,
  };
}

function mapObjectionResult(r: Record<string, unknown>) {
  return {
    category: r.category,
    categoryConfidence: r.category_confidence,
    objectionType: r.objection_type,
    typeConfidence: r.type_confidence,
    severity: r.severity,
    coaching: r.coaching,
    topTypes: r.top_types,
  };
}

function mapEntitiesResult(r: Record<string, unknown>) {
  return {
    entities: (r.entities as Array<Record<string, unknown>>).map((e) => ({
      type: e.type,
      text: e.text,
      confidence: e.confidence,
      role: e.role,
      roleScores: e.role_scores,
      source: e.source,
      startChar: e.start_char,
      endChar: e.end_char,
    })),
    regexCount: r.regex_count,
    neuralCount: r.neural_count,
    typesFound: r.types_found,
  };
}

function mapSubjectResult(r: Record<string, unknown>) {
  return {
    ranking: r.ranking,
    best: r.best,
    worst: r.worst,
  };
}

// ── Resolvers ───────────────────────────────────────────────────────────────

export const salescueResolvers = {
  Query: {
    async salescueHealth() {
      const h = await salescue.health();
      return {
        status: h.status,
        version: h.version,
        modules: h.modules,
        moduleCount: h.module_count,
        device: h.device,
      };
    },

    async salescueScore(
      _parent: unknown,
      args: { text: string },
      _context: GraphQLContext,
    ) {
      const res = await salescue.score(args.text);
      return mapScoreResult(res.result as unknown as Record<string, unknown>);
    },

    async salescueIntent(
      _parent: unknown,
      args: { text: string },
      _context: GraphQLContext,
    ) {
      const res = await salescue.intent(args.text);
      return mapIntentResult(res.result as unknown as Record<string, unknown>);
    },

    async salescueReply(
      _parent: unknown,
      args: { text: string; touchpoint?: number },
      _context: GraphQLContext,
    ) {
      const res = await salescue.reply(args.text, args.touchpoint ?? undefined);
      return mapReplyResult(res.result as unknown as Record<string, unknown>);
    },

    async salescueSentiment(
      _parent: unknown,
      args: { text: string },
      _context: GraphQLContext,
    ) {
      const res = await salescue.sentiment(args.text);
      return mapSentimentResult(res.result as unknown as Record<string, unknown>);
    },

    async salescueTriggers(
      _parent: unknown,
      args: { text: string },
      _context: GraphQLContext,
    ) {
      const res = await salescue.triggers(args.text);
      return mapTriggersResult(res.result as unknown as Record<string, unknown>);
    },

    async salescueIcp(
      _parent: unknown,
      args: { icp: string; prospect: string },
      _context: GraphQLContext,
    ) {
      const res = await salescue.icp(args.icp, args.prospect);
      return mapIcpResult(res.result as unknown as Record<string, unknown>);
    },

    async salescueSpam(
      _parent: unknown,
      args: { text: string },
      _context: GraphQLContext,
    ) {
      const res = await salescue.spam(args.text);
      return mapSpamResult(res.result as unknown as Record<string, unknown>);
    },

    async salescueObjection(
      _parent: unknown,
      args: { text: string },
      _context: GraphQLContext,
    ) {
      const res = await salescue.objection(args.text);
      return mapObjectionResult(res.result as unknown as Record<string, unknown>);
    },

    async salescueEntities(
      _parent: unknown,
      args: { text: string },
      _context: GraphQLContext,
    ) {
      const res = await salescue.entities(args.text);
      return mapEntitiesResult(res.result as unknown as Record<string, unknown>);
    },

    async salescueSubject(
      _parent: unknown,
      args: { subjects: string[] },
      _context: GraphQLContext,
    ) {
      const res = await salescue.subject(args.subjects);
      return mapSubjectResult(res.result as unknown as Record<string, unknown>);
    },
  },

  Mutation: {
    async salescueAnalyze(
      _parent: unknown,
      args: { text: string; modules?: string[] },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      const moduleNames = args.modules?.map((m) => m.toLowerCase()) ?? undefined;
      const res = await salescue.analyze(
        args.text,
        moduleNames as Parameters<typeof salescue.analyze>[1],
      );
      return {
        results: res.results,
        timings: res.timings,
        errors: res.errors,
        totalTime: res.total_time,
        modulesRun: res.modules_run,
      };
    },
  },
};
