"use client";

import { HowItWorks } from "@ai-apps/ui/how-it-works";
import { papers, researchStats, pipelineAgents, story, extraSections, technicalDetails } from "./data";

export function HowItWorksClient() {
  return (
    <HowItWorks
      papers={papers}
      title="How It Works"
      subtitle="A LangGraph agentic pipeline built on Next.js 15, PostgreSQL with pgvector, and DeepSeek — with 8 eval suites validating every stage from triage to safety guard"
      stats={researchStats}
      agents={pipelineAgents}
      story={story}
      extraSections={extraSections}
      technicalDetails={technicalDetails}
    />
  );
}
