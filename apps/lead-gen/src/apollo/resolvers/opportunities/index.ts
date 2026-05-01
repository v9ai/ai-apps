import { eq } from "drizzle-orm";
import { companies, opportunities as opportunitiesTable } from "@/db/schema";
import { isAdminEmail } from "@/lib/admin";
import { loadOpportunitiesPageData } from "@/lib/opportunities/load-page-data";
import { evaluateScoring } from "@/lib/ml/eval-metrics";
import {
  computeSourceBreakdown,
  extractOpportunityFeatures,
  labelFromTags,
} from "@/lib/ml/opportunity-features";
import type { GraphQLContext } from "../../context";
import type { Opportunity, Company as DbCompany } from "@/db/schema";
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

const EVAL_THRESHOLD = 0.5;

async function loadEvalReport(context: GraphQLContext) {
  if (!isAdminEmail(context.userEmail)) return null;

  const rows = await context.db
    .select({
      id: opportunitiesTable.id,
      score: opportunitiesTable.score,
      source: opportunitiesTable.source,
      tags: opportunitiesTable.tags,
      reward_usd: opportunitiesTable.reward_usd,
      company_id: opportunitiesTable.company_id,
      contact_id: opportunitiesTable.contact_id,
      first_seen: opportunitiesTable.first_seen,
      created_at: opportunitiesTable.created_at,
    })
    .from(opportunitiesTable);

  const scores: number[] = [];
  const labels: boolean[] = [];
  for (const row of rows) {
    const feat = extractOpportunityFeatures(row);
    scores.push(feat[0]);
    labels.push(labelFromTags(row.tags) === 1.0);
  }

  return {
    scoring: evaluateScoring(scores, labels, EVAL_THRESHOLD),
    sourceBreakdown: computeSourceBreakdown(rows),
    goldenCount: labels.filter(Boolean).length,
    excludedCount: labels.filter((l) => !l).length,
    nullScoreCount: rows.filter((r) => r.score == null).length,
    timestamp: new Date().toISOString(),
  };
}

function shapeOpportunityListItem(row: Awaited<ReturnType<typeof loadOpportunitiesPageData>>["pgOpportunities"][number]) {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    source: row.source,
    status: row.status,
    rewardText: row.reward_text,
    rewardUsd: row.reward_usd,
    score: row.score,
    tags: parseJsonArray(row.tags),
    applied: row.applied,
    appliedAt: row.applied_at,
    applicationStatus: row.application_status,
    firstSeen: row.first_seen,
    createdAt: row.created_at,
    companyName: row.company_name,
    companyKey: row.company_key,
    contactFirstName: row.contact_first,
    contactLastName: row.contact_last,
    contactSlug: row.contact_slug,
    contactPosition: row.contact_position,
  };
}

function shapeD1Item(row: Awaited<ReturnType<typeof loadOpportunitiesPageData>>["pendingD1"][number]) {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    source: row.source,
    status: row.status,
    tags: row.tags,
    location: row.location,
    salary: row.salary,
    archived: row.archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    companyName: row.company_name,
    companyKey: row.company_key,
  };
}

const opportunityQueries = {
  async contactOpportunities(
    _parent: unknown,
    args: { contactId: number },
    context: GraphQLContext,
  ) {
    return context.loaders.opportunitiesByContact.load(args.contactId);
  },
  async opportunitiesPage(_parent: unknown, _args: unknown, context: GraphQLContext) {
    const [{ pgOpportunities, pendingD1 }, evalReport] = await Promise.all([
      loadOpportunitiesPageData(),
      loadEvalReport(context),
    ]);

    return {
      opportunities: pgOpportunities.map(shapeOpportunityListItem),
      d1Pending: pendingD1.map(shapeD1Item),
      evalReport,
    };
  },
  ...opportunityQueryExtensions,
};

export const opportunityResolvers = {
  Opportunity: OpportunityField,
  Company: {
    async opportunities(parent: DbCompany, _args: unknown, context: GraphQLContext) {
      return context.loaders.opportunitiesByCompany.load(parent.id);
    },
  },
  Query: opportunityQueries,
  Mutation: opportunityMutations,
};
