export type AgentRole = 'attacker' | 'defender' | 'judge';

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
