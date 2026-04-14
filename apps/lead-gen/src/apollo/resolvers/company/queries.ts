/**
 * Company query resolvers.
 */

import {
  companies,
  companyFacts,
  companySnapshots,
} from "@/db/schema";
import { eq, and, or, like, ilike, asc, desc, gte, sql } from "drizzle-orm";
import type { GraphQLContext } from "../../context";
import type {
  QueryCompaniesArgs,
  QueryCompanyArgs,
  QueryCompany_FactsArgs,
  QueryCompany_SnapshotsArgs,
  QueryFindCompanyArgs,
} from "@/__generated__/resolvers-types";
import { safeJsonParse } from "./utils";

export const companyQueries = {
  async companies(
    _parent: unknown,
    args: QueryCompaniesArgs,
    context: GraphQLContext,
  ) {
    try {
      const conditions = [];

      // Always exclude blocked companies unless explicitly filtered
      conditions.push(eq(companies.blocked, false));

      if (args.filter) {
        if (args.filter.text) {
          const searchPattern = `%${args.filter.text}%`;
          conditions.push(
            or(
              like(companies.name, searchPattern),
              like(companies.key, searchPattern),
              like(companies.description, searchPattern),
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

        // Push service_taxonomy_any filter to SQL (jsonb overlap)
        if (
          args.filter.service_taxonomy_any &&
          args.filter.service_taxonomy_any.length > 0
        ) {
          const values = args.filter.service_taxonomy_any.map(
            (v) => sql`${v}`,
          );
          conditions.push(
            sql`${companies.service_taxonomy}::jsonb ?| array[${sql.join(values, sql.raw(","))}]`,
          );
        }
      }

      const limit = args.limit ?? 50;
      const offset = args.offset ?? 0;

      let query = context.db.select().from(companies).$dynamic();

      if (conditions.length > 0) {
        query = query.where(and(...conditions)!);
      }

      // Order by
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

      // Count total matches at the DB level (single aggregate, no full scan)
      const countQuery = context.db
        .select({ count: sql<number>`count(*)` })
        .from(companies)
        .$dynamic();
      const countConditions = [...conditions];
      const [{ count: totalCount }] = countConditions.length > 0
        ? await countQuery.where(and(...countConditions)!)
        : await countQuery;

      // Pagination pushed to SQL
      const paginatedCompanies = await query.limit(limit).offset(offset);

      // Prime the company loader cache so field resolvers that later request
      // the same company by ID get an instant hit instead of a DB round-trip.
      for (const c of paginatedCompanies) {
        context.loaders.company.prime(c.id, c);
      }

      return {
        companies: paginatedCompanies,
        totalCount,
      };
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
};
