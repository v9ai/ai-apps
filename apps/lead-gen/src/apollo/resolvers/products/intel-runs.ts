/**
 * Resolvers + kickoff helper for the async LangGraph run pattern.
 *
 * Mutations return an IntelRunAccepted in <2s; the graph runs on the CF
 * Container for 1–3 min and closes the loop via /api/webhooks/langgraph.
 *
 * Query productIntelRun(id) supports a lightweight reconcile path: if the
 * webhook was lost but LangGraph already reports `error`, we flip the row
 * here so polling UIs don't hang waiting for the sweeper cron.
 */

import { GraphQLError } from "graphql";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { productIntelRuns } from "@/db/schema";
import type { GraphQLContext } from "../../context";
import { isAdminEmail } from "@/lib/admin";
import { getRunStatus, startGraphRun } from "@/lib/langgraph-client";
import type {
  MutationAnalyzeProductPricingAsyncArgs,
  MutationAnalyzeProductGtmAsyncArgs,
  MutationRunFullProductIntelAsyncArgs,
  QueryProductIntelRunArgs,
  QueryProductIntelRunsArgs,
} from "@/__generated__/resolvers-types";
import type { ProductIntelRun as DbIntelRun } from "@/db/schema";

function requireAdmin(context: GraphQLContext): void {
  if (!context.userId) {
    throw new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
  if (!isAdminEmail(context.userEmail)) {
    throw new GraphQLError("Admin access required", {
      extensions: { code: "FORBIDDEN" },
    });
  }
}

type IntelKind = "pricing" | "gtm" | "product_intel" | "icp";

async function kickoff(
  kind: IntelKind,
  assistantId: string,
  extraInput: Record<string, unknown>,
  productId: number,
  context: GraphQLContext,
) {
  requireAdmin(context);

  const { appRunId, lgRunId, threadId, webhookSecret } = await startGraphRun(
    assistantId,
    { product_id: productId, ...extraInput },
  );

  await db.insert(productIntelRuns).values({
    id: appRunId,
    lg_run_id: lgRunId,
    lg_thread_id: threadId,
    product_id: productId,
    kind,
    status: "running",
    webhook_secret: webhookSecret,
    created_by: context.userEmail ?? null,
  });

  return {
    runId: appRunId,
    productId,
    kind,
    status: "running" as const,
  };
}

export const intelRunMutations = {
  async analyzeProductPricingAsync(
    _p: unknown,
    args: MutationAnalyzeProductPricingAsyncArgs,
    context: GraphQLContext,
  ) {
    return kickoff("pricing", "pricing", {}, args.id, context);
  },

  async analyzeProductGTMAsync(
    _p: unknown,
    args: MutationAnalyzeProductGtmAsyncArgs,
    context: GraphQLContext,
  ) {
    return kickoff("gtm", "gtm", {}, args.id, context);
  },

  async runFullProductIntelAsync(
    _p: unknown,
    args: MutationRunFullProductIntelAsyncArgs,
    context: GraphQLContext,
  ) {
    return kickoff(
      "product_intel",
      "product_intel",
      { force_refresh: Boolean(args.forceRefresh) },
      args.id,
      context,
    );
  },
};

export const intelRunQueries = {
  async productIntelRun(
    _p: unknown,
    args: QueryProductIntelRunArgs,
    _ctx: GraphQLContext,
  ) {
    const [run] = await db
      .select()
      .from(productIntelRuns)
      .where(eq(productIntelRuns.id, args.id))
      .limit(1);
    if (!run) return null;

    // Cheap reconciliation: if still running, ask LangGraph directly. We only
    // flip to error — success still relies on the webhook (source of truth for
    // the output payload).
    if (
      run.status === "running" &&
      run.lg_thread_id &&
      run.lg_run_id
    ) {
      const remote = await getRunStatus(run.lg_thread_id, run.lg_run_id);
      if (remote.status === "error" || remote.status === "interrupted") {
        await db
          .update(productIntelRuns)
          .set({
            status: "error",
            error: `lg:${remote.status}`,
            finished_at: new Date(),
          })
          .where(eq(productIntelRuns.id, run.id));
        run.status = "error";
        run.error = `lg:${remote.status}`;
        run.finished_at = new Date();
      }
    }

    return run;
  },

  async productIntelRuns(
    _p: unknown,
    args: QueryProductIntelRunsArgs,
    _ctx: GraphQLContext,
  ) {
    const filters = [eq(productIntelRuns.product_id, args.productId)];
    if (args.kind) {
      filters.push(eq(productIntelRuns.kind, args.kind as IntelKind));
    }
    return db
      .select()
      .from(productIntelRuns)
      .where(and(...filters))
      .orderBy(desc(productIntelRuns.started_at))
      .limit(50);
  },
};

// GraphQL field camelCase ← Drizzle column snake_case
export const IntelRunField = {
  productId: (r: DbIntelRun) => r.product_id,
  startedAt: (r: DbIntelRun) => r.started_at.toISOString(),
  finishedAt: (r: DbIntelRun) =>
    r.finished_at ? r.finished_at.toISOString() : null,
};
