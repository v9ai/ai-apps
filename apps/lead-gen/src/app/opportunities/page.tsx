import { uniqBy } from "lodash";
import { db } from "@/db";
import { opportunities, companies, contacts, blockedLocations } from "@/db/schema";
import { eq, desc, or, isNull } from "drizzle-orm";
import { fetchD1Opportunities } from "@/lib/d1-opportunities";
import { OpportunitiesClient } from "./opportunities-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OpportunitiesPage() {
  const [rows, d1Pending, blockedKeys, blockedLocs] = await Promise.all([
    db
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
      .orderBy(desc(opportunities.created_at)),
    fetchD1Opportunities(),
    db.select({ key: companies.key }).from(companies).where(eq(companies.blocked, true)),
    db.select({ pattern: blockedLocations.pattern, label: blockedLocations.label }).from(blockedLocations),
  ]);

  const blockedKeySet = new Set(blockedKeys.map((r) => r.key));
  const blockedPatterns = blockedLocs.map((r) => r.pattern);

  // Dedup PG rows by normalized URL (uniqBy keeps the first occurrence — `rows`
  // is ordered created_at DESC, so the newest wins). Rows without a URL are
  // keyed by id so they're never collapsed together.
  const dedupedPg = uniqBy(rows, (r) => normalizeUrl(r.url) ?? `id:${r.id}`);
  const seenPgUrls = new Set(
    dedupedPg.map((r) => normalizeUrl(r.url)).filter((u): u is string => !!u),
  );

  // Hide D1 rows whose URL already exists in PG (dedup across stores).
  const d1Visible = d1Pending.filter((d) => {
    if (d.company_key && blockedKeySet.has(d.company_key)) return false;
    if (d.location) {
      const loc = d.location.toLowerCase();
      if (blockedPatterns.some((p) => loc.includes(p))) return false;
    }
    const norm = normalizeUrl(d.url);
    if (norm && seenPgUrls.has(norm)) return false;
    return true;
  });

  return <OpportunitiesClient opportunities={dedupedPg} d1Pending={d1Visible} />;
}

function normalizeUrl(u: string | null): string | null {
  if (!u) return null;
  try {
    const url = new URL(u);
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return u.toLowerCase().split("?")[0].split("#")[0].replace(/\/+$/, "") || null;
  }
}
