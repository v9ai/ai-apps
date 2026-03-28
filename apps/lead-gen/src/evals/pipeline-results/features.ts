/**
 * Feature extraction from pipeline DB rows → dense numerical vectors.
 *
 * Each stage has a fixed feature schema (see FEATURE_NAMES in schema.ts).
 * All features normalized to [0, 1] for stable gradient updates.
 */

import { sql, count } from "drizzle-orm";
import { db } from "@/db";
import { companies, contacts, contactEmails } from "@/db/schema";
import type { FeatureVector, Stage } from "./schema";
import { FEATURE_NAMES } from "./schema";

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

/** Clamp a value to [0, 1]. */
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Normalize days to [0, 1] where 0 = today, 1 = 365+ days old. */
function normalizeDays(dateStr: string | null): number {
  if (!dateStr) return 1.0; // missing = maximally stale
  const days = (Date.now() - new Date(dateStr).getTime()) / 86_400_000;
  return clamp01(days / 365);
}

/** Normalize a count to [0, 1] with a soft cap. */
function normalizeCount(n: number, cap: number): number {
  return clamp01(n / cap);
}

/** Boolean to 0/1. */
function bool01(v: unknown): number {
  return v ? 1 : 0;
}

/** Parse JSON array length, returning 0 on failure. */
function jsonLen(jsonStr: string | null): number {
  if (!jsonStr) return 0;
  try { return JSON.parse(jsonStr).length; } catch { return 0; }
}

// ---------------------------------------------------------------------------
// Per-stage extractors
// ---------------------------------------------------------------------------

export async function extractDiscoveryFeatures(limit = 500): Promise<FeatureVector[]> {
  const dim = FEATURE_NAMES.discovery.length;
  const rows = await db
    .select({
      id: companies.id,
      website: companies.website,
      description: companies.description,
      logo_url: companies.logo_url,
      updated_at: companies.updated_at,
      linkedin_url: companies.linkedin_url,
      job_board_url: companies.job_board_url,
      email: companies.email,
    })
    .from(companies)
    .limit(limit);

  return rows.map((r) => {
    const values = new Float64Array(dim);
    values[0] = bool01(r.website);
    values[1] = bool01(r.description);
    values[2] = normalizeCount(r.description?.length ?? 0, 1000);
    values[3] = bool01(r.logo_url);
    values[4] = normalizeDays(r.updated_at);
    values[5] = bool01(r.linkedin_url);
    values[6] = bool01(r.job_board_url);
    values[7] = bool01(r.email);
    return { id: r.id, stage: "discovery" as Stage, values };
  });
}

export async function extractEnrichmentFeatures(limit = 500): Promise<FeatureVector[]> {
  const dim = FEATURE_NAMES.enrichment.length;
  const rows = await db
    .select({
      id: companies.id,
      category: companies.category,
      ai_tier: companies.ai_tier,
      ai_classification_confidence: companies.ai_classification_confidence,
      services: companies.services,
      tags: companies.tags,
      industries: companies.industries,
      deep_analysis: companies.deep_analysis,
      ashby_enriched_at: companies.ashby_enriched_at,
      ashby_tech_signals: companies.ashby_tech_signals,
    })
    .from(companies)
    .limit(limit);

  return rows.map((r) => {
    const values = new Float64Array(dim);
    values[0] = bool01(r.category && r.category !== "UNKNOWN");
    values[1] = clamp01((r.ai_tier ?? 0) / 2);
    values[2] = r.ai_classification_confidence ?? 0.5;
    values[3] = bool01(r.services && r.services !== "[]");
    values[4] = normalizeCount(jsonLen(r.services), 20);
    values[5] = bool01(r.tags && r.tags !== "[]");
    values[6] = bool01(r.industries && r.industries !== "[]");
    values[7] = bool01(r.deep_analysis);
    values[8] = bool01(r.ashby_enriched_at);
    values[9] = normalizeCount(jsonLen(r.ashby_tech_signals), 10);
    return { id: r.id, stage: "enrichment" as Stage, values };
  });
}

export async function extractContactFeatures(limit = 500): Promise<FeatureVector[]> {
  const dim = FEATURE_NAMES.contacts.length;
  const rows = await db
    .select({
      id: contacts.id,
      email: contacts.email,
      email_verified: contacts.email_verified,
      position: contacts.position,
      linkedin_url: contacts.linkedin_url,
      company_id: contacts.company_id,
      nb_status: contacts.nb_status,
      bounced_emails: contacts.bounced_emails,
      do_not_contact: contacts.do_not_contact,
      updated_at: contacts.updated_at,
    })
    .from(contacts)
    .limit(limit);

  return rows.map((r) => {
    const values = new Float64Array(dim);
    values[0] = bool01(r.email);
    values[1] = bool01(r.email_verified);
    values[2] = bool01(r.position);
    values[3] = bool01(r.linkedin_url);
    values[4] = bool01(r.company_id);
    values[5] = bool01(r.nb_status === "valid");
    values[6] = bool01(r.bounced_emails && r.bounced_emails !== "[]");
    values[7] = bool01(r.do_not_contact);
    values[8] = normalizeDays(r.updated_at);
    return { id: r.id, stage: "contacts" as Stage, values };
  });
}

export async function extractOutreachFeatures(limit = 500): Promise<FeatureVector[]> {
  const dim = FEATURE_NAMES.outreach.length;
  const rows = await db
    .select({
      id: contactEmails.id,
      status: contactEmails.status,
      opened_at: contactEmails.opened_at,
      reply_received: contactEmails.reply_received,
      sequence_number: contactEmails.sequence_number,
      followup_status: contactEmails.followup_status,
      sent_at: contactEmails.sent_at,
      subject: contactEmails.subject,
      text_content: contactEmails.text_content,
    })
    .from(contactEmails)
    .limit(limit);

  return rows.map((r) => {
    const values = new Float64Array(dim);
    values[0] = bool01(r.status === "delivered");
    values[1] = bool01(r.opened_at);
    values[2] = bool01(r.reply_received);
    values[3] = bool01(r.status === "error");
    values[4] = normalizeCount(parseInt(r.sequence_number ?? "0", 10), 3);
    values[5] = bool01(r.followup_status === "completed");
    values[6] = normalizeDays(r.sent_at);
    values[7] = normalizeCount(r.subject?.length ?? 0, 120);
    values[8] = normalizeCount(r.text_content?.length ?? 0, 2000);
    return { id: r.id, stage: "outreach" as Stage, values };
  });
}

// ---------------------------------------------------------------------------
// Unified extractor
// ---------------------------------------------------------------------------

export async function extractFeatures(
  stage: Stage,
  limit = 500,
): Promise<FeatureVector[]> {
  switch (stage) {
    case "discovery": return extractDiscoveryFeatures(limit);
    case "enrichment": return extractEnrichmentFeatures(limit);
    case "contacts": return extractContactFeatures(limit);
    case "outreach": return extractOutreachFeatures(limit);
  }
}

/** Extract features for all stages in parallel. */
export async function extractAllFeatures(
  limit = 500,
): Promise<Record<Stage, FeatureVector[]>> {
  const [discovery, enrichment, contactsResult, outreach] = await Promise.all([
    extractDiscoveryFeatures(limit),
    extractEnrichmentFeatures(limit),
    extractContactFeatures(limit),
    extractOutreachFeatures(limit),
  ]);
  return { discovery, enrichment, contacts: contactsResult, outreach };
}
