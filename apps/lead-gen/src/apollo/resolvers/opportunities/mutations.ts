import { eq, or } from "drizzle-orm";
import { isAdminEmail } from "@/lib/admin";
import { opportunities } from "@/db/schema";
import {
  classifyOpportunityLLM,
  type OpportunityClassification,
} from "@/ml/opportunity-classifier";
import type { GraphQLContext } from "../../context";
import type {
  MutationCreateOpportunityArgs,
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
