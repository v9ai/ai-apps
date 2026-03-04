import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateObject } from "ai";
import { z } from "zod";
import { Langfuse } from "langfuse";
import type { PaperDetails } from "./sources.tools";

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const langfuse = new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL,
});

/**
 * Research Extraction Tools
 * Now uses Langfuse-backed prompts (fetched at runtime, no hardcoded templates)
 */

function toVars(input: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input))
    out[k] = v == null ? "" : String(v);
  return out;
}

async function getCompiledTextPrompt(params: {
  name: string;
  vars: Record<string, unknown>;
}) {
  const p = await langfuse.getPrompt(params.name, undefined, {
    type: "text",
  });
  const compiled: string = p.compile(toVars(params.vars));

  if (compiled.includes("{{")) {
    throw new Error(
      `Unresolved {{variables}} in compiled Langfuse prompt "${params.name}".`,
    );
  }
  return compiled;
}

/**
 * Planner output schema (therapeutic/psychological research)
 * NOTE: This is what your Langfuse planner template must produce.
 */
const PlanSchema = z.object({
  goalType: z
    .string()
    .describe(
      "Type of therapeutic/psychological goal (e.g., 'anxiety_reduction', 'denial_coping', 'behavioral_change')",
    ),
  keywords: z.array(z.string()).min(3),
  inclusion: z.array(z.string()).default([]),
  exclusion: z.array(z.string()).default([]),

  // Query pack (key for recall/volume)
  semanticScholarQueries: z.array(z.string()).min(2),
  crossrefQueries: z.array(z.string()).min(2),
  pubmedQueries: z.array(z.string()).min(1),
});

export type ResearchPlan = z.infer<typeof PlanSchema>;

/**
 * Extractor output schema (generic therapeutic/psychological research)
 */
const ResearchExtractionSchema = z.object({
  domain: z.enum([
    "cbt",
    "act",
    "dbt",
    "behavioral",
    "psychodynamic",
    "somatic",
    "humanistic",
    // Pediatric / neurodevelopmental domains added based on clinical review
    "speech_language",
    "play_therapy",
    "aba",
    "parent_mediated",
    "neurodevelopmental",
    "other",
  ]),
  paperMeta: z.object({
    title: z.string(),
    authors: z.array(z.string()),
    year: z.number().int().nullable(),
    venue: z.string().nullable(),
    doi: z.string().nullable(),
    url: z.string().nullable(),
  }),
  studyType: z.enum([
    "meta-analysis",
    "RCT",
    "field study",
    "lab study",
    "quasi-experimental",
    "review",
    "other",
  ]),
  populationContext: z.string().nullable(),
  interventionOrSkill: z.string().nullable(),
  keyFindings: z.array(z.string()),
  evidenceSnippets: z.array(
    z.object({
      findingIndex: z.number().int(),
      snippet: z.string(),
    }),
  ),
  practicalTakeaways: z.array(z.string()),
  relevanceScore: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  rejectReason: z.string().nullable(),
});

export type ExtractedResearchV2 = z.infer<typeof ResearchExtractionSchema>;

// Legacy schema for backward compatibility
const TherapyResearchSchema = z.object({
  therapeuticGoalType: z
    .string()
    .describe(
      "Type of therapeutic goal (e.g., 'anxiety reduction', 'depression management')",
    ),
  title: z.string().describe("Paper title"),
  authors: z.array(z.string()).describe("Author names"),
  year: z.number().int().nullable().describe("Publication year"),
  journal: z.string().nullable().describe("Journal name"),
  doi: z.string().nullable().describe("DOI"),
  url: z.string().nullable().describe("URL"),
  abstract: z.string().nullable().describe("Abstract text"),
  keyFindings: z
    .array(z.string())
    .describe("Key findings relevant to the therapeutic goal (3-5 findings)"),
  therapeuticTechniques: z
    .array(z.string())
    .describe(
      "Specific therapeutic techniques mentioned (e.g., 'CBT', 'exposure therapy')",
    ),
  evidenceLevel: z
    .string()
    .nullable()
    .describe(
      "Evidence level: 'meta-analysis', 'RCT', 'cohort', 'case-study', or 'review'",
    ),
  relevanceScore: z.number().min(0).max(1).describe("Relevance to goal (0-1)"),
  extractedBy: z.string().describe("Extraction source identifier"),
  extractionConfidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence in extraction (0-1)"),
});

export type ExtractedResearch = z.infer<typeof TherapyResearchSchema>;

/**
 * Convert legacy ExtractedResearch to new ResearchExtractionSchema format
 */
function convertLegacyToResearchSchema(
  legacy: ExtractedResearch,
): ExtractedResearchV2 {
  return {
    domain: "other", // default domain for legacy conversions
    paperMeta: {
      title: legacy.title,
      authors: legacy.authors,
      year: legacy.year,
      venue: legacy.journal,
      doi: legacy.doi,
      url: legacy.url,
    },
    studyType: (legacy.evidenceLevel as any) ?? "other",
    populationContext: null,
    interventionOrSkill: legacy.therapeuticTechniques?.join(", ") ?? null,
    keyFindings: legacy.keyFindings,
    evidenceSnippets: legacy.keyFindings.map((finding, idx) => ({
      findingIndex: idx,
      snippet: finding,
    })),
    practicalTakeaways: legacy.therapeuticTechniques ?? [],
    relevanceScore: legacy.relevanceScore,
    confidence: legacy.extractionConfidence,
    rejectReason:
      legacy.relevanceScore < 0.5 ? "below_relevance_threshold" : null,
  };
}

/**
 * Plan research query using Langfuse-backed planner prompt
 */
export async function planResearchQuery(params: {
  title: string;
  description: string;
  notes: string[];
  plannerPromptName: string; // from workflow ensure step
}): Promise<ResearchPlan> {
  const { title, description, notes, plannerPromptName } = params;

  const compiledPrompt = await getCompiledTextPrompt({
    name: plannerPromptName,
    vars: {
      goalTitle: title,
      goalDescription: description,
      notes: notes.join("\n- "),
    },
  });

  const { object } = await generateObject({
    model: deepseek("deepseek-chat"),
    schema: PlanSchema,
    prompt: compiledPrompt,
  });

  return object;
}

/**
 * Extract research using Langfuse-backed extractor prompt
 */
export async function extractResearch(params: {
  goalTitle: string;
  goalDescription: string;
  goalType: string;
  paper: PaperDetails;
  extractorPromptName: string; // from workflow ensure step
}): Promise<ExtractedResearchV2> {
  const { goalTitle, goalDescription, goalType, paper, extractorPromptName } =
    params;

  const compiledPrompt = await getCompiledTextPrompt({
    name: extractorPromptName,
    vars: {
      goalTitle,
      goalDescription,
      goalType,
      paperTitle: paper.title ?? "",
      paperAuthors: (paper.authors ?? []).join(", "),
      paperYear: paper.year ?? "",
      paperVenue: paper.journal ?? "",
      paperDoi: paper.doi ?? "",
      paperUrl: paper.url ?? "",
      paperAbstract: paper.abstract ?? "",
    },
  });

  // Append explicit schema instructions to ensure valid JSON output
  const schemaInstructions = `

REQUIRED JSON OUTPUT FORMAT:
{
  "domain": "cbt" | "act" | "dbt" | "behavioral" | "psychodynamic" | "somatic" | "humanistic" | "other",
  "paperMeta": {
    "title": "string",
    "authors": ["string"],
    "year": number | null,
    "venue": "string" | null,
    "doi": "string" | null,
    "url": "string" | null
  },
  "studyType": "meta-analysis" | "RCT" | "field study" | "lab study" | "quasi-experimental" | "review" | "other",
  "populationContext": "string" | null,
  "interventionOrSkill": "string" | null,
  "keyFindings": ["string"],
  "evidenceSnippets": [{ "findingIndex": number, "snippet": "string" }],
  "practicalTakeaways": ["string"],
  "relevanceScore": number (0-1),
  "confidence": number (0-1),
  "rejectReason": "string" | null
}

CRITICAL: Return VALID JSON ONLY. No markdown, no code blocks, no extra text.`;

  try {
    const { object } = await generateObject({
      model: deepseek("deepseek-chat"),
      schema: ResearchExtractionSchema,
      prompt: compiledPrompt + schemaInstructions,
    });

    return object;
  } catch (err) {
    console.error(
      `⚠️ Schema validation failed for "${paper.title}". Falling back to legacy extraction.`,
    );
    // Fallback to legacy extraction on schema mismatch
    const legacyResult = await extractResearchLegacy({
      therapeuticGoalType: goalType,
      goalTitle,
      goalDescription,
      paper,
    });
    return convertLegacyToResearchSchema(legacyResult);
  }
}

/**
 * Legacy extract (for backward compatibility with existing workflow)
 * This will be deprecated once the workflow is fully migrated
 */
export async function extractResearchLegacy(params: {
  therapeuticGoalType: string;
  goalTitle: string;
  goalDescription: string;
  paper: PaperDetails;
}): Promise<ExtractedResearch> {
  const { therapeuticGoalType, goalTitle, goalDescription, paper } = params;

  const { object } = await generateObject({
    model: deepseek("deepseek-chat"),
    schema: TherapyResearchSchema,
    prompt: `Extract therapeutic research information from this paper.

Therapeutic Goal: ${goalTitle}
Goal Description: ${goalDescription}
Goal Type: ${therapeuticGoalType}

Paper:
Title: ${paper.title}
Authors: ${paper.authors?.join(", ") || "Unknown"}
Year: ${paper.year || "Unknown"}
Journal: ${paper.journal || "Unknown"}
DOI: ${paper.doi || "None"}
Abstract: ${paper.abstract}

CRITICAL: This should be THERAPEUTIC/PSYCHOLOGICAL research for clinical/counseling applications.

Extract:
1. Key findings (3-5) that are DIRECTLY relevant to the therapeutic goal
2. Specific therapeutic techniques mentioned (e.g., CBT, exposure therapy, mindfulness)
3. Evidence level (meta-analysis > RCT > cohort > case-study > review)
4. Relevance score (0-1) based on how well it addresses the THERAPEUTIC goal

RELEVANCE SCORING RUBRIC (be strict):
- 1.0: Directly studies the exact behavior/condition in the therapeutic goal in the same population
- 0.8: Studies the same condition in a closely related population
- 0.6: Studies an adjacent condition using the same modality for the goal's population
- 0.4: Same modality but different condition or population
- 0.2: General clinical psychology with no specific relevance to this goal
- 0.1 or below: NOT about the specific clinical domain of this goal

STRICT FILTERING:
- Score 0.1 or lower if paper is about: forensic interviews, legal proceedings, homework completion, academic achievement, adult populations (when goal is for a child), family therapy engagement (unless directly relevant)
- Score 0.1 or lower if NOT about the specific clinical domain of the therapeutic goal
- Score 0.8+ ONLY if directly studying the specific intervention for the goal type and population
- Population mismatch: reduce score by 0.3 if study population age does not match patient age
- Only extract findings EXPLICITLY stated in the abstract
- Do not infer or extrapolate beyond what is written
- Rate your extraction confidence honestly`,
  });

  return {
    ...object,
    extractedBy: "mastra:gpt-4o-mini:v1",
  };
}

/**
 * Repair extracted research based on feedback
 */
export async function repairResearch(params: {
  extracted: ExtractedResearch;
  abstract: string;
  feedback: string;
}): Promise<ExtractedResearch> {
  const { extracted, abstract, feedback } = params;

  const { object } = await generateObject({
    model: deepseek("deepseek-chat"),
    schema: TherapyResearchSchema,
    prompt: `Repair this research extraction based on feedback.

Original Extraction:
${JSON.stringify(extracted, null, 2)}

Abstract:
${abstract}

Feedback:
${feedback}

Instructions:
- Remove or rewrite any unsupported claims
- Ensure every finding is directly supported by the abstract
- Be more conservative in claims
- Lower confidence if uncertain
- Keep only well-supported findings`,
  });

  return {
    ...object,
    extractedBy: "mastra:gpt-4o-mini:v1-repaired",
  };
}

/**
 * Legacy plan for backward compatibility (old therapeutic goal schema)
 */
export async function planResearchQueryLegacy(params: {
  title: string;
  description: string;
  notes: string[];
}) {
  const { title, description, notes } = params;

  const { object } = await generateObject({
    model: deepseek("deepseek-chat"),
    temperature: 1.5,
    schema: z.object({
      therapeuticGoalType: z.string().describe("Type of therapeutic goal"),
      keywords: z
        .array(z.string())
        .describe("Core search keywords (5-8 terms)"),
      semanticScholarQueries: z
        .array(z.string())
        .describe("20-40 diverse queries for Semantic Scholar"),
      crossrefQueries: z
        .array(z.string())
        .describe("20-45 queries for Crossref"),
      pubmedQueries: z
        .array(z.string())
        .describe("20-40 MeSH-friendly queries for PubMed"),
      inclusion: z.array(z.string()).describe("Inclusion criteria"),
      exclusion: z.array(z.string()).describe("Exclusion criteria"),
    }),
    prompt: `Plan a research query strategy for this therapeutic/psychological goal.

Goal: ${title}
Description: ${description}
Notes: ${notes.join("\n- ")}

Generate MULTIPLE diverse queries to maximize recall from different psychological/therapy databases.

QUERY STRATEGY:
1. Semantic Scholar queries (20-40): Mix broad + specific, use synonyms and related constructs
2. Crossref queries (20-45): Use natural language phrases common in therapy/psychology literature
3. PubMed queries (20-40): Use MeSH terms and clinical psychology terminology

Focus on finding psychological research relevant to the specific therapeutic goal.
Include queries about: therapeutic interventions, mechanisms, evidence-based treatments, coping strategies.

Return 40-87 total queries across all sources for maximum recall.`,
  });

  return object;
}

/**
 * Sanitize plan to remove poison terms
 */
export function sanitizePlan(plan: {
  therapeuticGoalType?: string;
  goalType?: string;
  keywords: string[];
  semanticScholarQueries?: string[];
  crossrefQueries?: string[];
  pubmedQueries?: string[];
  inclusion?: string[];
  exclusion?: string[];
}) {
  return {
    ...plan,
    keywords: plan.keywords ?? [],
    semanticScholarQueries: plan.semanticScholarQueries ?? [],
    crossrefQueries: plan.crossrefQueries ?? [],
    pubmedQueries: plan.pubmedQueries ?? [],
    inclusion: plan.inclusion ?? [],
    exclusion: plan.exclusion ?? [],
  };
}

export const extractorTools = {
  extract: extractResearch,
  plan: planResearchQuery,
  repair: repairResearch,
  sanitize: sanitizePlan,
  // Legacy exports
  extractLegacy: extractResearchLegacy,
  planLegacy: planResearchQueryLegacy,
};
