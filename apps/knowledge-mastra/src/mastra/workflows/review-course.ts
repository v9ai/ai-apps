import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { deepseekChat } from "../lib/deepseek";
import {
  courseAggregatorPrompt,
  courseAiDomainRelevancePrompt,
  courseCommunityHealthPrompt,
  courseContentDepthPrompt,
  courseCurriculumFitPrompt,
  courseInstructorClarityPrompt,
  coursePedagogyPrompt,
  coursePracticalApplicationPrompt,
  coursePrerequisitesPrompt,
  courseTechnicalAccuracyPrompt,
  courseValuePropositionPrompt,
} from "../lib/course-review-prompts";

const REASONER_TEMP = 0;
const FAST_TEMP = 0.3;

const courseInput = z.object({
  courseId: z.string(),
  title: z.string(),
  url: z.string(),
  provider: z.string(),
  description: z.string().default(""),
  level: z.string().default("Beginner"),
  rating: z.number().default(0),
  reviewCount: z.number().int().default(0),
  durationHours: z.number().default(0),
  isFree: z.boolean().default(false),
});

const expertScore = z.object({
  score: z.number().int().min(1).max(10),
  reasoning: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
});

export type ExpertScore = z.infer<typeof expertScore>;

const allExpertScores = z.object({
  pedagogy_score: expertScore,
  technical_accuracy_score: expertScore,
  content_depth_score: expertScore,
  practical_application_score: expertScore,
  instructor_clarity_score: expertScore,
  curriculum_fit_score: expertScore,
  prerequisites_score: expertScore,
  ai_domain_relevance_score: expertScore,
  community_health_score: expertScore,
  value_proposition_score: expertScore,
});

const afterExperts = courseInput.merge(allExpertScores);

const reviewOutput = afterExperts.extend({
  aggregate_score: z.number(),
  verdict: z.string(),
  summary: z.string(),
  top_strengths: z.array(z.string()),
  key_weaknesses: z.array(z.string()),
});

export type CourseReviewResult = z.infer<typeof reviewOutput>;

function formatCourseInfo(c: z.infer<typeof courseInput>): string {
  const freeLabel = c.isFree ? "Free" : "Paid";
  return [
    `Title: ${c.title}`,
    `Provider: ${c.provider}`,
    `URL: ${c.url}`,
    `Level: ${c.level}`,
    `Rating: ${c.rating.toFixed(1)}/5 (${c.reviewCount.toLocaleString()} reviews)`,
    `Duration: ~${Math.round(c.durationHours)}h`,
    `Price: ${freeLabel}`,
    `Description: ${c.description || "N/A"}`,
  ].join("\n");
}

function parseExpertJson(content: string): unknown {
  const trimmed = content
    .trim()
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();
  return JSON.parse(trimmed);
}

async function runExpert(
  courseInfo: string,
  systemPrompt: string,
  temperature: number,
): Promise<ExpertScore> {
  const { content } = await deepseekChat(
    `Review this course:\n\n${courseInfo}`,
    { system: systemPrompt, temperature },
  );
  return expertScore.parse(parseExpertJson(content));
}

const expertsStep = createStep({
  id: "experts",
  inputSchema: courseInput,
  outputSchema: afterExperts,
  retries: 2,
  execute: async ({ inputData }) => {
    const info = formatCourseInfo(inputData);
    const [
      pedagogy,
      technicalAccuracy,
      contentDepth,
      practicalApplication,
      instructorClarity,
      curriculumFit,
      prerequisites,
      aiDomainRelevance,
      communityHealth,
      valueProposition,
    ] = await Promise.all([
      runExpert(info, coursePedagogyPrompt(info), REASONER_TEMP),
      runExpert(info, courseTechnicalAccuracyPrompt(info), REASONER_TEMP),
      runExpert(info, courseContentDepthPrompt(info), FAST_TEMP),
      runExpert(info, coursePracticalApplicationPrompt(info), FAST_TEMP),
      runExpert(info, courseInstructorClarityPrompt(info), FAST_TEMP),
      runExpert(info, courseCurriculumFitPrompt(info), FAST_TEMP),
      runExpert(info, coursePrerequisitesPrompt(info), FAST_TEMP),
      runExpert(info, courseAiDomainRelevancePrompt(info), REASONER_TEMP),
      runExpert(info, courseCommunityHealthPrompt(info), FAST_TEMP),
      runExpert(info, courseValuePropositionPrompt(info), FAST_TEMP),
    ]);
    return {
      ...inputData,
      pedagogy_score: pedagogy,
      technical_accuracy_score: technicalAccuracy,
      content_depth_score: contentDepth,
      practical_application_score: practicalApplication,
      instructor_clarity_score: instructorClarity,
      curriculum_fit_score: curriculumFit,
      prerequisites_score: prerequisites,
      ai_domain_relevance_score: aiDomainRelevance,
      community_health_score: communityHealth,
      value_proposition_score: valueProposition,
    };
  },
});

const aggregatorOnlySchema = z.object({
  aggregate_score: z.number(),
  verdict: z.string(),
  summary: z.string(),
  top_strengths: z.array(z.string()),
  key_weaknesses: z.array(z.string()),
});

const aggregatorStep = createStep({
  id: "aggregator",
  inputSchema: afterExperts,
  outputSchema: reviewOutput,
  retries: 2,
  execute: async ({ inputData }) => {
    const courseInfo = formatCourseInfo(inputData);

    const fmt = (key: keyof z.infer<typeof allExpertScores>): string => {
      const s = inputData[key];
      return [
        `${String(key)}:`,
        `  Score: ${s.score}/10`,
        `  Reasoning: ${s.reasoning}`,
        `  Strengths: ${s.strengths.join(", ")}`,
        `  Weaknesses: ${s.weaknesses.join(", ")}`,
      ].join("\n");
    };

    const summary = [
      fmt("pedagogy_score"),
      fmt("technical_accuracy_score"),
      fmt("content_depth_score"),
      fmt("practical_application_score"),
      fmt("instructor_clarity_score"),
      fmt("curriculum_fit_score"),
      fmt("prerequisites_score"),
      fmt("ai_domain_relevance_score"),
      fmt("community_health_score"),
      fmt("value_proposition_score"),
    ].join("\n\n");

    const { content } = await deepseekChat(
      `Aggregate these expert scores:\n\n${summary}`,
      {
        system: courseAggregatorPrompt(courseInfo, summary),
        temperature: REASONER_TEMP,
      },
    );
    const agg = aggregatorOnlySchema.parse(parseExpertJson(content));

    return { ...inputData, ...agg };
  },
});

export const reviewCourse = createWorkflow({
  id: "review-course",
  inputSchema: courseInput,
  outputSchema: reviewOutput,
})
  .then(expertsStep)
  .then(aggregatorStep)
  .commit();
