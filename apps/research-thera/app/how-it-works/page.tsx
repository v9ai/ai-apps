import type { Metadata } from "next";
import { HowItWorksClient } from "./how-it-works-client";

export const metadata: Metadata = {
  title: "How It Works | Research Thera",
  description: "A therapeutic platform for families — connecting goals, journals, issues, and habits with peer-reviewed research via AI agents and a GraphQL API",
};

export default function HowItWorksPage() {
  return <HowItWorksClient />;
}
