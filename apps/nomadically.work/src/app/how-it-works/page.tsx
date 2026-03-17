import type { Metadata } from "next";
import { HowItWorksClient } from "./how-it-works-client";

export const metadata: Metadata = {
  title: "How It Works | Nomadically Work",
  description: "A Next.js and Cloudflare Workers-powered job platform with AI-driven classification and PostgreSQL/D1 hybrid database",
};

export default function HowItWorksPage() {
  return <HowItWorksClient />;
}
