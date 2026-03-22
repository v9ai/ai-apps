"use client";

import { HowItWorks } from "@ai-apps/ui/how-it-works";
import { papers, researchStats, pipelineAgents, story, extraSections, technicalDetails } from "./data";

export function HowItWorksClient() {
  return (
    <HowItWorks
      papers={papers}
      title="How It Works"
      subtitle="A Next.js 15 and Supabase-powered adversarial AI pipeline that stress-tests legal briefs using DeepSeek and DashScope LLMs"
      stats={researchStats}
      agents={pipelineAgents}
      story={story}
      extraSections={extraSections}
      technicalDetails={technicalDetails}
    />
  );
}
