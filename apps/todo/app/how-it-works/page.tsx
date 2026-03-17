import type { Metadata } from "next";
import { HowItWorksClient } from "./how-it-works-client";

export const metadata: Metadata = {
  title: "How It Works | Todo",
  description: "An AI-powered task manager built with Next.js, PostgreSQL via Drizzle ORM, and Better Auth for secure authentication",
};

export default function HowItWorksPage() {
  return <HowItWorksClient />;
}
