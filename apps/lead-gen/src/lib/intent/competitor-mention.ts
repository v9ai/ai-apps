/**
 * Competitor mention detector.
 *
 * For each (company, competitor_analysis) pairing, scan enrichment data
 * (company_snapshots.text_sample + extracted JSON, company_facts,
 * linkedin_posts) for mentions of the competitor's name, domain, or
 * integration names. Each confirmed hit becomes one intent_signals row
 * (signal_type='competitor_mention') plus an intent_signal_products row
 * scoped to the competitor_analysis's product_id.
 */

import { db } from "@/db";
import {
  companies,
  companySnapshots,
  companyFacts,
  intentSignals,
  intentSignalProducts,
  competitors,
  competitorAnalyses,
  competitorIntegrations,
} from "@/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { listD1Posts } from "@/lib/posts-d1-client";

const DECAY_DAYS = 60;

interface DetectOptions {
  companyIds?: number[];
  productIds?: number[];
}

interface Haystack {
  text: string;
  source: string; // label like 'description', 'technologies', 'snapshot', 'linkedin_post'
}

function escapeRegex(s: string): string {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

function hasWordBoundaryMatch(haystack: string, needle: string): boolean {
  if (!needle || needle.length < 3) return false;
  const re = new RegExp(`\\b${escapeRegex(needle)}\\b`, "i");
  return re.test(haystack);
}

function snippetAround(
  haystack: string,
  needle: string,
  radius: number = 120,
): string {
  const idx = haystack.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return haystack.slice(0, 200);
  const start = Math.max(0, idx - radius);
  const end = Math.min(haystack.length, idx + needle.length + radius);
  return haystack.slice(start, end);
}

async function buildHaystackForCompany(
  companyId: number,
): Promise<Haystack[]> {
  const [snapshots, facts, posts] = await Promise.all([
    db
      .select({
        text_sample: companySnapshots.text_sample,
        extracted: companySnapshots.extracted,
      })
      .from(companySnapshots)
      .where(eq(companySnapshots.company_id, companyId))
      .orderBy(desc(companySnapshots.created_at))
      .limit(5),
    db
      .select({
        field: companyFacts.field,
        value_text: companyFacts.value_text,
      })
      .from(companyFacts)
      .where(
        and(
          eq(companyFacts.company_id, companyId),
          inArray(companyFacts.field, [
            "description",
            "services",
            "technologies",
            "tech_stack",
          ]),
        ),
      ),
    // LinkedIn posts now live in Cloudflare D1 (see migrations/0002_posts.sql
    // and edge worker /api/posts/d1). Fetch via the edge client; failures
    // shouldn't break detection — fall back to empty.
    listD1Posts({ companyId, limit: 10 }).catch(() => []),
  ]);

  const out: Haystack[] = [];
  for (const s of snapshots) {
    if (s.text_sample) out.push({ text: s.text_sample, source: "snapshot" });
    if (s.extracted) out.push({ text: s.extracted, source: "snapshot_extracted" });
  }
  for (const f of facts) {
    if (f.value_text) out.push({ text: f.value_text, source: f.field });
  }
  for (const p of posts) {
    const t = p.post_text ?? p.content;
    if (t) out.push({ text: t, source: "linkedin_post" });
  }
  return out;
}

interface CompetitorWithMeta {
  id: number;
  name: string;
  domain: string | null;
  product_id: number;
  tenant_id: string;
  integrations: string[];
}

async function loadCompetitors(
  productIds?: number[],
): Promise<CompetitorWithMeta[]> {
  const conditions = [] as any[];
  if (productIds && productIds.length > 0) {
    conditions.push(inArray(competitorAnalyses.product_id, productIds));
  }

  const rows = await db
    .select({
      id: competitors.id,
      name: competitors.name,
      domain: competitors.domain,
      product_id: competitorAnalyses.product_id,
      tenant_id: competitors.tenant_id,
    })
    .from(competitors)
    .innerJoin(
      competitorAnalyses,
      eq(competitors.analysis_id, competitorAnalyses.id),
    )
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  if (rows.length === 0) return [];

  const competitorIds = rows.map((r) => r.id);
  const integrationRows = await db
    .select({
      competitor_id: competitorIntegrations.competitor_id,
      integration_name: competitorIntegrations.integration_name,
    })
    .from(competitorIntegrations)
    .where(inArray(competitorIntegrations.competitor_id, competitorIds));

  const integrationsByCompetitor = new Map<number, string[]>();
  for (const r of integrationRows) {
    if (!r.integration_name) continue;
    const arr = integrationsByCompetitor.get(r.competitor_id) ?? [];
    arr.push(r.integration_name);
    integrationsByCompetitor.set(r.competitor_id, arr);
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    domain: r.domain,
    product_id: r.product_id,
    tenant_id: r.tenant_id,
    integrations: integrationsByCompetitor.get(r.id) ?? [],
  }));
}

interface Hit {
  competitor: CompetitorWithMeta;
  score: number;
  evidence: string[];
  snippet: string;
}

function scoreCompetitorInHaystacks(
  competitor: CompetitorWithMeta,
  haystacks: Haystack[],
): Hit | null {
  let score = 0;
  const evidenceSources = new Set<string>();
  const evidencePhrases: string[] = [];
  let snippetSource = "";

  const domain = competitor.domain?.trim() ?? "";
  const nameHits: Haystack[] = [];
  let domainHit = false;
  let techHit = false;
  let descHit = false;

  for (const hay of haystacks) {
    if (domain && hasWordBoundaryMatch(hay.text, domain)) {
      domainHit = true;
      evidenceSources.add(`domain:${hay.source}`);
      if (!snippetSource) {
        snippetSource = snippetAround(hay.text, domain);
        evidencePhrases.push(domain);
      }
    }
    if (hasWordBoundaryMatch(hay.text, competitor.name)) {
      nameHits.push(hay);
      if (hay.source === "technologies" || hay.source === "tech_stack") {
        techHit = true;
      } else if (
        hay.source === "description" ||
        hay.source === "snapshot" ||
        hay.source === "snapshot_extracted"
      ) {
        descHit = true;
      }
      evidenceSources.add(`name:${hay.source}`);
      if (!snippetSource) {
        snippetSource = snippetAround(hay.text, competitor.name);
        evidencePhrases.push(competitor.name);
      }
    }
  }

  if (domainHit) score += 0.7;
  if (techHit) score += 0.5;
  if (descHit) score += 0.3;

  // Extra evidence bump for each additional distinct source over 1, capped.
  const extraSources = Math.max(0, evidenceSources.size - 1);
  score += Math.min(extraSources * 0.2, 0.9 - score);

  if (score === 0) return null;

  return {
    competitor,
    score: Math.min(0.9, Math.max(0, score)),
    evidence: evidencePhrases,
    snippet: snippetSource.slice(0, 500),
  };
}

export async function detectCompetitorMentions(
  opts: DetectOptions = {},
): Promise<{ inserted: number }> {
  const competitorsToScan = await loadCompetitors(opts.productIds);
  if (competitorsToScan.length === 0) return { inserted: 0 };

  // Resolve companies to scan.
  const companyWhere = opts.companyIds && opts.companyIds.length > 0
    ? inArray(companies.id, opts.companyIds)
    : undefined;

  const companyRows = await db
    .select({ id: companies.id })
    .from(companies)
    .where(companyWhere);

  let inserted = 0;

  for (const company of companyRows) {
    const haystacks = await buildHaystackForCompany(company.id);
    if (haystacks.length === 0) continue;

    for (const competitor of competitorsToScan) {
      const hit = scoreCompetitorInHaystacks(competitor, haystacks);
      if (!hit) continue;

      const now = new Date().toISOString();
      const decaysAt = new Date(
        Date.now() + DECAY_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString();

      const [sig] = await db
        .insert(intentSignals)
        .values({
          company_id: company.id,
          signal_type: "competitor_mention",
          source_type: "company_snapshot",
          raw_text: hit.snippet,
          evidence: JSON.stringify(hit.evidence),
          confidence: hit.score,
          detected_at: now,
          decays_at: decaysAt,
          decay_days: DECAY_DAYS,
          competitor_id: competitor.id,
          model_version: "competitor-mention-v1",
        })
        .returning({ id: intentSignals.id });

      if (sig) {
        await db
          .insert(intentSignalProducts)
          .values({
            intent_signal_id: sig.id,
            product_id: competitor.product_id,
            match_reason: "competitor_mention",
            match_score: hit.score,
            tenant_id: competitor.tenant_id,
          })
          .onConflictDoNothing();
        inserted++;
      }
    }
  }

  return { inserted };
}
