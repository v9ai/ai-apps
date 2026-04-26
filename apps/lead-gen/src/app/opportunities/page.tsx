import { uniqBy } from "lodash";
import { desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { blockedLocations, companies, contacts, opportunities } from "@/db/schema";
import { fetchD1Opportunities } from "@/lib/d1-opportunities";
import type { D1OpportunityRow } from "@/lib/d1-opportunities";
import { OpportunitiesClient } from "./opportunities-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OpportunitiesPage() {
  const [pgRows, d1Rows, blockedCompanyKeys, blockedLocationPatterns] = await Promise.all([
    loadPgOpportunities(),
    fetchD1Opportunities(),
    loadBlockedCompanyKeys(),
    loadBlockedLocationPatterns(),
  ]);

  const isAllowed = makeBlocklistFilter(blockedCompanyKeys, blockedLocationPatterns);

  // PG: dedup by URL — newest wins (rows ordered created_at DESC).
  const pgOpportunities = uniqBy(pgRows, dedupKey);
  const pgUrls = collectUrls(pgOpportunities);

  // D1: dedup, drop URLs already in PG, drop blocked.
  const isPendingPromotion = (d: D1OpportunityRow) => {
    const url = normalizeUrl(d.url);
    return !url || !pgUrls.has(url);
  };
  const pendingD1 = uniqBy(d1Rows, dedupKey).filter(isPendingPromotion).filter(isAllowed);

  return <OpportunitiesClient opportunities={pgOpportunities} d1Pending={pendingD1} />;
}

// ── Loaders ──────────────────────────────────────────────────────────

function loadPgOpportunities() {
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

async function loadBlockedCompanyKeys(): Promise<Set<string>> {
  const rows = await db
    .select({ key: companies.key })
    .from(companies)
    .where(eq(companies.blocked, true));
  return new Set(rows.map((r) => r.key));
}

async function loadBlockedLocationPatterns(): Promise<string[]> {
  const rows = await db.select({ pattern: blockedLocations.pattern }).from(blockedLocations);
  return rows.map((r) => r.pattern);
}

// ── Predicates & helpers ─────────────────────────────────────────────

type LocatableRow = { company_key: string | null; location: string | null };

function makeBlocklistFilter(blockedKeys: Set<string>, blockedPatterns: string[]) {
  return (row: LocatableRow): boolean => {
    if (row.company_key && blockedKeys.has(row.company_key)) return false;
    if (row.location) {
      const loc = row.location.toLowerCase();
      if (blockedPatterns.some((p) => loc.includes(p))) return false;
    }
    return true;
  };
}

const dedupKey = (o: { id: string; url: string | null }) =>
  normalizeUrl(o.url) ?? `id:${o.id}`;

const collectUrls = (rows: { url: string | null }[]) =>
  new Set(rows.map((r) => normalizeUrl(r.url)).filter((u): u is string => !!u));

function normalizeUrl(u: string | null): string | null {
  if (!u) return null;
  try {
    const url = new URL(u);
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return u.toLowerCase().split("?")[0].split("#")[0].replace(/\/+$/, "") || null;
  }
}
