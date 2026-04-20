import fs from "node:fs";
import path from "node:path";
import { CONTENT_DIR, getLessonSlugs } from "./catalog";

export const MAX_REVISIONS = 2;
export const MIN_WORD_COUNT = 1500;
export const MIN_CODE_BLOCKS = 2;
export const MIN_CROSS_REFS = 1;

export interface QualityResult {
  ok: boolean;
  issues: string[];
  wordCount: number;
  codeBlocks: number;
  crossRefs: number;
}

export function checkQuality(content: string): QualityResult {
  const issues: string[] = [];
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const codeBlocks = (content.match(/```\w+/g) ?? []).length;
  const crossRefMatches = content.match(/\]\(\/[\w-]+\)/g) ?? [];
  const crossRefs = crossRefMatches.length;
  const hasTitle = content.trimStart().startsWith("# ");
  const sectionCount = (content.match(/^## /gm) ?? []).length;

  if (wordCount < MIN_WORD_COUNT)
    issues.push(`Too short: ${wordCount} words (min ${MIN_WORD_COUNT})`);
  if (codeBlocks < MIN_CODE_BLOCKS)
    issues.push(
      `Too few code examples: ${codeBlocks} (min ${MIN_CODE_BLOCKS})`,
    );
  if (crossRefs < MIN_CROSS_REFS)
    issues.push(`Missing cross-references: ${crossRefs} (min ${MIN_CROSS_REFS})`);
  if (!hasTitle) issues.push("Missing # title on first line");
  if (sectionCount < 3) issues.push("Fewer than 3 ## sections");

  const slugs = new Set(getLessonSlugs());
  for (const ref of crossRefMatches) {
    const refSlug = ref.slice(3, -1);
    if (
      !slugs.has(refSlug) &&
      !fs.existsSync(path.join(CONTENT_DIR, `${refSlug}.md`))
    ) {
      issues.push(`Broken link: /${refSlug}`);
    }
  }

  return { ok: issues.length === 0, issues, wordCount, codeBlocks, crossRefs };
}
