/**
 * Tag intent_signals with matching products via intent_signal_products.
 *
 * For each product with icp_analysis, extract ICP keywords (segments,
 * personas, anti_icp) and score each untagged signal's raw_text + evidence
 * against them. Signals scoring >= 0.4 are linked with match_reason='icp_keyword'.
 *
 * Usage:
 *   pnpm tsx scripts/tag-intent-signals-products.ts              # all products, all untagged signals
 *   pnpm tsx scripts/tag-intent-signals-products.ts --product 42
 *   pnpm tsx scripts/tag-intent-signals-products.ts --signal-ids 1,2,3
 */

import { db } from "@/db";
import {
  companies,
  products,
  intentSignals,
  intentSignalProducts,
} from "@/db/schema";
import { eq, and, inArray, isNotNull, notInArray } from "drizzle-orm";

const MIN_MATCH_SCORE = 0.4;

interface IcpSegment {
  name?: string;
  industry?: string;
}

interface IcpPersona {
  title?: string;
  department?: string;
}

interface IcpAnalysis {
  segments?: IcpSegment[];
  personas?: IcpPersona[];
  anti_icp?: string[];
}

const STOP_WORDS = new Set([
  "the", "a", "an", "of", "and", "or", "for", "with", "in", "on", "at",
  "to", "from", "by", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "team", "company", "product",
  "business", "work", "works", "working", "inc", "llc", "corp", "ltd",
  "saas", "platform", "software", "tool", "tools", "solution", "solutions",
]);

function normalizeToken(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokensFromPhrase(phrase: string): string[] {
  if (!phrase) return [];
  const norm = normalizeToken(phrase);
  const tokens = norm.split(/\s+/).filter(
    (t) => t.length >= 3 && !STOP_WORDS.has(t),
  );
  return tokens;
}

export function extractKeywords(
  icp: IcpAnalysis | null | undefined,
  name: string,
  description: string | null | undefined,
): Map<string, number> {
  const weights = new Map<string, number>();
  const add = (phrase: string | undefined, weight: number) => {
    if (!phrase) return;
    for (const tok of tokensFromPhrase(phrase)) {
      weights.set(tok, Math.max(weights.get(tok) ?? 0, weight));
    }
  };

  add(name, 1.0);
  add(description ?? undefined, 0.4);

  if (icp) {
    for (const seg of icp.segments ?? []) {
      add(seg.name, 1.0);
      add(seg.industry, 0.9);
    }
    for (const p of icp.personas ?? []) {
      add(p.title, 0.9);
      add(p.department, 0.7);
    }
    for (const a of icp.anti_icp ?? []) {
      for (const tok of tokensFromPhrase(a)) {
        weights.set(tok, Math.min(weights.get(tok) ?? 0, -0.5));
      }
    }
  }

  return weights;
}

export function keywordMatchScore(
  text: string,
  keywords: Map<string, number>,
): number {
  if (!text || keywords.size === 0) return 0;
  const haystack = ` ${normalizeToken(text)} `;
  let positive = 0;
  let negative = 0;
  let maxPositive = 0;

  for (const [kw, weight] of keywords) {
    const re = new RegExp(`\\b${kw.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "g");
    const matches = haystack.match(re);
    if (!matches) continue;
    const tf = Math.min(matches.length, 3);
    if (weight >= 0) {
      positive += weight * tf;
      maxPositive += weight * 3;
    } else {
      negative += Math.abs(weight) * tf;
    }
  }

  if (maxPositive === 0) return 0;
  const norm = positive / maxPositive;
  const score = norm - Math.min(negative * 0.2, 0.5);
  return Math.max(0, Math.min(1, score));
}

interface TagOptions {
  productId?: number;
  signalIds?: number[];
}

export async function tagIntentSignalsProducts(
  opts: TagOptions = {},
): Promise<{ linked: number; productsProcessed: number }> {
  const productWhere = opts.productId
    ? and(eq(products.id, opts.productId), isNotNull(products.icp_analysis))
    : isNotNull(products.icp_analysis);

  const productRows = await db
    .select({
      id: products.id,
      tenant_id: products.tenant_id,
      name: products.name,
      description: products.description,
      icp_analysis: products.icp_analysis,
    })
    .from(products)
    .where(productWhere);

  let linked = 0;
  for (const p of productRows) {
    const icp = (p.icp_analysis as IcpAnalysis | null) ?? null;
    const keywords = extractKeywords(icp, p.name, p.description);
    if (keywords.size === 0) continue;

    // Pull candidate signals for companies in this tenant that aren't already
    // linked to this product.
    const conditions = [eq(companies.tenant_id, p.tenant_id)];
    if (opts.signalIds && opts.signalIds.length > 0) {
      conditions.push(inArray(intentSignals.id, opts.signalIds));
    }

    const alreadyLinkedIds = db
      .select({ id: intentSignalProducts.intent_signal_id })
      .from(intentSignalProducts)
      .where(eq(intentSignalProducts.product_id, p.id));

    const candidates = await db
      .select({
        id: intentSignals.id,
        raw_text: intentSignals.raw_text,
        evidence: intentSignals.evidence,
      })
      .from(intentSignals)
      .innerJoin(companies, eq(intentSignals.company_id, companies.id))
      .where(
        and(
          ...conditions,
          notInArray(intentSignals.id, alreadyLinkedIds),
        ),
      );

    const toInsert: {
      intent_signal_id: number;
      product_id: number;
      match_reason: string;
      match_score: number;
      tenant_id: string;
    }[] = [];

    for (const sig of candidates) {
      const text = `${sig.raw_text ?? ""} ${sig.evidence ?? ""}`;
      const score = keywordMatchScore(text, keywords);
      if (score >= MIN_MATCH_SCORE) {
        toInsert.push({
          intent_signal_id: sig.id,
          product_id: p.id,
          match_reason: "icp_keyword",
          match_score: score,
          tenant_id: p.tenant_id,
        });
      }
    }

    if (toInsert.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const chunk = toInsert.slice(i, i + chunkSize);
        await db
          .insert(intentSignalProducts)
          .values(chunk)
          .onConflictDoNothing();
      }
      linked += toInsert.length;
    }
  }

  return { linked, productsProcessed: productRows.length };
}

// ── CLI entrypoint ─────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const productArg = args.find((a) => a === "--product");
  const productId = productArg
    ? parseInt(args[args.indexOf(productArg) + 1] ?? "", 10)
    : undefined;
  const sigArg = args.find((a) => a === "--signal-ids");
  const signalIds = sigArg
    ? (args[args.indexOf(sigArg) + 1] ?? "")
        .split(",")
        .map((s) => parseInt(s, 10))
        .filter((n) => Number.isFinite(n))
    : undefined;

  const result = await tagIntentSignalsProducts({
    productId: Number.isFinite(productId) ? productId : undefined,
    signalIds,
  });
  console.log(
    `Tagged ${result.linked} signal<->product links across ${result.productsProcessed} products`,
  );
}

// Only run as CLI when executed directly (not when imported).
const isEntrypoint =
  typeof process !== "undefined" &&
  process.argv[1] &&
  process.argv[1].includes("tag-intent-signals-products");

if (isEntrypoint) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
