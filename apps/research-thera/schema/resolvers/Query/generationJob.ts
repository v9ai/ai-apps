import type { QueryResolvers } from "./../../types.generated";
import { GraphQLError } from "graphql";
import { db } from "@/src/db";
import { getGraphRunStatus, getGraphState, LangGraphHttpError } from "@/src/lib/langgraph-client";

export const generationJob: NonNullable<QueryResolvers['generationJob']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  let job = await db.getGenerationJob(args.id);
  if (!job || job.userId !== userEmail) {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  // Live-sync with LangGraph if this is a background run still in flight.
  if (
    job.status === "RUNNING" &&
    job.langgraphThreadId &&
    job.langgraphRunId
  ) {
    try {
      const { status } = await getGraphRunStatus(job.langgraphThreadId, job.langgraphRunId);
      if (status === "success") {
        let count: number | null = null;
        let message: string | null = null;
        let internalError: string | null = null;
        let stateFetched = false;
        try {
          const state = await getGraphState(job.langgraphThreadId);
          stateFetched = true;
          const books = Array.isArray(state.books) ? state.books : [];
          count = books.length;
          message = typeof state.message === "string" ? state.message : null;
          // Some graphs signal internal failure via state fields even though
          // the LangGraph run itself exited cleanly. Prefer state.error, then
          // fall back to state.message when state.success === false.
          if (typeof state.error === "string" && state.error.length > 0) {
            internalError = state.error;
          } else if (state.success === false) {
            internalError =
              (typeof state.message === "string" && state.message.length > 0
                ? state.message
                : null) ?? "Graph reported success: false";
          }
        } catch (err) {
          console.warn("[generationJob] getGraphState failed:", err);
        }
        if (stateFetched && internalError) {
          await db.updateGenerationJob(args.id, {
            status: "FAILED",
            error: JSON.stringify({ message: internalError }),
          });
        } else {
          await db.updateGenerationJob(args.id, {
            status: "SUCCEEDED",
            progress: 100,
            result: JSON.stringify({ count, message }),
          });
        }
        job = await db.getGenerationJob(args.id);
      } else if (status === "error" || status === "interrupted" || status === "timeout") {
        let errMessage = `LangGraph run ${status}`;
        try {
          const state = await getGraphState(job.langgraphThreadId);
          if (typeof state.error === "string") errMessage = state.error;
          else if (typeof state.message === "string") errMessage = state.message;
        } catch {
          /* noop */
        }
        await db.updateGenerationJob(args.id, {
          status: "FAILED",
          error: JSON.stringify({ message: errMessage }),
        });
        job = await db.getGenerationJob(args.id);
      }
      // else: still pending/running — return current row.
    } catch (err) {
      if (err instanceof LangGraphHttpError && err.status === 404) {
        // The backend container restarted and forgot this run. Without this
        // branch the job would sit in RUNNING until cleanupStaleJobs fires
        // on the next generation-job creation (could be hours).
        console.warn("[generationJob] LangGraph run lost (404) — marking FAILED:", args.id);
        await db.updateGenerationJob(args.id, {
          status: "FAILED",
          error: JSON.stringify({
            message: "LangGraph run state was lost (backend restarted)",
            code: "RUN_LOST",
          }),
        });
        job = await db.getGenerationJob(args.id);
      } else {
        // Network hiccup / 5xx — don't flip the job; just return the current row.
        console.warn("[generationJob] LangGraph sync skipped:", err);
      }
    }
  }

  if (!job) {
    throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } });
  }

  return {
    id: job.id,
    userId: job.userId,
    type: job.type as any,
    goalId: job.goalId,
    storyId: job.storyId,
    status: job.status as any,
    progress: job.progress,
    result: job.result,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
};
