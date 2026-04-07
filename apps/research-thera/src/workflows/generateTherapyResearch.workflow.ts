import { z } from "zod";
import { generateObject } from "@/src/lib/deepseek";
import { db } from "@/src/db";
import { ragTools } from "@/src/tools/rag.tools";
import { sourceTools } from "@/src/tools/sources.tools";
import { extractorTools } from "@/src/tools/extractor.tools";
import { openAlexTools } from "@/src/tools/openalex.tools";
import { rerankPassages } from "@/src/lib/transformers";

/**
 * Deep Research Pipeline
 *
 * Multi-step pipeline with quality gating:
 * 1. Load goal + notes from database
 * 2. Normalize goal (translate + clinical classify)
 * 3. Plan query (goal type + keywords + multi-source query expansion)
 * 4. Multi-source search (Crossref, PubMed, Semantic Scholar)
 * 5. Enrich abstracts via OpenAlex (controlled concurrency)
 * 6. Extract + gate each candidate (batch processing with per-candidate error handling)
 * 7. Persist top results to database + vector store
 */

// Tunable constants
const ENRICH_CANDIDATES_LIMIT = 300;
const ENRICH_CONCURRENCY = 15;
const EXTRACT_CANDIDATES_LIMIT = 50;
const EXTRACTION_BATCH_SIZE = 6;
const PERSIST_CANDIDATES_LIMIT = 20;
const RELEVANCE_THRESHOLD = 0.75;
const CONFIDENCE_THRESHOLD = 0.55;
const BLENDED_THRESHOLD = 0.72;

// Input/Output schemas
const inputSchema = z.object({
  userId: z.string(),
  goalId: z.number().int().optional(),
  jobId: z.string().optional(),
  familyMemberName: z.string().optional(),
  familyMemberAge: z.number().int().optional(),
  issueId: z.number().int().optional(),
  feedbackId: z.number().int().optional(),
});

const outputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  count: z.number().int(),
});

type Input = z.infer<typeof inputSchema>;
type Output = z.infer<typeof outputSchema>;

/**
 * Clinical normalization schema
 */
const ClinicalContextSchema = z.object({
  translatedGoalTitle: z.string(),
  originalLanguage: z.string(),
  clinicalRestatement: z.string(),
  clinicalDomain: z.string(),
  behaviorDirection: z.enum(["INCREASE", "REDUCE", "MAINTAIN", "UNCLEAR"]),
  developmentalTier: z.enum([
    "preschool",
    "early_school",
    "middle_childhood",
    "adolescent",
    "adult",
    "unknown",
  ]),
  requiredKeywords: z.array(z.string()),
  excludedTopics: z.array(z.string()),
});

type ClinicalContext = z.infer<typeof ClinicalContextSchema>;

function ageToTier(age: number | null | undefined): ClinicalContext["developmentalTier"] {
  if (!age) return "unknown";
  if (age <= 5) return "preschool";
  if (age <= 8) return "early_school";
  if (age <= 12) return "middle_childhood";
  if (age <= 17) return "adolescent";
  return "adult";
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Step functions
// ---------------------------------------------------------------------------

async function loadContext(input: Input) {
  if (input.jobId) {
    await db.updateGenerationJob(input.jobId, { progress: 5 }).catch(() => {});
  }

  let familyMemberName: string | null = null;
  let familyMemberAge: number | null = null;

  if (input.goalId) {
    const goal = await db.getGoal(input.goalId, input.userId);
    const notes = await db.listNotesForEntity(input.goalId, "Goal", input.userId);

    if (goal.familyMemberId) {
      try {
        const fm = await db.getFamilyMember(goal.familyMemberId);
        if (fm) {
          familyMemberName = fm.firstName ?? fm.name ?? null;
          familyMemberAge = fm.ageYears ?? null;
        }
      } catch {
        // Non-fatal
      }
    }

    return {
      userId: input.userId,
      goalId: input.goalId,
      jobId: input.jobId,
      issueId: input.issueId,
      feedbackId: input.feedbackId,
      goal: { id: goal.id, title: goal.title, description: goal.description },
      notes: notes.map((n: any) => ({ id: n.id, content: n.content })),
      familyMemberName,
      familyMemberAge,
    };
  }

  if (input.feedbackId) {
    const feedback = await db.getContactFeedback(input.feedbackId, input.userId);
    if (!feedback) throw new Error(`Feedback ${input.feedbackId} not found`);

    const issues = feedback.extractedIssues ?? [];
    const issuesTitles = issues.map((i: any) => i.title).join("; ");
    const title = issuesTitles || feedback.subject || "Feedback-based research";
    const description = feedback.content;

    if (feedback.familyMemberId) {
      try {
        const fm = await db.getFamilyMember(feedback.familyMemberId);
        if (fm) {
          familyMemberName = fm.firstName ?? fm.name ?? null;
          familyMemberAge = fm.ageYears ?? null;
        }
      } catch {
        // Non-fatal
      }
    }

    return {
      userId: input.userId,
      goalId: undefined as number | undefined,
      jobId: input.jobId,
      issueId: input.issueId,
      feedbackId: input.feedbackId,
      goal: { id: input.feedbackId, title, description },
      notes: [{ id: input.feedbackId, content: feedback.content }],
      familyMemberName,
      familyMemberAge,
    };
  }

  throw new Error("Either goalId or feedbackId must be provided");
}

async function normalizeGoal<T extends {
  goal: { title: string; description: string | null };
  notes: Array<{ content: string }>;
  familyMemberName: string | null;
  familyMemberAge: number | null;
}>(ctx: T): Promise<T & ClinicalContext> {
  const fallback: ClinicalContext = {
    translatedGoalTitle: ctx.goal.title,
    originalLanguage: "unknown",
    clinicalRestatement: ctx.goal.title,
    clinicalDomain: "behavioral_change",
    behaviorDirection: "UNCLEAR",
    developmentalTier: ageToTier(ctx.familyMemberAge),
    requiredKeywords: [],
    excludedTopics: [],
  };

  try {

    const ageCtx = ctx.familyMemberAge ? `The patient is ${ctx.familyMemberAge} years old.` : "";
    const nameCtx = ctx.familyMemberName ? `Patient name: ${ctx.familyMemberName}.` : "";
    const notesCtx = ctx.notes.map((n) => n.content).join("; ") || "(none)";

    const { object } = await generateObject({
      schema: ClinicalContextSchema,
      prompt: `You are a clinical psychologist specializing in translating parent/family-reported therapeutic goals into precise clinical language for academic research queries.

Goal Title: "${ctx.goal.title}"
Goal Description: "${ctx.goal.description ?? ""}"
Notes: ${notesCtx}
${ageCtx} ${nameCtx}

TASK:
1. Detect the language (ISO 639-1 code, e.g. "en", "ro", "fr")
2. Translate to English if not already English
3. Identify the SPECIFIC clinical construct (not generic "behavioral_change")
4. Determine if goal is to INCREASE or REDUCE the behavior
5. Infer developmental stage from age
6. Generate 5-10 required keywords that MUST appear in relevant research papers
7. Generate 5-10 excluded topics that are NOT relevant to this goal

CLINICAL DOMAIN EXAMPLES (be this specific, never use "behavioral_change"):
- "Face sunete la lectii" (Romanian: makes sounds during lessons) → if child context:
  "selective_mutism" OR "adhd_vocalization" OR "vocal_stereotypy_asd"
- "Reduce test anxiety" → "test_anxiety_children"
- "Improve eye contact" → "social_communication_asd"
- "Stop hitting siblings" → "aggression_children"
- "Talk more at school" → "selective_mutism" or "school_social_anxiety"

BEHAVIOR DIRECTION:
- INCREASE: goal is to produce MORE of a behavior
- REDUCE: goal is to produce LESS of a behavior
- MAINTAIN: keep current level
- UNCLEAR: cannot determine

REQUIRED KEYWORDS: clinical terms that MUST appear in papers for them to be relevant.
Example for selective mutism: ["selective mutism", "classroom vocalization", "speech anxiety", "school", "children", "behavioral intervention"]

EXCLUDED TOPICS: topics that look related but are NOT relevant.
Example for selective mutism: ["homework completion", "academic achievement", "family therapy engagement", "adolescent depression", "adult psychotherapy"]

Return JSON matching the schema exactly.`,
    });

    console.log(
      `Goal normalized: "${ctx.goal.title}" → "${object.translatedGoalTitle}" (${object.clinicalDomain}, ${object.behaviorDirection})`,
    );

    return { ...ctx, ...object };
  } catch (err) {
    console.warn(
      `Goal normalization failed, using fallback: ${err instanceof Error ? err.message : String(err)}`,
    );
    return { ...ctx, ...fallback };
  }
}

async function planQuery<T extends {
  jobId?: string;
  goal: { title: string; description: string | null };
  notes: Array<{ content: string }>;
  translatedGoalTitle?: string;
  clinicalDomain?: string;
  behaviorDirection?: string;
  developmentalTier?: string;
  requiredKeywords?: string[];
  excludedTopics?: string[];
}>(ctx: T) {
  if (ctx.jobId) {
    await db.updateGenerationJob(ctx.jobId, { progress: 20 }).catch(() => {});
  }

  const planTitle = (ctx as any).translatedGoalTitle ?? ctx.goal.title;

  const rawPlan = await extractorTools.plan({
    title: planTitle,
    description: ctx.goal.description ?? "",
    notes: ctx.notes.map((n) => n.content),
    clinicalDomain: ctx.clinicalDomain,
    behaviorDirection: ctx.behaviorDirection,
    developmentalTier: ctx.developmentalTier,
    requiredKeywords: ctx.requiredKeywords,
    excludedTopics: ctx.excludedTopics,
  });

  const plan = extractorTools.sanitize(rawPlan);

  console.log(`Query Plan:`);
  console.log(`  Goal Type: ${plan.goalType ?? (plan as any).therapeuticGoalType}`);
  console.log(`  Semantic Scholar Queries: ${plan.semanticScholarQueries?.length ?? 0}`);
  console.log(`  Crossref Queries: ${plan.crossrefQueries?.length ?? 0}`);
  console.log(`  PubMed Queries: ${plan.pubmedQueries?.length ?? 0}`);

  return {
    ...ctx,
    ...plan,
    goalType: plan.goalType ?? (plan as any).therapeuticGoalType ?? "behavioral_change",
  };
}

async function search<T extends {
  jobId?: string;
  goalType: string;
  keywords: string[];
  semanticScholarQueries?: string[];
  crossrefQueries?: string[];
  pubmedQueries?: string[];
  excludedTopics?: string[];
  [key: string]: any;
}>(ctx: T) {
  if (ctx.jobId) {
    await db.updateGenerationJob(ctx.jobId, { progress: 40 }).catch(() => {});
  }

  const PER_QUERY = 50;
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const crossrefQueries = ctx.crossrefQueries?.length
    ? ctx.crossrefQueries.slice(0, 15)
    : [
        "behavioral intervention children school-age evidence-based",
        "CBT cognitive behavioral therapy children school",
        "anxiety disorder children behavioral treatment",
        "social skills intervention school-age children",
        "child behavioral therapy evidence-based outcomes",
      ];

  const semanticQueries = ctx.semanticScholarQueries?.length
    ? ctx.semanticScholarQueries.slice(0, 20)
    : [
        "evidence-based behavioral intervention children",
        "CBT children anxiety school outcomes",
        "pediatric behavioral therapy effectiveness",
        "school-based mental health intervention children",
        "child psychology therapeutic techniques",
      ];

  const pubmedQueries = ctx.pubmedQueries?.length
    ? ctx.pubmedQueries.slice(0, 12)
    : [
        "behavioral intervention children[MeSH] school",
        "CBT anxiety children school-based treatment",
      ];

  console.log(`  Crossref: ${crossrefQueries.length} queries`);
  console.log(`  Semantic Scholar: ${semanticQueries.length} queries`);
  console.log(`  PubMed: ${pubmedQueries.length} queries`);

  console.log("Fetching Crossref results...");
  const crossrefBatches: any[][] = [];
  for (const q of crossrefQueries) {
    crossrefBatches.push(await sourceTools.searchCrossref(q, PER_QUERY));
    await delay(500);
  }

  console.log("Fetching PubMed results...");
  const pubmedBatches: any[][] = [];
  for (const q of pubmedQueries) {
    pubmedBatches.push(await sourceTools.searchPubMed(q, PER_QUERY));
    await delay(1000);
  }

  console.log("Fetching Semantic Scholar results...");
  const semanticBatches: any[][] = [];
  const s2Delay = process.env.SEMANTIC_SCHOLAR_API_KEY ? 1100 : 200;
  for (const q of semanticQueries) {
    semanticBatches.push(await sourceTools.searchSemanticScholar(q, PER_QUERY));
    await delay(s2Delay);
  }

  const s2Results = semanticBatches.flat();
  const topS2Paper = s2Results
    .filter((p: any) => p.s2PaperId && (p.influentialCitationCount || 0) > 0)
    .sort((a: any, b: any) => (b.influentialCitationCount || 0) - (a.influentialCitationCount || 0))[0];

  let recommendationResults: any[] = [];
  if (topS2Paper?.s2PaperId) {
    console.log(`Fetching S2 recommendations for: "${topS2Paper.title}"`);
    recommendationResults = await sourceTools.getSemanticScholarRecommendations(topS2Paper.s2PaperId, 20);
    await delay(s2Delay);
  }

  const combined = [
    ...crossrefBatches.flat(),
    ...pubmedBatches.flat(),
    ...s2Results,
    ...recommendationResults,
  ];

  console.log(
    `Raw results: Crossref(${crossrefBatches.flat().length}), PubMed(${pubmedBatches.flat().length}), Semantic(${s2Results.length}), S2 Recs(${recommendationResults.length})`,
  );

  const staticBadTerms = [
    "forensic", "witness", "court", "police", "legal", "pre-admission",
    "homework completion", "homework adherence", "homework refusal",
    "dating violence", "teen dating", "cybersex", "internet pornography",
    "weight control", "obesity intervention", "gang-affiliated",
    "delinquency", "marital therapy", "marriage therapy", "couples therapy",
  ];

  const dynamicBadTerms: string[] = ctx.excludedTopics ?? [];
  const allBadTerms = [...staticBadTerms, ...dynamicBadTerms];
  const bad = new RegExp(`\\b(${allBadTerms.map(escapeRegExp).join("|")})\\b`, "i");

  const deduped = sourceTools.dedupeCandidates(combined);
  const titleFiltered = deduped.filter((c: any) => !bad.test(c.title ?? ""));
  const filtered = sourceTools.filterBookChapters(titleFiltered);

  console.log(`After dedup: ${deduped.length}, title filter: ${titleFiltered.length}, book chapter filter: ${filtered.length}`);

  return { ...ctx, candidates: filtered };
}

async function enrichAbstracts<T extends {
  jobId?: string;
  candidates: any[];
  [key: string]: any;
}>(ctx: T) {
  if (ctx.jobId) {
    await db.updateGenerationJob(ctx.jobId, { progress: 60 }).catch(() => {});
  }

  const slice = ctx.candidates.slice(0, ENRICH_CANDIDATES_LIMIT);

  const enriched = await sourceTools.mapLimit(
    slice,
    ENRICH_CONCURRENCY,
    async (c: any, idx: number) => {
      const doi = (c.doi ?? "").toString().trim();
      if (!doi || c.abstract) return c;

      if (idx > 0 && idx % 50 === 0) {
        console.log(`  Enriched ${idx} / ${slice.length}...`);
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

  console.log(`  Enriched: ${enriched.length}, with abstracts: ${withAbstracts.length}`);

  return {
    ...ctx,
    candidates: [...withAbstracts, ...ctx.candidates.slice(ENRICH_CANDIDATES_LIMIT)],
  };
}

async function extractOnePaper(params: {
  candidate: any;
  goalType: string;
  goalTitle: string;
  goalDescription: string | null;
  developmentalTier?: string;
  patientAge?: number | null;
}): Promise<{ ok: boolean; score: number; research?: any; reason: string }> {
  try {
    const paper = await sourceTools.fetchPaperDetails(params.candidate);

    const extracted = await extractorTools.extract({
      goalTitle: params.goalTitle,
      goalDescription: params.goalDescription ?? "",
      goalType: params.goalType,
      paper,
      developmentalTier: params.developmentalTier,
      patientAge: params.patientAge,
    });

    const ok =
      extracted.relevanceScore >= RELEVANCE_THRESHOLD &&
      extracted.confidence >= CONFIDENCE_THRESHOLD &&
      (extracted.keyFindings?.length ?? 0) > 0;

    return {
      ok,
      score: extracted.relevanceScore,
      research: ok
        ? {
            therapeuticGoalType: params.goalType,
            title: extracted.paperMeta.title,
            authors: extracted.paperMeta.authors,
            year: extracted.paperMeta.year,
            journal: extracted.paperMeta.venue,
            doi: extracted.paperMeta.doi,
            url: extracted.paperMeta.url,
            abstract: paper.abstract,
            keyFindings: extracted.keyFindings,
            therapeuticTechniques: extracted.practicalTakeaways,
            evidenceLevel: extracted.studyType,
            relevanceScore: extracted.relevanceScore,
            extractionConfidence: extracted.confidence,
            extractedBy: "pipeline:deepseek:v2",
          }
        : undefined,
      reason: ok ? "passed" : (extracted.rejectReason ?? "failed_thresholds"),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Extraction error for "${params.candidate.title}": ${msg}`);
    return { ok: false, score: 0, reason: "extraction_error" };
  }
}

async function rerankCandidates<T extends {
  candidates: any[];
  clinicalRestatement?: string;
  translatedGoalTitle?: string;
  goal: { title: string };
  [key: string]: any;
}>(ctx: T): Promise<T> {
  const query =
    ctx.clinicalRestatement ?? ctx.translatedGoalTitle ?? ctx.goal.title;

  if (ctx.candidates.length === 0) return ctx;

  console.log(
    `[rerank] Ranking ${ctx.candidates.length} candidates against: "${query}"`,
  );

  try {
    const passages = ctx.candidates.map((c: any) =>
      [c.title ?? "", c.abstract ?? c._enrichedAbstract ?? ""]
        .filter(Boolean)
        .join(" ")
        .slice(0, 512),
    );

    const results = await rerankPassages(query, passages);

    const ranked = results.map((r) => ({
      ...ctx.candidates[r.index],
      _rerankScore: r.score,
    }));

    console.log(
      `[rerank] Top-3 scores: ${ranked.slice(0, 3).map((c: any) => c._rerankScore.toFixed(3)).join(", ")}`,
    );

    return { ...ctx, candidates: ranked };
  } catch (err) {
    console.warn(
      `[rerank] Failed, using original order: ${err instanceof Error ? err.message : String(err)}`,
    );
    return ctx;
  }
}

async function extractAll<T extends {
  jobId?: string;
  goalId?: number;
  issueId?: number;
  feedbackId?: number;
  goal: { title: string; description: string | null };
  goalType: string;
  candidates: any[];
  translatedGoalTitle?: string;
  requiredKeywords?: string[];
  developmentalTier?: string;
  familyMemberAge?: number | null;
  [key: string]: any;
}>(ctx: T) {
  if (ctx.jobId) {
    await db.updateGenerationJob(ctx.jobId, { progress: 85 }).catch(() => {});
  }

  const candidates = ctx.candidates.slice(0, EXTRACT_CANDIDATES_LIMIT);

  console.log(`Extracting ${candidates.length} candidates (batches of ${EXTRACTION_BATCH_SIZE})...`);

  const results: any[] = [];

  for (let i = 0; i < candidates.length; i += EXTRACTION_BATCH_SIZE) {
    const batch = candidates.slice(i, i + EXTRACTION_BATCH_SIZE);
    const batchNum = Math.floor(i / EXTRACTION_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(candidates.length / EXTRACTION_BATCH_SIZE);

    console.log(
      `  Batch ${batchNum}/${totalBatches} (candidates ${i + 1}-${Math.min(i + EXTRACTION_BATCH_SIZE, candidates.length)})`,
    );

    const batchResults = await Promise.all(
      batch.map((candidate: any) =>
        extractOnePaper({
          candidate,
          goalType: ctx.goalType,
          goalTitle: ctx.translatedGoalTitle ?? ctx.goal.title,
          goalDescription: ctx.goal.description,
          developmentalTier: ctx.developmentalTier,
          patientAge: ctx.familyMemberAge,
        }),
      ),
    );

    results.push(...batchResults);
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`  Extraction complete: ${passed}/${results.length} passed initial gate`);

  return { ...ctx, results, requiredKeywords: ctx.requiredKeywords ?? [] };
}

async function persist<T extends {
  jobId?: string;
  goalId?: number;
  userId: string;
  issueId?: number;
  feedbackId?: number;
  results: any[];
  requiredKeywords?: string[];
}>(ctx: T): Promise<Output> {
  if (ctx.jobId) {
    await db.updateGenerationJob(ctx.jobId, { progress: 95 }).catch(() => {});
  }

  const requiredKeywords = (ctx.requiredKeywords ?? []).map((k) => k.toLowerCase());

  function keywordOverlapScore(research: any): number {
    if (!requiredKeywords.length) return 0.5;
    const haystack = `${research.title ?? ""} ${research.abstract ?? ""}`.toLowerCase();
    const hits = requiredKeywords.filter((kw) => haystack.includes(kw)).length;
    return hits / requiredKeywords.length;
  }

  const qualified = ctx.results
    .filter((r) => r.ok && r.research)
    .filter((r) => (r.research.keyFindings?.length ?? 0) > 0)
    .filter((r) => !r.rejectReason && !r.research?.rejectReason)
    .map((r) => {
      const relevance = r.research.relevanceScore ?? 0;
      const confidence = r.research.extractionConfidence ?? 0;
      const llmBlended = 0.7 * relevance + 0.3 * confidence;
      const kwOverlap = keywordOverlapScore(r.research);
      const adjustedBlended =
        requiredKeywords.length > 0
          ? 0.6 * llmBlended + 0.4 * kwOverlap
          : llmBlended;
      return { ...r, blended: adjustedBlended, llmBlended, kwOverlap };
    })
    .filter((r) => r.blended >= BLENDED_THRESHOLD)
    .sort((a, b) => b.blended - a.blended);

  const top = qualified.slice(0, PERSIST_CANDIDATES_LIMIT);

  console.log(`Persisting top ${top.length} papers...`);

  let count = 0;
  let errors = 0;

  for (const r of top) {
    const research = r.research;
    const displayTitle =
      research.title.length > 80 ? `${research.title.substring(0, 80)}...` : research.title;

    console.log(
      `  ${count + errors + 1}. [blended=${r.blended.toFixed(2)}] ${displayTitle}`,
    );

    try {
      const rowId = await db.upsertTherapyResearch(
        ctx.goalId,
        ctx.userId,
        { ...research, issueId: ctx.issueId ?? null, feedbackId: ctx.feedbackId ?? null },
      );
      count++;

      await ragTools.upsertResearchChunks({
        goalId: ctx.goalId,
        entityType: "TherapyResearch",
        entityId: rowId,
        title: research.title,
        abstract: research.abstract ?? "",
        keyFindings: research.keyFindings,
        techniques: research.therapeuticTechniques,
      });
    } catch (err) {
      errors++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  Failed to persist "${research.title}": ${msg}`);
    }
  }

  console.log(`Persisted ${count} papers${errors > 0 ? `, ${errors} failed` : ""}`);

  return {
    success: count > 0 || errors === 0,
    count,
    message: count
      ? `Generated ${count} research papers (blended quality score >= ${BLENDED_THRESHOLD}, ranked by relevance)`
      : errors > 0
        ? `All ${errors} persist attempts failed`
        : "No papers met minimum quality thresholds",
  };
}

// ---------------------------------------------------------------------------
// Main pipeline function
// ---------------------------------------------------------------------------

export async function generateTherapyResearch(inputData: Input): Promise<Output> {
  const ctx1 = await loadContext(inputData);
  const ctx2 = await normalizeGoal(ctx1);

  // Progress: 10% (formerly ensurePromptsStep)
  if (inputData.jobId) {
    await db.updateGenerationJob(inputData.jobId, { progress: 10 }).catch(() => {});
  }

  const ctx3 = await planQuery({ ...ctx2, notes: ctx2.notes.map((n: any) => ({ content: n.content })) });
  const ctx4 = await search(ctx3);
  const ctx5 = await enrichAbstracts(ctx4);
  const ctx5r = await rerankCandidates(ctx5);
  const ctx6 = await extractAll({
    ...ctx5r,
    issueId: (inputData as any).issueId,
    feedbackId: (inputData as any).feedbackId,
  });
  return persist({
    userId: inputData.userId,
    goalId: ctx1.goalId,
    jobId: inputData.jobId,
    issueId: (inputData as any).issueId,
    feedbackId: (inputData as any).feedbackId,
    results: ctx6.results,
    requiredKeywords: (ctx6 as any).requiredKeywords ?? [],
  });
}

