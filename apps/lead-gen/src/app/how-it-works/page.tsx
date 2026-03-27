import type { Metadata } from "next";
import { PipelineClient } from "./pipeline-client";

export const metadata: Metadata = {
  title: "How It Works | Lead Gen",
  description:
    "Interactive pipeline diagram showing how B2B leads flow from discovery through enrichment, contact verification, and AI-assisted outreach.",
};

export default function HowItWorksPage() {
  return <PipelineClient />;
}
