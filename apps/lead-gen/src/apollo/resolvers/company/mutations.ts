/**
 * Company mutation resolvers.
 */

import { GraphQLError } from "graphql";
import {
  companies,
  companyFacts,
  companySnapshots,
  contacts,
  contactEmails,
} from "@/db/schema";
import type {
  NewCompany,
  NewCompanyFact,
  NewCompanySnapshot,
} from "@/db/schema";
import { eq, and, inArray, ilike, sql } from "drizzle-orm";
import type { GraphQLContext } from "../../context";
import { isAdminEmail } from "@/lib/admin";
import type {
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
import { safeJsonParse } from "./utils";

/** Guard that throws a GraphQLError if the caller is not an authenticated admin. */
function requireAdmin(context: GraphQLContext): void {
  if (!context.userId) {
    throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
  }
  if (!isAdminEmail(context.userEmail)) {
    throw new GraphQLError("Admin access required", { extensions: { code: "FORBIDDEN" } });
  }
}

export const companyMutations = {
  async createCompany(
    _parent: unknown,
    args: MutationCreateCompanyArgs,
    context: GraphQLContext,
  ) {
    try {
      requireAdmin(context);

      const insertData = { ...args.input } as NewCompany;

      // Validate category enum
      if (args.input.category) {
        const validCategories = ["CONSULTANCY", "UNKNOWN"];
        const category = args.input.category.toUpperCase();
        insertData.category = validCategories.includes(category) ? category as NewCompany["category"] : "UNKNOWN";
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
      requireAdmin(context);

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
        throw new GraphQLError("Company not found", { extensions: { code: "NOT_FOUND" } });
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
      requireAdmin(context);

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
      requireAdmin(context);

      const insertedFacts = [];

      for (const fact of args.facts) {
        const insertData = {
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
        } as NewCompanyFact;

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
      requireAdmin(context);

      const insertData = {
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
      } as NewCompanySnapshot;

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
    requireAdmin(context);

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
    requireAdmin(context);

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
    requireAdmin(context);

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
        // Create new company -- use onConflictDoUpdate on unique `key` to handle race conditions
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
    requireAdmin(context);

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
          industry: input.industry ?? null,
        }).onConflictDoUpdate({
          target: companies.key,
          set: {
            website: sql`COALESCE(${companies.website}, excluded.website)`,
            linkedin_url: sql`COALESCE(${companies.linkedin_url}, excluded.linkedin_url)`,
            description: sql`COALESCE(${companies.description}, excluded.description)`,
            location: sql`COALESCE(${companies.location}, excluded.location)`,
            industry: sql`COALESCE(${companies.industry}, excluded.industry)`,
            size: sql`COALESCE(${companies.size}, excluded.size)`,
            updated_at: sql`now()::text`,
          },
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
            industry: input.industry ?? "",
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
    requireAdmin(context);
    const [updated] = await context.db
      .update(companies)
      .set({ blocked: true, updated_at: new Date().toISOString() })
      .where(eq(companies.id, args.id))
      .returning();
    if (!updated) {
      throw new GraphQLError("Company not found", { extensions: { code: "NOT_FOUND" } });
    }
    return updated;
  },

  async unblockCompany(
    _parent: unknown,
    args: MutationUnblockCompanyArgs,
    context: GraphQLContext,
  ) {
    requireAdmin(context);
    const [updated] = await context.db
      .update(companies)
      .set({ blocked: false, updated_at: new Date().toISOString() })
      .where(eq(companies.id, args.id))
      .returning();
    if (!updated) {
      throw new GraphQLError("Company not found", { extensions: { code: "NOT_FOUND" } });
    }
    return updated;
  },
};
