import type { Metadata } from "next";
import { HowItWorksClient } from "./how-it-works-client";

export const metadata: Metadata = {
  title: "How It Works | Knowledge",
  description: "A Next.js 15 learning platform with PostgreSQL, pgvector embeddings, and Cloudflare R2 for AI engineering curriculum delivery",
};

export default function HowItWorksPage() {
  return <HowItWorksClient />;
}
