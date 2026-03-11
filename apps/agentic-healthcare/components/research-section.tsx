"use client";

import { HowItWorks } from "@repo/ui/how-it-works";
import {
  papers,
  researchStats,
  pipelineAgents,
  story,
} from "@/app/how-it-works/data";

export function ResearchSection() {
  return (
    <HowItWorks
      papers={papers}
      title="How It Works"
      subtitle="8 peer-reviewed papers. 7 clinical ratios. One trajectory pipeline that turns blood test snapshots into a health story."
      stats={researchStats}
      agents={pipelineAgents}
      story={story}
    />
  );
}
