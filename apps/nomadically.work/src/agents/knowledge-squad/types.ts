import { z } from "zod";

// ---------------------------------------------------------------------------
// Source Discovery
// ---------------------------------------------------------------------------

export const discoveredSourceSchema = z.object({
  companyName: z.string(),
  boardUrl: z.string().url(),
  atsPlatform: z.enum(["greenhouse", "lever", "ashby", "workday", "smartrecruiters", "other"]),
  priority: z.number().int().min(1).max(10),
  estimatedJobs: z.number().int(),
  discoveryMethod: z.string(),
  notes: z.string().optional(),
});

export const discoverResultSchema = z.object({
  sources: z.array(discoveredSourceSchema).max(20),
  recommendations: z.array(z.string()),
});

export type DiscoveredSource = z.infer<typeof discoveredSourceSchema>;
export type DiscoverResult = z.infer<typeof discoverResultSchema>;

// ---------------------------------------------------------------------------
// Enrichment
// ---------------------------------------------------------------------------

export const enrichmentResultSchema = z.object({
  salaryMin: z.number().int().nullable(),
  salaryMax: z.number().int().nullable(),
  salaryCurrency: z.enum(["USD", "EUR", "GBP", "CHF", "SEK", "NOK", "DKK", "PLN", "CZK"]).nullable(),
  salarySource: z.enum(["description", "ats_data", "external", "inferred"]),
  salaryConfidence: z.number().min(0).max(1),
  visaSponsorship: z.boolean().nullable(),
  relocationSupport: z.boolean().nullable(),
  cultureSignals: z.array(z.string()),
  remoteQualityScore: z.number().min(0).max(1),
});

export type EnrichmentResult = z.infer<typeof enrichmentResultSchema>;

// ---------------------------------------------------------------------------
// Study Curator
// ---------------------------------------------------------------------------

export const studyResourceSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  type: z.enum(["docs", "tutorial", "practice", "video", "course"]),
  estimatedHours: z.number(),
});

export const skillGapSchema = z.object({
  skill: z.string(),
  currentLevel: z.enum(["none", "beginner", "intermediate", "advanced"]),
  targetLevel: z.enum(["intermediate", "advanced", "expert"]),
  frequencyInJobs: z.number().int(),
  priority: z.number().int().min(1).max(10),
  resources: z.array(studyResourceSchema),
});

export const studyPlanSchema = z.object({
  skillGaps: z.array(skillGapSchema).max(10),
  recommendations: z.array(z.string()),
  generatedAt: z.string(),
});

export type StudyResource = z.infer<typeof studyResourceSchema>;
export type SkillGap = z.infer<typeof skillGapSchema>;
export type StudyPlanResult = z.infer<typeof studyPlanSchema>;

// ---------------------------------------------------------------------------
// Application Strategy
// ---------------------------------------------------------------------------

export const coverLetterAngleSchema = z.object({
  angle: z.string(),
  reasoning: z.string(),
  exampleOpener: z.string(),
});

export const interviewTopicSchema = z.object({
  topic: z.string(),
  importance: z.enum(["high", "medium", "low"]),
  prepNotes: z.string(),
});

export const networkingSuggestionSchema = z.object({
  action: z.string(),
  target: z.string(),
  reasoning: z.string(),
});

export const riskFactorSchema = z.object({
  risk: z.string(),
  mitigation: z.string(),
});

export const applicationStrategySchema = z.object({
  coverLetterAngles: z.array(coverLetterAngleSchema).max(5),
  interviewTopics: z.array(interviewTopicSchema).max(8),
  networkingSuggestions: z.array(networkingSuggestionSchema).max(5),
  keyDifferentiators: z.array(z.string()),
  riskFactors: z.array(riskFactorSchema),
  recommendedApproach: z.string(),
  generatedAt: z.string(),
});

export type ApplicationStrategyResult = z.infer<typeof applicationStrategySchema>;

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

export const feedbackInsightSchema = z.object({
  type: z.enum(["source_quality", "strategy_effectiveness", "skill_gap_shift", "pipeline_health"]),
  targetAgent: z.enum(["discover", "enrich", "study", "strategy"]),
  recommendation: z.string(),
  evidence: z.string(),
  confidence: z.number().min(0).max(1),
});

export const feedbackResultSchema = z.object({
  applicationsAnalyzed: z.number().int(),
  insights: z.array(feedbackInsightSchema),
  summary: z.string(),
});

export type FeedbackInsight = z.infer<typeof feedbackInsightSchema>;
export type FeedbackResult = z.infer<typeof feedbackResultSchema>;
