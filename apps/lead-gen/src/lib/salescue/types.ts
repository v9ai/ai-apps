/**
 * TypeScript interfaces for all 16 SalesCue module outputs.
 * Mirrors the Python return dicts from salescue/modules/*.py
 */

// ── Score ───────────────────────────────────────────────────────────────────

export interface ScoreSignal {
  signal: string;
  category: string;
  strength: number;
  causal_impact: number;
  attended_positions: number[];
  attribution_type: string;
}

export interface ScoreCategories {
  intent: number;
  engagement: number;
  enrichment: number;
  analytics: number;
  outreach: number;
  automation: number;
}

export interface ScoreResult {
  label: "hot" | "warm" | "cold" | "disqualified";
  score: number;
  confidence: number;
  signals: ScoreSignal[];
  categories: ScoreCategories;
  n_signals_detected: number;
}

// ── Intent ──────────────────────────────────────────────────────────────────

export type IntentStage =
  | "unaware"
  | "aware"
  | "researching"
  | "evaluating"
  | "committed"
  | "purchasing";

export interface IntentTrajectory {
  days_to_purchase: number;
  direction:
    | "accelerating"
    | "cruising"
    | "decelerating"
    | "stalled"
    | "stable"
    | "insufficient_data";
  velocity: number;
  acceleration: number;
  current_intensity: number;
}

export interface IntentResult {
  stage: IntentStage;
  confidence: number;
  distribution: Record<IntentStage, number>;
  trajectory: IntentTrajectory | null;
  data_points: number;
}

// ── Reply ───────────────────────────────────────────────────────────────────

export type ReplyLabel =
  | "genuinely_interested"
  | "politely_acknowledging"
  | "objection"
  | "not_now"
  | "unsubscribe"
  | "out_of_office"
  | "bounce"
  | "meeting_request"
  | "referral"
  | "negative_sentiment";

export interface ReplyEvidence {
  label: string;
  text: string;
}

export interface ReplyResult {
  active: Record<ReplyLabel, boolean>;
  scores: Record<ReplyLabel, number>;
  evidence: ReplyEvidence[];
  primary: string;
  configuration_score: number;
  alternative_configs: number;
}

// ── Sentiment ───────────────────────────────────────────────────────────────

export type SentimentType =
  | "enthusiastic"
  | "positive_engaged"
  | "neutral_professional"
  | "cautious_interest"
  | "polite_decline"
  | "frustrated_objection"
  | "hostile_rejection";

export type IntentStrength = "strong" | "moderate" | "weak" | "none";

export interface SentimentEvidence {
  signal: string;
  text: string;
}

export interface SentimentResult {
  sentiment: SentimentType;
  intent: IntentStrength;
  confidence: number;
  inverted: boolean;
  interaction_weight: number;
  context_gate: number;
  disentanglement: {
    sentiment_repr_norm: number;
    intent_repr_norm: number;
  };
  evidence: SentimentEvidence[];
  interpretation: string | null;
}

// ── Triggers ────────────────────────────────────────────────────────────────

export type TriggerEvent =
  | "new_funding"
  | "job_change"
  | "expansion"
  | "layoff_restructure"
  | "acquisition_merger"
  | "new_product_launch"
  | "leadership_change"
  | "hiring_surge"
  | "technology_adoption"
  | "active_vendor_evaluation";

export interface TriggerDetection {
  type: TriggerEvent;
  confidence: number;
  freshness: "current" | "recent" | "historical";
  fresh: boolean;
  displacement_days: number;
  displacement_ci: [number, number];
  displacement_uncertainty: number;
  temporal_features: {
    today_signal: number;
    recent_signal: number;
    past_signal: number;
  };
}

export interface TriggersResult {
  events: TriggerDetection[];
  primary: TriggerDetection | null;
}

// ── ICP ─────────────────────────────────────────────────────────────────────

export type ICPDimension =
  | "industry"
  | "size"
  | "tech"
  | "role"
  | "signal"
  | "hf_sophistication";

export interface ICPDimensionFit {
  fit: number | null;
  distance: number;
  icp_spread: number;
  status: "pass" | "dealbreaker" | "no_data";
}

export interface ICPResult {
  score: number;
  qualified: boolean;
  dimensions: Record<ICPDimension, ICPDimensionFit>;
  dealbreakers: string[];
  missing: string[];
}

// ── Spam ────────────────────────────────────────────────────────────────────

export type SpamCategory =
  | "clean"
  | "template_spam"
  | "ai_generated"
  | "low_effort"
  | "role_account"
  | "domain_suspect"
  | "content_violation";

export interface SpamResult {
  spam_score: number;
  spam_category: SpamCategory;
  category_scores: Record<SpamCategory, number>;
  ai_risk: number;
  ai_details: {
    ai_risk: number;
    perplexity_ratio: number;
    style_transfer_score: number;
    watermark_detected: boolean;
    watermark_score: number;
    trajectory_smoothness: number;
    structural_features: Record<string, number | boolean>;
  };
  header_verdict: {
    spf: string;
    dkim: string;
    dmarc: string;
    reply_to_mismatch: boolean;
    header_score: number;
  };
  deliverability: number;
  provider: string;
  provider_scores: Record<string, number>;
  risk_level: string;
  risk_factors: string[];
  token_spam_contributions: Array<{ token: string; score: number }>;
  sentence_scores: number[];
  gate_decision: string;
  gate_confidence: number;
  aspect_scores: Record<string, number>;
  uncertainty: { aleatoric: number; epistemic: number };
}

// ── Objection ───────────────────────────────────────────────────────────────

export type ObjectionCategory =
  | "genuine_objection"
  | "stall"
  | "misunderstanding";

export type ObjectionType =
  | "price_too_high"
  | "no_budget"
  | "not_the_right_time"
  | "need_to_think"
  | "happy_with_current"
  | "no_authority"
  | "too_complex"
  | "dont_see_value"
  | "bad_experience"
  | "need_more_info"
  | "feature_missing"
  | "contract_locked";

export interface CoachingCard {
  framework: string;
  steps: string[];
  avoid: string[];
  example: string;
}

export interface ObjectionResult {
  category: ObjectionCategory;
  category_confidence: number;
  category_distribution: Record<ObjectionCategory, number>;
  objection_type: ObjectionType;
  type_confidence: number;
  severity: number;
  coaching: CoachingCard;
  top_types: Array<{ type: string; score: number }>;
}

// ── Entities ────────────────────────────────────────────────────────────────

export type EntityType =
  | "person"
  | "company"
  | "product"
  | "role"
  | "location"
  | "technology"
  | "email"
  | "phone"
  | "url"
  | "money"
  | "date"
  | "percentage";

export interface ExtractedEntity {
  type: EntityType;
  text: string;
  confidence: number;
  role: string;
  role_scores: Record<string, number>;
  source: "regex" | "neural";
  start_char?: number;
  end_char?: number;
}

export interface EntitiesResult {
  entities: ExtractedEntity[];
  regex_count: number;
  neural_count: number;
  types_found: string[];
}

// ── Subject ─────────────────────────────────────────────────────────────────

export interface SubjectRanking {
  rank: number;
  subject: string;
  score: number;
}

export interface SubjectResult {
  ranking: SubjectRanking[];
  best: string;
  worst: string;
}

// ── Call ─────────────────────────────────────────────────────────────────────

export interface TurningPoint {
  turn: number;
  probability: number;
  direction: "positive" | "negative";
  delta: number;
  uncertainty: number;
  speaker: string;
}

export interface Commitment {
  type: string;
  turn: number;
  speaker: string;
  pattern: string;
  negated: boolean;
}

export interface CallResult {
  deal_health: number;
  turn_scores: number[];
  turn_uncertainties: number[];
  momentum: "accelerating" | "stable" | "decelerating";
  turning_points: TurningPoint[];
  commitments: Commitment[];
  commitment_count: number;
  negated_commitment_count: number;
  action: "follow_up" | "send_proposal" | "escalate" | "nurture" | "close";
  model_confidence: number;
}

// ── Survival ────────────────────────────────────────────────────────────────

export type RiskGroup =
  | "fast_mover"
  | "steady"
  | "long_cycle"
  | "stalled"
  | "disqualified";

export interface SurvivalResult {
  median_days_to_conversion: number;
  p_convert_30d: number;
  p_convert_90d: number;
  risk_group: RiskGroup;
  risk_confidence: number;
  survival_curve: Record<string, number>;
  weibull_params: {
    shapes: number[];
    scales: number[];
    weights: number[];
  };
}

// ── Anomaly ─────────────────────────────────────────────────────────────────

export type AnomalyType =
  | "hiring_spike"
  | "model_release_burst"
  | "download_surge"
  | "website_overhaul"
  | "social_activity_spike"
  | "funding_event"
  | "press_coverage_spike"
  | "dev_activity_surge"
  | "multi_signal_anomaly"
  | "normal";

export interface AnomalyResult {
  anomaly_score: number;
  is_anomalous: boolean;
  anomaly_type: AnomalyType;
  type_confidence: number;
  z_score: number;
  cosine_similarity: number;
  channel_attribution: Record<string, number>;
  text_prior_adjustment: number;
  gmm_assignments: Record<string, number>;
}

// ── Bandit ───────────────────────────────────────────────────────────────────

export interface BanditArm {
  template:
    | "cold_intro"
    | "case_study"
    | "social_proof"
    | "direct_ask"
    | "value_prop";
  timing:
    | "monday_9am"
    | "tuesday_10am"
    | "wednesday_2pm"
    | "thursday_11am"
    | "friday_3pm";
  subject_style:
    | "question"
    | "personalized"
    | "stat_hook"
    | "mutual_connection"
    | "direct";
}

export interface BanditResult {
  best_arm: BanditArm;
  expected_reward: number;
  sampled_reward: number;
  exploration_temperature: number;
  alternatives: Array<BanditArm & { sampled_reward: number }>;
  arm_index: number;
  total_arms: number;
}

// ── Email Generation ────────────────────────────────────────────────────────

export interface EmailgenResult {
  email: string;
  word_count: number;
  has_call_to_action: boolean;
  email_type: string;
  prompt_tokens: number;
  context_used: Record<string, string>;
}

// ── Graph ───────────────────────────────────────────────────────────────────

export type GraphLabel =
  | "high_value_cluster"
  | "emerging_cluster"
  | "isolated"
  | "competitive_dense"
  | "complementary";

export interface GraphResult {
  graph_score: number;
  graph_label: GraphLabel;
  label_confidence: number;
  similar_companies: Array<{ name: string; similarity: number }>;
  graph_signals: Array<{ type: string; with: string; strength: number }>;
  node_count?: number;
  edge_count?: number;
  note?: string;
}

// ── Skills ──────────────────────────────────────────────────────────────────

export interface SkillMatch {
  tag: string;
  label: string;
  confidence: number;
}

export interface SkillsResult {
  skills: SkillMatch[];
  skill_count: number;
}

// ── Engine ───────────────────────────────────────────────────────────────────

export type ModuleName =
  | "score"
  | "intent"
  | "reply"
  | "sentiment"
  | "triggers"
  | "icp"
  | "spam"
  | "objection"
  | "entities"
  | "subject"
  | "survival"
  | "bandit"
  | "call"
  | "anomaly"
  | "emailgen"
  | "graph"
  | "skills";

export interface ModuleResponse<T = unknown> {
  result: T;
  module: string;
  time_s: number;
}

export interface AnalyzeResponse {
  results: Partial<Record<ModuleName, unknown>>;
  timings: Partial<Record<ModuleName, number>>;
  errors: Array<{ module: string; error: string }>;
  total_time: number;
  modules_run: number;
}

export interface HealthResponse {
  status: string;
  version: string;
  modules: string[];
  module_count: number;
  device: string;
}
