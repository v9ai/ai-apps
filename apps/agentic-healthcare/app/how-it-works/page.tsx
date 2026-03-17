import type { Metadata } from "next";
import { HowItWorksClient } from "./how-it-works-client";

export const metadata: Metadata = {
  title: "How It Works | Agentic Healthcare",
  description: "A Next.js 15 platform that transforms blood test PDFs into AI-driven health insights using Neon pgvector, Qwen embeddings, and Drizzle ORM.",
};

export default function HowItWorksPage() {
  return <HowItWorksClient />;
}
