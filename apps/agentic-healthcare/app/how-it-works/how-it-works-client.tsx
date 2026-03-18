"use client";

import { HowItWorks } from "@ai-apps/ui/how-it-works";
import { papers, researchStats, pipelineAgents, story, extraSections, technicalDetails } from "./data";

export function HowItWorksClient() {
  return (
    <HowItWorks
      papers={papers}
      title="How It Works"
      subtitle={"A longitudinal health tracking platform built with Next.js, PostgreSQL with pgvector, and AI-powered RAG using Qwen and BGE embeddings"}
      stats={researchStats}
      agents={pipelineAgents}
      story={story}
      extraSections={extraSections}
      technicalDetails={technicalDetails}
    />
  );
}
