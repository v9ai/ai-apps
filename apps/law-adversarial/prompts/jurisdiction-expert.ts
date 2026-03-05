import { buildJurisdictionExpertPrompt } from '../lib/agents/prompts';
import type { RoundContext, JudgeOutput } from '../lib/agents/types';

export default function ({ vars }: { vars: Record<string, string> }): string {
  const previousFindings: JudgeOutput[] = vars.previousFindings
    ? JSON.parse(vars.previousFindings)
    : [];

  const ctx: RoundContext = {
    brief: vars.brief,
    jurisdiction: vars.jurisdiction || undefined,
    round: Number(vars.round) || 1,
    previousFindings,
  };

  return buildJurisdictionExpertPrompt(ctx);
}
