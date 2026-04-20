import fs from "node:fs/promises";
import path from "node:path";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { deepseekChat } from "../lib/deepseek";
import {
  DRAFT_PROMPT,
  OUTLINE_PROMPT,
  RESEARCH_PROMPT,
  REVIEW_PROMPT,
  REVISE_PROMPT,
} from "../lib/prompts";
import {
  CONTENT_DIR,
  getCategory,
  getExistingArticles,
  getRelatedTopics,
  getStyleSample,
} from "../lib/catalog";
import { checkQuality, MAX_REVISIONS } from "../lib/quality";

const qualitySchema = z.object({
  ok: z.boolean(),
  issues: z.array(z.string()),
  wordCount: z.number(),
  codeBlocks: z.number(),
  crossRefs: z.number(),
});

const workflowInput = z.object({
  slug: z.string(),
  topic: z.string(),
  dryRun: z.boolean().default(false),
});

const afterResearch = workflowInput.extend({
  category: z.string(),
  research: z.string(),
  totalTokens: z.number(),
});

const afterOutline = afterResearch.extend({
  outline: z.string(),
});

const afterDraft = afterOutline.extend({
  draft: z.string(),
});

const afterReview = afterDraft.extend({
  final: z.string(),
  quality: qualitySchema,
  revision: z.number(),
});

const workflowOutput = z.object({
  slug: z.string(),
  final: z.string(),
  wordCount: z.number(),
  revisions: z.number(),
  totalTokens: z.number(),
  saved: z.boolean(),
});

const researchStep = createStep({
  id: "research",
  retries: 2,
  inputSchema: workflowInput,
  outputSchema: afterResearch,
  execute: async ({ inputData }) => {
    const prompt = RESEARCH_PROMPT({
      topic: inputData.topic,
      slug: inputData.slug,
      related_topics: getRelatedTopics(inputData.slug),
    });
    const { content, tokens } = await deepseekChat(prompt);
    return {
      ...inputData,
      category: getCategory(inputData.slug),
      research: content,
      totalTokens: tokens,
    };
  },
});

const outlineStep = createStep({
  id: "outline",
  retries: 2,
  inputSchema: afterResearch,
  outputSchema: afterOutline,
  execute: async ({ inputData }) => {
    const prompt = OUTLINE_PROMPT({
      topic: inputData.topic,
      slug: inputData.slug,
      category: inputData.category,
      research: inputData.research,
      existing_articles: getExistingArticles(),
    });
    const { content, tokens } = await deepseekChat(prompt);
    return {
      ...inputData,
      outline: content,
      totalTokens: inputData.totalTokens + tokens,
    };
  },
});

const draftStep = createStep({
  id: "draft",
  retries: 2,
  inputSchema: afterOutline,
  outputSchema: afterDraft,
  execute: async ({ inputData }) => {
    const prompt = DRAFT_PROMPT({
      topic: inputData.topic,
      slug: inputData.slug,
      outline: inputData.outline,
      research: inputData.research,
      style_sample: getStyleSample(),
    });
    const { content, tokens } = await deepseekChat(prompt);
    return {
      ...inputData,
      draft: content,
      totalTokens: inputData.totalTokens + tokens,
    };
  },
});

const reviewStep = createStep({
  id: "review",
  retries: 2,
  inputSchema: afterDraft,
  outputSchema: afterReview,
  execute: async ({ inputData }) => {
    const prompt = REVIEW_PROMPT({
      topic: inputData.topic,
      draft: inputData.draft,
    });
    const { content, tokens } = await deepseekChat(prompt);
    const quality = checkQuality(content);
    return {
      ...inputData,
      final: content,
      quality,
      revision: 0,
      totalTokens: inputData.totalTokens + tokens,
    };
  },
});

const reviseStep = createStep({
  id: "revise",
  retries: 2,
  inputSchema: afterReview,
  outputSchema: afterReview,
  execute: async ({ inputData }) => {
    if (inputData.quality.ok) return inputData;
    const issuesText = inputData.quality.issues
      .map((i) => `- ${i}`)
      .join("\n");
    const prompt = REVISE_PROMPT({
      topic: inputData.topic,
      draft: inputData.final,
      issues: issuesText,
    });
    const { content, tokens } = await deepseekChat(prompt);
    const quality = checkQuality(content);
    return {
      ...inputData,
      final: content,
      quality,
      revision: inputData.revision + 1,
      totalTokens: inputData.totalTokens + tokens,
    };
  },
});

const saveStep = createStep({
  id: "save",
  inputSchema: afterReview,
  outputSchema: workflowOutput,
  execute: async ({ inputData }) => {
    let saved = false;
    if (!inputData.dryRun) {
      const outPath = path.join(CONTENT_DIR, `${inputData.slug}.md`);
      await fs.writeFile(outPath, inputData.final);
      saved = true;
    }
    return {
      slug: inputData.slug,
      final: inputData.final,
      wordCount: inputData.quality.wordCount,
      revisions: inputData.revision,
      totalTokens: inputData.totalTokens,
      saved,
    };
  },
});

export const generateArticle = createWorkflow({
  id: "generate-article",
  inputSchema: workflowInput,
  outputSchema: workflowOutput,
})
  .then(researchStep)
  .then(outlineStep)
  .then(draftStep)
  .then(reviewStep)
  .dowhile(
    reviseStep,
    async ({ inputData }) =>
      !inputData.quality.ok && inputData.revision < MAX_REVISIONS,
  )
  .then(saveStep)
  .commit();
