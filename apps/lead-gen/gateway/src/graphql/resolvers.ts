/**
 * Resolvers for the gateway's IntelRun + Product surface. Reads/writes Neon
 * directly via Drizzle. Mirrors the resolver behavior in
 * `apps/lead-gen/src/apollo/resolvers/products/` so the client cache shape is
 * unchanged.
 */

import { GraphQLError } from "graphql";
import { and, desc, eq } from "drizzle-orm";
import type { Resolvers, IntelRun } from "../__generated__/resolvers-types";
import { products, productIntelRuns, productIntelRunSecrets } from "../db/schema";
import {
  startGraphRun,
  getRunStatus,
  productIntelAssistantId,
} from "../langgraph/client";
import { publishToPubSub } from "./pubsub-publish";
import type { GatewayContext } from "./context";

const PRODUCT_INTEL_VERSION = "v1";

function requireAdmin(ctx: GatewayContext): void {
  if (!ctx.user) {
    throw new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
  if (!ctx.user.isAdmin) {
    throw new GraphQLError("Admin access required", {
      extensions: { code: "FORBIDDEN" },
    });
  }
}

type IntelKind = "pricing" | "gtm" | "product_intel" | "icp";

async function kickoff(
  ctx: GatewayContext,
  kind: IntelKind,
  assistantId: string,
  extraInput: Record<string, unknown>,
  productId: number,
  resumeFromRunId?: string | null,
) {
  requireAdmin(ctx);

  let resumeThreadId: string | null = null;
  if (resumeFromRunId) {
    const [prior] = await ctx.db
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
      throw new GraphQLError(`cannot resume ${prior.kind} run as ${kind}`, {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }
    resumeThreadId = prior.threadId;
  }

  const { appRunId, lgRunId, threadId, webhookSecret } = await startGraphRun(
    ctx.env,
    assistantId,
    { product_id: productId, ...extraInput },
    { resumeThreadId },
  );

  await ctx.db.insert(productIntelRuns).values({
    id: appRunId,
    lg_run_id: lgRunId,
    lg_thread_id: threadId,
    product_id: productId,
    kind,
    status: "running",
    webhook_secret: webhookSecret,
    created_by: ctx.user!.userEmail,
    schema_version: PRODUCT_INTEL_VERSION,
  });

  await ctx.db.insert(productIntelRunSecrets).values({
    run_id: appRunId,
    secret: webhookSecret,
  });

  await publishToPubSub(ctx.env, {
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

  return { runId: appRunId, productId, kind, status: "running" as const };
}

export const resolvers: Resolvers = {
  Query: {
    async productBySlug(_p, args, ctx) {
      const [row] = await ctx.db
        .select()
        .from(products)
        .where(eq(products.slug, args.slug))
        .limit(1);
      if (!row) return null;
      return mapProduct(row);
    },

    async productIntelRun(_p, args, ctx) {
      const [run] = await ctx.db
        .select()
        .from(productIntelRuns)
        .where(eq(productIntelRuns.id, String(args.id)))
        .limit(1);
      if (!run) return null;

      if (run.status === "running" && run.lg_thread_id && run.lg_run_id) {
        const remote = await getRunStatus(ctx.env, run.lg_thread_id, run.lg_run_id);
        if (remote.status === "error" || remote.status === "interrupted") {
          const finishedAt = new Date();
          await ctx.db
            .update(productIntelRuns)
            .set({
              status: "error",
              error: `lg:${remote.status}`,
              finished_at: finishedAt,
            })
            .where(eq(productIntelRuns.id, run.id));
          run.status = "error";
          run.error = `lg:${remote.status}`;
          run.finished_at = finishedAt;
        }
      }

      return mapIntelRun(run);
    },

    async productIntelRuns(_p, args, ctx) {
      const conds = [eq(productIntelRuns.product_id, args.productId)];
      if (args.kind) conds.push(eq(productIntelRuns.kind, args.kind));

      const rows = await ctx.db
        .select()
        .from(productIntelRuns)
        .where(and(...conds))
        .orderBy(desc(productIntelRuns.started_at))
        .limit(50);

      return rows.map(mapIntelRun);
    },
  },

  Mutation: {
    analyzeProductPricingAsync(_p, args, ctx) {
      return kickoff(ctx, "pricing", "pricing", {}, args.id, args.resumeFromRunId);
    },
    analyzeProductGTMAsync(_p, args, ctx) {
      return kickoff(ctx, "gtm", "gtm", {}, args.id, args.resumeFromRunId);
    },
    runFullProductIntelAsync(_p, args, ctx) {
      return kickoff(
        ctx,
        "product_intel",
        productIntelAssistantId(ctx.env),
        { force_refresh: Boolean(args.forceRefresh) },
        args.id,
        args.resumeFromRunId,
      );
    },
  },

  Subscription: {
    intelRunStatus: {
      // Subscriptions are served by the WebSocket transport on the JobPubSub
      // Durable Object, not Apollo Server's HTTP path. This stub satisfies
      // the executable schema; calling it over HTTP throws.
      subscribe() {
        throw new GraphQLError(
          "Subscription.intelRunStatus is served by the WebSocket transport on /graphql",
        );
      },
    },
  },
};

type ProductRow = typeof products.$inferSelect;
type IntelRunRow = typeof productIntelRuns.$inferSelect;

function mapProduct(p: ProductRow) {
  return {
    id: p.id,
    name: p.name,
    url: p.url,
    domain: p.domain,
    slug: p.slug,
    description: p.description,
    pricingAnalysis: p.pricing_analysis,
    pricingAnalyzedAt: p.pricing_analyzed_at,
    gtmAnalysis: p.gtm_analysis,
    gtmAnalyzedAt: p.gtm_analyzed_at,
    intelReport: p.intel_report,
    intelReportAt: p.intel_report_at,
  };
}

function mapIntelRun(r: IntelRunRow): IntelRun {
  return {
    id: r.id,
    productId: r.product_id,
    kind: r.kind,
    status: r.status,
    startedAt: r.started_at.toISOString(),
    finishedAt: r.finished_at ? r.finished_at.toISOString() : null,
    error: r.error,
    output: r.output,
  };
}
