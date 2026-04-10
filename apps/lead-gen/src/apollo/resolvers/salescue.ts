/**
 * GraphQL resolvers for SalesCue ML modules.
 * Delegates to the Python FastAPI service via src/lib/salescue/client.ts.
 */

import { salescue } from "@/lib/salescue/client";
import { isAdminEmail } from "@/lib/admin";
import type { GraphQLContext } from "../context";
import type {
  ScoreResult,
  IntentResult,
  ReplyResult,
  SentimentResult,
  TriggersResult,
  TriggerDetection,
  ICPResult,
  SpamResult,
  ObjectionResult,
  EntitiesResult,
  SubjectResult,
} from "@/lib/salescue/types";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Map snake_case Python result to camelCase GraphQL fields */
function mapScoreResult(r: ScoreResult) {
  return {
    label: r.label,
    score: r.score,
    confidence: r.confidence,
    signals: r.signals.map((s) => ({
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

function mapIntentResult(r: IntentResult) {
  return {
    stage: r.stage,
    confidence: r.confidence,
    distribution: r.distribution,
    trajectory: r.trajectory
      ? {
          daysToPurchase: r.trajectory.days_to_purchase,
          direction: r.trajectory.direction,
          velocity: r.trajectory.velocity,
          acceleration: r.trajectory.acceleration,
          currentIntensity: r.trajectory.current_intensity,
        }
      : null,
    dataPoints: r.data_points,
  };
}

function mapReplyResult(r: ReplyResult) {
  return {
    active: r.active,
    scores: r.scores,
    evidence: r.evidence,
    primary: r.primary,
    configurationScore: r.configuration_score,
    alternativeConfigs: r.alternative_configs,
  };
}

function mapSentimentResult(r: SentimentResult) {
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

function mapTriggersResult(r: TriggersResult) {
  const mapEvent = (e: TriggerDetection) => ({
    type: e.type,
    confidence: e.confidence,
    freshness: e.freshness,
    fresh: e.fresh,
    displacementDays: e.displacement_days,
    displacementCi: e.displacement_ci,
    displacementUncertainty: e.displacement_uncertainty,
    temporalFeatures: {
      todaySignal: e.temporal_features.today_signal,
      recentSignal: e.temporal_features.recent_signal,
      pastSignal: e.temporal_features.past_signal,
    },
  });
  return {
    events: r.events.map(mapEvent),
    primary: r.primary ? mapEvent(r.primary) : null,
  };
}

function mapIcpResult(r: ICPResult) {
  return {
    score: r.score,
    qualified: r.qualified,
    dimensions: r.dimensions,
    dealbreakers: r.dealbreakers,
    missing: r.missing,
  };
}

function mapSpamResult(r: SpamResult) {
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

function mapObjectionResult(r: ObjectionResult) {
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

function mapEntitiesResult(r: EntitiesResult) {
  return {
    entities: r.entities.map((e) => ({
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

function mapSubjectResult(r: SubjectResult) {
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
      return mapScoreResult(res.result);
    },

    async salescueIntent(
      _parent: unknown,
      args: { text: string },
      _context: GraphQLContext,
    ) {
      const res = await salescue.intent(args.text);
      return mapIntentResult(res.result);
    },

    async salescueReply(
      _parent: unknown,
      args: { text: string; touchpoint?: number },
      _context: GraphQLContext,
    ) {
      const res = await salescue.reply(args.text, args.touchpoint ?? undefined);
      return mapReplyResult(res.result);
    },

    async salescueSentiment(
      _parent: unknown,
      args: { text: string },
      _context: GraphQLContext,
    ) {
      const res = await salescue.sentiment(args.text);
      return mapSentimentResult(res.result);
    },

    async salescueTriggers(
      _parent: unknown,
      args: { text: string },
      _context: GraphQLContext,
    ) {
      const res = await salescue.triggers(args.text);
      return mapTriggersResult(res.result);
    },

    async salescueIcp(
      _parent: unknown,
      args: { icp: string; prospect: string },
      _context: GraphQLContext,
    ) {
      const res = await salescue.icp(args.icp, args.prospect);
      return mapIcpResult(res.result);
    },

    async salescueSpam(
      _parent: unknown,
      args: { text: string },
      _context: GraphQLContext,
    ) {
      const res = await salescue.spam(args.text);
      return mapSpamResult(res.result);
    },

    async salescueObjection(
      _parent: unknown,
      args: { text: string },
      _context: GraphQLContext,
    ) {
      const res = await salescue.objection(args.text);
      return mapObjectionResult(res.result);
    },

    async salescueEntities(
      _parent: unknown,
      args: { text: string },
      _context: GraphQLContext,
    ) {
      const res = await salescue.entities(args.text);
      return mapEntitiesResult(res.result);
    },

    async salescueSubject(
      _parent: unknown,
      args: { subjects: string[] },
      _context: GraphQLContext,
    ) {
      const res = await salescue.subject(args.subjects);
      return mapSubjectResult(res.result);
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
