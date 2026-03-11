import type { Metadata } from "next";
import { HowItWorksClient } from "./how-it-works-client";

export const metadata: Metadata = {
  title: "How It Works | Brief Stress-Tester",
  description:
    "Explore the 6-agent adversarial pipeline, the 8 research papers behind it, and interactive demo case analysis.",
};

export default function HowItWorksPage() {
  return <HowItWorksClient />;
}
