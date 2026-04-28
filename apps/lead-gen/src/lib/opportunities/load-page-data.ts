import { uniqBy } from "lodash";
import { desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { blockedLocations, companies, contacts, opportunities } from "@/db/schema";
import { fetchD1Opportunities, type D1OpportunityRow } from "@/lib/d1-opportunities";

export type PgOpportunityRow = {
  id: string;
  title: string;
  url: string | null;
  source: string | null;
  status: string;
  reward_text: string | null;
  reward_usd: number | null;
  score: number | null;
  tags: string | null;
  applied: boolean;
  applied_at: string | null;
  application_status: string | null;
  first_seen: string | null;
  created_at: string;
  company_name: string | null;
  company_key: string | null;
  contact_first: string | null;
  contact_last: string | null;
  contact_slug: string | null;
  contact_position: string | null;
};

export function loadPgOpportunities(): Promise<PgOpportunityRow[]> {
  return db
    .select({
      id: opportunities.id,
      title: opportunities.title,
      url: opportunities.url,
      source: opportunities.source,
      status: opportunities.status,
      reward_text: opportunities.reward_text,
      reward_usd: opportunities.reward_usd,
      score: opportunities.score,
      tags: opportunities.tags,
      applied: opportunities.applied,
      applied_at: opportunities.applied_at,
      application_status: opportunities.application_status,
      first_seen: opportunities.first_seen,
      created_at: opportunities.created_at,
      company_name: companies.name,
      company_key: companies.key,
      contact_first: contacts.first_name,
      contact_last: contacts.last_name,
      contact_slug: contacts.slug,
      contact_position: contacts.position,
    })
    .from(opportunities)
    .leftJoin(companies, eq(opportunities.company_id, companies.id))
    .leftJoin(contacts, eq(opportunities.contact_id, contacts.id))
    .where(or(isNull(opportunities.company_id), eq(companies.blocked, false)))
    .orderBy(desc(opportunities.created_at));
}

export async function loadBlockedCompanyKeys(): Promise<Set<string>> {
  const rows = await db
    .select({ key: companies.key })
    .from(companies)
    .where(eq(companies.blocked, true));
  return new Set(rows.map((r) => r.key));
}

export async function loadBlockedLocationPatterns(): Promise<string[]> {
  const rows = await db.select({ pattern: blockedLocations.pattern }).from(blockedLocations);
  return rows.map((r) => r.pattern);
}

type LocatableRow = { company_key: string | null; location: string | null };

export function makeBlocklistFilter(blockedKeys: Set<string>, blockedPatterns: string[]) {
  return (row: LocatableRow): boolean => {
    if (row.company_key && blockedKeys.has(row.company_key)) return false;
    if (row.location) {
      const loc = row.location.toLowerCase();
      if (blockedPatterns.some((p) => loc.includes(p))) return false;
    }
    return true;
  };
}

export const dedupKey = (o: { id: string; url: string | null }) =>
  normalizeUrl(o.url) ?? `id:${o.id}`;

export const collectUrls = (rows: { url: string | null }[]) =>
  new Set(rows.map((r) => normalizeUrl(r.url)).filter((u): u is string => !!u));

export function normalizeUrl(u: string | null): string | null {
  if (!u) return null;
  try {
    const url = new URL(u);
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return u.toLowerCase().split("?")[0].split("#")[0].replace(/\/+$/, "") || null;
  }
}

export type LoadedPageData = {
  pgOpportunities: PgOpportunityRow[];
  pendingD1: D1OpportunityRow[];
};

export async function loadOpportunitiesPageData(): Promise<LoadedPageData> {
  const [pgRows, d1Rows, blockedCompanyKeys, blockedLocationPatterns] = await Promise.all([
    loadPgOpportunities(),
    fetchD1Opportunities(),
    loadBlockedCompanyKeys(),
    loadBlockedLocationPatterns(),
  ]);

  const isAllowed = makeBlocklistFilter(blockedCompanyKeys, blockedLocationPatterns);

  const pgOpportunities = uniqBy(pgRows, dedupKey);
  const pgUrls = collectUrls(pgOpportunities);

  const isPendingPromotion = (d: D1OpportunityRow) => {
    const url = normalizeUrl(d.url);
    return !url || !pgUrls.has(url);
  };
  const pendingD1 = uniqBy(d1Rows, dedupKey).filter(isPendingPromotion).filter(isAllowed);

  return { pgOpportunities, pendingD1 };
}
