/**
 * Posts-first intent signal detector.
 *
 * Pulls LinkedIn posts for a company from the Cloudflare D1 `posts` table
 * (via the edge worker), batches them through the local Qwen model, and
 * writes detected signals to Neon `intent_signals` with one row per signal,
 * each linking back to its source post via `source_url`.
 *
 * Usage:
 *   pnpm tsx scripts/detect-intent-from-posts.ts --company durlston-partners
 *   pnpm tsx scripts/detect-intent-from-posts.ts --company foo --limit 50
 *
 * Env (read from .env.local):
 *   LEAD_GEN_EDGE_URL  e.g. https://agenticleadgen-edge.eeeew.workers.dev
 *   JOBS_D1_TOKEN      bearer token for the edge worker
 *   LLM_BASE_URL       (optional) default http://localhost:8080/v1
 *   LLM_MODEL          (optional) default mlx-community/Qwen2.5-3B-Instruct-4bit
 */

import { db } from "@/db";
import { companies, intentSignals } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  VALID_SIGNAL_TYPES,
  computeIntentScore,
  stripMarkdownFences,
  callLocalLLM,
  ensureLLMReachable,
  type DetectedSignal,
} from "@/lib/intent/detector";

const SYSTEM_PROMPT = `You extract buying/hiring intent signals from LinkedIn posts authored by a B2B company.
You will be given multiple posts in a numbered list. For each post that contains a clear signal, emit one entry in the output array referring to its number.

Signal types (with default decay_days):
- hiring_intent (30): explicit hiring, open mandates, "we're looking for", named role + location, recruitment outreach
- tech_adoption (60): adopting / migrating to a new technology or platform, building on a specific stack
- growth_signal (45): funding, expansion, new office, M&A, revenue milestone
- budget_cycle (90): vendor evaluation, procurement, RFP, budget planning
- leadership_change (60): new exec, promotion, key hire announcement
- product_launch (30): new product, service line, or feature announcement

Return JSON exactly: {"signals": [{"post_index": N, "signal_type": "...", "confidence": 0.0-1.0, "evidence": ["short phrase from the post"], "decay_days": N}]}
- post_index is 1-based and refers to the numbered post.
- Only emit signals with confidence > 0.5.
- evidence must be 1-3 short phrases lifted verbatim from that post.
- If a post has no signal, omit it.
- If no posts have signals, return {"signals": []}.

CRITICAL: Respond with ONLY a valid JSON object, no markdown, no commentary.`;

interface D1Post {
  id: number;
  company_key: string;
  author_kind: string;
  author_name: string | null;
  author_url: string | null;
  post_url: string | null;
  post_text: string | null;
  posted_date: string | null;
  reactions_count: number;
  comments_count: number;
  reposts_count: number;
  media_type: string;
  is_repost: number;
  original_author: string | null;
  scraped_at: string;
}

interface PostSignal extends DetectedSignal {
  post_index: number;
}

const BATCH_SIZE = 5;
const POST_TEXT_TRUNCATE = 1200;

function parseArgs(): { company: string; limit: number } {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const company = get("--company");
  if (!company) {
    console.error("usage: --company <slug> [--limit N]");
    process.exit(1);
  }
  const limit = parseInt(get("--limit") ?? "1000", 10);
  return { company, limit: Number.isFinite(limit) ? limit : 1000 };
}

async function fetchD1Posts(slug: string, limit: number): Promise<D1Post[]> {
  const baseUrl = process.env.LEAD_GEN_EDGE_URL;
  const token = process.env.JOBS_D1_TOKEN;
  if (!baseUrl) throw new Error("LEAD_GEN_EDGE_URL not set");
  if (!token) throw new Error("JOBS_D1_TOKEN not set");

  const url = `${baseUrl}/api/companies/${encodeURIComponent(slug)}/posts/d1?limit=${limit}`;
  const r = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`edge ${r.status}: ${await r.text()}`);
  const body = (await r.json()) as { count: number; posts: D1Post[] };
  return body.posts;
}

async function detectBatch(
  company: { name: string; key: string },
  posts: D1Post[],
): Promise<Array<{ post: D1Post; signal: DetectedSignal }>> {
  const numbered = posts
    .map(
      (p, i) =>
        `Post ${i + 1} (${p.posted_date ?? "?"}):\n${(p.post_text ?? "").slice(0, POST_TEXT_TRUNCATE)}`,
    )
    .join("\n\n---\n\n");

  const userText = `Company: ${company.name} (${company.key})\n\n${numbered}`;

  const raw = await callLocalLLM(SYSTEM_PROMPT, userText, { maxTokens: 2048 });
  const json = stripMarkdownFences(raw);

  let parsed: { signals?: PostSignal[] };
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }

  const out: Array<{ post: D1Post; signal: DetectedSignal }> = [];
  for (const s of parsed.signals ?? []) {
    if (
      typeof s.post_index !== "number" ||
      s.post_index < 1 ||
      s.post_index > posts.length
    )
      continue;
    if (!VALID_SIGNAL_TYPES.has(s.signal_type)) continue;
    if (typeof s.confidence !== "number" || s.confidence <= 0.5 || s.confidence > 1)
      continue;
    out.push({
      post: posts[s.post_index - 1],
      signal: {
        signal_type: s.signal_type,
        confidence: s.confidence,
        evidence: Array.isArray(s.evidence) ? s.evidence : [],
        decay_days: typeof s.decay_days === "number" ? s.decay_days : 30,
      },
    });
  }
  return out;
}

async function main() {
  const { company: slug, limit } = parseArgs();

  await ensureLLMReachable().catch((e) => {
    console.error(`ERROR: ${e.message}. Start with: make intent-serve`);
    process.exit(1);
  });

  const [companyRow] = await db
    .select({ id: companies.id, name: companies.name, key: companies.key })
    .from(companies)
    .where(eq(companies.key, slug))
    .limit(1);
  if (!companyRow) {
    console.error(`Company not found in Neon: ${slug}`);
    process.exit(1);
  }

  const posts = await fetchD1Posts(slug, limit);
  console.log(`Fetched ${posts.length} D1 posts for ${slug}`);
  if (posts.length === 0) return;

  let detected = 0;
  let inserted = 0;
  const insertedIds: number[] = [];

  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const batch = posts.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(posts.length / BATCH_SIZE);

    let pairs: Array<{ post: D1Post; signal: DetectedSignal }> = [];
    try {
      pairs = await detectBatch(companyRow, batch);
    } catch (e: any) {
      console.error(`  batch ${batchNum}/${totalBatches}: ${e.message}`);
      continue;
    }

    detected += pairs.length;

    for (const { post, signal } of pairs) {
      const now = new Date().toISOString();
      const decayDays = signal.decay_days ?? 30;
      const decaysAt = new Date(
        Date.now() + decayDays * 24 * 60 * 60 * 1000,
      ).toISOString();

      try {
        const [row] = await db
          .insert(intentSignals)
          .values({
            company_id: companyRow.id,
            signal_type: signal.signal_type as any,
            source_type: "linkedin_post" as any,
            source_url: post.post_url,
            raw_text: (post.post_text ?? "").slice(0, 500),
            evidence: JSON.stringify(signal.evidence ?? []),
            confidence: signal.confidence,
            detected_at: now,
            decays_at: decaysAt,
            decay_days: decayDays,
            model_version: "intent-from-posts-v1",
          })
          .returning({ id: intentSignals.id });
        if (row) {
          inserted++;
          insertedIds.push(row.id);
        }
      } catch (e: any) {
        console.error(`  insert error: ${e.message}`);
      }
    }

    console.log(
      `  batch ${batchNum}/${totalBatches}: ${pairs.length} signals (running: detected=${detected} inserted=${inserted})`,
    );
  }

  // Re-aggregate intent score
  const allSignals = await db
    .select()
    .from(intentSignals)
    .where(eq(intentSignals.company_id, companyRow.id));
  const score = computeIntentScore(allSignals);
  await db
    .update(companies)
    .set({
      intent_score: score,
      intent_score_updated_at: new Date().toISOString(),
      intent_signals_count: allSignals.length,
    })
    .where(eq(companies.id, companyRow.id));

  console.log(
    `\nDone. ${slug}: detected=${detected} inserted=${inserted} totalSignals=${allSignals.length} score=${score.toFixed(1)}`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
