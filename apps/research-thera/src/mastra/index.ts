import { Mastra } from "@mastra/core";
import { CloudflareDeployer } from "@mastra/deployer-cloudflare";
import { habitsWorkflow } from "@/src/workflows/habits.workflow";
import { parentAdviceWorkflow } from "@/src/workflows/parent-advice.workflow";
import { deepAnalysisWorkflow } from "@/src/workflows/deep-analysis.workflow";
import { storyWorkflow } from "@/src/workflows/story.workflow";
import { researchWorkflow } from "@/src/workflows/research.workflow";
import { ttsWorkflow } from "@/src/workflows/tts.workflow";

const PORTED_WORKFLOWS = {
  habits: habitsWorkflow,
  parent_advice: parentAdviceWorkflow,
  deep_analysis: deepAnalysisWorkflow,
  story: storyWorkflow,
  research: researchWorkflow,
  tts: ttsWorkflow,
} as const;

type PortedAssistantId = keyof typeof PORTED_WORKFLOWS;

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
        handler: async (c) => {
          const body = (await c.req.json()) as {
            assistant_id?: string;
            input?: Record<string, unknown>;
          };
          const assistantId = body.assistant_id;
          if (!assistantId) {
            return c.json({ error: "assistant_id required" }, 400);
          }

          if (!(assistantId in PORTED_WORKFLOWS)) {
            const fallback = process.env.LANGGRAPH_FALLBACK_URL;
            if (!fallback) {
              return c.json(
                { error: `workflow "${assistantId}" not ported and no LANGGRAPH_FALLBACK_URL set` },
                404,
              );
            }
            const resp = await fetch(`${fallback}/runs/wait`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            return new Response(resp.body, {
              status: resp.status,
              headers: resp.headers,
            });
          }

          const workflow = PORTED_WORKFLOWS[assistantId as PortedAssistantId];
          const run = await workflow.createRun();
          const result = await run.start({ inputData: (body.input ?? {}) as never });

          if (result.status === "success") {
            return c.json(result.result);
          }
          return c.json(
            { error: `workflow ${assistantId} finished with status ${result.status}`, details: result },
            500,
          );
        },
      },
    ],
  },
});
