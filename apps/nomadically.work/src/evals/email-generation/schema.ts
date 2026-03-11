/**
 * Schema for email generation evaluation.
 */

export interface JobContext {
  title?: string;
  description?: string;
  requiredSkills?: string[];
  location?: string;
}

export interface ApplicationContext {
  appliedAt?: string;
  status?: string;
}

export interface EmailTestCase {
  id: string;
  description: string;
  companyName?: string;
  instructions?: string;
  jobContext?: JobContext;
  applicationContext?: ApplicationContext;
  /** Phrases that MUST appear in the output */
  mustMention?: string[];
  /** Phrases that MUST NOT appear in the output */
  mustNotContain?: string[];
  /** Skills from sender profile that should be highlighted */
  expectedSkillCategory?: ("frontend" | "ai-ml" | "backend" | "systems" | "infra")[];
}

export interface EmailScoreResult {
  relevance: number;
  naturalness: number;
  personalization: number;
  structure: number;
  conciseness: number;
  noHallucination: number;
  composite: number;
}
