import type { Metadata } from "next";
import { HowItWorksClient } from "./how-it-works-client";

export const metadata: Metadata = {
  title: "How It Works | Agentic Healthcare",
  description:
    "8 peer-reviewed papers, 6 pipeline stages, and 7 clinical ratios — the science behind health trajectory tracking.",
};

export default function HowItWorksPage() {
  return <HowItWorksClient />;
}
