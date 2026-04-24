import type { Metadata } from "next";
import { ArchitectureClient } from "./architecture-client";

export const metadata: Metadata = {
  title: "System Architecture | How It Works",
  description:
    "Ten layers of the agentic lead-gen stack, each surveyed by its own architect — frontend, GraphQL API, database, auth, discovery, enrichment, contact ML, outreach, LangGraph backend, and the Claude Code agent teams.",
};

export default function ArchitectureHowItWorksPage() {
  return <ArchitectureClient />;
}
