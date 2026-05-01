/**
 * Company query resolvers.
 */

import {
  companies,
  companyFacts,
  companySnapshots,
  products,
} from "@/db/schema";
import { db as httpDb } from "@/db";
import { eq, and, or, like, ilike, asc, desc, gte, ne, sql, isNotNull, inArray } from "drizzle-orm";
import type { GraphQLContext } from "../../context";
import type {
  QueryCompaniesArgs,
  QueryCompanyArgs,
  QueryCompany_FactsArgs,
  QueryCompany_SnapshotsArgs,
  QueryFindCompanyArgs,
  QueryExistingCompanyLinkedinUrlsArgs,
} from "@/__generated__/resolvers-types";
import { safeJsonParse } from "./utils";
import { withEdgeCache } from "../../cache";

// Pure fetcher for the companies list — no `context` capture so unstable_cache
// can serialize the args into a stable cache key. Uses the module-scoped
// httpDb; single-tenant deployment makes RLS scoping equivalent.
const fetchCompaniesList = withEdgeCache(
  async (args: QueryCompaniesArgs) => {
    const conditions = [];
    conditions.push(eq(companies.blocked, false));

    if (args.filter) {
      if (args.filter.text) {
        const searchPattern = `%${args.filter.text}%`;
        conditions.push(
          or(
            ilike(companies.name, searchPattern),
            ilike(companies.key, searchPattern),
            ilike(companies.description, searchPattern),
          )!,
        );
      }
      if (args.filter.category) {
        conditions.push(eq(companies.category, args.filter.category));
      }
      if (args.filter.min_score != null) {
        conditions.push(gte(companies.score, args.filter.min_score));
      }
      if (args.filter.min_ai_tier != null) {
        conditions.push(gte(companies.ai_tier, args.filter.min_ai_tier));
      }
      if (
        args.filter.service_taxonomy_any &&
        args.filter.service_taxonomy_any.length > 0
      ) {
        const values = args.filter.service_taxonomy_any.map((v) => sql`${v}`);
        conditions.push(
          sql`${companies.service_taxonomy}::jsonb ?| array[${sql.join(values, sql.raw(","))}]`,
        );
      }
      if (args.filter.tags_any && args.filter.tags_any.length > 0) {
        const values = args.filter.tags_any.map((v) => sql`${v}`);
        conditions.push(
          sql`(CASE WHEN ${companies.tags} LIKE '[%' THEN ${companies.tags}::jsonb ?| array[${sql.join(values, sql.raw(","))}] ELSE FALSE END)`,
        );
      }
    }

    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    let query = httpDb.select().from(companies).$dynamic();
    if (conditions.length > 0) {
      query = query.where(and(...conditions)!);
    }

    const orderBy = args.order_by ?? "SCORE_DESC";
    if (orderBy === "NAME_ASC") {
      query = query.orderBy(asc(companies.name));
    } else if (orderBy === "SCORE_DESC") {
      query = query.orderBy(desc(companies.score));
    } else if (orderBy === "UPDATED_AT_DESC") {
      query = query.orderBy(desc(companies.updated_at));
    } else if (orderBy === "CREATED_AT_DESC") {
      query = query.orderBy(desc(companies.created_at));
    }

    const countQuery = httpDb
      .select({ count: sql<number>`count(*)` })
      .from(companies)
      .$dynamic();
    const countConditions = [...conditions];
    const [{ count: totalCount }] = countConditions.length > 0
      ? await countQuery.where(and(...countConditions)!)
      : await countQuery;

    const paginatedCompanies = await query.limit(limit).offset(offset);

    return { companies: paginatedCompanies, totalCount };
  },
  ["companies-list-v1"],
);

export const companyQueries = {
  async companies(
    _parent: unknown,
    args: QueryCompaniesArgs,
    context: GraphQLContext,
  ) {
    try {
      const result = await fetchCompaniesList(args);
      // Prime the per-request loader cache so field resolvers don't re-fetch
      // the same companies by ID inside this request.
      for (const c of result.companies) {
        context.loaders.company.prime(c.id, c);
      }
      return result;
    } catch (error) {
      console.error("Error fetching companies:", error);
      return { companies: [], totalCount: 0 };
    }
  },

  async company(
    _parent: unknown,
    args: QueryCompanyArgs,
    context: GraphQLContext,
  ) {
    try {
      if (!args.id && !args.key) {
        return null;
      }

      let query = context.db.select().from(companies).$dynamic();

      if (args.id) {
        query = query.where(eq(companies.id, args.id));
      } else if (args.key) {
        query = query.where(eq(companies.key, args.key));
      }

      const [result] = await query.limit(1);
      // Prime the loader cache for consistency with list queries
      if (result) {
        context.loaders.company.prime(result.id, result);
      }
      return result || null;
    } catch (error) {
      console.error("Error fetching company:", error);
      return null;
    }
  },

  async company_facts(
    _parent: unknown,
    args: QueryCompany_FactsArgs,
    context: GraphQLContext,
  ) {
    try {
      const limit = args.limit ?? 200;
      const offset = args.offset ?? 0;

      const conditions = [eq(companyFacts.company_id, args.company_id)];
      if (args.field) {
        conditions.push(eq(companyFacts.field, args.field));
      }

      const facts = await context.db
        .select()
        .from(companyFacts)
        .where(and(...conditions)!)
        .limit(limit)
        .offset(offset);
      return facts || [];
    } catch (error) {
      console.error("Error fetching company facts:", error);
      return [];
    }
  },

  async company_snapshots(
    _parent: unknown,
    args: QueryCompany_SnapshotsArgs,
    context: GraphQLContext,
  ) {
    try {
      const limit = args.limit ?? 50;
      const offset = args.offset ?? 0;

      const snapshots = await context.db
        .select()
        .from(companySnapshots)
        .where(eq(companySnapshots.company_id, args.company_id))
        .limit(limit)
        .offset(offset);
      return snapshots || [];
    } catch (error) {
      console.error("Error fetching company snapshots:", error);
      return [];
    }
  },

  async allCompanyTags(
    _parent: unknown,
    _args: unknown,
    context: GraphQLContext,
  ) {
    try {
      const rows = await context.db
        .select({ tags: companies.tags })
        .from(companies)
        .where(sql`${companies.tags} IS NOT NULL AND ${companies.tags} != '[]'`);

      const tagSet = new Set<string>();
      for (const row of rows) {
        const parsed = safeJsonParse<string[]>(row.tags, []);
        for (const tag of parsed) tagSet.add(tag);
      }
      return [...tagSet].sort();
    } catch (error) {
      console.error("Error fetching all company tags:", error);
      return [];
    }
  },

  async findCompany(
    _parent: unknown,
    args: QueryFindCompanyArgs,
    context: GraphQLContext,
  ) {
    try {
      if (!args.name && !args.website && !args.linkedinUrl) {
        return { found: false, company: null };
      }

      // Priority 1: exact match by LinkedIn URL (most reliable identifier)
      if (args.linkedinUrl) {
        const byUrl = await context.db
          .select()
          .from(companies)
          .where(eq(companies.linkedin_url, args.linkedinUrl.replace(/\/$/, "")))
          .limit(1);
        if (byUrl[0]) return { found: true, company: byUrl[0] };
      }

      // Priority 2: case-insensitive exact match by name
      if (args.name) {
        const byName = await context.db
          .select()
          .from(companies)
          .where(ilike(companies.name, args.name.trim()))
          .limit(1);
        if (byName[0]) return { found: true, company: byName[0] };
      }

      // Priority 3: website domain substring (inherently fuzzy)
      if (args.website) {
        const domain = args.website.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
        const escaped = domain.replace(/%/g, "\\%").replace(/_/g, "\\_");
        const byDomain = await context.db
          .select()
          .from(companies)
          .where(like(companies.website, `%${escaped}%`))
          .limit(1);
        if (byDomain[0]) return { found: true, company: byDomain[0] };
      }

      return { found: false, company: null };
    } catch (error) {
      console.error("Error finding company:", error);
      return { found: false, company: null };
    }
  },

  async existingCompanyLinkedinUrls(
    _parent: unknown,
    args: QueryExistingCompanyLinkedinUrlsArgs,
    context: GraphQLContext,
  ) {
    if (!args.linkedinUrls?.length) return [];
    const normalized = args.linkedinUrls.map((u) => u.replace(/\/$/, ""));
    const rows = await context.db
      .select({ url: companies.linkedin_url })
      .from(companies)
      .where(inArray(companies.linkedin_url, normalized));
    return rows.map((r) => r.url).filter((u): u is string => !!u);
  },

  async similarCompaniesByProfile(
    _parent: unknown,
    args: { companyId: number; limit?: number | null },
    context: GraphQLContext,
  ) {
    try {
      const limit = Math.min(Math.max(args.limit ?? 10, 1), 100);

      // Look up the source company's profile_embedding so we can compare
      // against it. We cast to ::vector in the sub-select so pgvector knows
      // the operand type on the cosine operator.
      const rows = await context.db
        .select()
        .from(companies)
        .where(
          and(
            ne(companies.id, args.companyId),
            eq(companies.blocked, false),
            isNotNull(companies.profile_embedding),
            sql`(SELECT profile_embedding FROM companies WHERE id = ${args.companyId}) IS NOT NULL`,
          )!,
        )
        .orderBy(
          sql`${companies.profile_embedding} <=> (SELECT profile_embedding FROM companies WHERE id = ${args.companyId})::vector`,
        )
        .limit(limit);

      for (const c of rows) {
        context.loaders.company.prime(c.id, c);
      }
      return rows;
    } catch (error) {
      console.error("Error fetching similar companies:", error);
      return [];
    }
  },

  async topCompaniesForProduct(
    _parent: unknown,
    args: { productId: number; limit?: number | null; minScore?: number | null },
    context: GraphQLContext,
  ) {
    try {
      const limit = Math.min(Math.max(args.limit ?? 20, 1), 200);
      const minScore = args.minScore ?? 0.6;

      const productRow = await context.db
        .select({ emb: products.icp_embedding })
        .from(products)
        .where(and(eq(products.id, args.productId), isNotNull(products.icp_embedding))!)
        .limit(1);
      if (!productRow[0]) return [];

      // 1 - cosine_distance = cosine_similarity for L2-normalized vectors.
      const rows = await context.db
        .select()
        .from(companies)
        .where(
          and(
            eq(companies.blocked, false),
            isNotNull(companies.profile_embedding),
            sql`1 - (${companies.profile_embedding} <=> (SELECT icp_embedding FROM products WHERE id = ${args.productId})::vector) >= ${minScore}`,
          )!,
        )
        .orderBy(
          sql`${companies.profile_embedding} <=> (SELECT icp_embedding FROM products WHERE id = ${args.productId})::vector`,
        )
        .limit(limit);

      for (const c of rows) {
        context.loaders.company.prime(c.id, c);
      }
      return rows;
    } catch (error) {
      console.error("Error fetching top companies for product:", error);
      return [];
    }
  },
};
