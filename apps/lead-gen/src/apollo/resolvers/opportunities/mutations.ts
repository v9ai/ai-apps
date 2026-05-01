import { eq, or } from "drizzle-orm";
import { isAdminEmail } from "@/lib/admin";
import { opportunities } from "@/db/schema";
import {
  classifyOpportunityLLM,
  type OpportunityClassification,
} from "@/ml/opportunity-classifier";
import { extractStack, type ExtractStackResult } from "@/lib/langgraph-client";
import type { GraphQLContext } from "../../context";
import type {
  MutationCreateOpportunityArgs,
  MutationExtractOpportunityStackArgs,
  MutationUpdateOpportunityTagsArgs,
  QueryOpportunityByUrlArgs,
} from "@/__generated__/resolvers-types";

function requireAdmin(context: GraphQLContext): void {
  if (!context.userId) throw new Error("Authentication required");
  if (!isAdminEmail(context.userEmail))
    throw new Error("Admin access required");
}

function generateOpportunityId(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  return `opp_${ts}_${rand}`;
}

const CLASSIFY_TIMEOUT_MS = 8_000;

// Bounded race so a slow or down classifier upstream never blocks the save path.
async function tryClassify(input: {
  title: string;
  rawContext: string;
  companyName?: string | null;
  location?: string | null;
  url?: string | null;
}): Promise<OpportunityClassification | null> {
  if (!process.env.LLM_BASE_URL) return null;
  if (!input.rawContext || input.rawContext.length < 80) return null;
  try {
    return await Promise.race([
      classifyOpportunityLLM(input),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("classify timeout")), CLASSIFY_TIMEOUT_MS),
      ),
    ]);
  } catch (err) {
    console.warn("[opportunity-classifier] skipped:", err instanceof Error ? err.message : err);
    return null;
  }
}

export const opportunityMutations = {
  async updateOpportunityTags(
    _parent: unknown,
    args: MutationUpdateOpportunityTagsArgs,
    context: GraphQLContext,
  ) {
    requireAdmin(context);
    const now = new Date().toISOString();
    const rows = await context.db
      .update(opportunities)
      .set({
        tags: JSON.stringify(args.tags),
        updated_at: now,
      })
      .where(eq(opportunities.id, args.id))
      .returning();

    if (rows.length === 0) throw new Error("Opportunity not found");
    return rows[0];
  },

  async extractOpportunityStack(
    _parent: unknown,
    args: MutationExtractOpportunityStackArgs,
    context: GraphQLContext,
  ): Promise<ExtractStackResult> {
    requireAdmin(context);
    const [row] = await context.db
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, args.opportunityId))
      .limit(1);
    if (!row) throw new Error("Opportunity not found");
    const rawJd = row.raw_context ?? "";
    if (!rawJd || rawJd.trim().length < 40) {
      throw new Error("Opportunity has no raw_context to extract from");
    }

    const result = await extractStack({ rawJd, title: row.title });

    let mergedMetadata: Record<string, unknown> = {};
    if (row.metadata) {
      try {
        const parsed = JSON.parse(row.metadata);
        if (parsed && typeof parsed === "object") {
          mergedMetadata = parsed as Record<string, unknown>;
        }
      } catch {
        mergedMetadata = { _raw: row.metadata };
      }
    }
    mergedMetadata.required_stack = {
      skills: result.skills,
      summary: result.summary,
      confidence: result.confidence,
      model: result.model,
      extracted_at: new Date().toISOString(),
    };

    await context.db
      .update(opportunities)
      .set({
        metadata: JSON.stringify(mergedMetadata),
        updated_at: new Date().toISOString(),
      })
      .where(eq(opportunities.id, args.opportunityId));

    return result;
  },

  async createOpportunity(
    _parent: unknown,
    args: MutationCreateOpportunityArgs,
    context: GraphQLContext,
  ) {
    requireAdmin(context);
    const input = args.input;
    const now = new Date().toISOString();

    // Parse any caller-provided metadata so the classifier can enrich without clobbering it.
    let userMeta: Record<string, unknown> = {};
    if (input.metadata) {
      try {
        const parsed = JSON.parse(input.metadata);
        if (parsed && typeof parsed === "object") userMeta = parsed as Record<string, unknown>;
      } catch {
        // Legacy non-JSON metadata — preserve as raw field.
        userMeta = { _raw: input.metadata };
      }
    }

    const location = typeof userMeta.location === "string" ? (userMeta.location as string) : null;
    const classification = await tryClassify({
      title: input.title,
      rawContext: input.rawContext ?? "",
      location,
      url: input.url,
    });

    const userTags = input.tags ?? [];
    const mergedTags = classification
      ? Array.from(new Set([...userTags, ...classification.tags]))
      : userTags;

    const mergedMetadata = classification
      ? { ...userMeta, classifier: {
          seniority: classification.seniority,
          tech_stack: classification.tech_stack,
          remote_policy: classification.remote_policy,
          tldr: classification.tldr,
        } }
      : userMeta;

    const rows = await context.db
      .insert(opportunities)
      .values({
        id: generateOpportunityId(),
        title: input.title,
        url: input.url ?? undefined,
        source: input.source ?? undefined,
        status: input.status ?? "open",
        reward_text: input.rewardText ?? undefined,
        reward_usd: classification?.reward_usd ?? undefined,
        score: classification?.score ?? undefined,
        raw_context: input.rawContext ?? undefined,
        metadata: Object.keys(mergedMetadata).length > 0 ? JSON.stringify(mergedMetadata) : undefined,
        applied: input.applied ?? false,
        applied_at: input.appliedAt ?? undefined,
        tags: JSON.stringify(mergedTags),
        company_id: input.companyId ?? undefined,
        contact_id: input.contactId ?? undefined,
        first_seen: now,
        last_seen: now,
        created_at: now,
        updated_at: now,
      })
      .returning();

    return rows[0];
  },
};

export const opportunityQueryExtensions = {
  async opportunityByUrl(
    _parent: unknown,
    args: QueryOpportunityByUrlArgs,
    context: GraphQLContext,
  ) {
    const normalized = args.url.replace(/\/+$/, "");
    const withSlash = normalized + "/";
    const rows = await context.db
      .select()
      .from(opportunities)
      .where(or(
        eq(opportunities.url, normalized),
        eq(opportunities.url, withSlash),
      ))
      .limit(1);

    return rows[0] ?? null;
  },
};
