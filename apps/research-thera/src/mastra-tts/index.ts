import { Mastra } from "@mastra/core";
import { CloudflareDeployer } from "@mastra/deployer-cloudflare";
import { ttsWorkflow } from "@/src/workflows/tts.workflow";
import { makeRunsWaitHandler } from "@/src/mastra/runs-wait-handler";

const PORTED_WORKFLOWS = {
  tts: ttsWorkflow,
} as const;

export const mastra = new Mastra({
  workflows: PORTED_WORKFLOWS,
  deployer: new CloudflareDeployer({
    name: "research-thera-mastra-tts",
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
