/**
 * Contact mutation resolvers.
 */

import { GraphQLError } from "graphql";
import {
  contacts,
  companies,
  contactEmails,
  type NewContact,
} from "@/db/schema";
import { eq, and, or, count, sql, max, inArray, ilike } from "drizzle-orm";
import { computeNextTouchScore } from "../reminders";
import type { GraphQLContext } from "../../context";
import { isAdminEmail } from "@/lib/admin";
import type {
  MutationCreateContactArgs,
  MutationUpdateContactArgs,
  MutationImportContactsArgs,
} from "@/__generated__/resolvers-types";
import {
  NeverBounceClient,
  extractDomainFromWebsite,
  generateEmailCandidates,
  inferEmailPattern,
  generateEmailFromPattern,
} from "@/lib/email/verification";
import { isAIContact, gatherAIContactProfile, extractLinkedInOG, fetchGitHubProfile, searchGitHubByName } from "@/lib/ai-contact-enrichment";
import { evaluateFakeAccount } from "@/lib/ml/fake-account-detector";
import { classifyContact, computeDeletionScore, parseJsonArray } from "./classification";
import { deriveContactSlug } from "@/lib/contact-slug";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core/query-builders/update";

/** Typed update object for contacts table */
type ContactUpdate = PgUpdateSetSource<typeof contacts>;

/** Strip null values from a GraphQL input to match Drizzle's update type */
function stripNulls<T extends Record<string, unknown>>(obj: T): { [K in keyof T]: Exclude<T[K], null> } {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    if (result[key] === null) delete result[key];
  }
  return result as { [K in keyof T]: Exclude<T[K], null> };
}

/** Resolve a unique slug, appending -2, -3, etc. on collision. */
async function resolveUniqueSlug(db: GraphQLContext["db"], baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let attempt = 1;
  while (true) {
    const [existing] = await db.select({ id: contacts.id }).from(contacts).where(eq(contacts.slug, slug)).limit(1);
    if (!existing) return slug;
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }
}

/** Guard that throws a GraphQLError if the caller is not an authenticated admin. */
function requireAdmin(context: GraphQLContext): void {
  if (!context.userId) {
    throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
  }
  if (!isAdminEmail(context.userEmail)) {
    throw new GraphQLError("Admin access required", { extensions: { code: "FORBIDDEN" } });
  }
}

export const contactMutations = {
  async createContact(
    _parent: unknown,
    args: MutationCreateContactArgs,
    context: GraphQLContext,
  ) {
    requireAdmin(context);
    const { firstName, lastName, emails, tags, companyId, linkedinUrl, githubHandle, telegramHandle, position, email } = args.input;

    // Dedup: if a contact with this LinkedIn URL already exists, return it
    if (linkedinUrl) {
      const normalized = linkedinUrl.replace(/\/+$/, "").split("?")[0];
      const withSlash = normalized + "/";
      const [existing] = await context.db.select().from(contacts)
        .where(or(eq(contacts.linkedin_url, normalized), eq(contacts.linkedin_url, withSlash)))
        .orderBy(sql`${contacts.slug} ASC NULLS LAST`)
        .limit(1);
      if (existing) return existing;
    }

    const mlClassification = classifyContact(position);
    const baseSlug = deriveContactSlug({
      github_handle: githubHandle,
      linkedin_url: linkedinUrl,
      first_name: firstName,
      last_name: lastName ?? "",
    });
    const slug = await resolveUniqueSlug(context.db, baseSlug);
    let rows;
    try {
      rows = await context.db
        .insert(contacts)
        .values({
          first_name: firstName,
          last_name: lastName ?? "",
          slug,
          emails: emails ? JSON.stringify(emails) : "[]",
          tags: tags ? JSON.stringify(tags) : "[]",
          ...(companyId !== undefined && { company_id: companyId }),
          ...(linkedinUrl !== undefined && { linkedin_url: linkedinUrl }),
          ...(githubHandle !== undefined && { github_handle: githubHandle }),
          ...(telegramHandle !== undefined && { telegram_handle: telegramHandle }),
          ...(position !== undefined && { position }),
          ...(email !== undefined && { email }),
          seniority: mlClassification.seniority,
          department: mlClassification.department,
          is_decision_maker: mlClassification.isDecisionMaker,
          authority_score: mlClassification.authorityScore,
          dm_reasons: JSON.stringify(mlClassification.dmReasons),
        })
        .returning();
    } catch (err: unknown) {
      if (err instanceof Error && "code" in err && (err as { code: string }).code === "23505") {
        const detail = "detail" in err ? String((err as { detail: string }).detail) : "";
        const field = detail.match(/\((\w+)\)/)?.[1] ?? "field";
        throw new GraphQLError(
          `A contact with this ${field} already exists.`,
          { extensions: { code: "CONFLICT" } },
        );
      }
      throw err;
    }
    return rows[0];
  },

  async updateContact(
    _parent: unknown,
    args: MutationUpdateContactArgs,
    context: GraphQLContext,
  ) {
    requireAdmin(context);
    const {
      firstName, lastName, emails, tags, doNotContact,
      linkedinUrl, githubHandle, telegramHandle,
      company, companyId,
      ...rest // email, position — these match DB column names
    } = args.input;
    const patch: ContactUpdate = stripNulls({ ...rest });
    if (firstName != null) patch.first_name = firstName;
    if (lastName != null) patch.last_name = lastName;
    if (emails != null) patch.emails = JSON.stringify(emails);
    if (tags != null) patch.tags = JSON.stringify(tags);
    if (doNotContact != null) patch.do_not_contact = doNotContact;
    if (linkedinUrl !== undefined) patch.linkedin_url = linkedinUrl ?? undefined;
    if (githubHandle !== undefined) patch.github_handle = githubHandle ?? undefined;
    if (telegramHandle !== undefined) patch.telegram_handle = telegramHandle ?? undefined;
    if (company !== undefined) patch.company = company ?? undefined;
    if (companyId !== undefined) patch.company_id = companyId ?? undefined;
    // Re-classify whenever position changes
    if (args.input.position !== undefined) {
      const mlClassification = classifyContact(args.input.position);
      patch.seniority = mlClassification.seniority;
      patch.department = mlClassification.department;
      patch.is_decision_maker = mlClassification.isDecisionMaker;
      patch.authority_score = mlClassification.authorityScore;
      patch.dm_reasons = JSON.stringify(mlClassification.dmReasons);
    }
    patch.updated_at = new Date().toISOString();

    let rows;
    try {
      rows = await context.db
        .update(contacts)
        .set(patch)
        .where(eq(contacts.id, args.id))
        .returning();
    } catch (err: unknown) {
      // Unique constraint violation (email, slug, github_handle)
      if (err instanceof Error && "code" in err && (err as { code: string }).code === "23505") {
        const detail = "detail" in err ? String((err as { detail: string }).detail) : "";
        const field = detail.match(/\((\w+)\)/)?.[1] ?? "field";
        throw new GraphQLError(
          `A contact with this ${field} already exists.`,
          { extensions: { code: "CONFLICT" } },
        );
      }
      throw err;
    }
    if (!rows[0]) {
      throw new GraphQLError("Contact not found", { extensions: { code: "NOT_FOUND" } });
    }
    return rows[0];
  },

  async deleteContact(
    _parent: unknown,
    args: { id: number },
    context: GraphQLContext,
  ) {
    requireAdmin(context);
    await context.db.delete(contacts).where(eq(contacts.id, args.id));
    return { success: true, message: "Contact deleted" };
  },

  async importContacts(
    _parent: unknown,
    args: MutationImportContactsArgs,
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    const errors: string[] = [];
    const valuesToInsert: NewContact[] = [];

    for (const input of args.contacts) {
      try {
        const { firstName, lastName, emails, tags, linkedinUrl, companyId, githubHandle, telegramHandle, position, email, company } = input;
        const mlClassification = classifyContact(position);
        const baseSlug = deriveContactSlug({
          github_handle: githubHandle,
          linkedin_url: linkedinUrl,
          first_name: firstName,
          last_name: lastName ?? "",
        });
        const slug = await resolveUniqueSlug(context.db, baseSlug);
        valuesToInsert.push({
          first_name: firstName,
          last_name: lastName ?? "",
          slug,
          emails: emails ? JSON.stringify(emails) : "[]",
          tags: tags ? JSON.stringify(tags) : "[]",
          nb_flags: "[]",
          ...(linkedinUrl != null && { linkedin_url: linkedinUrl }),
          ...(companyId != null && { company_id: companyId }),
          ...(githubHandle != null && { github_handle: githubHandle }),
          ...(telegramHandle != null && { telegram_handle: telegramHandle }),
          ...(position != null && { position }),
          ...(email != null && { email }),
          ...(company != null && { company }),
          seniority: mlClassification.seniority,
          department: mlClassification.department,
          is_decision_maker: mlClassification.isDecisionMaker,
          authority_score: mlClassification.authorityScore,
          dm_reasons: JSON.stringify(mlClassification.dmReasons),
        });
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    // Deduplicate: find existing contacts by email so we merge tags instead of creating duplicates
    const emailsToCheck = valuesToInsert
      .map((v) => v.email)
      .filter((e): e is string => e != null && e !== "");
    const existingByEmail = new Map<string, { id: number; tags: string }>();
    if (emailsToCheck.length > 0) {
      const existing = await context.db
        .select({ id: contacts.id, email: contacts.email, tags: contacts.tags })
        .from(contacts)
        .where(inArray(contacts.email, emailsToCheck));
      for (const row of existing) {
        if (row.email) existingByEmail.set(row.email.toLowerCase(), { id: row.id, tags: row.tags ?? "[]" });
      }
    }

    // Split: contacts with existing emails get tags merged; new contacts get inserted
    const toInsert: NewContact[] = [];
    let imported = 0;
    let updated = 0;

    for (const row of valuesToInsert) {
      const match = row.email ? existingByEmail.get(row.email.toLowerCase()) : null;
      if (match) {
        try {
          const existingTags: string[] = JSON.parse(match.tags);
          const newTags: string[] = JSON.parse(row.tags ?? "[]");
          const mergedTags = [...new Set([...existingTags, ...newTags])];
          await context.db
            .update(contacts)
            .set({ tags: JSON.stringify(mergedTags), updated_at: sql`now()::text` })
            .where(eq(contacts.id, match.id));
          updated++;
        } catch (err) {
          errors.push(err instanceof Error ? err.message : String(err));
        }
      } else {
        toInsert.push(row);
      }
    }

    if (toInsert.length > 0) {
      try {
        const result = await context.db
          .insert(contacts)
          .values(toInsert)
          .returning({ id: contacts.id });
        imported = result.length;
      } catch (err) {
        // If batch fails, fall back to individual inserts to identify bad rows
        for (const row of toInsert) {
          try {
            await context.db.insert(contacts).values(row);
            imported++;
          } catch (rowErr) {
            errors.push(rowErr instanceof Error ? rowErr.message : String(rowErr));
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      imported,
      updated,
      failed: errors.length,
      errors,
    };
  },

  // -------------------------------------------------------------------------
  // Email discovery mutations
  // -------------------------------------------------------------------------

  async findContactEmail(
    _parent: unknown,
    args: { contactId: number },
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    const apiKey = process.env.NEVERBOUNCE_API_KEY;
    if (!apiKey) {
      throw new GraphQLError("NEVERBOUNCE_API_KEY not configured", { extensions: { code: "BAD_USER_INPUT" } });
    }

    const contactRows = await context.db
      .select()
      .from(contacts)
      .where(eq(contacts.id, args.contactId))
      .limit(1);
    const contact = contactRows[0];

    if (!contact) {
      return {
        success: false,
        emailFound: false,
        email: null,
        verified: null,
        message: "Contact not found",
        candidatesTried: 0,
      };
    }

    if (contact.email && contact.email_verified) {
      return {
        success: true,
        emailFound: true,
        email: contact.email,
        verified: true,
        message: "Contact already has a verified email",
        candidatesTried: 0,
      };
    }

    if (!contact.first_name) {
      return {
        success: false,
        emailFound: false,
        email: null,
        verified: null,
        message: "Contact must have a first name",
        candidatesTried: 0,
      };
    }

    const domains: string[] = [];
    if (contact.company_id) {
      const companyRows = await context.db
        .select()
        .from(companies)
        .where(eq(companies.id, contact.company_id))
        .limit(1);
      const company = companyRows[0];
      if (company?.website) {
        const domain = extractDomainFromWebsite(company.website);
        if (domain) domains.push(domain);
      }
    }

    if (domains.length === 0) {
      return {
        success: false,
        emailFound: false,
        email: null,
        verified: null,
        message: "Company must have a website to find email",
        candidatesTried: 0,
      };
    }

    const bouncedEmails = new Set(parseJsonArray(contact.bounced_emails));
    const nbClient = new NeverBounceClient(apiKey);
    let totalCandidatesTried = 0;

    for (const domain of domains) {
      const candidates = generateEmailCandidates(
        contact.first_name,
        contact.last_name ?? "",
        domain,
      );
      const validCandidates = candidates.filter((e) => !bouncedEmails.has(e));

      if (validCandidates.length === 0) continue;
      totalCandidatesTried += validCandidates.length;

      const result = await nbClient.findVerifiedEmail(validCandidates);

      if (result) {
        await context.db
          .update(contacts)
          .set({
            email: result.email,
            email_verified: result.outcome.verified,
            nb_status: "success",
            nb_result: result.outcome.rawResult,
            nb_flags: JSON.stringify(result.outcome.flags),
            nb_suggested_correction: result.outcome.suggestedCorrection ?? null,
            nb_retry_token: result.outcome.retryToken ?? null,
            nb_execution_time_ms: result.outcome.executionTimeMs,
            updated_at: new Date().toISOString(),
          })
          .where(eq(contacts.id, args.contactId));

        return {
          success: true,
          emailFound: true,
          email: result.email,
          verified: result.outcome.verified,
          message: `Found and verified email: ${result.email}`,
          candidatesTried: totalCandidatesTried,
        };
      }
    }

    return {
      success: true,
      emailFound: false,
      email: null,
      verified: null,
      message: `No verified email found after trying ${totalCandidatesTried} candidate(s) across ${domains.length} domain(s)`,
      candidatesTried: totalCandidatesTried,
    };
  },

  async findCompanyEmails(
    _parent: unknown,
    args: { companyId: number },
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    const apiKey = process.env.NEVERBOUNCE_API_KEY;
    if (!apiKey) {
      throw new GraphQLError("NEVERBOUNCE_API_KEY not configured", { extensions: { code: "BAD_USER_INPUT" } });
    }

    const [company] = await context.db
      .select()
      .from(companies)
      .where(eq(companies.id, args.companyId))
      .limit(1);

    if (!company?.website) {
      return {
        success: false,
        message: "Company not found or has no website",
        companiesProcessed: 0,
        totalContactsProcessed: 0,
        totalEmailsFound: 0,
        errors: [],
      };
    }

    const domain = extractDomainFromWebsite(company.website);
    if (!domain) {
      return {
        success: false,
        message: `Could not extract domain from ${company.website}`,
        companiesProcessed: 0,
        totalContactsProcessed: 0,
        totalEmailsFound: 0,
        errors: [],
      };
    }

    const companyContacts = await context.db
      .select()
      .from(contacts)
      .where(eq(contacts.company_id, company.id));

    const errors: string[] = [];
    let totalContactsProcessed = 0;
    let totalEmailsFound = 0;
    const nbClient = new NeverBounceClient(apiKey);
    let foundPattern = NeverBounceClient.getDomainPattern(domain) ?? null;

    for (const contact of companyContacts) {
      if (contact.email_verified && contact.email) continue;

      const firstName = contact.first_name?.trim();
      const lastName = contact.last_name?.trim();
      if (!firstName || !lastName) continue;

      totalContactsProcessed++;

      try {
        let foundEmail: string | null = null;
        let verified = false;

        if (foundPattern) {
          const result = NeverBounceClient.verifyWithPattern(firstName, lastName, foundPattern);
          foundEmail = result.email;
          verified = true;
        } else {
          const candidates = generateEmailCandidates(firstName, lastName, domain);
          const result = await nbClient.findVerifiedEmail(candidates);
          if (result) {
            foundEmail = result.email;
            verified = result.outcome.verified;
            const pattern = inferEmailPattern(firstName, lastName, foundEmail);
            if (pattern && verified) {
              foundPattern = pattern;
              NeverBounceClient.setDomainPattern(pattern);
            }
          }
        }

        if (foundEmail) {
          await context.db
            .update(contacts)
            .set({ email: foundEmail, email_verified: verified, updated_at: new Date().toISOString() })
            .where(eq(contacts.id, contact.id));
          totalEmailsFound++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`${firstName} ${lastName}: ${msg}`);
      }
    }

    return {
      success: true,
      message: `Found ${totalEmailsFound} email${totalEmailsFound !== 1 ? "s" : ""} for ${totalContactsProcessed} contact${totalContactsProcessed !== 1 ? "s" : ""}`,
      companiesProcessed: 1,
      totalContactsProcessed,
      totalEmailsFound,
      errors,
    };
  },

  async enhanceAllContacts(
    _parent: unknown,
    _args: unknown,
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    const apiKey = process.env.NEVERBOUNCE_API_KEY;
    if (!apiKey) {
      throw new GraphQLError("NEVERBOUNCE_API_KEY not configured", { extensions: { code: "BAD_USER_INPUT" } });
    }

    const allCompanies = await context.db.select().from(companies);
    const errors: string[] = [];
    let companiesProcessed = 0;
    let totalContactsProcessed = 0;
    let totalEmailsFound = 0;

    const nbClient = new NeverBounceClient(apiKey);

    // Fetch all contacts once and group by company_id (eliminates N+1 SELECT per company)
    const allContacts = await context.db.select().from(contacts);
    const contactsByCompanyId = new Map<number, typeof allContacts>();
    for (const contact of allContacts) {
      if (contact.company_id == null) continue;
      const existing = contactsByCompanyId.get(contact.company_id);
      if (existing) {
        existing.push(contact);
      } else {
        contactsByCompanyId.set(contact.company_id, [contact]);
      }
    }

    for (const company of allCompanies) {
      if (!company.website) continue;

      const domain = extractDomainFromWebsite(company.website);
      if (!domain) continue;

      try {
        const companyContacts = contactsByCompanyId.get(company.id) ?? [];

        if (companyContacts.length === 0) continue;

        let contactsProcessedForCompany = 0;
        let emailsFoundForCompany = 0;

        let foundPattern = NeverBounceClient.getDomainPattern(domain) ?? null;

        for (const contact of companyContacts) {
          if (contact.email_verified && contact.email) continue;

          const firstName = contact.first_name?.trim();
          const lastName = contact.last_name?.trim();
          if (!firstName || !lastName) continue;

          contactsProcessedForCompany++;

          try {
            let foundEmail: string | null = null;
            let verified = false;

            if (foundPattern) {
              const result = NeverBounceClient.verifyWithPattern(firstName, lastName, foundPattern);
              foundEmail = result.email;
              verified = true;
            } else {
              const candidates = generateEmailCandidates(firstName, lastName, domain);
              const result = await nbClient.findVerifiedEmail(candidates);

              if (result) {
                foundEmail = result.email;
                verified = result.outcome.verified;

                const pattern = inferEmailPattern(firstName, lastName, foundEmail);
                if (pattern && verified) {
                  foundPattern = pattern;
                  NeverBounceClient.setDomainPattern(pattern);
                }
              }
            }

            if (foundEmail) {
              await context.db
                .update(contacts)
                .set({
                  email: foundEmail,
                  email_verified: verified,
                  updated_at: new Date().toISOString(),
                })
                .where(eq(contacts.id, contact.id));

              emailsFoundForCompany++;
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            errors.push(`Contact ${contact.id} (${firstName} ${lastName}): ${msg}`);
          }
        }

        if (contactsProcessedForCompany > 0) {
          companiesProcessed++;
          totalContactsProcessed += contactsProcessedForCompany;
          totalEmailsFound += emailsFoundForCompany;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`Company ${company.name ?? company.id}: ${msg}`);
      }
    }

    return {
      success: true,
      message: `Processed ${companiesProcessed} companies, found ${totalEmailsFound} emails for ${totalContactsProcessed} contacts`,
      companiesProcessed,
      totalContactsProcessed,
      totalEmailsFound,
      errors,
    };
  },

  async applyEmailPattern(
    _parent: unknown,
    args: { companyId: number },
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    try {
      const companyContacts = await context.db
        .select()
        .from(contacts)
        .where(eq(contacts.company_id, args.companyId));

      const verifiedContacts = companyContacts.filter(
        (c) => c.email_verified && c.email,
      );

      if (verifiedContacts.length === 0) {
        return {
          success: false,
          message: `No verified emails found. Total contacts: ${companyContacts.length}. Contacts with emails: ${companyContacts.filter((c) => c.email).length}.`,
          contactsUpdated: 0,
          pattern: null,
          contacts: [],
        };
      }

      const patternContact = verifiedContacts.find((c) => c.first_name && c.last_name);

      if (!patternContact) {
        return {
          success: false,
          message: `Found ${verifiedContacts.length} verified email(s), but none have both first and last name needed to infer pattern`,
          contactsUpdated: 0,
          pattern: null,
          contacts: [],
        };
      }

      const pattern = inferEmailPattern(
        patternContact.first_name,
        patternContact.last_name,
        patternContact.email!,
      );

      if (!pattern) {
        return {
          success: false,
          message: `Could not infer pattern from verified email '${patternContact.email}' for contact '${patternContact.first_name} ${patternContact.last_name}'`,
          contactsUpdated: 0,
          pattern: null,
          contacts: [],
        };
      }

      const contactsToProcess = companyContacts.filter((c) => {
        if (c.email_verified) return false;
        if (!c.first_name) return false;
        return !!c.last_name;
      });

      const updatedContacts = [];

      for (const contact of contactsToProcess) {
        const generatedEmail = generateEmailFromPattern(pattern, contact.first_name, contact.last_name ?? "");

        const existingMatches = contact.email
          ? contact.email.toLowerCase().trim() === generatedEmail.toLowerCase().trim()
          : false;

        if (existingMatches) {
          const rows = await context.db
            .update(contacts)
            .set({ email_verified: true, updated_at: new Date().toISOString() })
            .where(eq(contacts.id, contact.id))
            .returning();
          if (rows[0]) updatedContacts.push(rows[0]);
        } else {
          const rows = await context.db
            .update(contacts)
            .set({ email: generatedEmail, email_verified: true, updated_at: new Date().toISOString() })
            .where(eq(contacts.id, contact.id))
            .returning();
          if (rows[0]) updatedContacts.push(rows[0]);
        }
      }

      const patternLabel = `${pattern.patternType}@${pattern.domain}`;

      return {
        success: updatedContacts.length > 0,
        message: updatedContacts.length > 0
          ? `Applied pattern ${patternLabel} to ${updatedContacts.length} contacts`
          : "No contacts to update",
        contactsUpdated: updatedContacts.length,
        pattern: patternLabel,
        contacts: updatedContacts,
      };
    } catch (err) {
      console.error("[applyEmailPattern] error:", err);
      return {
        success: false,
        message: err instanceof Error ? err.message : "Failed to apply email pattern",
        contactsUpdated: 0,
        pattern: null,
        contacts: [],
      };
    }
  },

  async unverifyCompanyContacts(
    _parent: unknown,
    args: { companyId: number },
    context: GraphQLContext,
  ) {
    requireAdmin(context);
    const rows = await context.db
      .update(contacts)
      .set({ email_verified: false, updated_at: new Date().toISOString() })
      .where(eq(contacts.company_id, args.companyId))
      .returning({ id: contacts.id });
    return { success: true, count: rows.length };
  },

  async markContactEmailVerified(
    _parent: unknown,
    args: { contactId: number; verified: boolean },
    context: GraphQLContext,
  ) {
    requireAdmin(context);
    const rows = await context.db
      .update(contacts)
      .set({ email_verified: args.verified, updated_at: new Date().toISOString() })
      .where(eq(contacts.id, args.contactId))
      .returning();
    if (!rows[0]) {
      throw new GraphQLError("Contact not found", { extensions: { code: "NOT_FOUND" } });
    }
    return rows[0];
  },

  async verifyContactEmail(
    _parent: unknown,
    args: { contactId: number },
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    const apiKey = process.env.NEVERBOUNCE_API_KEY;
    if (!apiKey) {
      return { success: false, verified: null, rawResult: null, flags: null, suggestedCorrection: null, message: "NEVERBOUNCE_API_KEY not configured" };
    }

    const [contact] = await context.db
      .select()
      .from(contacts)
      .where(eq(contacts.id, args.contactId))
      .limit(1);

    if (!contact) {
      return { success: false, verified: null, rawResult: null, flags: null, suggestedCorrection: null, message: "Contact not found" };
    }

    if (!contact.email) {
      return { success: false, verified: null, rawResult: null, flags: null, suggestedCorrection: null, message: "Contact has no email" };
    }

    const nbClient = new NeverBounceClient(apiKey);
    const outcome = await nbClient.verifyEmail(contact.email);

    await context.db
      .update(contacts)
      .set({
        email_verified: outcome.verified,
        nb_status: "success",
        nb_result: outcome.rawResult,
        nb_flags: JSON.stringify(outcome.flags),
        nb_suggested_correction: outcome.suggestedCorrection ?? null,
        nb_execution_time_ms: outcome.executionTimeMs,
        updated_at: new Date().toISOString(),
      })
      .where(eq(contacts.id, args.contactId));

    return {
      success: true,
      verified: outcome.verified,
      rawResult: outcome.rawResult,
      flags: outcome.flags,
      suggestedCorrection: outcome.suggestedCorrection ?? null,
      message: outcome.verified ? "Email verified successfully" : `Email verification result: ${outcome.rawResult}`,
    };
  },

  async mergeDuplicateContacts(
    _parent: unknown,
    args: { companyId: number },
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    try {
      const companyContacts = await context.db
        .select()
        .from(contacts)
        .where(eq(contacts.company_id, args.companyId));

      if (companyContacts.length < 2) {
        return { success: true, message: "No duplicates found", mergedCount: 0, removedCount: 0 };
      }

      // Group by normalized (firstName + lastName)
      const groups = new Map<string, typeof companyContacts>();
      for (const c of companyContacts) {
        const key = `${(c.first_name ?? "").toLowerCase().trim()}|${(c.last_name ?? "").toLowerCase().trim()}`;
        const arr = groups.get(key);
        if (arr) arr.push(c);
        else groups.set(key, [c]);
      }

      let mergedCount = 0;
      let removedCount = 0;

      for (const [, group] of groups) {
        if (group.length < 2) continue;

        // Pick the most complete contact as primary
        const sorted = group.sort((a, b) => {
          let sa = 0, sb = 0;
          if (a.email) sa += 5;
          if (a.email_verified) sa += 10;
          if (a.linkedin_url) sa += 3;
          if (b.email) sb += 5;
          if (b.email_verified) sb += 10;
          if (b.linkedin_url) sb += 3;
          return sb - sa;
        });

        const primary = sorted[0];
        const dupes = sorted.slice(1);
        const dupeIds = dupes.map((d) => d.id);

        // Merge emails from duplicates
        const allEmails = new Set<string>();
        for (const c of group) {
          if (c.email) allEmails.add(c.email);
          const extras = parseJsonArray(c.emails);
          extras.forEach((e) => allEmails.add(e));
        }
        // Primary email stays as-is; rest go into emails array
        allEmails.delete(primary.email ?? "");

        // Reassign contact_emails from dupes to primary
        await context.db
          .update(contactEmails)
          .set({ contact_id: primary.id, updated_at: new Date().toISOString() })
          .where(inArray(contactEmails.contact_id, dupeIds));

        // Update primary with merged data
        await context.db
          .update(contacts)
          .set({
            emails: JSON.stringify([...allEmails]),
            linkedin_url: primary.linkedin_url ?? dupes.find((d) => d.linkedin_url)?.linkedin_url ?? null,
            position: primary.position ?? dupes.find((d) => d.position)?.position ?? null,
            updated_at: new Date().toISOString(),
          })
          .where(eq(contacts.id, primary.id));

        // Delete duplicates
        await context.db
          .delete(contacts)
          .where(inArray(contacts.id, dupeIds));

        mergedCount++;
        removedCount += dupeIds.length;
      }

      return {
        success: true,
        message: mergedCount > 0
          ? `Merged ${mergedCount} group(s), removed ${removedCount} duplicate(s)`
          : "No duplicates found",
        mergedCount,
        removedCount,
      };
    } catch (error) {
      console.error("Error merging duplicate contacts:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to merge contacts",
        mergedCount: 0,
        removedCount: 0,
      };
    }
  },

  async scoreContactsML(
    _parent: unknown,
    args: { companyId: number },
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    const rows = await context.db
      .select()
      .from(contacts)
      .where(eq(contacts.company_id, args.companyId));

    if (rows.length === 0) {
      return {
        success: true,
        message: "No contacts found for company",
        contactsScored: 0,
        decisionMakersFound: 0,
        results: [],
      };
    }

    const results: Array<{
      contactId: number;
      seniority: string;
      department: string;
      isDecisionMaker: boolean;
      authorityScore: number;
      dmReasons: string[];
    }> = [];

    // Classify all contacts first, then batch-update in a single query
    const classifications = rows.map((contact) => {
      const cls = classifyContact(contact.position);
      results.push({
        contactId: contact.id,
        seniority: cls.seniority,
        department: cls.department,
        isDecisionMaker: cls.isDecisionMaker,
        authorityScore: cls.authorityScore,
        dmReasons: cls.dmReasons,
      });
      return { id: contact.id, cls };
    });

    if (classifications.length > 0) {
      const now = new Date().toISOString();
      const classIds = classifications.map((c) => c.id);

      // Build CASE expressions for each column
      const seniorityCases = classifications.map((c) => sql`WHEN ${contacts.id} = ${c.id} THEN ${c.cls.seniority}`);
      const departmentCases = classifications.map((c) => sql`WHEN ${contacts.id} = ${c.id} THEN ${c.cls.department}`);
      const isDmCases = classifications.map((c) => sql`WHEN ${contacts.id} = ${c.id} THEN ${c.cls.isDecisionMaker}`);
      const authScoreCases = classifications.map((c) => sql`WHEN ${contacts.id} = ${c.id} THEN ${c.cls.authorityScore}`);
      const dmReasonsCases = classifications.map((c) => sql`WHEN ${contacts.id} = ${c.id} THEN ${JSON.stringify(c.cls.dmReasons)}`);

      await context.db
        .update(contacts)
        .set({
          seniority: sql`CASE ${sql.join(seniorityCases, sql` `)} END`,
          department: sql`CASE ${sql.join(departmentCases, sql` `)} END`,
          is_decision_maker: sql`CASE ${sql.join(isDmCases, sql` `)} END`,
          authority_score: sql`CASE ${sql.join(authScoreCases, sql` `)} END`,
          dm_reasons: sql`CASE ${sql.join(dmReasonsCases, sql` `)} END`,
          updated_at: now,
        })
        .where(inArray(contacts.id, classIds));
    }

    const decisionMakersFound = results.filter(r => r.isDecisionMaker).length;

    // Also compute next_touch_score for all contacts in one batch
    const contactIds = rows.map((c) => c.id);
    if (contactIds.length > 0) {
      type EmailSummary = { contact_id: number; last_sent_at: string | null; any_reply: boolean };
      const emailSummaries = await context.db
        .select({
          contact_id: contactEmails.contact_id,
          last_sent_at: max(contactEmails.sent_at).as("last_sent_at"),
          any_reply: sql<boolean>`bool_or(${contactEmails.reply_received})`.as("any_reply"),
        })
        .from(contactEmails)
        .where(inArray(contactEmails.contact_id, contactIds))
        .groupBy(contactEmails.contact_id) as EmailSummary[];

      const summaryMap = new Map(emailSummaries.map((s) => [s.contact_id, s]));
      const msPerDay = 86_400_000;
      const now = new Date().toISOString();

      // Compute scores, then batch-update in a single query (eliminates N+1 UPDATE)
      const touchUpdates = rows.map((contact) => {
        const summary = summaryMap.get(contact.id);
        const hasReply = summary?.any_reply ?? false;
        const lastSent = summary?.last_sent_at ?? null;
        const daysSince = lastSent
          ? Math.floor((Date.now() - new Date(lastSent).getTime()) / msPerDay)
          : null;
        const touchScore = computeNextTouchScore(contact.authority_score ?? 0.1, daysSince, hasReply);
        return { id: contact.id, touchScore, lastSent };
      });

      const touchScoreCases = touchUpdates.map((u) => sql`WHEN ${contacts.id} = ${u.id} THEN ${u.touchScore}`);
      const lastContactedCases = touchUpdates.map((u) => sql`WHEN ${contacts.id} = ${u.id} THEN ${u.lastSent}`);

      await context.db
        .update(contacts)
        .set({
          next_touch_score: sql`CASE ${sql.join(touchScoreCases, sql` `)} END`,
          last_contacted_at: sql`CASE ${sql.join(lastContactedCases, sql` `)} END`,
          updated_at: now,
        })
        .where(inArray(contacts.id, contactIds));
    }

    return {
      success: true,
      message: `Scored ${results.length} contact(s), found ${decisionMakersFound} decision maker(s)`,
      contactsScored: results.length,
      decisionMakersFound,
      results,
    };
  },

  async enrichAIContactProfile(
    _parent: unknown,
    args: { contactId: number },
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    const rows = await context.db
      .select()
      .from(contacts)
      .where(eq(contacts.id, args.contactId))
      .limit(1);
    const contact = rows[0];

    if (!contact) {
      return { success: false, message: "Contact not found", contactId: args.contactId, aiProfile: null };
    }

    if (!isAIContact(contact)) {
      return {
        success: false,
        message: "Contact is not AI-related (no AI/ML department or AI tag)",
        contactId: args.contactId,
        aiProfile: null,
      };
    }

    const profile = await gatherAIContactProfile(contact);
    await context.db
      .update(contacts)
      .set({ ai_profile: JSON.stringify(profile), updated_at: new Date().toISOString() })
      .where(eq(contacts.id, contact.id));

    const contactObj = { ...contact, ai_profile: JSON.stringify(profile) };
    // Re-use the Contact.aiProfile field resolver logic inline
    const aiProfileOut = {
      trigger: profile.trigger,
      enrichedAt: profile.enriched_at,
      linkedinHeadline: profile.linkedin_headline,
      linkedinBio: profile.linkedin_bio,
      githubBio: profile.github_bio,
      githubTopLanguages: profile.github_top_languages,
      githubAiRepos: profile.github_ai_repos,
      githubTotalStars: profile.github_total_stars,
      specialization: profile.specialization,
      skills: profile.skills,
      researchAreas: profile.research_areas,
      experienceLevel: profile.experience_level,
      synthesisConfidence: profile.synthesis_confidence,
      synthesisRationale: profile.synthesis_rationale,
    };
    void contactObj; // suppress unused warning

    return {
      success: true,
      message: `AI profile enriched (trigger: ${profile.trigger}, confidence: ${profile.synthesis_confidence.toFixed(2)})`,
      contactId: contact.id,
      aiProfile: aiProfileOut,
    };
  },

  async enrichAIContactsForCompany(
    _parent: unknown,
    args: { companyId: number },
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    const rows = await context.db
      .select()
      .from(contacts)
      .where(eq(contacts.company_id, args.companyId));

    const aiContacts = rows.filter(isAIContact);

    if (aiContacts.length === 0) {
      return { success: true, message: "No AI-related contacts found", enriched: 0, skipped: rows.length, errors: [] };
    }

    let enriched = 0;
    const errors: string[] = [];

    // Process in batches of 3 to avoid overwhelming external APIs
    for (let i = 0; i < aiContacts.length; i += 3) {
      const batch = aiContacts.slice(i, i + 3);
      await Promise.all(
        batch.map(async (contact) => {
          try {
            const profile = await gatherAIContactProfile(contact);
            await context.db
              .update(contacts)
              .set({ ai_profile: JSON.stringify(profile), updated_at: new Date().toISOString() })
              .where(eq(contacts.id, contact.id));
            enriched++;
          } catch (err) {
            errors.push(`Contact ${contact.id} (${contact.first_name} ${contact.last_name}): ${err instanceof Error ? err.message : String(err)}`);
          }
        }),
      );
    }

    return {
      success: true,
      message: `Enriched ${enriched}/${aiContacts.length} AI contacts (${rows.length - aiContacts.length} skipped as non-AI)`,
      enriched,
      skipped: rows.length - aiContacts.length,
      errors,
    };
  },

  // ── ML Deletion Scoring ────────────────────────────────────────────────

  async computeContactDeletionScores(
    _parent: unknown,
    args: { companyId?: number | null },
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    const rows = await context.db
      .select()
      .from(contacts)
      .where(args.companyId != null ? eq(contacts.company_id, args.companyId) : undefined);

    if (rows.length === 0) {
      return { success: true, affected: 0, message: "No contacts found" };
    }

    // Batch-load outbound email counts + reply signal per contact
    interface EmailSummary { contact_id: number; total: number; any_reply: boolean }
    const contactIds = rows.map((c) => c.id);
    const emailSummaries = await context.db
      .select({
        contact_id: contactEmails.contact_id,
        total: count(contactEmails.id),
        any_reply: sql<boolean>`bool_or(${contactEmails.reply_received})`,
      })
      .from(contactEmails)
      .where(inArray(contactEmails.contact_id, contactIds))
      .groupBy(contactEmails.contact_id) as EmailSummary[];

    const summaryMap = new Map(emailSummaries.map((s) => [s.contact_id, s]));
    const now = new Date().toISOString();

    await Promise.all(
      rows.map(async (contact) => {
        const summary = summaryMap.get(contact.id);
        const { score, reasons } = computeDeletionScore(
          contact,
          summary?.total ?? 0,
          summary?.any_reply ?? false,
        );
        await context.db
          .update(contacts)
          .set({
            deletion_score: score,
            deletion_reasons: JSON.stringify(reasons),
            updated_at: now,
          })
          .where(eq(contacts.id, contact.id));
      }),
    );

    return { success: true, affected: rows.length, message: `Scored ${rows.length} contact(s)` };
  },

  async flagContactsForDeletion(
    _parent: unknown,
    args: { threshold?: number | null },
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    const threshold = args.threshold ?? 0.50;
    const now = new Date().toISOString();

    const rows = await context.db
      .select({ id: contacts.id })
      .from(contacts)
      .where(
        and(
          sql`${contacts.deletion_score} >= ${threshold}`,
          eq(contacts.to_be_deleted, false),
        ),
      );

    if (rows.length === 0) {
      return { success: true, affected: 0, message: `No contacts above threshold ${threshold}` };
    }

    const ids = rows.map((r) => r.id);
    await context.db
      .update(contacts)
      .set({ to_be_deleted: true, deletion_flagged_at: now, updated_at: now })
      .where(inArray(contacts.id, ids));

    return {
      success: true,
      affected: ids.length,
      message: `Flagged ${ids.length} contact(s) for deletion (threshold: ${threshold})`,
    };
  },

  async unflagContactForDeletion(
    _parent: unknown,
    args: { id: number },
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    const now = new Date().toISOString();
    const rows = await context.db
      .update(contacts)
      .set({ to_be_deleted: false, deletion_flagged_at: null, updated_at: now })
      .where(eq(contacts.id, args.id))
      .returning();

    if (!rows[0]) {
      throw new GraphQLError(`Contact ${args.id} not found`, { extensions: { code: "NOT_FOUND" } });
    }
    return rows[0];
  },

  async purgeDeletedContacts(
    _parent: unknown,
    args: { companyId?: number | null },
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    const condition = args.companyId != null
      ? and(eq(contacts.to_be_deleted, true), eq(contacts.company_id, args.companyId))
      : eq(contacts.to_be_deleted, true);

    const toDelete = await context.db
      .select({ id: contacts.id })
      .from(contacts)
      .where(condition);

    if (toDelete.length === 0) {
      return { success: true, affected: 0, message: "No contacts flagged for deletion" };
    }

    const ids = toDelete.map((r) => r.id);
    await context.db.delete(contacts).where(inArray(contacts.id, ids));

    return {
      success: true,
      affected: ids.length,
      message: `Purged ${ids.length} contact(s)`,
    };
  },

  async verifyContactAuthenticity(
    _parent: unknown,
    args: { contactId: number },
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    const [contact] = await context.db
      .select()
      .from(contacts)
      .where(eq(contacts.id, args.contactId))
      .limit(1);

    if (!contact) {
      return {
        success: false,
        contactId: args.contactId,
        verdict: "suspicious",
        authenticityScore: 0,
        flags: ["contact_not_found"],
        recommendations: ["Contact not found in database"],
        skillMatch: null,
      };
    }

    // Parallel: LinkedIn OG + GitHub discovery
    const [linkedinOG, githubResult] = await Promise.all([
      contact.linkedin_url ? extractLinkedInOG(contact.linkedin_url) : Promise.resolve(null),
      contact.github_handle
        ? fetchGitHubProfile(contact.github_handle).then(p => ({
            found: !!p,
            topLanguages: p?.topLanguages ?? [],
            login: contact.github_handle!,
          }))
        : searchGitHubByName(contact.first_name, contact.last_name).then(r => ({
            found: !!r,
            topLanguages: r?.topLanguages ?? [],
            login: r?.login ?? null,
          })),
    ]);

    // If we discovered a GitHub handle, save it
    if (githubResult.login && !contact.github_handle) {
      await context.db
        .update(contacts)
        .set({ github_handle: githubResult.login, updated_at: new Date().toISOString() })
        .where(eq(contacts.id, contact.id));
    }

    const result = evaluateFakeAccount({
      contact,
      linkedinOG,
      githubTopLanguages: githubResult.topLanguages,
      githubFound: githubResult.found,
      targetSkills: ["Python", "Rust"],
    });

    // Persist results
    await context.db
      .update(contacts)
      .set({
        authenticity_score: result.authenticityScore,
        authenticity_verdict: result.verdict,
        authenticity_flags: JSON.stringify(result.flags),
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .where(eq(contacts.id, contact.id));

    return {
      success: true,
      contactId: contact.id,
      verdict: result.verdict,
      authenticityScore: result.authenticityScore,
      flags: result.flags,
      recommendations: result.recommendations,
      skillMatch: result.skillMatch,
    };
  },

  async verifyCompanyContacts(
    _parent: unknown,
    args: { companyId: number; skillFilter?: string[] | null },
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    const conditions = [eq(contacts.company_id, args.companyId)];

    // Optional skill filter on position/headline
    if (args.skillFilter?.length) {
      const skillConditions = args.skillFilter.map(s =>
        ilike(contacts.position, `%${s}%`),
      );
      conditions.push(or(...skillConditions)!);
    }

    const rows = await context.db
      .select()
      .from(contacts)
      .where(and(...conditions));

    const results: Array<{
      success: boolean;
      contactId: number;
      verdict: string;
      authenticityScore: number;
      flags: string[];
      recommendations: string[];
      skillMatch: { claimedSkills: string[]; githubLanguages: string[]; matched: boolean } | null;
    }> = [];

    // Process in batches of 3 to respect GitHub API rate limits
    for (let i = 0; i < rows.length; i += 3) {
      const batch = rows.slice(i, i + 3);
      const batchResults = await Promise.all(
        batch.map(async (contact) => {
          const [linkedinOG, githubResult] = await Promise.all([
            contact.linkedin_url ? extractLinkedInOG(contact.linkedin_url) : Promise.resolve(null),
            contact.github_handle
              ? fetchGitHubProfile(contact.github_handle).then(p => ({
                  found: !!p,
                  topLanguages: p?.topLanguages ?? [],
                  login: contact.github_handle!,
                }))
              : searchGitHubByName(contact.first_name, contact.last_name).then(r => ({
                  found: !!r,
                  topLanguages: r?.topLanguages ?? [],
                  login: r?.login ?? null,
                })),
          ]);

          if (githubResult.login && !contact.github_handle) {
            await context.db
              .update(contacts)
              .set({ github_handle: githubResult.login, updated_at: new Date().toISOString() })
              .where(eq(contacts.id, contact.id));
          }

          const result = evaluateFakeAccount({
            contact,
            linkedinOG,
            githubTopLanguages: githubResult.topLanguages,
            githubFound: githubResult.found,
            targetSkills: args.skillFilter ?? ["Python", "Rust"],
            isRecruitingFirm: true,
          });

          await context.db
            .update(contacts)
            .set({
              authenticity_score: result.authenticityScore,
              authenticity_verdict: result.verdict,
              authenticity_flags: JSON.stringify(result.flags),
              verified_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .where(eq(contacts.id, contact.id));

          return {
            success: true,
            contactId: contact.id,
            verdict: result.verdict,
            authenticityScore: result.authenticityScore,
            flags: result.flags,
            recommendations: result.recommendations,
            skillMatch: result.skillMatch,
          };
        }),
      );
      results.push(...batchResults);
    }

    const verified = results.filter(r => r.verdict === "verified").length;
    const review = results.filter(r => r.verdict === "review").length;
    const suspicious = results.filter(r => r.verdict === "suspicious").length;

    return {
      success: true,
      totalChecked: results.length,
      verified,
      review,
      suspicious,
      results,
    };
  },

  /**
   * Re-enrich all sourced candidates for an opportunity with deep GitHub data.
   * Fetches activity metrics, recent repos, push counts — then re-scores.
   */
  async enrichOpportunityCandidates(
    _parent: unknown,
    args: { opportunityId: string },
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    // Find all contacts tagged with this opportunity
    const rows = await context.db
      .select()
      .from(contacts)
      .where(sql`${contacts.tags}::text LIKE ${"%" + `opp:${args.opportunityId}` + "%"}`);

    if (rows.length === 0) {
      return { success: true, message: "No candidates found for this opportunity", enriched: 0, skipped: 0, errors: [] };
    }

    let enriched = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Process in batches of 3 to respect GitHub rate limits
    for (let i = 0; i < rows.length; i += 3) {
      const batch = rows.slice(i, i + 3);
      await Promise.all(
        batch.map(async (contact) => {
          try {
            // Skip if no GitHub handle — nothing to enrich
            if (!contact.github_handle) {
              skipped++;
              return;
            }

            const profile = await gatherAIContactProfile(contact);
            await context.db
              .update(contacts)
              .set({
                ai_profile: JSON.stringify(profile),
                updated_at: new Date().toISOString(),
              })
              .where(eq(contacts.id, contact.id));
            enriched++;
          } catch (err) {
            errors.push(
              `${contact.first_name} ${contact.last_name}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }),
      );
    }

    return {
      success: true,
      message: `Enriched ${enriched}/${rows.length} candidates (${skipped} skipped — no GitHub handle)`,
      enriched,
      skipped,
      errors,
    };
  },
};
