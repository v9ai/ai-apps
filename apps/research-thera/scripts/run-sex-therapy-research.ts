import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const USER_EMAIL = process.env.USER_EMAIL || "nicolai.vadim@gmail.com";
const FAMILY_MEMBER_ID = 3;
const GOAL_SLUG = "sex-therapy-intimacy-desire";
const TAG = "sex-therapy";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const CROSSREF_QUERIES = [
  "sexual desire discrepancy couples intervention",
  "hypoactive sexual desire disorder treatment",
  "sensate focus sex therapy outcomes",
  "cognitive behavioral therapy sexual dysfunction",
  "sexual communication intimacy couples",
  "low sexual desire women treatment",
  "emotionally focused therapy sexual intimacy",
  "mindfulness based sex therapy randomized trial",
];

const SEMANTIC_QUERIES = [
  "sex therapy sensate focus outcomes",
  "hypoactive sexual desire women randomized trial",
  "couples sexual intimacy intervention efficacy",
  "mindfulness sexual dysfunction meta-analysis",
  "emotion focused therapy sexuality",
  "sexual communication relationship satisfaction outcomes",
  "cognitive behavioral therapy sexual dysfunction systematic review",
  "sexual desire discrepancy intervention",
];

const ARXIV_QUERIES = [
  "sexual dysfunction treatment",
  "sensate focus therapy",
  "couples therapy sexuality",
];

const GENERAL_QUERIES = [
  "sex therapy sensate focus",
  "sexual desire discrepancy couples",
  "hypoactive sexual desire treatment",
  "mindfulness sexual dysfunction",
  "cognitive behavioral therapy sexual dysfunction",
  "sexual communication intimacy",
];

const RERANK_QUERY =
  "evidence-based sex therapy for adult couples: sexual desire discrepancy, hypoactive sexual desire, sensate focus, communication about intimacy, cognitive-behavioral and emotionally-focused interventions";

const PER_QUERY = 50;
const ENRICH_LIMIT = 300;
const ENRICH_CONCURRENCY = 15;
const PERSIST_LIMIT = 20;

function inferEvidenceLevel(text: string): string {
  const t = text.toLowerCase();
  if (/\bmeta[-\s]?analysis\b/.test(t)) return "meta-analysis";
  if (/\bsystematic review\b/.test(t)) return "systematic_review";
  if (/\brandomi[sz]ed controlled trial\b|\brct\b/.test(t)) return "RCT";
  if (/\bcohort\b/.test(t)) return "cohort";
  if (/\bcase[-\s]control\b/.test(t)) return "case_control";
  if (/\bcase series\b/.test(t)) return "case_series";
  if (/\bcase report\b|\bcase study\b/.test(t)) return "case_study";
  if (/\breview\b/.test(t)) return "review";
  return "other";
}

function topSentencesFromAbstract(abstract: string, n = 3): string[] {
  if (!abstract) return [];
  const sentences = abstract
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 30 && s.length <= 400);
  return sentences.slice(0, n);
}

async function main() {
  const { db } = await import("@/src/db");
  const { sql } = await import("@/src/db/neon");
  const { sourceTools } = await import("@/src/tools/sources.tools");
  const { openAlexTools } = await import("@/src/tools/openalex.tools");
  const { ragTools } = await import("@/src/tools/rag.tools");
  const { rerankPassages } = await import("@/src/lib/transformers");

  let goalId: number;
  try {
    const existing = await db.getGoalBySlug(GOAL_SLUG, USER_EMAIL);
    goalId = existing.id;
    console.log(`Found existing goal ${goalId}: "${existing.title}"`);
    const tags: string[] = existing.tags ?? [];
    if (!tags.includes(TAG)) {
      await db.updateGoal(existing.id, USER_EMAIL, { tags: [...tags, TAG] });
    }
  } catch {
    goalId = await db.createGoal({
      familyMemberId: FAMILY_MEMBER_ID,
      createdBy: USER_EMAIL,
      slug: GOAL_SLUG,
      title: "Rebuild sexual intimacy and desire in long-term partnership",
      description:
        "Evidence-based interventions for sexual desire discrepancy, hypoactive sexual desire, sensate focus, cognitive-behavioral therapy for sexual dysfunction, and communication about intimacy in long-term couples.",
    });
    await db.updateGoal(goalId, USER_EMAIL, { tags: [TAG] });
    await sql`UPDATE journal_entries SET goal_id = ${goalId} WHERE id IN (25, 26) AND user_id = ${USER_EMAIL}`;
    console.log(`Created goal ${goalId}, linked journal entries 25, 26`);
  }

  console.log(
    `\n=== 6-provider deep research for goal ${goalId} (LLM-free path) ===\n`,
  );

  const t0 = Date.now();

  console.log(`Crossref: ${CROSSREF_QUERIES.length} queries`);
  const crossrefBatches: any[][] = [];
  for (const q of CROSSREF_QUERIES) {
    crossrefBatches.push(await sourceTools.searchCrossref(q, PER_QUERY));
    await delay(500);
  }
  console.log(`  → ${crossrefBatches.flat().length} results`);

  console.log(`Semantic Scholar: ${SEMANTIC_QUERIES.length} queries`);
  const s2Batches: any[][] = [];
  const s2Delay = process.env.SEMANTIC_SCHOLAR_API_KEY ? 1100 : 200;
  for (const q of SEMANTIC_QUERIES) {
    s2Batches.push(await sourceTools.searchSemanticScholar(q, PER_QUERY));
    await delay(s2Delay);
  }
  console.log(`  → ${s2Batches.flat().length} results`);

  console.log(`arXiv: ${ARXIV_QUERIES.length} queries`);
  const arxivBatches: any[][] = [];
  for (const q of ARXIV_QUERIES) {
    arxivBatches.push(await sourceTools.searchArxiv(q, PER_QUERY));
    await delay(500);
  }
  console.log(`  → ${arxivBatches.flat().length} results`);

  console.log(`OpenAlex: ${GENERAL_QUERIES.length} queries`);
  const openAlexBatches: any[][] = [];
  for (const q of GENERAL_QUERIES) {
    openAlexBatches.push(await sourceTools.searchOpenAlex(q, PER_QUERY));
    await delay(200);
  }
  console.log(`  → ${openAlexBatches.flat().length} results`);

  console.log(`CORE: ${GENERAL_QUERIES.length} queries`);
  const coreBatches: any[][] = [];
  for (const q of GENERAL_QUERIES) {
    coreBatches.push(await sourceTools.searchCore(q, PER_QUERY));
    await delay(1000);
  }
  console.log(`  → ${coreBatches.flat().length} results`);

  console.log(`Zenodo: ${GENERAL_QUERIES.length} queries`);
  const zenodoBatches: any[][] = [];
  for (const q of GENERAL_QUERIES) {
    zenodoBatches.push(await sourceTools.searchZenodo(q, PER_QUERY));
    await delay(1100);
  }
  console.log(`  → ${zenodoBatches.flat().length} results`);

  const combined = [
    ...crossrefBatches.flat(),
    ...s2Batches.flat(),
    ...arxivBatches.flat(),
    ...openAlexBatches.flat(),
    ...coreBatches.flat(),
    ...zenodoBatches.flat(),
  ];

  const deduped = sourceTools.dedupeCandidates(combined);
  const filtered = sourceTools.filterBookChapters(deduped);
  console.log(
    `\nCombined=${combined.length}, deduped=${deduped.length}, after book-chapter filter=${filtered.length}`,
  );

  console.log(`\nEnriching top ${ENRICH_LIMIT} abstracts via OpenAlex...`);
  const slice = filtered.slice(0, ENRICH_LIMIT);
  const enriched = await sourceTools.mapLimit(
    slice,
    ENRICH_CONCURRENCY,
    async (c: any, idx: number) => {
      const doi = (c.doi ?? "").toString().trim();
      if (!doi || c.abstract) return c;
      if (idx > 0 && idx % 50 === 0) {
        console.log(`  enriched ${idx}/${slice.length}...`);
      }
      try {
        const oa = await openAlexTools.fetchAbstractByDoi(doi);
        return {
          ...c,
          _enrichedAbstract: oa.abstract,
          _enrichedYear: oa.year,
          _enrichedVenue: oa.venue,
          _enrichedAuthors: oa.authors,
        };
      } catch {
        return c;
      }
    },
  );

  const withAbstracts = enriched.filter(
    (c: any) => (c.abstract || c._enrichedAbstract || "").length >= 300,
  );
  const rest = filtered.slice(ENRICH_LIMIT);
  const candidates = [...withAbstracts, ...rest];
  console.log(`  With abstracts ≥300 chars: ${withAbstracts.length}`);

  console.log(`\nReranking ${candidates.length} candidates via embeddings...`);
  const passages = candidates.map((c: any) =>
    [c.title ?? "", c.abstract ?? c._enrichedAbstract ?? ""]
      .filter(Boolean)
      .join(" ")
      .slice(0, 512),
  );
  const ranked = await rerankPassages(RERANK_QUERY, passages);
  console.log(
    `  Top-5 rerank scores: ${ranked.slice(0, 5).map((r) => r.score.toFixed(3)).join(", ")}`,
  );

  const top = ranked
    .slice(0, PERSIST_LIMIT)
    .map((r) => ({ cand: candidates[r.index], score: r.score }));

  console.log(`\nPersisting top ${top.length} papers to goal ${goalId}...\n`);

  let persisted = 0;
  let failures = 0;
  for (const { cand, score } of top) {
    const title = cand.title ?? "(no title)";
    const abstract = cand.abstract ?? cand._enrichedAbstract ?? "";
    const authors: string[] = Array.isArray(cand.authors)
      ? cand.authors
      : Array.isArray(cand._enrichedAuthors)
        ? cand._enrichedAuthors
        : [];
    const year = cand.year ?? cand._enrichedYear ?? null;
    const journal = cand.venue ?? cand._enrichedVenue ?? null;
    const doi = cand.doi ?? null;
    const url = cand.url ?? (doi ? `https://doi.org/${doi}` : null);
    const keyFindings = topSentencesFromAbstract(abstract, 3);
    if (keyFindings.length === 0) {
      keyFindings.push(title);
    }
    const evidence = inferEvidenceLevel(`${title} ${abstract}`);

    console.log(
      `  ${persisted + failures + 1}. [${score.toFixed(2)} ${evidence}] ${title.slice(0, 90)}`,
    );

    try {
      const rowId = await db.upsertTherapyResearch(goalId, USER_EMAIL, {
        therapeuticGoalType: "sex-therapy",
        title,
        authors,
        year,
        journal,
        doi,
        url,
        abstract,
        keyFindings,
        therapeuticTechniques: [],
        evidenceLevel: evidence,
        relevanceScore: Math.max(0, Math.min(1, score)),
        extractedBy: "direct:6-provider:no-llm",
        extractionConfidence: 0.7,
      });

      if (abstract) {
        await ragTools
          .upsertResearchChunks({
            goalId,
            entityType: "TherapyResearch",
            entityId: rowId,
            title,
            abstract,
            keyFindings,
            techniques: [],
          })
          .catch((err: any) => {
            console.warn(
              `     ! RAG chunk failed: ${err instanceof Error ? err.message : String(err)}`,
            );
          });
      }
      persisted++;
    } catch (err) {
      failures++;
      console.error(
        `     ✗ persist failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `\n=== Done in ${elapsed}s: ${persisted} persisted, ${failures} failed ===`,
  );
  console.log(`View at /goals/${GOAL_SLUG} or /tag/sex-therapy`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
