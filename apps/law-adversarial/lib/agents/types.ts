export type AgentRole = 'attacker' | 'defender' | 'judge' | 'citation_verifier' | 'jurisdiction_expert' | 'brief_rewriter';

export type AttackType =
  | 'logical'
  | 'factual'
  | 'legal'
  | 'procedural'
  | 'citation';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface Attack {
  claim: string;
  weakness: string;
  type: AttackType;
  evidence: string;
}

export interface AttackerOutput {
  attacks: Attack[];
}

export interface Rebuttal {
  attack_ref: string;
  defense: string;
  supporting_citations: string[];
  strength: number; // 0-1
}

export interface DefenderOutput {
  rebuttals: Rebuttal[];
}

export interface Finding {
  type: AttackType;
  severity: Severity;
  description: string;
  confidence: number; // 0-1
  suggested_fix: string;
}

export interface JudgeOutput {
  findings: Finding[];
  overall_score: number; // 0-100
}

export interface RoundContext {
  brief: string;
  jurisdiction?: string;
  round: number;
  previousFindings: JudgeOutput[];
}

// --- Citation Verifier ---

export type CitationStatus = 'valid' | 'mischaracterized' | 'overruled' | 'distinguished' | 'fabricated' | 'inapposite';

export interface CitationCheck {
  citation: string;
  status: CitationStatus;
  actual_holding: string;
  brief_characterization: string;
  issue: string;
  confidence: number;
}

export interface CitationVerifierOutput {
  citations: CitationCheck[];
  fabrication_risk: number;
  summary: string;
}

// --- Jurisdiction Expert ---

export type JurisdictionIssueCategory = 'precedent_hierarchy' | 'procedural_rule' | 'local_rule' | 'standard_of_review' | 'burden_allocation' | 'statutory_interpretation';

export interface JurisdictionIssue {
  category: JurisdictionIssueCategory;
  description: string;
  controlling_authority: string;
  brief_treatment: string;
  recommendation: string;
  severity: Severity;
  confidence: number;
}

export interface JurisdictionExpertOutput {
  jurisdiction_analysis: string;
  issues: JurisdictionIssue[];
  binding_authority_gaps: string[];
  procedural_compliance: { rule: string; status: 'compliant' | 'non_compliant' | 'unclear'; note: string }[];
  overall_jurisdiction_fitness: number;
}

// --- Brief Rewriter ---

export type ChangeType = 'rewrite' | 'addition' | 'deletion' | 'citation_fix' | 'structural';

export interface BriefChange {
  original_text: string;
  revised_text: string;
  change_type: ChangeType;
  reason: string;
  finding_ref: string;
}

export interface BriefRewriterOutput {
  revised_brief: string;
  changes: BriefChange[];
  improvement_score: number; // estimated new score 0-100
  change_summary: string;
}
