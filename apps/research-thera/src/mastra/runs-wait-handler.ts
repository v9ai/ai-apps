import type { AnyWorkflow } from "@mastra/core/workflows";

type WorkflowRecord = Record<string, AnyWorkflow>;

type RequestBody = {
  assistant_id?: string;
  input?: Record<string, unknown>;
};

type HonoCtx = {
  req: { json: () => Promise<unknown> };
  json: (body: unknown, status?: number) => Response;
  executionCtx?: { waitUntil: (promise: Promise<unknown>) => void };
};

const ASYNC_WORKFLOWS = new Set<string>(["research"]);

export function makeRunsWaitHandler(workflows: WorkflowRecord) {
  return async (c: HonoCtx) => {
    const body = (await c.req.json()) as RequestBody;
    const assistantId = body.assistant_id;
    if (!assistantId) {
      return c.json({ error: "assistant_id required" }, 400);
    }

    if (!(assistantId in workflows)) {
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
      return new Response(resp.body, { status: resp.status, headers: resp.headers });
    }

    const workflow = workflows[assistantId];

    if (ASYNC_WORKFLOWS.has(assistantId) && c.executionCtx?.waitUntil) {
      const input = (body.input ?? {}) as never;
      const promise = (async () => {
        try {
          const run = await workflow.createRun();
          await run.start({ inputData: input });
        } catch (err) {
          console.error(`[runs/wait] async workflow "${assistantId}" failed:`, err);
        }
      })();
      c.executionCtx.waitUntil(promise);
      return c.json({ accepted: true, assistant_id: assistantId }, 202);
    }

    const run = await workflow.createRun();
    const result = await run.start({ inputData: (body.input ?? {}) as never });

    if (result.status === "success") {
      return c.json(result.result);
    }
    return c.json(
      { error: `workflow ${assistantId} finished with status ${result.status}`, details: result },
      500,
    );
  };
}
