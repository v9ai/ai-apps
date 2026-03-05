import { z } from "zod";

const attackTypeEnum = z.enum(["logical", "factual", "legal", "procedural", "citation"]);
const severityEnum = z.enum(["low", "medium", "high", "critical"]);

export const AttackSchema = z.object({
  claim: z.string(),
  weakness: z.string(),
  type: attackTypeEnum,
  evidence: z.string(),
});

export const AttackerOutputSchema = z.object({
  attacks: z.array(AttackSchema),
});

export const RebuttalSchema = z.object({
  attack_ref: z.string(),
  defense: z.string(),
  supporting_citations: z.array(z.string()),
  strength: z.number().min(0).max(1),
});

export const DefenderOutputSchema = z.object({
  rebuttals: z.array(RebuttalSchema),
});

export const FindingSchema = z.object({
  type: attackTypeEnum,
  severity: severityEnum,
  description: z.string(),
  confidence: z.number().min(0).max(1),
  suggested_fix: z.string(),
});

export const JudgeOutputSchema = z.object({
  findings: z.array(FindingSchema),
  overall_score: z.number().min(0).max(100),
});
