import type { Metadata } from "next";
import { HowItWorksClient } from "./how-it-works-client";

export const metadata: Metadata = {
  title: "How It Works | Research Thera",
  description: "A therapeutic journaling platform that uses Next.js, GraphQL, and AI to connect personal mental health goals with evidence-based research",
};

export default function HowItWorksPage() {
  return <HowItWorksClient />;
}
