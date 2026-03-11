import { z } from "zod";

/**
 * Input for a batch email quality test case.
 */
export const emailQualityInputSchema = z.object({
  companyName: z.string().optional(),
  instructions: z.string().optional(),
  recipientCount: z.number().optional(),
});

export type EmailQualityInput = z.infer<typeof emailQualityInputSchema>;

/**
 * Expected attributes that describe what a quality email should contain.
 */
export type EmailQualityAttributes = {
  hasNamePlaceholder: boolean;
  hasGreeting: boolean;
  hasSignoff: boolean;
  wordCountInRange: boolean;
  hasCTA: boolean;
  mentionsCompany: boolean;
  toneKeywords?: string[];
};

/**
 * A single test case for batch email quality evaluation.
 */
export type EmailQualityTestCase = {
  id: string;
  description: string;
  input: EmailQualityInput;
  expectedAttributes: EmailQualityAttributes;
};

/**
 * Per-check breakdown returned by the scorer.
 */
export type EmailQualityCheck = {
  score: number;
  comment: string;
};

/**
 * Composite score result from the email quality scorer.
 */
export type EmailQualityScore = {
  score: number;
  checks: Record<string, EmailQualityCheck>;
};
