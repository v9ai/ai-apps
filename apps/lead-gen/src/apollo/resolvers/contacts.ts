import { contacts, companies, contactEmails, type NewContact } from "@/db/schema";
import { resend } from "@/lib/resend";
import { eq, and, like, or, count, desc, sql, max } from "drizzle-orm";
import { computeNextTouchScore } from "./reminders";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";
import {
  NeverBounceClient,
  extractDomainFromWebsite,
  generateEmailCandidates,
  inferEmailPattern,
  generateEmailFromPattern,
} from "@/lib/neverbounce";

// ─── ML Contact Classification ────────────────────────────────────────────────

interface ContactClassification {
  seniority: string;
  department: string;
  authorityScore: number;
  isDecisionMaker: boolean;
  dmReasons: string[];
}

/**
 * Classify a contact's job title into seniority tier, department,
 * authority score (0–1), and decision-maker flag.
 *
 * Mirrors the Rust `classify_contact()` in crates/leadgen/src/scoring/authority.rs.
 * This TypeScript version is used for real-time scoring in the GraphQL resolver
 * (Vercel serverless); the Rust version is used for offline batch scoring via
 * `leadgen score-neon --company <key>`.
 */
function classifyContact(position: string | null | undefined): ContactClassification {
  const raw = position?.trim() ?? "";
  if (!raw) {
    return { seniority: "IC", department: "Other", authorityScore: 0.10, isDecisionMaker: false, dmReasons: ["No title provided"] };
  }

  const t = raw.toLowerCase();

  // ── Seniority ────────────────────────────────────────────────────────────
  let seniority = "IC";
  let authorityScore = 0.10;
  let seniorityReason = `Title '${raw}' classified as IC`;

  const C_LEVEL_PATTERNS = [
    "chief executive", "chief technology", "chief technical", "chief product",
    "chief operating", "chief financial", "chief revenue", "chief marketing",
    "chief data", "chief ai", "chief machine learning", "chief science",
    "chief information", "chief growth", "chief people", "chief legal",
    "chief compliance", "chief architect",
  ];
  const isCLevel =
    C_LEVEL_PATTERNS.some(p => t.includes(p)) ||
    /\bceo\b/.test(t) || /\bcto\b/.test(t) || /\bcfo\b/.test(t) ||
    /\bcoo\b/.test(t) || /\bcpo\b/.test(t) || /\bcro\b/.test(t) || /\bcmo\b/.test(t);

  if (isCLevel) {
    seniority = "C-level"; authorityScore = 1.0; seniorityReason = `Title matches C-level pattern`;
  } else if (["founder", "co-founder", "cofounder", "president", "co founder"].some(p => t.includes(p))) {
    seniority = "Founder"; authorityScore = 0.95; seniorityReason = "Title matches Founder pattern";
  } else if (["managing partner", "general partner", " partner", "equity partner"].some(p => t.includes(p))) {
    seniority = "Partner"; authorityScore = 0.90; seniorityReason = "Title matches Partner pattern";
  } else if (
    ["vice president", "vp of", "vp,", "vp engineering", "vp product", "vp sales",
     "vp marketing", "vp business", "vp operations", "vp ai", "vp technology",
     "vp research", "vp data", "vp partnerships", "vp finance", "vp strategy"].some(p => t.includes(p)) ||
    t.startsWith("vp ") || t === "vp"
  ) {
    seniority = "VP"; authorityScore = 0.85; seniorityReason = "Title matches VP pattern";
  } else if (
    ["director of", "director,", "director ", "head of", "general manager",
     "managing director", "regional director", "executive director",
     "associate director", "group lead", "group manager"].some(p => t.includes(p)) ||
    t === "director"
  ) {
    seniority = "Director"; authorityScore = 0.75; seniorityReason = "Title matches Director/Head-of pattern";
  } else if (
    ["engineering manager", "product manager", "project manager", "program manager",
     "team lead", "tech lead", "technical lead", "team manager", "area manager",
     "delivery manager", "account manager", "practice lead"].some(p => t.includes(p)) ||
    (t.includes("manager") && !t.includes("general manager")) ||
    t.endsWith(" lead")
  ) {
    seniority = "Manager"; authorityScore = 0.50; seniorityReason = "Title matches Manager/Lead pattern";
  } else if (["senior ", "staff ", "principal ", "sr. ", "sr "].some(p => t.includes(p))) {
    seniority = "Senior"; authorityScore = 0.25; seniorityReason = "Title matches Senior/Staff/Principal pattern";
  }

  // ── Department ───────────────────────────────────────────────────────────
  let department = "Other";
  let deptReason = "No department keyword found";

  const AI_ML = [
    "artificial intelligence", " ai ", "machine learning", "deep learning",
    "natural language", " nlp", "computer vision", " cv ", "data science",
    "data scientist", "mlops", "ml engineer", "llm", "large language",
    "language model", "generative ai", "reinforcement learning", "neural network",
    "foundation model", "ai research", "ai engineer", "ai architect", "ai lead",
    "ai director", "head of ai", "vp ai", "chief ai",
  ];
  if (AI_ML.some(p => t.includes(p)) || t.startsWith("ai ") || t.endsWith(" ai")) {
    department = "AI/ML"; deptReason = "Title contains AI/ML keywords";
  } else if (["research scientist", "research engineer", "researcher", "r&d",
              "research and development", "scientist", " lab ", "applied science"].some(p => t.includes(p))) {
    department = "Research"; deptReason = "Title contains Research keywords";
  } else if (["engineer", "developer", "software", "backend", "frontend", "full stack",
              "fullstack", "platform", "infrastructure", "devops", "site reliability",
              "sre", "cloud architect", "solutions architect", "architect", "cto",
              "vp eng", "engineering manager", "head of engineering"].some(p => t.includes(p))) {
    department = "Engineering"; deptReason = "Title contains Engineering keywords";
  } else if (["product manager", "product owner", "product lead", "head of product",
              "vp product", "cpo", "ux", "user experience", "product design",
              "ui designer", "ux designer"].some(p => t.includes(p))) {
    department = "Product"; deptReason = "Title contains Product keywords";
  } else if (["sales", "business development", "account executive", "account manager",
              "commercial", "revenue", "partnerships", "partner manager",
              "strategic alliance", "cro", "pre-sales", "presales",
              "solution selling", "enterprise", "channel"].some(p => t.includes(p))) {
    department = "Sales/BD"; deptReason = "Title contains Sales/BD keywords";
  } else if (["marketing", "growth", "cmo", "brand", "content", "demand generation",
              "seo", "paid acquisition", "pr ", "public relations", "communications",
              "product marketing"].some(p => t.includes(p))) {
    department = "Marketing"; deptReason = "Title contains Marketing keywords";
  } else if (["recruiter", "recruiting", "recruitment", "talent acquisition",
              "talent partner", "head of talent", "head of people", "chief people",
              "people operations", "hr manager", "hrbp", "human resources",
              "people & culture", "people and culture", "people team"].some(p => t.includes(p))) {
    department = "HR/Recruiting"; deptReason = "Title contains HR/Recruiting keywords (gatekeeper)";
  } else if (["finance", "cfo", "controller", "accounting", "treasurer",
              "financial", "fp&a", "investor relations"].some(p => t.includes(p))) {
    department = "Finance"; deptReason = "Title contains Finance keywords";
  } else if (["operations", "coo", "general manager", "chief of staff", "strategy",
              "transformation", "process", "supply chain", "program operations"].some(p => t.includes(p))) {
    department = "Operations"; deptReason = "Title contains Operations keywords";
  }

  // ── Gatekeeper penalty ───────────────────────────────────────────────────
  const reasons: string[] = [seniorityReason, deptReason];
  let effectiveScore = authorityScore;
  if (department === "HR/Recruiting") {
    effectiveScore = authorityScore * 0.4;
    reasons.push("HR/Recruiting contacts are gatekeepers, not hiring DMs");
  }

  const isDecisionMaker = effectiveScore >= 0.70;
  if (isDecisionMaker) reasons.push(`Authority score ${effectiveScore.toFixed(2)} ≥ 0.70 threshold`);

  return {
    seniority,
    department,
    authorityScore: Math.round(effectiveScore * 100) / 100,
    isDecisionMaker,
    dmReasons: reasons,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Safely parse JSON arrays with proper error handling and logging
 * Prevents crashes from malformed JSON data in database
 */
function parseJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    return JSON.parse(val);
  } catch (error) {
    console.warn("[parseJsonArray] Failed to parse JSON:", {
      error: error instanceof Error ? error.message : String(error),
      valueLength: val?.length,
      valuePreview: val?.substring(0, 100),
    });
    return [];
  }
}

const Contact = {
  emails(parent: any) {
    return parseJsonArray(parent.emails);
  },
  bouncedEmails(parent: any) {
    return parseJsonArray(parent.bounced_emails);
  },
  nbFlags(parent: any) {
    return parseJsonArray(parent.nb_flags);
  },
  tags(parent: any) {
    return parseJsonArray(parent.tags);
  },
  firstName(parent: any) {
    return parent.first_name;
  },
  lastName(parent: any) {
    return parent.last_name;
  },
  linkedinUrl(parent: any) {
    return parent.linkedin_url ?? null;
  },
  companyId(parent: any) {
    return parent.company_id ?? null;
  },
  userId(parent: any) {
    return parent.user_id ?? null;
  },
  nbStatus(parent: any) {
    return parent.nb_status ?? null;
  },
  nbResult(parent: any) {
    return parent.nb_result ?? null;
  },
  nbSuggestedCorrection(parent: any) {
    return parent.nb_suggested_correction ?? null;
  },
  nbRetryToken(parent: any) {
    return parent.nb_retry_token ?? null;
  },
  nbExecutionTimeMs(parent: any) {
    return parent.nb_execution_time_ms ?? null;
  },
  emailVerified(parent: any) {
    return (parent.email_verified as unknown) === 1 || parent.email_verified === true;
  },
  doNotContact(parent: any) {
    return (parent.do_not_contact as unknown) === 1 || parent.do_not_contact === true;
  },
  githubHandle(parent: any) {
    return parent.github_handle ?? null;
  },
  telegramHandle(parent: any) {
    return parent.telegram_handle ?? null;
  },
  createdAt(parent: any) {
    return parent.created_at;
  },
  updatedAt(parent: any) {
    return parent.updated_at;
  },
  // ML-derived decision-maker fields
  seniority(parent: any) {
    return parent.seniority ?? null;
  },
  department(parent: any) {
    return parent.department ?? null;
  },
  isDecisionMaker(parent: any) {
    return (parent.is_decision_maker as unknown) === true ||
           (parent.is_decision_maker as unknown) === 1;
  },
  authorityScore(parent: any) {
    return parent.authority_score ?? 0.0;
  },
  dmReasons(parent: any) {
    return parseJsonArray(parent.dm_reasons);
  },
  nextTouchScore(parent: any) {
    return parent.next_touch_score ?? 0.0;
  },
  lastContactedAt(parent: any) {
    return parent.last_contacted_at ?? null;
  },
};

export const contactResolvers = {
  Contact,

  Query: {
    async contacts(
      _parent: unknown,
      args: { companyId?: number; search?: string; limit?: number; offset?: number },
      context: GraphQLContext,
    ) {
      const limit = Math.min(args.limit ?? 50, 200);
      const offset = args.offset ?? 0;

      const conditions = [];
      if (args.companyId != null) {
        conditions.push(eq(contacts.company_id, args.companyId));
      }
      if (args.search) {
        const term = `%${args.search}%`;
        conditions.push(
          or(
            like(contacts.first_name, term),
            like(contacts.last_name, term),
            like(contacts.email, term),
            like(contacts.company, term),
          ),
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, countRows] = await Promise.all([
        context.db
          .select()
          .from(contacts)
          .where(where)
          .limit(limit + 1)
          .offset(offset),
        context.db
          .select({ value: count() })
          .from(contacts)
          .where(where),
      ]);

      return {
        contacts: rows.slice(0, limit),
        totalCount: countRows[0]?.value ?? 0,
      };
    },

    async contact(_parent: unknown, args: { id: number }, context: GraphQLContext) {
      const rows = await context.db
        .select()
        .from(contacts)
        .where(eq(contacts.id, args.id))
        .limit(1);
      return rows[0] ?? null;
    },

    async contactByEmail(
      _parent: unknown,
      args: { email: string },
      context: GraphQLContext,
    ) {
      const rows = await context.db
        .select()
        .from(contacts)
        .where(eq(contacts.email, args.email))
        .limit(1);
      return rows[0] ?? null;
    },

    async contactEmails(
      _parent: unknown,
      args: { contactId: number },
      context: GraphQLContext,
    ) {
      return context.db
        .select()
        .from(contactEmails)
        .where(eq(contactEmails.contact_id, args.contactId))
        .orderBy(contactEmails.created_at);
    },

    async companyContactEmails(
      _parent: unknown,
      args: { companyId: number },
      context: GraphQLContext,
    ) {
      return context.db
        .select({
          id: contactEmails.id,
          contact_id: contactEmails.contact_id,
          resend_id: contactEmails.resend_id,
          from_email: contactEmails.from_email,
          to_emails: contactEmails.to_emails,
          subject: contactEmails.subject,
          text_content: contactEmails.text_content,
          status: contactEmails.status,
          sent_at: contactEmails.sent_at,
          scheduled_at: contactEmails.scheduled_at,
          delivered_at: contactEmails.delivered_at,
          opened_at: contactEmails.opened_at,
          recipient_name: contactEmails.recipient_name,
          error_message: contactEmails.error_message,
          sequence_type: contactEmails.sequence_type,
          sequence_number: contactEmails.sequence_number,
          reply_received: contactEmails.reply_received,
          followup_status: contactEmails.followup_status,
          company_id: contactEmails.company_id,
          created_at: contactEmails.created_at,
          updated_at: contactEmails.updated_at,
          contact_first_name: contacts.first_name,
          contact_last_name: contacts.last_name,
          contact_position: contacts.position,
        })
        .from(contactEmails)
        .innerJoin(contacts, eq(contactEmails.contact_id, contacts.id))
        .where(eq(contacts.company_id, args.companyId))
        .orderBy(desc(contactEmails.created_at));
    },

    async resendEmail(_parent: unknown, args: { resendId: string }) {
      const data = await resend.instance.getEmail(args.resendId);
      if (!data) return null;
      return {
        id: data.id,
        from: data.from,
        to: Array.isArray(data.to) ? data.to : [data.to],
        subject: data.subject ?? null,
        text: data.text ?? null,
        html: data.html ?? null,
        lastEvent: data.last_event ?? null,
        createdAt: data.created_at,
        scheduledAt: data.scheduled_at ?? null,
        cc: data.cc ?? null,
        bcc: data.bcc ?? null,
      };
    },
  },

  Mutation: {
    async createContact(
      _parent: unknown,
      args: { input: any },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      const { firstName, lastName, emails, tags, companyId, linkedinUrl, githubHandle, telegramHandle, position, email } = args.input;
      const mlClassification = classifyContact(position);
      const rows = await context.db
        .insert(contacts)
        .values({
          first_name: firstName,
          last_name: lastName ?? "",
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
      return rows[0];
    },

    async updateContact(
      _parent: unknown,
      args: { id: number; input: any },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      const { firstName, lastName, emails, tags, doNotContact, ...rest } = args.input;
      const patch: Record<string, unknown> = { ...rest };
      if (firstName !== undefined) patch.first_name = firstName;
      if (lastName !== undefined) patch.last_name = lastName;
      if (emails !== undefined) patch.emails = JSON.stringify(emails);
      if (tags !== undefined) patch.tags = JSON.stringify(tags);
      if (doNotContact !== undefined) patch.do_not_contact = doNotContact;
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

      const rows = await context.db
        .update(contacts)
        .set(patch)
        .where(eq(contacts.id, args.id))
        .returning();
      if (!rows[0]) throw new Error("Contact not found");
      return rows[0];
    },

    async deleteContact(
      _parent: unknown,
      args: { id: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      await context.db.delete(contacts).where(eq(contacts.id, args.id));
      return { success: true, message: "Contact deleted" };
    },

    async importContacts(
      _parent: unknown,
      args: { contacts: any[] },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const errors: string[] = [];
      const valuesToInsert: NewContact[] = [];

      for (const input of args.contacts) {
        try {
          const { firstName, lastName, emails, tags, linkedinUrl, companyId, githubHandle, telegramHandle, position, email, company } = input;
          const mlClassification = classifyContact(position);
          valuesToInsert.push({
            first_name: firstName,
            last_name: lastName ?? "",
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

      let imported = 0;
      if (valuesToInsert.length > 0) {
        try {
          const result = await context.db
            .insert(contacts)
            .values(valuesToInsert)
            .returning({ id: contacts.id });
          imported = result.length;
        } catch (err) {
          // If batch fails, fall back to individual inserts to identify bad rows
          for (const row of valuesToInsert) {
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
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const apiKey = process.env.NEVERBOUNCE_API_KEY;
      if (!apiKey) {
        throw new Error("NEVERBOUNCE_API_KEY not configured");
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
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const apiKey = process.env.NEVERBOUNCE_API_KEY;
      if (!apiKey) {
        throw new Error("NEVERBOUNCE_API_KEY not configured");
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
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const apiKey = process.env.NEVERBOUNCE_API_KEY;
      if (!apiKey) {
        throw new Error("NEVERBOUNCE_API_KEY not configured");
      }

      const allCompanies = await context.db.select().from(companies);
      const errors: string[] = [];
      let companiesProcessed = 0;
      let totalContactsProcessed = 0;
      let totalEmailsFound = 0;

      const nbClient = new NeverBounceClient(apiKey);

      for (const company of allCompanies) {
        if (!company.website) continue;

        const domain = extractDomainFromWebsite(company.website);
        if (!domain) continue;

        try {
          const companyContacts = await context.db
            .select()
            .from(contacts)
            .where(eq(contacts.company_id, company.id));

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
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      try {
        const companyContacts = await context.db
          .select()
          .from(contacts)
          .where(eq(contacts.company_id, args.companyId));

        const verifiedContacts = companyContacts.filter(
          (c) => (c.email_verified === true || (c.email_verified as unknown) === 1) && c.email,
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
          if (c.email_verified === true || (c.email_verified as unknown) === 1) return false;
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
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
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
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      const rows = await context.db
        .update(contacts)
        .set({ email_verified: args.verified, updated_at: new Date().toISOString() })
        .where(eq(contacts.id, args.contactId))
        .returning();
      if (!rows[0]) throw new Error("Contact not found");
      return rows[0];
    },

    async verifyContactEmail(
      _parent: unknown,
      args: { contactId: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

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
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

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
            .where(sql`${contactEmails.contact_id} IN (${sql.join(dupeIds.map((id) => sql`${id}`), sql`, `)})`);

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
            .where(sql`${contacts.id} IN (${sql.join(dupeIds.map((id) => sql`${id}`), sql`, `)})`);

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
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

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

      for (const contact of rows) {
        const cls = classifyContact(contact.position);
        await context.db
          .update(contacts)
          .set({
            seniority: cls.seniority,
            department: cls.department,
            is_decision_maker: cls.isDecisionMaker,
            authority_score: cls.authorityScore,
            dm_reasons: JSON.stringify(cls.dmReasons),
            updated_at: new Date().toISOString(),
          })
          .where(eq(contacts.id, contact.id));

        results.push({
          contactId: contact.id,
          seniority: cls.seniority,
          department: cls.department,
          isDecisionMaker: cls.isDecisionMaker,
          authorityScore: cls.authorityScore,
          dmReasons: cls.dmReasons,
        });
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
          .where(sql`${contactEmails.contact_id} = ANY(ARRAY[${sql.join(contactIds.map(id => sql`${id}`), sql`, `)}]::int[])`)
          .groupBy(contactEmails.contact_id) as EmailSummary[];

        const summaryMap = new Map(emailSummaries.map((s) => [s.contact_id, s]));
        const msPerDay = 86_400_000;

        for (const contact of rows) {
          const summary = summaryMap.get(contact.id);
          const hasReply = summary?.any_reply ?? false;
          const lastSent = summary?.last_sent_at ?? null;
          const daysSince = lastSent
            ? Math.floor((Date.now() - new Date(lastSent).getTime()) / msPerDay)
            : null;
          const touchScore = computeNextTouchScore(contact.authority_score ?? 0.1, daysSince, hasReply);

          await context.db
            .update(contacts)
            .set({ next_touch_score: touchScore, last_contacted_at: lastSent, updated_at: new Date().toISOString() })
            .where(eq(contacts.id, contact.id));
        }
      }

      return {
        success: true,
        message: `Scored ${results.length} contact(s), found ${decisionMakersFound} decision maker(s)`,
        contactsScored: results.length,
        decisionMakersFound,
        results,
      };
    },
  },

  // Company.contacts field resolver
  Company: {
    async contacts(parent: any, _args: any, context: GraphQLContext) {
      return context.loaders.contactsByCompany.load(parent.id);
    },
  },

  ContactEmail: {
    contactId: (parent: any) => parent.contact_id,
    resendId: (parent: any) => parent.resend_id,
    fromEmail: (parent: any) => parent.from_email,
    toEmails: (parent: any) => parseJsonArray(parent.to_emails),
    textContent: (parent: any) => parent.text_content ?? null,
    sentAt: (parent: any) => parent.sent_at ?? null,
    scheduledAt: (parent: any) => parent.scheduled_at ?? null,
    deliveredAt: (parent: any) => parent.delivered_at ?? null,
    openedAt: (parent: any) => parent.opened_at ?? null,
    recipientName: (parent: any) => parent.recipient_name ?? null,
    errorMessage: (parent: any) => parent.error_message ?? null,
    parentEmailId: (parent: any) => parent.parent_email_id ?? null,
    sequenceType: (parent: any) => parent.sequence_type ?? null,
    sequenceNumber: (parent: any) => parent.sequence_number ?? null,
    replyReceived: (parent: any) =>
      (parent.reply_received as unknown) === 1 || parent.reply_received === true,
    replyReceivedAt: (parent: any) => parent.reply_received_at ?? null,
    followupStatus: (parent: any) => parent.followup_status ?? null,
    companyId: (parent: any) => parent.company_id ?? null,
    ccEmails: (parent: any) => parseJsonArray(parent.cc_emails),
    replyToEmails: (parent: any) => parseJsonArray(parent.reply_to_emails),
    htmlContent: (parent: any) => parent.html_content ?? null,
    attachments: (parent: any) => parent.attachments ? JSON.parse(parent.attachments) : [],
    tags: (parent: any) => parseJsonArray(parent.tags),
    headers: (parent: any) => parent.headers ? JSON.parse(parent.headers) : [],
    idempotencyKey: (parent: any) => parent.idempotency_key ?? null,
    createdAt: (parent: any) => parent.created_at,
    updatedAt: (parent: any) => parent.updated_at,
  },

  CompanyContactEmail: {
    contactId: (parent: any) => parent.contact_id,
    resendId: (parent: any) => parent.resend_id,
    fromEmail: (parent: any) => parent.from_email,
    toEmails: (parent: any) => parseJsonArray(parent.to_emails),
    textContent: (parent: any) => parent.text_content ?? null,
    sentAt: (parent: any) => parent.sent_at ?? null,
    scheduledAt: (parent: any) => parent.scheduled_at ?? null,
    deliveredAt: (parent: any) => parent.delivered_at ?? null,
    openedAt: (parent: any) => parent.opened_at ?? null,
    recipientName: (parent: any) => parent.recipient_name ?? null,
    errorMessage: (parent: any) => parent.error_message ?? null,
    sequenceType: (parent: any) => parent.sequence_type ?? null,
    sequenceNumber: (parent: any) => parent.sequence_number ?? null,
    replyReceived: (parent: any) =>
      (parent.reply_received as unknown) === 1 || parent.reply_received === true,
    followupStatus: (parent: any) => parent.followup_status ?? null,
    createdAt: (parent: any) => parent.created_at,
    updatedAt: (parent: any) => parent.updated_at,
    contactFirstName: (parent: any) => parent.contact_first_name,
    contactLastName: (parent: any) => parent.contact_last_name,
    contactPosition: (parent: any) => parent.contact_position ?? null,
  },
};
