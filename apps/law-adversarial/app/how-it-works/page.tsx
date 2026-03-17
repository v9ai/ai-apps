import type { Metadata } from "next";
import { HowItWorksClient } from "./how-it-works-client";

export const metadata: Metadata = {
  title: "How It Works | Law Adversarial",
  description: "A Next.js 15 and Supabase-powered adversarial AI pipeline that stress-tests legal briefs using DeepSeek and DashScope LLMs",
};

export default function HowItWorksPage() {
  return <HowItWorksClient />;
}
