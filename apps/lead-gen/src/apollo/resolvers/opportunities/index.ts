import type { GraphQLContext } from "../../context";
import type { Opportunity } from "@/db/schema";
import { opportunityMutations, opportunityQueryExtensions } from "./mutations";

type DbOpportunityRow = Opportunity & { company_name: string | null };

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const OpportunityField = {
  rewardUsd: (parent: DbOpportunityRow) => parent.reward_usd ?? null,
  rewardText: (parent: DbOpportunityRow) => parent.reward_text ?? null,
  startDate: (parent: DbOpportunityRow) => parent.start_date ?? null,
  endDate: (parent: DbOpportunityRow) => parent.end_date ?? null,
  firstSeen: (parent: DbOpportunityRow) => parent.first_seen ?? null,
  lastSeen: (parent: DbOpportunityRow) => parent.last_seen ?? null,
  appliedAt: (parent: DbOpportunityRow) => parent.applied_at ?? null,
  applicationStatus: (parent: DbOpportunityRow) => parent.application_status ?? null,
  applicationNotes: (parent: DbOpportunityRow) => parent.application_notes ?? null,
  tags: (parent: DbOpportunityRow) => parseJsonArray(parent.tags),
  companyId: (parent: DbOpportunityRow) => parent.company_id ?? null,
  contactId: (parent: DbOpportunityRow) => parent.contact_id ?? null,
  companyName: (parent: DbOpportunityRow) => parent.company_name ?? null,
  createdAt: (parent: DbOpportunityRow) => parent.created_at,
  updatedAt: (parent: DbOpportunityRow) => parent.updated_at,
};

const opportunityQueries = {
  async contactOpportunities(
    _parent: unknown,
    args: { contactId: number },
    context: GraphQLContext,
  ) {
    return context.loaders.opportunitiesByContact.load(args.contactId);
  },
  ...opportunityQueryExtensions,
};

export const opportunityResolvers = {
  Opportunity: OpportunityField,
  Query: opportunityQueries,
  Mutation: opportunityMutations,
};
