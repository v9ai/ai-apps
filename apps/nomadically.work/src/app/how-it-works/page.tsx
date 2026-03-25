import type { Metadata } from "next";
import { PipelineClient } from "./pipeline-client";

export const metadata: Metadata = {
  title: "How It Works | Nomadically Work",
  description:
    "Interactive pipeline diagram showing how jobs flow from discovery to your screen — AI classification, skill extraction, and resume matching.",
};

export default function HowItWorksPage() {
  return <PipelineClient />;
}
