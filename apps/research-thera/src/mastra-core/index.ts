import { Mastra } from "@mastra/core";
import { CloudflareDeployer } from "@mastra/deployer-cloudflare";
import { habitsWorkflow } from "@/src/workflows/habits.workflow";
import { parentAdviceWorkflow } from "@/src/workflows/parent-advice.workflow";
import { deepAnalysisWorkflow } from "@/src/workflows/deep-analysis.workflow";
import { storyWorkflow } from "@/src/workflows/story.workflow";
import { researchWorkflow } from "@/src/workflows/research.workflow";
import { makeRunsWaitHandler } from "@/src/mastra/runs-wait-handler";

const PORTED_WORKFLOWS = {
  habits: habitsWorkflow,
  parent_advice: parentAdviceWorkflow,
  deep_analysis: deepAnalysisWorkflow,
  story: storyWorkflow,
  research: researchWorkflow,
} as const;

export const mastra = new Mastra({
  workflows: PORTED_WORKFLOWS,
  deployer: new CloudflareDeployer({
    name: "research-thera-mastra",
    vars: { NODE_ENV: "production" },
  }),
  server: {
    apiRoutes: [
      {
        path: "/runs/wait",
        method: "POST",
        handler: makeRunsWaitHandler(PORTED_WORKFLOWS),
      },
    ],
  },
});
