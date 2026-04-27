/**
 * Resolvers + kickoff helper for the async LangGraph run pattern.
 *
 * Mutations return an IntelRunAccepted in <2s; the graph runs on the CF
 * Container for 1–3 min and closes the loop by POSTing to the gateway's
 * /internal/run-finished endpoint (the Vercel webhook was removed).
 *
 * Query productIntelRun(id) supports a lightweight reconcile path: if the
 * webhook was lost but LangGraph already reports `error`, we flip the row
 * here so polling UIs don't hang waiting for the sweeper cron.
 */

import { GraphQLError } from "graphql";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { productIntelRuns, productIntelRunSecrets } from "@/db/schema";
import type { GraphQLContext } from "../../context";
import { isAdminEmail } from "@/lib/admin";
import { PRODUCT_INTEL_VERSION } from "@/lib/intelVersion";
import {
  getRunStatus,
  productIntelAssistantId,
  startGraphRun,
} from "@/lib/langgraph-client";
import { publishIntelRunUpdate } from "@/lib/gateway-publish";
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
  resumeFromRunId?: string | null,
) {
  requireAdmin(context);

  // Checkpoint-aware retry: if the caller passed a prior run id, look up its
  // LangGraph thread_id and reuse it. AsyncPostgresSaver rehydrates all
  // previously-computed state channels on thread re-entry, so nodes whose
  // outputs are already populated short-circuit and return `{}` immediately —
  // only the node that failed (and everything after it) re-runs.
  let resumeThreadId: string | null = null;
  if (resumeFromRunId) {
    const [prior] = await db
      .select({ threadId: productIntelRuns.lg_thread_id, kind: productIntelRuns.kind })
      .from(productIntelRuns)
      .where(eq(productIntelRuns.id, resumeFromRunId))
      .limit(1);
    if (!prior) {
      throw new GraphQLError(`resumeFromRunId ${resumeFromRunId} not found`, {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }
    if (prior.kind !== kind) {
      throw new GraphQLError(
        `cannot resume ${prior.kind} run as ${kind}`,
        { extensions: { code: "BAD_USER_INPUT" } },
      );
    }
    resumeThreadId = prior.threadId;
  }

  const { appRunId, lgRunId, threadId, webhookSecret } = await startGraphRun(
    assistantId,
    { product_id: productId, ...extraInput },
    { resumeThreadId },
  );

  await db.insert(productIntelRuns).values({
    id: appRunId,
    lg_run_id: lgRunId,
    lg_thread_id: threadId,
    product_id: productId,
    kind,
    status: "running",
    // Dual-write: old column stays populated for one deploy so webhooks from
    // pre-deploy rows still verify. A follow-up migration drops the column
    // after the sibling table is fully in service.
    webhook_secret: webhookSecret,
    created_by: context.userEmail ?? null,
    schema_version: PRODUCT_INTEL_VERSION,
  });

  // New home for the HMAC secret — sibling table with RLS forced and zero
  // policies (see migration 0061). The public_read policy on
  // product_intel_runs cannot traverse here, so SELECT * leaks are closed.
  await db.insert(productIntelRunSecrets).values({
    run_id: appRunId,
    secret: webhookSecret,
  });

  await publishIntelRunUpdate({
    productId,
    kind,
    intelRun: {
      id: appRunId,
      productId,
      kind,
      status: "running",
      startedAt: new Date().toISOString(),
      finishedAt: null,
      error: null,
    },
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
    return kickoff(
      "pricing",
      "pricing",
      {},
      args.id,
      context,
      args.resumeFromRunId,
    );
  },

  async analyzeProductGTMAsync(
    _p: unknown,
    args: MutationAnalyzeProductGtmAsyncArgs,
    context: GraphQLContext,
  ) {
    return kickoff(
      "gtm",
      "gtm",
      {},
      args.id,
      context,
      args.resumeFromRunId,
    );
  },

  async runFullProductIntelAsync(
    _p: unknown,
    args: MutationRunFullProductIntelAsyncArgs,
    context: GraphQLContext,
  ) {
    // kind stays "product_intel" — stable taxonomy across v1/v2. Only the
    // LangGraph assistant id swaps based on PRODUCT_INTEL_GRAPH_VERSION.
    return kickoff(
      "product_intel",
      productIntelAssistantId(),
      { force_refresh: Boolean(args.forceRefresh) },
      args.id,
      context,
      args.resumeFromRunId,
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
    if (args.minSchemaVersion) {
      filters.push(gte(productIntelRuns.schema_version, args.minSchemaVersion));
    }
    if (args.graphVersion) {
      filters.push(
        sql`${productIntelRuns.output}->'graph_meta'->>'graph_version' = ${args.graphVersion}`,
      );
    }
    return db
      .select()
      .from(productIntelRuns)
      .where(and(...filters))
      .orderBy(desc(productIntelRuns.started_at))
      .limit(50);
  },
};

// GraphQL field resolvers for IntelRun — EXPLICIT ALLOWLIST.
// Since product_intel_runs is public-read (see migration 0059), we must not
// rely on default resolution; an accidental SELECT * would otherwise surface
// webhook_secret / tenant_id / lg_* / created_by to anonymous callers.
//
// If a field isn't listed below AND isn't in the IntelRun GraphQL type, it
// can't leak. Keep both sides in sync.
export const IntelRunField = {
  id: (r: DbIntelRun) => r.id,
  productId: (r: DbIntelRun) => r.product_id,
  kind: (r: DbIntelRun) => r.kind,
  status: (r: DbIntelRun) => r.status,
  startedAt: (r: DbIntelRun) => r.started_at.toISOString(),
  finishedAt: (r: DbIntelRun) =>
    r.finished_at ? r.finished_at.toISOString() : null,
  error: (r: DbIntelRun) => r.error ?? null,
  output: (r: DbIntelRun) => r.output ?? null,
  progress: (r: DbIntelRun) => r.progress ?? null,
  // numeric returns string from pg; coerce to Float at the GraphQL boundary.
  totalCostUsd: (r: DbIntelRun) =>
    r.total_cost_usd === null || r.total_cost_usd === undefined
      ? null
      : Number(r.total_cost_usd),
  // Deliberately absent (and not in the GraphQL schema either):
  //   webhook_secret, tenant_id, lg_run_id, lg_thread_id, created_by
};
