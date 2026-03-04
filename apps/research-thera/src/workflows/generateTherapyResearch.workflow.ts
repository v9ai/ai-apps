import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateObject } from "ai";
import { d1Tools } from "@/src/db";
import { ragTools } from "@/src/tools/rag.tools";
import { sourceTools } from "@/src/tools/sources.tools";
import { extractorTools } from "@/src/tools/extractor.tools";
import { openAlexTools } from "@/src/tools/openalex.tools";
import { langfusePromptPackTools } from "@/src/tools/langfusePromptPack.tools";

/**
 * Deep Research Workflow
 *
 * Multi-step workflow with quality gating:
 * 1. Load goal + notes from D1 database
 * 2. Ensure Langfuse prompts exist (DeepSeek generates goal-specific templates)
 * 3. Plan query (goal type + keywords + multi-source query expansion)
 * 4. Multi-source search (Crossref, PubMed, Semantic Scholar)
 * 5. Enrich abstracts via OpenAlex (controlled concurrency)
 * 6. Extract + gate each candidate (batch processing with per-candidate error handling)
 * 7. Persist top results to D1 database + vector store
 */

// Tunable constants
const ENRICH_CANDIDATES_LIMIT = 300;
const ENRICH_CONCURRENCY = 15;
const EXTRACT_CANDIDATES_LIMIT = 50;
const EXTRACTION_BATCH_SIZE = 6;
const PERSIST_CANDIDATES_LIMIT = 20; // lowered from 50: quality over quantity
const RELEVANCE_THRESHOLD = 0.75; // raised from 0.6: require clear topic match
const CONFIDENCE_THRESHOLD = 0.55; // raised from 0.5
const BLENDED_THRESHOLD = 0.72; // raised from 0.45 (was a dead-code no-op gate)

// Input/Output schemas
const inputSchema = z.object({
  userId: z.string(),
  goalId: z.number().int(),
  jobId: z.string().optional(),
  familyMemberName: z.string().optional(),
  familyMemberAge: z.number().int().optional(),
});

const outputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  count: z.number().int(),
});

/**
 * Clinical normalization schema — output of normalizeGoalStep
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

/**
 * Derive developmental tier from age (years).
 */
function ageToTier(age: number | null | undefined): ClinicalContext["developmentalTier"] {
  if (!age) return "unknown";
  if (age <= 5) return "preschool";
  if (age <= 8) return "early_school";
  if (age <= 12) return "middle_childhood";
  if (age <= 17) return "adolescent";
  return "adult";
}

/**
 * Step 1b: Normalize goal — translate non-English titles and classify the
 * clinical construct before Langfuse prompts are generated.
 *
 * This step runs between loadContextStep and ensurePromptsStep.  Without it,
 * Romanian (or any non-English) goal titles confuse DeepSeek into generating
 * semantically drifted search queries (e.g. "homework completion" instead of
 * "selective mutism classroom vocalization").
 *
 * Failure is non-fatal: we fall back to the original title + safe defaults.
 */
const normalizeGoalStep = createStep({
  id: "normalize-goal",
  inputSchema: z.object({
    userId: z.string(),
    goalId: z.number().int(),
    jobId: z.string().optional(),
    goal: z.object({
      id: z.number().int(),
      title: z.string(),
      description: z.string().nullable(),
    }),
    notes: z.array(z.object({ id: z.number().int(), content: z.string() })),
    familyMemberName: z.string().nullable(),
    familyMemberAge: z.number().int().nullable(),
  }),
  outputSchema: z.object({
    userId: z.string(),
    goalId: z.number().int(),
    jobId: z.string().optional(),
    goal: z.object({
      id: z.number().int(),
      title: z.string(),
      description: z.string().nullable(),
    }),
    notes: z.array(z.object({ id: z.number().int(), content: z.string() })),
    familyMemberName: z.string().nullable(),
    familyMemberAge: z.number().int().nullable(),
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
  }),
  execute: async ({ inputData }) => {
    const fallback: ClinicalContext = {
      translatedGoalTitle: inputData.goal.title,
      originalLanguage: "unknown",
      clinicalRestatement: inputData.goal.title,
      clinicalDomain: "behavioral_change",
      behaviorDirection: "UNCLEAR",
      developmentalTier: ageToTier(inputData.familyMemberAge),
      requiredKeywords: [],
      excludedTopics: [],
    };

    try {
      const deepseek = createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY });

      const ageCtx = inputData.familyMemberAge
        ? `The patient is ${inputData.familyMemberAge} years old.`
        : "";
      const nameCtx = inputData.familyMemberName
        ? `Patient name: ${inputData.familyMemberName}.`
        : "";
      const notesCtx =
        inputData.notes.map((n) => n.content).join("; ") || "(none)";

      const { object } = await generateObject({
        model: deepseek("deepseek-chat"),
        schema: ClinicalContextSchema,
        prompt: `You are a clinical psychologist specializing in translating parent/family-reported therapeutic goals into precise clinical language for academic research queries.

Goal Title: "${inputData.goal.title}"
Goal Description: "${inputData.goal.description ?? ""}"
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
        `🌐 Goal normalized: "${inputData.goal.title}" → "${object.translatedGoalTitle}" (${object.clinicalDomain}, ${object.behaviorDirection})`,
      );

      return { ...inputData, ...object };
    } catch (err) {
      console.warn(
        `⚠️ Goal normalization failed, using fallback: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { ...inputData, ...fallback };
    }
  },
});

// Step 1: Load context
const loadContextStep = createStep({
  id: "load-context",
  inputSchema,
  outputSchema: z.object({
    userId: z.string(),
    goalId: z.number().int(),
    jobId: z.string().optional(),
    goal: z.object({
      id: z.number().int(),
      title: z.string(),
      description: z.string().nullable(),
    }),
    notes: z.array(z.object({ id: z.number().int(), content: z.string() })),
    familyMemberName: z.string().nullable(),
    familyMemberAge: z.number().int().nullable(),
  }),
  execute: async ({ inputData }) => {
    if (inputData.jobId) {
      await d1Tools.updateGenerationJob(inputData.jobId, { progress: 5 }).catch(() => {});
    }
    const goal = await d1Tools.getGoal(inputData.goalId, inputData.userId);
    const notes = await d1Tools.listNotesForEntity(
      inputData.goalId,
      "Goal",
      inputData.userId,
    );

    let familyMemberName: string | null = null;
    let familyMemberAge: number | null = null;

    if (goal.familyMemberId) {
      try {
        const fm = await d1Tools.getFamilyMember(goal.familyMemberId);
        if (fm) {
          familyMemberName = fm.firstName ?? fm.name ?? null;
          familyMemberAge = fm.ageYears ?? null;
        }
      } catch {
        // Non-fatal: proceed without family member context
      }
    }

    return {
      userId: inputData.userId,
      goalId: inputData.goalId,
      jobId: inputData.jobId,
      goal: {
        id: goal.id,
        title: goal.title,
        description: goal.description,
      },
      notes: notes.map((n) => ({ id: n.id, content: n.content })),
      familyMemberName,
      familyMemberAge,
    };
  },
});

const clinicalContextFields = {
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
};

// Step 2: Ensure Langfuse prompts exist (DeepSeek generates goal-specific templates)
const ensurePromptsStep = createStep({
  id: "ensure-langfuse-prompts",
  inputSchema: z.object({
    userId: z.string(),
    goalId: z.number().int(),
    jobId: z.string().optional(),
    goal: z.object({
      id: z.number().int(),
      title: z.string(),
      description: z.string().nullable(),
    }),
    notes: z.array(z.object({ id: z.number().int(), content: z.string() })),
    familyMemberName: z.string().nullable(),
    familyMemberAge: z.number().int().nullable(),
    ...clinicalContextFields,
  }),
  outputSchema: z.object({
    userId: z.string(),
    goalId: z.number().int(),
    jobId: z.string().optional(),
    goal: z.object({
      id: z.number().int(),
      title: z.string(),
      description: z.string().nullable(),
    }),
    notes: z.array(z.object({ content: z.string() })),
    familyMemberName: z.string().nullable(),
    familyMemberAge: z.number().int().nullable(),
    plannerPromptName: z.string(),
    extractorPromptName: z.string(),
    goalSignature: z.string(),
    createdNewVersion: z.boolean(),
    ...clinicalContextFields,
  }),
  execute: async ({ inputData }) => {
    if (inputData.jobId) {
      await d1Tools.updateGenerationJob(inputData.jobId, { progress: 10 }).catch(() => {});
    }
    const ensured = await langfusePromptPackTools.ensure({
      goalId: inputData.goalId,
      // Use the translated/normalized title so DeepSeek generates correct domain queries
      goalTitle: inputData.translatedGoalTitle,
      goalDescription: inputData.goal.description ?? "",
      notes: inputData.notes.map((n) => n.content),
      familyMemberName: inputData.familyMemberName,
      familyMemberAge: inputData.familyMemberAge,
      label: process.env.LANGFUSE_PROMPT_LABEL || "production",
      // Clinical context from normalizeGoalStep — used as hard constraints in planner prompt
      clinicalDomain: inputData.clinicalDomain,
      clinicalRestatement: inputData.clinicalRestatement,
      behaviorDirection: inputData.behaviorDirection,
      developmentalTier: inputData.developmentalTier,
      requiredKeywords: inputData.requiredKeywords,
      excludedTopics: inputData.excludedTopics,
    });

    return {
      ...inputData,
      notes: inputData.notes.map((n) => ({ content: n.content })),
      ...ensured,
      jobId: inputData.jobId,
    };
  },
});

// Step 3: Plan query (uses Langfuse-backed planner prompt)
const planQueryStep = createStep({
  id: "plan-query",
  inputSchema: z.object({
    userId: z.string(),
    goalId: z.number().int(),
    jobId: z.string().optional(),
    goal: z.object({ title: z.string(), description: z.string().nullable() }),
    notes: z.array(z.object({ content: z.string() })),
    familyMemberName: z.string().nullable(),
    familyMemberAge: z.number().int().nullable(),
    plannerPromptName: z.string(),
    extractorPromptName: z.string(),
  }),
  outputSchema: z.object({
    userId: z.string(),
    goalId: z.number().int(),
    jobId: z.string().optional(),
    goal: z.object({ title: z.string(), description: z.string().nullable() }),
    notes: z.array(z.object({ content: z.string() })),
    familyMemberName: z.string().nullable(),
    familyMemberAge: z.number().int().nullable(),
    plannerPromptName: z.string(),
    extractorPromptName: z.string(),
    goalType: z.string(),
    keywords: z.array(z.string()),
    semanticScholarQueries: z.array(z.string()),
    crossrefQueries: z.array(z.string()),
    pubmedQueries: z.array(z.string()),
    inclusion: z.array(z.string()),
    exclusion: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    if (inputData.jobId) {
      await d1Tools.updateGenerationJob(inputData.jobId, { progress: 20 }).catch(() => {});
    }
    // Use the translated title so the Langfuse planner prompt runs in clinical English
    const planTitle = (inputData as any).translatedGoalTitle ?? inputData.goal.title;

    const rawPlan = await extractorTools.plan({
      title: planTitle,
      description: inputData.goal.description ?? "",
      notes: inputData.notes.map((n) => n.content),
      plannerPromptName: inputData.plannerPromptName,
    });

    const plan = extractorTools.sanitize(rawPlan);

    console.log(`\n📋 Query Plan:`);
    console.log(`   Goal Type: ${plan.goalType ?? plan.therapeuticGoalType}`);
    console.log(
      `   Semantic Scholar Queries: ${plan.semanticScholarQueries?.length ?? 0}`,
    );
    console.log(`   Crossref Queries: ${plan.crossrefQueries?.length ?? 0}`);
    console.log(`   PubMed Queries: ${plan.pubmedQueries?.length ?? 0}\n`);

    return {
      ...inputData,
      ...plan,
      goalType:
        plan.goalType ?? plan.therapeuticGoalType ?? "behavioral_change",
      jobId: inputData.jobId,
    };
  },
});

/**
 * Escape special regex characters
 */
function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Step 4: Multi-source search with multi-query expansion
const searchStep = createStep({
  id: "search",
  inputSchema: z.object({
    userId: z.string(),
    goalId: z.number().int(),
    jobId: z.string().optional(),
    goal: z.any(),
    notes: z.any(),
    plannerPromptName: z.string(),
    extractorPromptName: z.string(),
    goalType: z.string(),
    keywords: z.array(z.string()),
    semanticScholarQueries: z.array(z.string()).optional(),
    crossrefQueries: z.array(z.string()).optional(),
    pubmedQueries: z.array(z.string()).optional(),
    exclusion: z.array(z.string()).optional(),
  }),
  outputSchema: z.object({
    userId: z.string(),
    goalId: z.number().int(),
    jobId: z.string().optional(),
    goal: z.any(),
    notes: z.any(),
    plannerPromptName: z.string(),
    extractorPromptName: z.string(),
    goalType: z.string(),
    keywords: z.array(z.string()),
    candidates: z.array(
      z.object({
        title: z.string(),
        doi: z.string().optional(),
        url: z.string().optional(),
        year: z.number().int().optional(),
        source: z.string(),
      }),
    ),
  }),
  execute: async ({ inputData }) => {
    if (inputData.jobId) {
      await d1Tools.updateGenerationJob(inputData.jobId, { progress: 40 }).catch(() => {});
    }
    // Increase recall aggressively; filter later
    const PER_QUERY = 50;

    console.log(`\n🔍 Multi-source search with query expansion...\n`);

    // Fallback queries — child/behavioral defaults if planner didn't provide them.
    // These are intentionally pediatric-focused to avoid adult-CBT drift.
    const crossrefQueries = inputData.crossrefQueries?.length
      ? inputData.crossrefQueries.slice(0, 15)
      : [
          "behavioral intervention children school-age evidence-based",
          "CBT cognitive behavioral therapy children school",
          "anxiety disorder children behavioral treatment",
          "social skills intervention school-age children",
          "child behavioral therapy evidence-based outcomes",
        ];

    const semanticQueries = inputData.semanticScholarQueries?.length
      ? inputData.semanticScholarQueries.slice(0, 20)
      : [
          "evidence-based behavioral intervention children",
          "CBT children anxiety school outcomes",
          "pediatric behavioral therapy effectiveness",
          "school-based mental health intervention children",
          "child psychology therapeutic techniques",
        ];

    const pubmedQueries = inputData.pubmedQueries?.length
      ? inputData.pubmedQueries.slice(0, 12)
      : [
          "behavioral intervention children[MeSH] school",
          "CBT anxiety children school-based treatment",
        ];

    console.log(`   Crossref: ${crossrefQueries.length} queries`);
    console.log(`   Semantic Scholar: ${semanticQueries.length} queries`);
    console.log(`   PubMed: ${pubmedQueries.length} queries\n`);

    // Sequential with delays to respect free-tier API rate limits
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

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
      await delay(1000); // NCBI rate limit: 3 req/sec without API key
    }

    console.log("Fetching Semantic Scholar results...");
    const semanticBatches: any[][] = [];
    // With API key: introductory limit is 1 RPS → 1100ms safe gap.
    // Without API key: shared pool of 1000 RPS → 200ms is conservative enough.
    const s2Delay = process.env.SEMANTIC_SCHOLAR_API_KEY ? 1100 : 200;
    for (const q of semanticQueries) {
      semanticBatches.push(
        await sourceTools.searchSemanticScholar(q, PER_QUERY),
      );
      await delay(s2Delay);
    }

    // Expand candidate pool using S2 paper recommendations.
    // Pick the most-cited paper from the initial S2 results and fetch papers
    // that S2 considers similar — these are often highly relevant but missed
    // by keyword search alone.
    const s2Results = semanticBatches.flat();
    const topS2Paper = s2Results
      .filter((p: any) => p.s2PaperId && (p.influentialCitationCount || 0) > 0)
      .sort(
        (a: any, b: any) =>
          (b.influentialCitationCount || 0) - (a.influentialCitationCount || 0),
      )[0];

    let recommendationResults: any[] = [];
    if (topS2Paper?.s2PaperId) {
      console.log(
        `🔗 Fetching S2 recommendations for: "${topS2Paper.title}"`,
      );
      recommendationResults = await sourceTools.getSemanticScholarRecommendations(
        topS2Paper.s2PaperId,
        20,
      );
      await delay(s2Delay);
    }

    const combined = [
      ...crossrefBatches.flat(),
      ...pubmedBatches.flat(),
      ...s2Results,
      ...recommendationResults,
    ];

    console.log(
      `📚 Raw results: Crossref(${crossrefBatches.flat().length}), PubMed(${pubmedBatches.flat().length}), Semantic(${s2Results.length}), S2 Recs(${recommendationResults.length})`,
    );

    // Title blacklist: avoid obvious out-of-domain papers.
    // NOTE: "occupational therapy" intentionally removed — it's a valid co-treatment
    // domain for pediatric communication and sensory goals.
    const staticBadTerms = [
      "forensic",
      "witness",
      "court",
      "police",
      "legal",
      "pre-admission",
      "homework completion",
      "homework adherence",
      "homework refusal",
      "dating violence",
      "teen dating",
      "cybersex",
      "internet pornography",
      "weight control",
      "obesity intervention",
      "gang-affiliated",
      "delinquency",
      "marital therapy",
      "marriage therapy",
      "couples therapy",
    ];

    // Also incorporate excludedTopics from the clinical normalization step
    const dynamicBadTerms: string[] = (inputData as any).excludedTopics ?? [];

    const allBadTerms = [...staticBadTerms, ...dynamicBadTerms];

    const bad = new RegExp(
      `\\b(${allBadTerms.map(escapeRegExp).join("|")})\\b`,
      "i",
    );

    const deduped = sourceTools.dedupeCandidates(combined);
    const titleFiltered = deduped.filter((c: any) => {
      const title = c.title ?? "";
      return !bad.test(title);
    });

    console.log(`🔗 After dedup: ${deduped.length} candidates`);
    console.log(`🚫 After title filter: ${titleFiltered.length} candidates`);

    // Filter book chapters but keep candidates without abstracts (enriched next)
    const filtered = sourceTools.filterBookChapters(titleFiltered);

    console.log(
      `✅ After book chapter filter: ${filtered.length} candidates\n`,
    );

    return {
      ...inputData,
      candidates: filtered,
      jobId: inputData.jobId,
    };
  },
});

// Step 5: Enrich abstracts from OpenAlex (controlled concurrency)
const enrichAbstractsStep = createStep({
  id: "enrich-abstracts",
  inputSchema: z.object({
    userId: z.string(),
    goalId: z.number().int(),
    jobId: z.string().optional(),
    goal: z.any(),
    notes: z.any(),
    plannerPromptName: z.string(),
    extractorPromptName: z.string(),
    goalType: z.string(),
    keywords: z.array(z.string()),
    candidates: z.array(z.any()),
  }),
  outputSchema: z.object({
    userId: z.string(),
    goalId: z.number().int(),
    jobId: z.string().optional(),
    goal: z.any(),
    notes: z.any(),
    plannerPromptName: z.string(),
    extractorPromptName: z.string(),
    goalType: z.string(),
    keywords: z.array(z.string()),
    candidates: z.array(z.any()),
  }),
  execute: async ({ inputData }) => {
    if (inputData.jobId) {
      await d1Tools.updateGenerationJob(inputData.jobId, { progress: 60 }).catch(() => {});
    }
    const candidates = inputData.candidates;

    console.log(`\n🔬 Enriching abstracts from OpenAlex...\n`);

    const slice = candidates.slice(0, ENRICH_CANDIDATES_LIMIT);

    // Use mapLimit to cap concurrent OpenAlex requests
    const enriched = await sourceTools.mapLimit(
      slice,
      ENRICH_CONCURRENCY,
      async (c: any, idx: number) => {
        const doi = (c.doi ?? "").toString().trim();
        if (!doi || c.abstract) {
          return c;
        }

        if (idx > 0 && idx % 50 === 0) {
          console.log(`   Enriched ${idx} / ${slice.length}...`);
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
      // Raised from 150 to 300 chars: a 150-char abstract is ~2 sentences,
      // too short for the extractor to score accurately
      (c: any) => (c.abstract || c._enrichedAbstract || "").length >= 300,
    );

    console.log(`   Enriched: ${enriched.length} candidates`);
    console.log(`   With abstracts (≥150 chars): ${withAbstracts.length}\n`);

    return {
      ...inputData,
      candidates: [
        ...withAbstracts,
        ...candidates.slice(ENRICH_CANDIDATES_LIMIT),
      ],
      jobId: inputData.jobId,
    };
  },
});

// Plain async function for single-paper extraction.
// Not a Mastra step — avoids the `step.execute!()` anti-pattern.
async function extractOnePaper(params: {
  candidate: {
    title: string;
    doi?: string;
    url?: string;
    year?: number;
    source: string;
    [key: string]: any;
  };
  goalType: string;
  goalTitle: string;
  goalDescription: string | null;
  extractorPromptName: string;
}): Promise<{ ok: boolean; score: number; research?: any; reason: string }> {
  try {
    const paper = await sourceTools.fetchPaperDetails(params.candidate);

    const extracted = await extractorTools.extract({
      goalTitle: params.goalTitle,
      goalDescription: params.goalDescription ?? "",
      goalType: params.goalType,
      paper,
      extractorPromptName: params.extractorPromptName,
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
            // Map to DB schema
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
            extractedBy: "mastra:deepseek-langfuse:v2",
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

// Step 6: Reshape data for the extraction step
const prepExtractStep = createStep({
  id: "prep-extract",
  inputSchema: z.any(),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    if (inputData.jobId) {
      await d1Tools.updateGenerationJob(inputData.jobId, { progress: 65 }).catch(() => {});
    }
    return {
      userId: inputData.userId,
      goalId: inputData.goalId,
      jobId: inputData.jobId,
      context: {
        goal: inputData.goal,
        notes: inputData.notes,
        // Pass translated title so extractor scores against the correct clinical domain
        translatedGoalTitle: inputData.translatedGoalTitle ?? inputData.goal?.title,
      },
      plan: {
        goalType: inputData.goalType,
        extractorPromptName: inputData.extractorPromptName,
        keywords: inputData.keywords,
        // Pass requiredKeywords for keyword-overlap scoring in persistStep
        requiredKeywords: inputData.requiredKeywords ?? [],
      },
      search: {
        candidates: inputData.candidates,
      },
    };
  },
});

// Step 7: Extract all candidates in batches
const extractAllStep = createStep({
  id: "extract-all",
  inputSchema: z.object({
    userId: z.string(),
    goalId: z.number().int(),
    jobId: z.string().optional(),
    context: z.any(),
    plan: z.any(),
    search: z.any(),
  }),
  outputSchema: z.object({
    userId: z.string(),
    goalId: z.number().int(),
    jobId: z.string().optional(),
    results: z.array(z.any()),
    requiredKeywords: z.array(z.string()).optional(),
  }),
  execute: async ({ inputData }) => {
    if (inputData.jobId) {
      await d1Tools.updateGenerationJob(inputData.jobId, { progress: 85 }).catch(() => {});
    }
    const goal = inputData.context.goal;
    const plan = inputData.plan;
    const candidates = inputData.search.candidates.slice(
      0,
      EXTRACT_CANDIDATES_LIMIT,
    );

    console.log(
      `\n🧠 Extracting ${candidates.length} candidates (batches of ${EXTRACTION_BATCH_SIZE})...\n`,
    );

    const results: any[] = [];

    for (let i = 0; i < candidates.length; i += EXTRACTION_BATCH_SIZE) {
      const batch = candidates.slice(i, i + EXTRACTION_BATCH_SIZE);
      const batchNum = Math.floor(i / EXTRACTION_BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(candidates.length / EXTRACTION_BATCH_SIZE);

      console.log(
        `   Batch ${batchNum}/${totalBatches} (candidates ${i + 1}-${Math.min(i + EXTRACTION_BATCH_SIZE, candidates.length)})`,
      );

      const batchResults = await Promise.all(
        batch.map((candidate: any) =>
          extractOnePaper({
            candidate,
            goalType: plan.goalType,
            // Use translated title so extractor scores against the correct clinical domain
            goalTitle: inputData.context.translatedGoalTitle ?? goal.title,
            goalDescription: goal.description,
            extractorPromptName: plan.extractorPromptName,
          }),
        ),
      );

      results.push(...batchResults);
    }

    const passed = results.filter((r) => r.ok).length;
    console.log(
      `\n   Extraction complete: ${passed}/${results.length} passed initial gate\n`,
    );

    return {
      userId: inputData.userId,
      goalId: inputData.goalId,
      jobId: inputData.jobId,
      results,
      requiredKeywords: inputData.plan?.requiredKeywords ?? [],
    };
  },
});

// Step 8: Persist results with multi-stage quality gating
const persistStep = createStep({
  id: "persist",
  inputSchema: z.object({
    userId: z.string(),
    goalId: z.number().int(),
    jobId: z.string().optional(),
    results: z.array(z.any()),
    // requiredKeywords from normalizeGoalStep, passed via prepExtractStep → extractAllStep
    requiredKeywords: z.array(z.string()).optional(),
  }),
  outputSchema,
  execute: async ({ inputData }) => {
    if (inputData.jobId) {
      await d1Tools.updateGenerationJob(inputData.jobId, { progress: 95 }).catch(() => {});
    }
    console.log(`\n📊 Extraction results: ${inputData.results.length} total\n`);

    const requiredKeywords = (inputData.requiredKeywords ?? []).map((k) =>
      k.toLowerCase(),
    );

    /**
     * Keyword-overlap score: fraction of required keywords found in title + abstract.
     * Used as a tie-breaker and a weak signal that the paper is in the right domain.
     * Returns 0 if no requiredKeywords are defined (no penalty for legacy runs).
     */
    function keywordOverlapScore(research: any): number {
      if (!requiredKeywords.length) return 0.5; // neutral if no keywords defined
      const haystack = `${research.title ?? ""} ${research.abstract ?? ""}`.toLowerCase();
      const hits = requiredKeywords.filter((kw) => haystack.includes(kw)).length;
      return hits / requiredKeywords.length;
    }

    // Stage 1: must have passed extractor gate + have key findings + no rejectReason
    // Stage 2: rank by adjusted blended score (60% LLM-blended + 40% keyword-overlap)
    const qualified = inputData.results
      .filter((r) => r.ok && r.research)
      .filter((r) => (r.research.keyFindings?.length ?? 0) > 0)
      // Enforce rejectReason: if the LLM explicitly rejected, exclude regardless of score
      .filter((r) => !r.rejectReason && !r.research?.rejectReason)
      .map((r) => {
        const relevance = r.research.relevanceScore ?? 0;
        const confidence = r.research.extractionConfidence ?? 0;
        const llmBlended = 0.7 * relevance + 0.3 * confidence;
        const kwOverlap = keywordOverlapScore(r.research);
        // Adjusted blended: 60% LLM score + 40% keyword presence
        const adjustedBlended =
          requiredKeywords.length > 0
            ? 0.6 * llmBlended + 0.4 * kwOverlap
            : llmBlended;
        return { ...r, blended: adjustedBlended, llmBlended, kwOverlap };
      })
      .filter((r) => r.blended >= BLENDED_THRESHOLD)
      .sort((a, b) => b.blended - a.blended);

    const top = qualified.slice(0, PERSIST_CANDIDATES_LIMIT);

    console.log(`\n🎯 Persisting top ${top.length} papers:\n`);

    let count = 0;
    let errors = 0;

    for (const r of top) {
      const research = r.research;
      const displayTitle =
        research.title.length > 80
          ? `${research.title.substring(0, 80)}…`
          : research.title;

      console.log(
        `   ${count + errors + 1}. [blended=${r.blended.toFixed(2)} llm=${r.llmBlended?.toFixed(2) ?? "?"} kw=${r.kwOverlap?.toFixed(2) ?? "?"}] ${displayTitle}`,
      );

      try {
        const rowId = await d1Tools.upsertTherapyResearch(
          inputData.goalId,
          inputData.userId,
          research,
        );
        count++;

        await ragTools.upsertResearchChunks({
          goalId: inputData.goalId,
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
        console.error(`   ⚠️  Failed to persist "${research.title}": ${msg}`);
      }
    }

    console.log(
      `\n✨ Persisted ${count} papers${errors > 0 ? `, ${errors} failed` : ""}\n`,
    );

    return {
      success: count > 0 || errors === 0,
      count,
      message: count
        ? `Generated ${count} research papers (blended quality score ≥ ${BLENDED_THRESHOLD}, ranked by relevance)`
        : errors > 0
          ? `All ${errors} persist attempts failed`
          : "No papers met minimum quality thresholds",
    };
  },
});

// Build workflow
export const generateTherapyResearchWorkflow = createWorkflow({
  id: "generate-therapy-research",
  inputSchema,
  outputSchema,
})
  .then(loadContextStep)
  .then(normalizeGoalStep)  // translate + clinical classify before Langfuse prompt generation
  .then(ensurePromptsStep)
  .then(planQueryStep)
  .then(searchStep)
  .then(enrichAbstractsStep)
  .then(prepExtractStep)
  .then(extractAllStep)
  .then(persistStep)
  .commit();
