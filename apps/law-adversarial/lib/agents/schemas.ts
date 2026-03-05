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

// --- Citation Verifier ---

const citationStatusEnum = z.enum(['valid', 'mischaracterized', 'overruled', 'distinguished', 'fabricated', 'inapposite']);

export const CitationCheckSchema = z.object({
  citation: z.string(),
  status: citationStatusEnum,
  actual_holding: z.string(),
  brief_characterization: z.string(),
  issue: z.string(),
  confidence: z.number().min(0).max(1),
});

export const CitationVerifierOutputSchema = z.object({
  citations: z.array(CitationCheckSchema),
  fabrication_risk: z.number().min(0).max(1),
  summary: z.string(),
});

// --- Jurisdiction Expert ---

const jurisdictionIssueCategoryEnum = z.enum(['precedent_hierarchy', 'procedural_rule', 'local_rule', 'standard_of_review', 'burden_allocation', 'statutory_interpretation']);

export const JurisdictionIssueSchema = z.object({
  category: jurisdictionIssueCategoryEnum,
  description: z.string(),
  controlling_authority: z.string(),
  brief_treatment: z.string(),
  recommendation: z.string(),
  severity: severityEnum,
  confidence: z.number().min(0).max(1),
});

export const JurisdictionExpertOutputSchema = z.object({
  jurisdiction_analysis: z.string(),
  issues: z.array(JurisdictionIssueSchema),
  binding_authority_gaps: z.array(z.string()),
  procedural_compliance: z.array(z.object({
    rule: z.string(),
    status: z.enum(['compliant', 'non_compliant', 'unclear']),
    note: z.string(),
  })),
  overall_jurisdiction_fitness: z.number().min(0).max(100),
});

// --- Brief Rewriter ---

const changeTypeEnum = z.enum(['rewrite', 'addition', 'deletion', 'citation_fix', 'structural']);

export const BriefChangeSchema = z.object({
  original_text: z.string(),
  revised_text: z.string(),
  change_type: changeTypeEnum,
  reason: z.string(),
  finding_ref: z.string(),
});

export const BriefRewriterOutputSchema = z.object({
  revised_brief: z.string(),
  changes: z.array(BriefChangeSchema),
  improvement_score: z.number().min(0).max(100),
  change_summary: z.string(),
});
