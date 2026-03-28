import { eq, sql, count, avg, and, lt, isNull, isNotNull, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  companies,
  contacts,
  contactEmails,
  companyFacts,
} from "@/db/schema";
import type {
  StageResult,
  StageCheck,
  Severity,
  Thresholds,
} from "./schema";
import { DEFAULT_THRESHOLDS } from "./schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function severity(score: number): Severity {
  if (score >= 0.8) return "OK";
  if (score >= 0.5) return "WARNING";
  return "CRITICAL";
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function check(
  name: string,
  metric: number,
  threshold: number,
  higher_is_better: boolean,
  detail: string,
): StageCheck {
  const score = higher_is_better
    ? Math.min(metric / threshold, 1)
    : metric <= threshold
      ? 1
      : Math.max(0, 1 - (metric - threshold) / threshold);
  return { name, score, severity: severity(score), metric, threshold, detail };
}

function stageScore(checks: StageCheck[]): number {
  if (checks.length === 0) return 0;
  return checks.reduce((sum, c) => sum + c.score, 0) / checks.length;
}

// ---------------------------------------------------------------------------
// Discovery checker
// ---------------------------------------------------------------------------

export async function checkDiscovery(
  t: Thresholds["discovery"] = DEFAULT_THRESHOLDS.discovery,
): Promise<StageResult> {
  const [totals] = await db
    .select({
      total: count(),
      withWebsite: count(companies.website),
      withDescription: count(companies.description),
    })
    .from(companies);

  const staleThreshold = new Date(
    Date.now() - t.maxStaleAgeDays * 86_400_000,
  ).toISOString();

  const [stale] = await db
    .select({ count: count() })
    .from(companies)
    .where(lt(companies.updated_at, staleThreshold));

  const total = totals.total;
  const counts = {
    total,
    withWebsite: totals.withWebsite,
    withDescription: totals.withDescription,
    stale: stale.count,
  };

  const checks: StageCheck[] = [
    check(
      "company-count",
      total,
      t.minCompanies,
      true,
      `${total} companies (need ≥${t.minCompanies})`,
    ),
    check(
      "website-coverage",
      ratio(totals.withWebsite, total),
      t.minWithWebsite,
      true,
      `${((ratio(totals.withWebsite, total)) * 100).toFixed(1)}% have website`,
    ),
    check(
      "description-coverage",
      ratio(totals.withDescription, total),
      t.minWithDescription,
      true,
      `${((ratio(totals.withDescription, total)) * 100).toFixed(1)}% have description`,
    ),
    check(
      "staleness",
      ratio(stale.count, total),
      0.3, // more than 30% stale is a warning
      false,
      `${stale.count} stale (>${t.maxStaleAgeDays}d)`,
    ),
  ];

  const score = stageScore(checks);
  return { stage: "discovery", score, severity: severity(score), checks, counts };
}

// ---------------------------------------------------------------------------
// Enrichment checker
// ---------------------------------------------------------------------------

export async function checkEnrichment(
  t: Thresholds["enrichment"] = DEFAULT_THRESHOLDS.enrichment,
): Promise<StageResult> {
  const [totals] = await db
    .select({
      total: count(),
      categoryKnown: sql<number>`count(*) filter (where ${companies.category} != 'UNKNOWN')`,
      aiClassified: sql<number>`count(*) filter (where ${companies.ai_tier} > 0)`,
      avgConfidence: avg(companies.ai_classification_confidence),
      withServices: sql<number>`count(*) filter (where ${companies.services} is not null and ${companies.services} != '[]')`,
    })
    .from(companies);

  const total = totals.total;
  const avgConf = Number(totals.avgConfidence ?? 0);
  const counts = {
    total,
    categoryKnown: Number(totals.categoryKnown),
    aiClassified: Number(totals.aiClassified),
    withServices: Number(totals.withServices),
  };

  const checks: StageCheck[] = [
    check(
      "category-coverage",
      ratio(Number(totals.categoryKnown), total),
      t.minCategoryKnown,
      true,
      `${((ratio(Number(totals.categoryKnown), total)) * 100).toFixed(1)}% categorized`,
    ),
    check(
      "ai-classification",
      ratio(Number(totals.aiClassified), total),
      t.minAiClassified,
      true,
      `${((ratio(Number(totals.aiClassified), total)) * 100).toFixed(1)}% AI-classified`,
    ),
    check(
      "avg-confidence",
      avgConf,
      t.minAvgConfidence,
      true,
      `avg confidence ${avgConf.toFixed(2)}`,
    ),
    check(
      "services-coverage",
      ratio(Number(totals.withServices), total),
      t.minWithServices,
      true,
      `${((ratio(Number(totals.withServices), total)) * 100).toFixed(1)}% have services`,
    ),
  ];

  const score = stageScore(checks);
  return { stage: "enrichment", score, severity: severity(score), checks, counts };
}

// ---------------------------------------------------------------------------
// Contacts checker
// ---------------------------------------------------------------------------

export async function checkContacts(
  t: Thresholds["contacts"] = DEFAULT_THRESHOLDS.contacts,
): Promise<StageResult> {
  const [totals] = await db
    .select({
      total: count(),
      verified: sql<number>`count(*) filter (where ${contacts.email_verified} = true)`,
      withPosition: count(contacts.position),
      doNotContact: sql<number>`count(*) filter (where ${contacts.do_not_contact} = true)`,
    })
    .from(contacts);

  // Bounce rate: contacts with non-empty bounced_emails
  const [bounced] = await db
    .select({ count: count() })
    .from(contacts)
    .where(
      and(
        isNotNull(contacts.bounced_emails),
        ne(contacts.bounced_emails, "[]"),
      ),
    );

  // Companies with enrichment but no contacts
  const [companiesWithContacts] = await db
    .select({
      count: sql<number>`count(distinct ${contacts.company_id})`,
    })
    .from(contacts)
    .where(isNotNull(contacts.company_id));

  const [enrichedCompanies] = await db
    .select({ count: count() })
    .from(companies)
    .where(ne(companies.category, "UNKNOWN"));

  const total = totals.total;
  const bounceRate = ratio(bounced.count, total);
  const contactCoverage = ratio(
    Number(companiesWithContacts.count),
    enrichedCompanies.count,
  );

  const counts = {
    total,
    verified: Number(totals.verified),
    withPosition: totals.withPosition,
    bounced: bounced.count,
    doNotContact: Number(totals.doNotContact),
    companiesWithContacts: Number(companiesWithContacts.count),
    enrichedCompanies: enrichedCompanies.count,
  };

  const checks: StageCheck[] = [
    check(
      "contact-coverage",
      contactCoverage,
      t.minPerCompany > 0 ? 0.5 : 0, // at least 50% of enriched companies have contacts
      true,
      `${(contactCoverage * 100).toFixed(1)}% enriched companies have contacts`,
    ),
    check(
      "email-verified",
      ratio(Number(totals.verified), total),
      t.minEmailVerified,
      true,
      `${((ratio(Number(totals.verified), total)) * 100).toFixed(1)}% verified`,
    ),
    check(
      "position-coverage",
      ratio(totals.withPosition, total),
      t.minWithPosition,
      true,
      `${((ratio(totals.withPosition, total)) * 100).toFixed(1)}% have position`,
    ),
    check(
      "bounce-rate",
      bounceRate,
      t.maxBounceRate,
      false,
      `${(bounceRate * 100).toFixed(1)}% bounce rate`,
    ),
  ];

  const score = stageScore(checks);
  return { stage: "contacts", score, severity: severity(score), checks, counts };
}

// ---------------------------------------------------------------------------
// Outreach checker
// ---------------------------------------------------------------------------

export async function checkOutreach(
  t: Thresholds["outreach"] = DEFAULT_THRESHOLDS.outreach,
): Promise<StageResult> {
  const [totals] = await db
    .select({
      total: count(),
      delivered: sql<number>`count(*) filter (where ${contactEmails.status} = 'delivered')`,
      opened: sql<number>`count(*) filter (where ${contactEmails.opened_at} is not null)`,
      replied: sql<number>`count(*) filter (where ${contactEmails.reply_received} = true)`,
      errored: sql<number>`count(*) filter (where ${contactEmails.status} = 'error')`,
      sent: sql<number>`count(*) filter (where ${contactEmails.status} in ('sent', 'delivered'))`,
    })
    .from(contactEmails);

  const total = totals.total;
  const sent = Number(totals.sent);
  const delivered = Number(totals.delivered);
  const opened = Number(totals.opened);
  const replied = Number(totals.replied);
  const errored = Number(totals.errored);

  const counts = { total, sent, delivered, opened, replied, errored };

  const checks: StageCheck[] = [
    check(
      "delivery-rate",
      ratio(delivered, sent || total),
      t.minDeliveryRate,
      true,
      `${(ratio(delivered, sent || total) * 100).toFixed(1)}% delivered`,
    ),
    check(
      "open-rate",
      ratio(opened, delivered || total),
      t.minOpenRate,
      true,
      `${(ratio(opened, delivered || total) * 100).toFixed(1)}% opened`,
    ),
    check(
      "reply-rate",
      ratio(replied, delivered || total),
      t.minReplyRate,
      true,
      `${(ratio(replied, delivered || total) * 100).toFixed(1)}% replied`,
    ),
    check(
      "error-rate",
      ratio(errored, total),
      t.maxErrorRate,
      false,
      `${(ratio(errored, total) * 100).toFixed(1)}% errored`,
    ),
  ];

  const score = stageScore(checks);
  return { stage: "outreach", score, severity: severity(score), checks, counts };
}
