import type { Metadata } from "next";
import { HowItWorksClient } from "./how-it-works-client";

export const metadata: Metadata = {
  title: "How It Works",
  description: "A therapeutic + clinical-intelligence platform — therapeutic goals, journals, issues, and habits backed by a 7-node research pipeline; plus a LlamaIndex healthcare layer for blood tests, derived clinical ratios, conditions, medications, brain protocols, and a 5-stage chat pipeline. 6 AI agents over a GraphQL API.",
};

export default function HowItWorksPage() {
  return <HowItWorksClient />;
}
