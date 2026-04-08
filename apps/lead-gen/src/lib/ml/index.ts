/**
 * ML module index — pure TypeScript machine learning primitives for
 * B2B lead generation scoring, optimization, and monitoring.
 *
 * Zero external dependencies. All math is implemented with Math.* operations.
 */

// Hawkes process lead temperature
export {
  computeLeadTemperature,
  estimateHawkesParams,
  type EngagementEvent,
  type EngagementEventType,
  type HawkesParams,
  type LeadTemperature,
  type TemperatureTrend,
} from "./lead-temperature";

// Beta-Binomial Thompson Sampling send-time optimization
export {
  createDefaultStats,
  thompsonSampleBestSlot,
  updateStats,
  type SendTimeRecommendation,
  type SendTimeStats,
} from "./send-time-optimizer";

// Gradient-boosted stump engagement prediction
export {
  predictEngagement,
  trainEngagementModel,
  FEATURE_NAMES as ENGAGEMENT_FEATURE_NAMES,
  type DecisionStump,
  type EngagementModel,
  type EngagementPrediction,
  type TrainingSample,
} from "./engagement-predictor";

// Kaplan-Meier survival + optimal stopping cadence
export {
  fitKaplanMeier,
  computeOptimalCadence,
  type CadenceRecommendation,
  type SurvivalCurve,
  type SurvivalObservation,
} from "./outreach-cadence";

// DFT seasonal cycle detection
export {
  extractSeasonalPatterns,
  forecastSeasonal,
  type SeasonalForecast,
  type SeasonalSignal,
  type WeeklyEngagement,
} from "./seasonal-patterns";

// Logistic regression bounce prediction
export {
  predictBounce,
  createDefaultBounceWeights,
  BOUNCE_FEATURE_NAMES,
  type BouncePrediction,
  type BouncePredictorWeights,
  type BounceRisk,
} from "./bounce-predictor";

// Welford's online anomaly detection
export {
  createDetector,
  updateDetector,
  anomalyScore,
  isAnomalous,
  getVariances,
  type AnomalyDetector,
} from "./anomaly-detector";

// 42-feature lead ranking feature extraction
export {
  extractCompanyFeatures,
  vectorToArray,
  parseJsonArray,
  clamp01,
  logScale,
  FEATURE_NAMES as LEAD_FEATURE_NAMES,
  type LeadFeatureVector,
} from "./feature-vector";

// XGBoost-distilled lead ranker
export {
  scoreLeads,
  rankCompanies,
  createDefaultRankerWeights,
  type LeadRankerWeights,
  type RankedCompany,
} from "./lead-ranker";

// PSI + KS drift detection
export {
  computePSI,
  computeKS,
  histogram,
  type KSResult,
} from "./drift";
