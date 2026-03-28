/**
 * ML-native types for pipeline results evaluation.
 *
 * No LLM wrappers — pure numerical scoring, online learning,
 * drift detection, conformal prediction, feature importance.
 */

// ---------------------------------------------------------------------------
// Feature vector
// ---------------------------------------------------------------------------

/** Raw feature vector extracted from a pipeline entity (company/contact/email). */
export interface FeatureVector {
  id: number;
  stage: Stage;
  /** Dense numerical features — order matches FEATURE_NAMES[stage]. */
  values: Float64Array;
}

export type Stage = "discovery" | "enrichment" | "contacts" | "outreach";

/** Feature name registry per stage. */
export const FEATURE_NAMES: Record<Stage, readonly string[]> = {
  discovery: [
    "has_website",       // 0/1
    "has_description",   // 0/1
    "description_len",   // normalized 0..1
    "has_logo",          // 0/1
    "days_since_update", // normalized 0..1 (0=fresh, 1=stale)
    "has_linkedin",      // 0/1
    "has_job_board",     // 0/1
    "has_email",         // 0/1
  ],
  enrichment: [
    "category_known",            // 0/1 (not UNKNOWN)
    "ai_tier",                   // 0/1/2 → normalized 0..1
    "ai_confidence",             // 0..1 raw
    "has_services",              // 0/1
    "service_count",             // normalized 0..1
    "has_tags",                  // 0/1
    "has_industries",            // 0/1
    "has_deep_analysis",         // 0/1
    "has_ashby_enrichment",      // 0/1
    "ashby_tech_signal_count",   // normalized 0..1
  ],
  contacts: [
    "has_email",              // 0/1
    "email_verified",         // 0/1
    "has_position",           // 0/1
    "has_linkedin",           // 0/1
    "has_company_link",       // 0/1 (company_id set)
    "nb_status_valid",        // 0/1 (nb_status == 'valid')
    "is_bounced",             // 0/1
    "do_not_contact",         // 0/1
    "days_since_update",      // normalized 0..1
  ],
  outreach: [
    "was_delivered",        // 0/1
    "was_opened",           // 0/1
    "got_reply",            // 0/1
    "is_error",             // 0/1
    "sequence_depth",       // normalized 0..1 (0/1/2/3 → 0..1)
    "has_followup",         // 0/1
    "days_since_sent",      // normalized 0..1
    "subject_length",       // normalized 0..1
    "body_length",          // normalized 0..1
  ],
} as const;

// ---------------------------------------------------------------------------
// Online statistics (EMA + Welford variance)
// ---------------------------------------------------------------------------

/** Per-feature running statistics for online scoring. */
export interface FeatureStats {
  mean: number;
  variance: number;
  min: number;
  max: number;
  count: number;
}

/** Exponential moving average state for a single metric. */
export interface EMAState {
  value: number;
  alpha: number; // smoothing factor (0..1), default 0.1
  count: number;
}

// ---------------------------------------------------------------------------
// Scorer output
// ---------------------------------------------------------------------------

export interface ScoredEntity {
  id: number;
  stage: Stage;
  /** Raw composite score 0..1. */
  score: number;
  /** Calibrated score after isotonic/Platt mapping. */
  calibratedScore: number;
  /** Conformal prediction interval [lower, upper] at 95% coverage. */
  conformalInterval: [number, number];
  /** Per-feature z-scores — identifies which features are outliers. */
  zScores: number[];
  /** Per-feature contribution to the composite score (SHAP-lite). */
  contributions: number[];
}

/** Drift signal from ADWIN-style detector. */
export interface DriftSignal {
  feature: string;
  stage: Stage;
  /** Current window mean vs. reference mean. */
  currentMean: number;
  referenceMean: number;
  /** Wasserstein-1 distance between windows. */
  distance: number;
  /** True if distance exceeds adaptive threshold. */
  drifted: boolean;
}

// ---------------------------------------------------------------------------
// Model state (persisted to JSON for online learning continuity)
// ---------------------------------------------------------------------------

export interface ModelState {
  version: number;
  updatedAt: string;
  stages: Record<Stage, StageModelState>;
}

export interface StageModelState {
  featureStats: FeatureStats[];
  ema: EMAState;
  /** Sorted calibration pairs [raw, calibrated] for isotonic regression. */
  calibrationTable: [number, number][];
  /** Conformal residuals (last N absolute errors for quantile computation). */
  conformalResiduals: number[];
  /** Reference distribution means for drift detection. */
  referenceMeans: number[];
  /** Learned feature weights (updated via online gradient). */
  weights: number[];
}

// ---------------------------------------------------------------------------
// Improvement (ML-driven)
// ---------------------------------------------------------------------------

export type ImprovementAction =
  | "RETRAIN_WEIGHTS"    // feature weights drifted — re-fit from recent data
  | "RECALIBRATE"        // calibration curve stale — re-fit isotonic
  | "OUTLIER_REVIEW"     // entities with z-score > 2.5 on critical features
  | "FILL_FEATURE"       // missing feature drags score — fill it
  | "DRIFT_ALERT"        // distribution shift detected — investigate
  | "EXPAND_TRAINING"    // conformal intervals too wide — more data needed
  | "RECLASSIFY";        // AI classifier confidence below threshold — re-run

export interface Improvement {
  action: ImprovementAction;
  stage: Stage;
  priority: number; // 0..1 continuous (not categorical)
  description: string;
  /** Feature(s) driving this improvement. */
  features: string[];
  /** Expected score lift if applied. */
  expectedLift: number;
  /** IDs of entities to act on. */
  targetIds: number[];
}

// ---------------------------------------------------------------------------
// Pipeline check result
// ---------------------------------------------------------------------------

export interface PipelineCheckResult {
  timestamp: string;
  modelVersion: number;
  stages: StageReport[];
  driftSignals: DriftSignal[];
  improvements: Improvement[];
}

export interface StageReport {
  stage: Stage;
  entityCount: number;
  meanScore: number;
  medianScore: number;
  p10Score: number; // 10th percentile
  p90Score: number; // 90th percentile
  meanCalibratedScore: number;
  avgConformalWidth: number;
  driftedFeatures: string[];
  topContributors: { feature: string; avgContribution: number }[];
}
