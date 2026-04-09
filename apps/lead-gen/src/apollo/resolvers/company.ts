import {
  companies,
  companyFacts,
  companySnapshots,
  contacts,
  contactEmails,
} from "@/db/schema";
import type {
  Company as DbCompany,
  CompanyFact as DbCompanyFact,
  CompanySnapshot as DbCompanySnapshot,
} from "@/db/schema";
import { eq, and, or, like, ilike, asc, desc, gte, inArray, sql } from "drizzle-orm";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";
import type {
  QueryCompaniesArgs,
  QueryCompanyArgs,
  QueryCompany_FactsArgs,
  QueryCompany_SnapshotsArgs,
  QueryFindCompanyArgs,
  MutationCreateCompanyArgs,
  MutationUpdateCompanyArgs,
  MutationDeleteCompanyArgs,
  MutationAdd_Company_FactsArgs,
  MutationIngest_Company_SnapshotArgs,
  MutationMergeDuplicateCompaniesArgs,
  MutationDeleteCompaniesArgs,
  MutationImportCompanyWithContactsArgs,
  MutationImportCompaniesArgs,
  MutationEnhanceCompanyArgs,
  MutationAnalyzeCompanyArgs,
  MutationBlockCompanyArgs,
  MutationUnblockCompanyArgs,
} from "@/__generated__/resolvers-types";

/**
 * Safely parse JSON strings with proper error handling and logging
 * Prevents crashes from malformed JSON data in database
 */
function safeJsonParse<T>(value: string | null | undefined, defaultValue: T): T {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn("[safeJsonParse] Failed to parse JSON:", {
      error: error instanceof Error ? error.message : String(error),
      valueLength: value?.length,
      valuePreview: value?.substring(0, 100),
    });
    return defaultValue;
  }
}

export const companyResolvers = {
  Company: {
    ai_tier(parent: DbCompany) {
      return parent.ai_tier ?? 0;
    },
    ai_classification_confidence(parent: DbCompany) {
      return parent.ai_classification_confidence ?? 0.5;
    },
    ai_classification_reason(parent: DbCompany) {
      return parent.ai_classification_reason ?? null;
    },
    blocked(parent: DbCompany) {
      return parent.blocked ?? false;
    },
    // Validate and sanitize category enum
    category(parent: DbCompany) {
      const validCategories = ["CONSULTANCY", "UNKNOWN"];
      const category = parent.category?.toUpperCase() || "UNKNOWN";
      return validCategories.includes(category) ? category : "UNKNOWN";
    },
    // Parse JSON fields with proper error handling
    tags(parent: DbCompany) {
      return safeJsonParse(parent.tags, []);
    },
    services(parent: DbCompany) {
      if (!parent.services) return [];
      const parsed = safeJsonParse<string[] | null>(parent.services, null);
      if (parsed !== null) return parsed;
      // Fallback: plain comma-separated string
      return parent.services.split(',').map((s: string) => s.trim()).filter(Boolean);
    },
    service_taxonomy(parent: DbCompany) {
      return safeJsonParse(parent.service_taxonomy, []);
    },
    industries(parent: DbCompany) {
      return safeJsonParse(parent.industries, []);
    },
    score_reasons(parent: DbCompany) {
      return safeJsonParse(parent.score_reasons, []);
    },
    email(parent: DbCompany) {
      return parent.email ?? null;
    },
    emailsList(parent: DbCompany) {
      return safeJsonParse(parent.emails, []);
    },
    githubUrl(parent: DbCompany) {
      return parent.github_url ?? null;
    },
    async facts(
      parent: DbCompany,
      args: { limit?: number; offset?: number; field?: string },
      context: GraphQLContext,
    ) {
      try {
        const limit = args.limit ?? 200;
        const offset = args.offset ?? 0;

        let facts = await context.loaders.companyFacts.load(parent.id);
        if (args.field) {
          facts = facts.filter((f) => f.field === args.field);
        }
        return facts.slice(offset, offset + limit);
      } catch (error) {
        console.error("Error fetching company facts:", error);
        return [];
      }
    },
    async facts_count(parent: DbCompany, _args: unknown, context: GraphQLContext) {
      try {
        const facts = await context.loaders.companyFacts.load(parent.id);
        return facts.length;
      } catch (error) {
        console.error("Error counting company facts:", error);
        return 0;
      }
    },
    async snapshots(parent: DbCompany, args: { limit?: number; offset?: number }, context: GraphQLContext) {
      try {
        const limit = args.limit ?? 50;
        const offset = args.offset ?? 0;

        const snapshots = await context.loaders.companySnapshots.load(parent.id);
        return snapshots.slice(offset, offset + limit);
      } catch (error) {
        console.error("Error fetching company snapshots:", error);
        return [];
      }
    },
    async snapshots_count(parent: DbCompany, _args: unknown, context: GraphQLContext) {
      try {
        const snapshots = await context.loaders.companySnapshots.load(parent.id);
        return snapshots.length;
      } catch (error) {
        console.error("Error counting company snapshots:", error);
        return 0;
      }
    },
  },

  Evidence: {
    warc(parent: DbCompanyFact) {
      if (!parent.warc_filename) return null;
      return {
        filename: parent.warc_filename,
        offset: parent.warc_offset,
        length: parent.warc_length,
        digest: parent.warc_digest,
      };
    },
  },

  CompanyFact: {
    value_json(parent: DbCompanyFact) {
      return parent.value_json ? JSON.parse(parent.value_json) : null;
    },
    normalized_value(parent: DbCompanyFact) {
      return parent.normalized_value
        ? JSON.parse(parent.normalized_value)
        : null;
    },
    evidence(parent: DbCompanyFact) {
      return {
        source_type: parent.source_type,
        source_url: parent.source_url,
        crawl_id: parent.crawl_id,
        capture_timestamp: parent.capture_timestamp,
        observed_at: parent.observed_at,
        method: parent.method,
        extractor_version: parent.extractor_version,
        http_status: parent.http_status,
        mime: parent.mime,
        content_hash: parent.content_hash,
        warc_filename: parent.warc_filename,
        warc_offset: parent.warc_offset,
        warc_length: parent.warc_length,
        warc_digest: parent.warc_digest,
      };
    },
  },

  CompanySnapshot: {
    jsonld(parent: DbCompanySnapshot) {
      return parent.jsonld ? JSON.parse(parent.jsonld) : null;
    },
    extracted(parent: DbCompanySnapshot) {
      return parent.extracted ? JSON.parse(parent.extracted) : null;
    },
    evidence(parent: DbCompanySnapshot) {
      return {
        source_type: parent.source_type,
        source_url: parent.source_url,
        crawl_id: parent.crawl_id,
        capture_timestamp: parent.capture_timestamp,
        observed_at: parent.fetched_at,
        method: parent.method,
        extractor_version: parent.extractor_version,
        http_status: parent.http_status,
        mime: parent.mime,
        content_hash: parent.content_hash,
        warc_filename: parent.warc_filename,
        warc_offset: parent.warc_offset,
        warc_length: parent.warc_length,
        warc_digest: parent.warc_digest,
      };
    },
  },

  Query: {
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

          if (args.filter.min_score !== undefined) {
            conditions.push(gte(companies.score, args.filter.min_score));
          }

          if (args.filter.min_ai_tier !== undefined && args.filter.min_ai_tier !== null) {
            conditions.push(gte(companies.ai_tier, args.filter.min_ai_tier));
          }
        }
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

        let allResults = await query;

        // Post-filter for service_taxonomy_any
        if (
          args.filter?.service_taxonomy_any &&
          args.filter.service_taxonomy_any.length > 0
        ) {
          allResults = allResults.filter((c) => {
            if (!c.service_taxonomy) return false;
            const taxonomies = JSON.parse(c.service_taxonomy);
            return args.filter!.service_taxonomy_any!.some((t) =>
              taxonomies.includes(t),
            );
          });
        }

        const totalCount = allResults.length;
        const limit = args.limit ?? 50;
        const offset = args.offset ?? 0;
        const paginatedCompanies = allResults.slice(offset, offset + limit);

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
        if (!args.name && !args.website) {
          return { found: false, company: null };
        }

        const conditions = [];
        if (args.name) {
          conditions.push(like(companies.name, `%${args.name}%`));
        }
        if (args.website) {
          // Match by domain substring
          const domain = args.website.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
          conditions.push(like(companies.website, `%${domain}%`));
        }

        const rows = await context.db
          .select()
          .from(companies)
          .where(or(...conditions))
          .limit(1);

        if (rows[0]) {
          return { found: true, company: rows[0] };
        }
        return { found: false, company: null };
      } catch (error) {
        console.error("Error finding company:", error);
        return { found: false, company: null };
      }
    },

  },

  Mutation: {
    async createCompany(
      _parent: unknown,
      args: MutationCreateCompanyArgs,
      context: GraphQLContext,
    ) {
      try {
        if (!context.userId) {
          throw new Error("Unauthorized");
        }

        if (!isAdminEmail(context.userEmail)) {
          throw new Error("Forbidden - Admin access required");
        }

        const insertData: Record<string, unknown> = { ...args.input };

        // Validate category enum
        if (args.input.category) {
          const validCategories = ["CONSULTANCY", "UNKNOWN"];
          const category = args.input.category.toUpperCase();
          insertData.category = validCategories.includes(category) ? category : "UNKNOWN";
        }

        // Stringify JSON fields
        if (args.input.tags) {
          insertData.tags = JSON.stringify(args.input.tags);
        }
        if (args.input.services) {
          insertData.services = JSON.stringify(args.input.services);
        }
        if (args.input.service_taxonomy) {
          insertData.service_taxonomy = JSON.stringify(
            args.input.service_taxonomy,
          );
        }
        if (args.input.industries) {
          insertData.industries = JSON.stringify(args.input.industries);
        }

        const [newCompany] = await context.db
          .insert(companies)
          .values(insertData)
          .returning();

        return newCompany;
      } catch (error) {
        console.error("Error creating company:", error);
        throw error;
      }
    },

    async updateCompany(
      _parent: unknown,
      args: MutationUpdateCompanyArgs,
      context: GraphQLContext,
    ) {
      try {
        if (!context.userId) {
          throw new Error("Unauthorized");
        }

        if (!isAdminEmail(context.userEmail)) {
          throw new Error("Forbidden - Admin access required");
        }

        const updateData: Record<string, unknown> = { ...args.input };

        // Validate category enum
        if (args.input.category) {
          const validCategories = ["CONSULTANCY", "UNKNOWN"];
          const category = args.input.category.toUpperCase();
          updateData.category = validCategories.includes(category) ? category : "UNKNOWN";
        }

        // Stringify JSON fields
        if (args.input.tags) {
          updateData.tags = JSON.stringify(args.input.tags);
        }
        if (args.input.services) {
          updateData.services = JSON.stringify(args.input.services);
        }
        if (args.input.service_taxonomy) {
          updateData.service_taxonomy = JSON.stringify(
            args.input.service_taxonomy,
          );
        }
        if (args.input.industries) {
          updateData.industries = JSON.stringify(args.input.industries);
        }
        if (args.input.score_reasons) {
          updateData.score_reasons = JSON.stringify(args.input.score_reasons);
        }

        updateData.updated_at = new Date().toISOString();

        const [updatedCompany] = await context.db
          .update(companies)
          .set(updateData)
          .where(eq(companies.id, args.id))
          .returning();

        if (!updatedCompany) {
          throw new Error("Company not found");
        }

        return updatedCompany;
      } catch (error) {
        console.error("Error updating company:", error);
        throw error;
      }
    },

    async deleteCompany(
      _parent: unknown,
      args: MutationDeleteCompanyArgs,
      context: GraphQLContext,
    ) {
      try {
        if (!context.userId) {
          throw new Error("Unauthorized");
        }

        if (!isAdminEmail(context.userEmail)) {
          throw new Error("Forbidden - Admin access required");
        }

        await context.db.delete(contacts).where(eq(contacts.company_id, args.id));

        await context.db.delete(companies).where(eq(companies.id, args.id));

        return {
          success: true,
          message: "Company deleted successfully",
        };
      } catch (error) {
        console.error("Error deleting company:", error);
        throw error;
      }
    },

    async add_company_facts(
      _parent: unknown,
      args: MutationAdd_Company_FactsArgs,
      context: GraphQLContext,
    ) {
      try {
        if (!context.userId) {
          throw new Error("Unauthorized");
        }

        if (!isAdminEmail(context.userEmail)) {
          throw new Error("Forbidden - Admin access required");
        }

        const insertedFacts = [];

        for (const fact of args.facts) {
          const insertData: Record<string, unknown> = {
            company_id: args.company_id,
            field: fact.field,
            value_text: fact.value_text,
            confidence: fact.confidence,
            // Evidence fields
            source_type: fact.evidence.source_type,
            source_url: fact.evidence.source_url,
            crawl_id: fact.evidence.crawl_id,
            capture_timestamp: fact.evidence.capture_timestamp,
            observed_at: fact.evidence.observed_at,
            method: fact.evidence.method,
            extractor_version: fact.evidence.extractor_version,
            http_status: fact.evidence.http_status,
            mime: fact.evidence.mime,
            content_hash: fact.evidence.content_hash,
            warc_filename: fact.evidence.warc?.filename,
            warc_offset: fact.evidence.warc?.offset,
            warc_length: fact.evidence.warc?.length,
            warc_digest: fact.evidence.warc?.digest,
          };

          if (fact.value_json) {
            insertData.value_json = JSON.stringify(fact.value_json);
          }
          if (fact.normalized_value) {
            insertData.normalized_value = JSON.stringify(fact.normalized_value);
          }

          const [inserted] = await context.db
            .insert(companyFacts)
            .values(insertData)
            .returning();
          insertedFacts.push(inserted);
        }

        return insertedFacts;
      } catch (error) {
        console.error("Error adding company facts:", error);
        throw error;
      }
    },

    async ingest_company_snapshot(
      _parent: unknown,
      args: MutationIngest_Company_SnapshotArgs,
      context: GraphQLContext,
    ) {
      try {
        if (!context.userId) {
          throw new Error("Unauthorized");
        }

        if (!isAdminEmail(context.userEmail)) {
          throw new Error("Forbidden - Admin access required");
        }

        const insertData: Record<string, unknown> = {
          company_id: args.company_id,
          source_url: args.source_url,
          crawl_id: args.crawl_id,
          capture_timestamp: args.capture_timestamp,
          fetched_at: args.fetched_at,
          http_status: args.http_status,
          mime: args.mime,
          content_hash: args.content_hash,
          text_sample: args.text_sample,
          // Evidence fields
          source_type: args.evidence.source_type,
          method: args.evidence.method,
          extractor_version: args.evidence.extractor_version,
          warc_filename: args.evidence.warc?.filename,
          warc_offset: args.evidence.warc?.offset,
          warc_length: args.evidence.warc?.length,
          warc_digest: args.evidence.warc?.digest,
        };

        if (args.jsonld) {
          insertData.jsonld = JSON.stringify(args.jsonld);
        }
        if (args.extracted) {
          insertData.extracted = JSON.stringify(args.extracted);
        }

        const [snapshot] = await context.db
          .insert(companySnapshots)
          .values(insertData)
          .returning();

        return snapshot;
      } catch (error) {
        console.error("Error ingesting company snapshot:", error);
        throw error;
      }
    },

    async mergeDuplicateCompanies(
      _parent: unknown,
      args: MutationMergeDuplicateCompaniesArgs,
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const { companyIds } = args;
      if (companyIds.length < 2) {
        return { success: false, message: "Need at least 2 companies to merge", keptCompanyId: null, merged: 0 };
      }

      try {
        const allCompanies = await context.db
          .select()
          .from(companies)
          .where(inArray(companies.id, companyIds));

        if (allCompanies.length < 2) {
          return { success: false, message: "Less than 2 companies found", keptCompanyId: null, merged: 0 };
        }

        // Score each company by field completeness to pick the best primary
        function scoreCompany(c: typeof allCompanies[0]): number {
          let s = 0;
          if (c.website) s += 10;
          if (c.linkedin_url) s += 8;
          if (c.description) s += Math.min(c.description.length / 50, 5);
          if (c.email) s += 5;
          const emailsList = c.emails ? safeJsonParse(c.emails, []) : [];
          s += emailsList.length * 3;
          const tagsList = c.tags ? safeJsonParse(c.tags, []) : [];
          s += tagsList.length * 2;
          if (c.logo_url) s += 3;
          if (c.industry) s += 2;
          if (c.size) s += 2;
          if (c.location) s += 2;
          return s;
        }

        const scored = allCompanies
          .map((c) => ({ company: c, score: scoreCompany(c) }))
          .sort((a, b) => b.score - a.score);

        const primary = scored[0].company;
        const duplicates = scored.slice(1).map((s) => s.company);
        const duplicateIds = duplicates.map((d) => d.id);

        // Merge fields: take first non-null for scalars, merge arrays
        const mergedEmails = new Set<string>();
        const mergedTags = new Set<string>();
        let bestDescription = primary.description ?? "";

        for (const c of allCompanies) {
          const emails = c.emails ? safeJsonParse<string[]>(c.emails, []) : [];
          emails.forEach((e) => mergedEmails.add(e));
          if (c.email) mergedEmails.add(c.email);

          const tags = c.tags ? safeJsonParse<string[]>(c.tags, []) : [];
          tags.forEach((t) => mergedTags.add(t));

          if (c.description && c.description.length > bestDescription.length) {
            bestDescription = c.description;
          }
        }

        // Update primary with merged data
        await context.db
          .update(companies)
          .set({
            emails: JSON.stringify([...mergedEmails]),
            tags: JSON.stringify([...mergedTags]),
            description: bestDescription || primary.description,
            website: primary.website ?? duplicates.find((d) => d.website)?.website ?? null,
            linkedin_url: primary.linkedin_url ?? duplicates.find((d) => d.linkedin_url)?.linkedin_url ?? null,
            logo_url: primary.logo_url ?? duplicates.find((d) => d.logo_url)?.logo_url ?? null,
            updated_at: new Date().toISOString(),
          })
          .where(eq(companies.id, primary.id));

        // Reassign contacts, contact_emails from duplicates to primary
        await context.db
          .update(contacts)
          .set({ company_id: primary.id, updated_at: new Date().toISOString() })
          .where(inArray(contacts.company_id, duplicateIds));

        await context.db
          .update(contactEmails)
          .set({ company_id: primary.id, updated_at: new Date().toISOString() })
          .where(inArray(contactEmails.company_id, duplicateIds));

        // Delete duplicate companies (cascade will handle remaining FKs)
        await context.db
          .delete(companies)
          .where(inArray(companies.id, duplicateIds));

        return {
          success: true,
          message: `Merged ${duplicateIds.length} companies into "${primary.name}" (ID: ${primary.id})`,
          keptCompanyId: primary.id,
          merged: duplicateIds.length,
        };
      } catch (error) {
        console.error("Error merging companies:", error);
        return {
          success: false,
          message: error instanceof Error ? error.message : "Failed to merge companies",
          keptCompanyId: null,
          merged: 0,
        };
      }
    },

    async deleteCompanies(
      _parent: unknown,
      args: MutationDeleteCompaniesArgs,
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const { companyIds } = args;
      if (companyIds.length === 0) {
        return { success: false, message: "No company IDs provided", deleted: 0 };
      }

      try {
        // Delete contacts first (cascade may not apply for all FK types)
        await context.db
          .delete(contacts)
          .where(inArray(contacts.company_id, companyIds));

        // Delete companies
        const result = await context.db
          .delete(companies)
          .where(inArray(companies.id, companyIds))
          .returning({ id: companies.id });

        return {
          success: true,
          message: `Deleted ${result.length} company(ies)`,
          deleted: result.length,
        };
      } catch (error) {
        console.error("Error deleting companies:", error);
        return {
          success: false,
          message: error instanceof Error ? error.message : "Failed to delete companies",
          deleted: 0,
        };
      }
    },

    async importCompanyWithContacts(
      _parent: unknown,
      args: MutationImportCompanyWithContactsArgs,
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const { companyName, website, contacts: rawContactInputs, skillFilter } = args.input;

      // Apply skill filter if provided (e.g. ["Python", "Rust"])
      const contactInputs = skillFilter?.length
        ? rawContactInputs.filter(c =>
            skillFilter.some(s =>
              (c.headline ?? "").toLowerCase().includes(s.toLowerCase()) ||
              c.name.toLowerCase().includes(s.toLowerCase()),
            ),
          )
        : rawContactInputs;
      // Normalize empty strings to null to avoid storing "" in the DB
      const linkedinUrl = args.input.linkedinUrl?.trim() || null;
      const errors: string[] = [];

      try {
        // Upsert company: find by linkedin_url first (most reliable), then by name
        let companyRow: typeof companies.$inferSelect | undefined;

        if (linkedinUrl) {
          const byUrl = await context.db
            .select()
            .from(companies)
            .where(eq(companies.linkedin_url, linkedinUrl))
            .limit(1);
          companyRow = byUrl[0];
        }

        if (!companyRow) {
          // Use Drizzle ilike() instead of raw sql`lower(...)` for type-safe case-insensitive match
          const byName = await context.db
            .select()
            .from(companies)
            .where(ilike(companies.name, companyName.trim()))
            .limit(1);
          companyRow = byName[0];
        }

        if (companyRow) {
          // Update missing fields
          const updates: Record<string, unknown> = {};
          if (!companyRow.website && website) updates.website = website;
          if (!companyRow.linkedin_url && linkedinUrl) updates.linkedin_url = linkedinUrl;
          if (Object.keys(updates).length > 0) {
            updates.updated_at = new Date().toISOString();
            const [updated] = await context.db
              .update(companies)
              .set(updates)
              .where(eq(companies.id, companyRow.id))
              .returning();
            companyRow = updated;
          }
        } else {
          // Create new company — use onConflictDoUpdate on unique `key` to handle race conditions
          // where two concurrent requests try to insert the same company
          const key = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          const [created] = await context.db
            .insert(companies)
            .values({
              key,
              name: companyName,
              website: website || null,
              linkedin_url: linkedinUrl,
            })
            .onConflictDoUpdate({
              target: companies.key,
              set: {
                // On conflict, fill in missing fields without overwriting existing data
                website: sql`COALESCE(${companies.website}, excluded.website)`,
                linkedin_url: sql`COALESCE(${companies.linkedin_url}, excluded.linkedin_url)`,
                updated_at: sql`now()::text`,
              },
            })
            .returning();
          companyRow = created;
        }

        if (!companyRow) {
          return {
            success: false,
            company: null,
            contactsImported: 0,
            contactsSkipped: 0,
            errors: ["Failed to create or find company"],
          };
        }

        let imported = 0;
        let skipped = 0;

        for (const input of contactInputs) {
          try {
            // Parse name
            const parts = input.name.trim().split(/\s+/);
            const firstName = parts[0] || input.name;
            const lastName = parts.slice(1).join(" ") || "";
            // Normalize empty strings to null
            const contactLinkedinUrl = input.linkedinUrl?.trim() || null;
            const contactEmail = input.workEmail?.trim() || null;

            // Check for duplicates by linkedinUrl or (firstName + lastName + companyId)
            if (contactLinkedinUrl) {
              const dupByLinkedin = await context.db
                .select({ id: contacts.id })
                .from(contacts)
                .where(eq(contacts.linkedin_url, contactLinkedinUrl))
                .limit(1);
              if (dupByLinkedin[0]) { skipped++; continue; }
            }

            // Use Drizzle ilike() instead of raw sql`lower(...)` for type-safe case-insensitive match
            const dupByName = await context.db
              .select({ id: contacts.id })
              .from(contacts)
              .where(
                and(
                  ilike(contacts.first_name, firstName),
                  ilike(contacts.last_name, lastName),
                  eq(contacts.company_id, companyRow.id),
                ),
              )
              .limit(1);

            if (dupByName[0]) { skipped++; continue; }

            await context.db.insert(contacts).values({
              first_name: firstName,
              last_name: lastName,
              email: contactEmail,
              linkedin_url: contactLinkedinUrl,
              company_id: companyRow.id,
              company: companyName,
              position: input.headline?.trim() || null,
            });
            imported++;
          } catch (err) {
            errors.push(`${input.name}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }

        return {
          success: true,
          company: companyRow,
          contactsImported: imported,
          contactsSkipped: skipped,
          errors,
        };
      } catch (error) {
        console.error("Error importing company with contacts:", error);
        return {
          success: false,
          company: null,
          contactsImported: 0,
          contactsSkipped: 0,
          errors: [error instanceof Error ? error.message : "Import failed"],
        };
      }
    },

    async importCompanies(
      _parent: unknown,
      args: MutationImportCompaniesArgs,
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      let imported = 0;
      const errors: string[] = [];

      for (const input of args.companies) {
        try {
          const key = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          const [inserted] = await context.db.insert(companies).values({
            key,
            name: input.name,
            website: input.website ?? null,
            email: input.email ?? null,
            linkedin_url: input.linkedin_url ?? null,
            location: input.location ?? null,
            size: input.size ?? null,
            description: input.description ?? null,
          }).returning({ id: companies.id });
          imported++;

          // Fire-and-forget: send to SalesCue classifier for staffing detection
          const salescueUrl = process.env.SALESCUE_URL || "http://localhost:8000";
          fetch(`${salescueUrl}/classify-company`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              company_id: inserted.id,
              name: input.name,
              description: input.description ?? "",
              website: input.website ?? "",
              location: input.location ?? "",
              size: input.size ?? "",
            }),
          }).catch((err) => {
            console.warn(`[importCompanies] Classifier fire-and-forget failed for ${input.name}:`, err.message);
          });
        } catch (err) {
          errors.push(`${input.name}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      return {
        success: errors.length === 0,
        imported,
        failed: errors.length,
        errors,
      };
    },

    async enhanceCompany(_parent: unknown, args: MutationEnhanceCompanyArgs) {
      return {
        success: false,
        message: "Enhancement is currently unavailable.",
        companyId: args.id ?? null,
        companyKey: args.key ?? null,
      };
    },

    async analyzeCompany(_parent: unknown, args: MutationAnalyzeCompanyArgs) {
      return {
        success: false,
        message: "Deep analysis is currently unavailable.",
        companyId: args.id ?? null,
        companyKey: args.key ?? null,
      };
    },

    async blockCompany(
      _parent: unknown,
      args: MutationBlockCompanyArgs,
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      const [updated] = await context.db
        .update(companies)
        .set({ blocked: true, updated_at: new Date().toISOString() })
        .where(eq(companies.id, args.id))
        .returning();
      if (!updated) throw new Error("Company not found");
      return updated;
    },

    async unblockCompany(
      _parent: unknown,
      args: MutationUnblockCompanyArgs,
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      const [updated] = await context.db
        .update(companies)
        .set({ blocked: false, updated_at: new Date().toISOString() })
        .where(eq(companies.id, args.id))
        .returning();
      if (!updated) throw new Error("Company not found");
      return updated;
    },
  },
};
