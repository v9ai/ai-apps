"use client";

import { HowItWorks } from "@ai-apps/ui/how-it-works";
import { papers, researchStats, pipelineAgents, story, extraSections, technicalDetails } from "./data";

export function HowItWorksClient() {
  return (
    <HowItWorks
      papers={papers}
      title="How It Works"
      subtitle={"An autonomous B2B lead generation pipeline built with Next.js, Rust, and local AI embeddings"}
      stats={researchStats}
      agents={pipelineAgents}
      story={story}
      extraSections={extraSections}
      technicalDetails={technicalDetails}
    />
  );
}
