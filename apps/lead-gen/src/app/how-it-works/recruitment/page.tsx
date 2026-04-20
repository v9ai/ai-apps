import type { Metadata } from "next";
import { RecruitmentClient } from "./recruitment-client";

export const metadata: Metadata = {
  title: "Recruitment Pipeline | How It Works",
  description:
    "How we discover, score, and contact AI/ML engineers on GitHub using the gh Rust crate.",
};

export default function RecruitmentHowItWorksPage() {
  return <RecruitmentClient />;
}
