import { z } from "zod";
import { ClassificationConfidence } from "@/schema/contracts/enums";

/**
 * Schema for Remote EU job classification results.
 *
 * Defines the structure of classification outputs including
 * boolean decision, confidence level, and reasoning.
 *
 * Uses ClassificationConfidence from the unified schema contracts
 * to keep confidence levels in sync across all workers.
 */
export const remoteEUClassificationSchema = z.object({
  isRemoteEU: z.boolean().describe("Whether the job is a Remote EU position"),
  confidence: ClassificationConfidence.describe("Confidence level of the classification"),
  reason: z.string().describe("Explanation for the classification decision"),
});

/**
 * Type representing a Remote EU classification result.
 */
export type RemoteEUClassification = z.infer<
  typeof remoteEUClassificationSchema
>;

/**
 * Input structure for scoring Remote EU classifications.
 */
export type RemoteEUScoreInput = {
  jobPosting: {
    title: string;
    location: string;
    description: string;
    country?: string;
    workplace_type?: string;
    is_remote?: boolean;
  };
  expectedClassification: RemoteEUClassification;
  actualClassification: RemoteEUClassification;
};

/**
 * Result structure from scoring a Remote EU classification.
 */
export type RemoteEUScoreResult = {
  score: number;
  metadata: {
    expected: RemoteEUClassification;
    actual: RemoteEUClassification;
    isCorrect: boolean;
    confidenceMatch: boolean;
    details: {
      jobTitle: string;
      location: string;
      expectedReason: string;
      actualReason: string;
    };
  };
};

/**
 * Result structure from confidence calibration scoring.
 *
 * ECE (Expected Calibration Error) measures how well the model's
 * confidence levels align with its actual accuracy per tier.
 * Lower ECE = better calibrated.
 */
export type ConfidenceCalibrationResult = {
  /** Expected Calibration Error: 0 = perfectly calibrated, 1 = worst */
  ece: number;
  tiers: {
    high: { accuracy: number; count: number };
    medium: { accuracy: number; count: number };
    low: { accuracy: number; count: number };
  };
};

/**
 * Test case structure for Remote EU classification evaluation.
 */
export type RemoteEUTestCase = {
  id: string;
  description: string;
  jobPosting: {
    title: string;
    location: string;
    description: string;
    /** ISO 3166 country code from ATS enrichment (e.g. "DE", "US") */
    country?: string;
    /** ATS workplace type (e.g. "remote", "hybrid", "on-site") */
    workplace_type?: string;
    /** ATS remote flag (from any ATS provider) */
    is_remote?: boolean;
  };
  expectedClassification: RemoteEUClassification;
};
