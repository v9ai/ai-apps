import { eq, or } from "drizzle-orm";
import { isAdminEmail } from "@/lib/admin";
import { opportunities } from "@/db/schema";
import type { GraphQLContext } from "../../context";
import type {
  MutationCreateOpportunityArgs,
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

export const opportunityMutations = {
  async createOpportunity(
    _parent: unknown,
    args: MutationCreateOpportunityArgs,
    context: GraphQLContext,
  ) {
    requireAdmin(context);
    const input = args.input;
    const now = new Date().toISOString();

    const rows = await context.db
      .insert(opportunities)
      .values({
        id: generateOpportunityId(),
        title: input.title,
        url: input.url ?? undefined,
        source: input.source ?? undefined,
        status: input.status ?? "open",
        reward_text: input.rewardText ?? undefined,
        raw_context: input.rawContext ?? undefined,
        metadata: input.metadata ?? undefined,
        applied: input.applied ?? false,
        applied_at: input.appliedAt ?? undefined,
        tags: input.tags ? JSON.stringify(input.tags) : "[]",
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
