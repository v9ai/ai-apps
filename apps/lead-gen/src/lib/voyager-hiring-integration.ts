/**
 * Voyager Hiring Contact Integration
 *
 * Server-side module that bridges Voyager-discovered hiring contacts
 * (from the Chrome extension) with the lead-gen pipeline's contact scoring,
 * authority detection, and outreach prioritization.
 *
 * Data flow:
 *   Chrome ext → Voyager API → HiringContact[]
 *     → importVoyagerContacts() → Neon DB (contacts table)
 *     → classifyContact() + scoreContact() → authority_score, seniority, etc.
 *
 * This module does NOT call LinkedIn APIs directly (that's the Chrome ext's job).
 * It receives already-extracted HiringContact/RecruiterProfile data and persists
 * it into the pipeline with proper ML scoring.
 */

import { db } from "@/db";
import { contacts } from "@/db/schema";
import type { Contact, NewContact } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import {
  classifyContact,
  type ContactClassification,
} from "@/apollo/resolvers/contacts/classification";
import {
  scoreContact,
  type ContactRankFeatures,
} from "@/ml/contact-ranker";

// ── Types (mirror Chrome extension types for server-side use) ───────────

/**
 * Hiring contact from Voyager (same shape as Chrome extension's HiringContact).
 * Redefined here to avoid cross-project import dependency.
 */
export interface VoyagerHiringContact {
  memberUrn: string | null;
  publicIdentifier: string | null;
  linkedinUrl: string | null;
  firstName: string;
  lastName: string;
  title: string | null;
  profilePictureUrl: string | null;
  source: "job_poster" | "hiring_team" | "recruiter" | "company_employee";
  connectionDegree: "SELF" | "FIRST" | "SECOND" | "THIRD" | "OUT_OF_NETWORK" | "UNKNOWN";
  inmailAvailable: boolean;
  jobPostingIds: string[];
  entityType: string | null;
}

export interface VoyagerRecruiterProfile {
  memberUrn: string;
  publicIdentifier: string;
  linkedinUrl: string;
  firstName: string;
  lastName: string;
  headline: string | null;
  currentCompany: string | null;
  isInternal: boolean;
  agencyName: string | null;
  connectionDegree: string;
  openPositionCount: number;
  jobPostingIds: string[];
}

export interface VoyagerDiscoveryPayload {
  companyNumericId: string;
  companyId: number;
  companyName?: string;
  jobPostingsScanned: number;
  hiringContacts: VoyagerHiringContact[];
  recruiters: VoyagerRecruiterProfile[];
}

// ── Import Result ──────────────────────────────────────────────────────

export interface VoyagerImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  contacts: Array<{
    contactId: number;
    firstName: string;
    lastName: string;
    source: string;
    authorityScore: number;
    isDecisionMaker: boolean;
    seniority: string;
    department: string;
    outreachPriority: number;
  }>;
}

// ── Voyager Signal Boosts ──────────────────────────────────────────────

/**
 * Additional authority score adjustments based on Voyager-specific signals.
 * These are applied on top of classifyContact()'s base authority score.
 */
const VOYAGER_AUTHORITY_BOOSTS: Record<string, number> = {
  /** Confirmed in "Meet the hiring team" section */
  hiring_team: 0.10,
  /** Poster on the job card (likely hiring manager or delegated poster) */
  job_poster: 0.05,
  /** Recruiter (informational, not decision authority) */
  recruiter: 0.0,
  /** Generic company employee */
  company_employee: 0.0,
};

const CONNECTION_BOOSTS: Record<string, number> = {
  FIRST: 0.05,
  SECOND: 0.02,
  THIRD: 0.0,
  OUT_OF_NETWORK: 0.0,
  SELF: 0.0,
  UNKNOWN: 0.0,
};

/**
 * Compute per-additional-job-posting authority boost.
 * Caps at +0.15 (3+ postings).
 */
function multiPostingBoost(jobPostingCount: number): number {
  if (jobPostingCount <= 1) return 0;
  return Math.min((jobPostingCount - 1) * 0.05, 0.15);
}

// ── Core Import Function ───────────────────────────────────────────────

/**
 * Import Voyager-discovered hiring contacts into the pipeline.
 *
 * For each contact:
 * 1. Check if already exists by linkedin_url or (first_name + last_name + company_id)
 * 2. Run classifyContact() on their title for seniority/department/authority
 * 3. Apply Voyager-specific boosts (source, connection degree, multi-posting)
 * 4. Compute outreach priority via scoreContact()
 * 5. Insert or update in Neon
 *
 * @param payload — Discovery result from Chrome extension
 * @returns Import summary with scored contacts
 */
export async function importVoyagerContacts(
  payload: VoyagerDiscoveryPayload,
): Promise<VoyagerImportResult> {
  const { companyId, companyName, hiringContacts, recruiters } = payload;
  const result: VoyagerImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    contacts: [],
  };

  // Merge hiring contacts and recruiters into a single list
  const allContacts: VoyagerHiringContact[] = [
    ...hiringContacts,
    ...recruiters.map((r): VoyagerHiringContact => ({
      memberUrn: r.memberUrn,
      publicIdentifier: r.publicIdentifier,
      linkedinUrl: r.linkedinUrl,
      firstName: r.firstName,
      lastName: r.lastName,
      title: r.headline,
      profilePictureUrl: null,
      source: "recruiter",
      connectionDegree: r.connectionDegree as VoyagerHiringContact["connectionDegree"],
      inmailAvailable: r.connectionDegree !== "FIRST",
      jobPostingIds: r.jobPostingIds,
      entityType: "recruiter",
    })),
  ];

  for (const vc of allContacts) {
    try {
      const scored = await importSingleContact(vc, companyId, companyName);
      if (scored) {
        result.contacts.push(scored);
        if (scored.contactId < 0) {
          // Negative ID signals "updated existing"
          result.updated++;
          scored.contactId = Math.abs(scored.contactId);
        } else {
          result.created++;
        }
      } else {
        result.skipped++;
      }
    } catch (err) {
      result.errors.push(
        `${vc.firstName} ${vc.lastName}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Sort by outreach priority (ascending = highest priority first)
  result.contacts.sort((a, b) => a.outreachPriority - b.outreachPriority);

  return result;
}

async function importSingleContact(
  vc: VoyagerHiringContact,
  companyId: number,
  companyName?: string,
): Promise<VoyagerImportResult["contacts"][number] | null> {
  if (!vc.firstName && !vc.lastName) return null;

  // ── Classify title ──
  const classification = classifyContact(vc.title);

  // ── Apply Voyager boosts ──
  const sourceBoost = VOYAGER_AUTHORITY_BOOSTS[vc.source] ?? 0;
  const connectionBoost = CONNECTION_BOOSTS[vc.connectionDegree] ?? 0;
  const postingBoost = multiPostingBoost(vc.jobPostingIds.length);
  const voyagerBoost = sourceBoost + connectionBoost + postingBoost;

  const adjustedAuthority = Math.min(
    Math.round((classification.authorityScore + voyagerBoost) * 100) / 100,
    1.0,
  );

  // Recalculate DM status with boosted score
  const isDecisionMaker = adjustedAuthority >= 0.70 && classification.department !== "HR/Recruiting";

  // ── Build tags ──
  const tags: string[] = [`voyager:${vc.source}`];
  if (vc.connectionDegree !== "UNKNOWN") {
    tags.push(`connection:${vc.connectionDegree.toLowerCase()}`);
  }
  if (vc.inmailAvailable) tags.push("inmail:available");
  if (vc.jobPostingIds.length > 0) tags.push(`job-postings:${vc.jobPostingIds.length}`);
  if (vc.memberUrn) tags.push(`urn:${vc.memberUrn}`);

  // ── Build DM reasons ──
  const dmReasons = [...classification.dmReasons];
  if (sourceBoost > 0) {
    dmReasons.push(`Voyager source '${vc.source}' boost: +${sourceBoost.toFixed(2)}`);
  }
  if (connectionBoost > 0) {
    dmReasons.push(`${vc.connectionDegree} connection boost: +${connectionBoost.toFixed(2)}`);
  }
  if (postingBoost > 0) {
    dmReasons.push(`Active on ${vc.jobPostingIds.length} postings boost: +${postingBoost.toFixed(2)}`);
  }

  // ── Compute outreach score ──
  const rankFeatures: ContactRankFeatures = {
    authorityScore: adjustedAuthority,
    isDecisionMaker: isDecisionMaker ? 1 : 0,
    hasVerifiedEmail: 0,
    emailCount: 0,
    hasLinkedin: vc.linkedinUrl ? 1 : 0,
    hasGithub: 0,
    departmentRelevance: computeDepartmentRelevance(classification.department),
    emailsSent: 0,
    daysSinceLastContact: 0,
    hasReplied: 0,
    doNotContact: 0,
    nextTouchScore: 0,
  };
  const outreachScore = scoreContact(rankFeatures);

  // ── Check for existing contact ──
  const existing = await findExistingContact(vc, companyId);

  if (existing) {
    // Update existing contact with Voyager data (only upgrade, never downgrade)
    const updates: Partial<NewContact> = {
      updated_at: sql`now()::text` as unknown as string,
    };

    // Only upgrade authority score, never downgrade
    if (adjustedAuthority > (existing.authority_score ?? 0)) {
      updates.authority_score = adjustedAuthority;
      updates.seniority = classification.seniority;
      updates.department = classification.department;
      updates.is_decision_maker = isDecisionMaker;
      updates.dm_reasons = JSON.stringify(dmReasons);
    }

    // Merge tags (additive)
    const existingTags: string[] = existing.tags ? JSON.parse(existing.tags) : [];
    const mergedTags = [...new Set([...existingTags, ...tags])];
    updates.tags = JSON.stringify(mergedTags);

    // Fill in missing LinkedIn URL
    if (!existing.linkedin_url && vc.linkedinUrl) {
      updates.linkedin_url = vc.linkedinUrl;
    }

    // Fill in missing position
    if (!existing.position && vc.title) {
      updates.position = vc.title;
    }

    await db
      .update(contacts)
      .set(updates)
      .where(eq(contacts.id, existing.id));

    return {
      contactId: -existing.id, // Negative signals "updated"
      firstName: existing.first_name,
      lastName: existing.last_name,
      source: vc.source,
      authorityScore: Math.max(adjustedAuthority, existing.authority_score ?? 0),
      isDecisionMaker: isDecisionMaker || (existing.is_decision_maker ?? false),
      seniority: adjustedAuthority > (existing.authority_score ?? 0)
        ? classification.seniority
        : existing.seniority ?? classification.seniority,
      department: adjustedAuthority > (existing.authority_score ?? 0)
        ? classification.department
        : existing.department ?? classification.department,
      outreachPriority: Math.round((1 - outreachScore) * 100),
    };
  }

  // ── Insert new contact ──
  const newContact: NewContact = {
    first_name: vc.firstName,
    last_name: vc.lastName || "",
    linkedin_url: vc.linkedinUrl,
    company: companyName,
    company_id: companyId,
    position: vc.title,
    seniority: classification.seniority,
    department: classification.department,
    authority_score: adjustedAuthority,
    is_decision_maker: isDecisionMaker,
    dm_reasons: JSON.stringify(dmReasons),
    tags: JSON.stringify(tags),
  };

  const [inserted] = await db.insert(contacts).values(newContact).returning({ id: contacts.id });

  return {
    contactId: inserted!.id,
    firstName: vc.firstName,
    lastName: vc.lastName,
    source: vc.source,
    authorityScore: adjustedAuthority,
    isDecisionMaker,
    seniority: classification.seniority,
    department: classification.department,
    outreachPriority: Math.round((1 - outreachScore) * 100),
  };
}

// ── Helpers ────────────────────────────────────────────────────────────

async function findExistingContact(
  vc: VoyagerHiringContact,
  companyId: number,
): Promise<Contact | null> {
  // Strategy 1: Match by LinkedIn URL (most reliable)
  if (vc.linkedinUrl) {
    const byUrl = await db
      .select()
      .from(contacts)
      .where(eq(contacts.linkedin_url, vc.linkedinUrl))
      .limit(1);
    if (byUrl[0]) return byUrl[0];
  }

  // Strategy 2: Match by name + company
  if (vc.firstName && vc.lastName) {
    const byName = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.first_name, vc.firstName),
          eq(contacts.last_name, vc.lastName),
          eq(contacts.company_id, companyId),
        ),
      )
      .limit(1);
    if (byName[0]) return byName[0];
  }

  return null;
}

/**
 * Map department to AI-outreach relevance score (0-1).
 * Mirrors the departmentRelevance feature in contact-ranker.ts.
 */
function computeDepartmentRelevance(department: string): number {
  switch (department) {
    case "AI/ML": return 1.0;
    case "Engineering": return 0.85;
    case "Research": return 0.80;
    case "Product": return 0.60;
    case "Operations": return 0.40;
    case "Sales/BD": return 0.30;
    case "Marketing": return 0.25;
    case "HR/Recruiting": return 0.15;
    case "Finance": return 0.10;
    default: return 0.20;
  }
}

// ── Batch Analysis ─────────────────────────────────────────────────────

/**
 * Analyze a batch of Voyager contacts without importing them.
 * Returns scored and ranked results for preview before commit.
 */
export function analyzeVoyagerContacts(
  hiringContacts: VoyagerHiringContact[],
): Array<{
  contact: VoyagerHiringContact;
  classification: ContactClassification;
  adjustedAuthority: number;
  isDecisionMaker: boolean;
  outreachScore: number;
  voyagerBoosts: { source: number; connection: number; postings: number };
}> {
  return hiringContacts.map((vc) => {
    const classification = classifyContact(vc.title);
    const sourceBoost = VOYAGER_AUTHORITY_BOOSTS[vc.source] ?? 0;
    const connectionBoost = CONNECTION_BOOSTS[vc.connectionDegree] ?? 0;
    const postingBoost = multiPostingBoost(vc.jobPostingIds.length);
    const adjustedAuthority = Math.min(
      Math.round((classification.authorityScore + sourceBoost + connectionBoost + postingBoost) * 100) / 100,
      1.0,
    );
    const isDecisionMaker = adjustedAuthority >= 0.70 && classification.department !== "HR/Recruiting";

    const rankFeatures: ContactRankFeatures = {
      authorityScore: adjustedAuthority,
      isDecisionMaker: isDecisionMaker ? 1 : 0,
      hasVerifiedEmail: 0,
      emailCount: 0,
      hasLinkedin: vc.linkedinUrl ? 1 : 0,
      hasGithub: 0,
      departmentRelevance: computeDepartmentRelevance(classification.department),
      emailsSent: 0,
      daysSinceLastContact: 0,
      hasReplied: 0,
      doNotContact: 0,
      nextTouchScore: 0,
    };

    return {
      contact: vc,
      classification,
      adjustedAuthority,
      isDecisionMaker,
      outreachScore: scoreContact(rankFeatures),
      voyagerBoosts: {
        source: sourceBoost,
        connection: connectionBoost,
        postings: postingBoost,
      },
    };
  }).sort((a, b) => b.outreachScore - a.outreachScore);
}
