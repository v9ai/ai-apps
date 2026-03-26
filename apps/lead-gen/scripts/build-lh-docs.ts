/**
 * Build script: reads markdown docs from apps/lh-ai-fs/,
 * splits TECHNICAL-REFERENCE.md by H2 headings, and writes
 * section files + toc.json manifest to public/docs/lh-ai-fs/.
 *
 * Usage: npx tsx scripts/build-lh-docs.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const LH_DIR = resolve(ROOT, "../../apps/lh-ai-fs");
const OUT_DIR = join(ROOT, "public/docs/lh-ai-fs");

interface TocEntry {
  id: string;
  title: string;
  group: string;
  file: string;
  byteSize: number;
}

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function writeSection(relPath: string, content: string): number {
  const absPath = join(OUT_DIR, relPath);
  ensureDir(join(absPath, ".."));
  writeFileSync(absPath, content, "utf-8");
  return Buffer.byteLength(content, "utf-8");
}

function addWholeFile(
  sections: TocEntry[],
  srcName: string,
  outName: string,
  title: string,
  group: string,
) {
  const srcPath = join(LH_DIR, srcName);
  if (!existsSync(srcPath)) {
    console.warn(`  SKIP (not found): ${srcName}`);
    return;
  }
  const content = readFileSync(srcPath, "utf-8");
  const byteSize = writeSection(outName, content);
  sections.push({
    id: outName.replace(/\.md$/, "").replace(/\//g, "-"),
    title,
    group,
    file: outName,
    byteSize,
  });
  console.log(`  ${outName} (${(byteSize / 1024).toFixed(1)} KB)`);
}

function splitTechRef(sections: TocEntry[]) {
  const srcPath = join(LH_DIR, "TECHNICAL-REFERENCE.md");
  if (!existsSync(srcPath)) {
    console.warn("  SKIP (not found): TECHNICAL-REFERENCE.md");
    return;
  }
  const content = readFileSync(srcPath, "utf-8");
  const lines = content.split("\n");

  // Find all ## heading positions
  const headings: { line: number; title: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^## (.+)/);
    if (match) headings.push({ line: i, title: match[1].trim() });
  }

  if (headings.length === 0) {
    // No H2 headings — write as single file
    const byteSize = writeSection("tech-ref/full.md", content);
    sections.push({
      id: "tech-ref-full",
      title: "Technical Reference",
      group: "Technical Reference",
      file: "tech-ref/full.md",
      byteSize,
    });
    return;
  }

  // Preamble before first H2 (if any)
  if (headings[0].line > 0) {
    const preamble = lines.slice(0, headings[0].line).join("\n").trim();
    if (preamble) {
      const byteSize = writeSection("tech-ref/00-overview.md", preamble);
      sections.push({
        id: "tech-ref-00-overview",
        title: "Overview",
        group: "Technical Reference",
        file: "tech-ref/00-overview.md",
        byteSize,
      });
      console.log(`  tech-ref/00-overview.md (${(byteSize / 1024).toFixed(1)} KB)`);
    }
  }

  // Each H2 section
  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].line;
    const end = i + 1 < headings.length ? headings[i + 1].line : lines.length;
    const sectionContent = lines.slice(start, end).join("\n").trim();
    const idx = String(i + 1).padStart(2, "0");
    const slug = slugify(headings[i].title);
    const fileName = `tech-ref/${idx}-${slug}.md`;

    const byteSize = writeSection(fileName, sectionContent);
    sections.push({
      id: `tech-ref-${idx}-${slug}`,
      title: headings[i].title,
      group: "Technical Reference",
      file: fileName,
      byteSize,
    });
    console.log(`  ${fileName} (${(byteSize / 1024).toFixed(1)} KB)`);
  }
}

// --- Main ---
console.log("Building lh-ai-fs docs...\n");
ensureDir(OUT_DIR);

const sections: TocEntry[] = [];

// Group 1: Overview
console.log("Overview:");
addWholeFile(sections, "README.md", "readme.md", "README", "Overview");
addWholeFile(sections, "REFLECTION.md", "reflection.md", "Design Reflection", "Overview");

// Group 2: Technical Reference (split by H2)
console.log("\nTechnical Reference (split by ## headings):");
splitTechRef(sections);

// Group 3: Interview Preparation
console.log("\nInterview Preparation:");
addWholeFile(sections, "INTERVIEW-PREP-TTS.md", "interview-prep-tts.md", "Interview Prep (TTS)", "Interview Preparation");
addWholeFile(sections, "EVAL-HARNESS-TTS.md", "eval-harness-tts.md", "Eval Harness (TTS)", "Interview Preparation");
addWholeFile(sections, "TECHNICAL-REFERENCE-TTS.md", "tech-ref-tts.md", "Technical Reference (TTS)", "Interview Preparation");

// Write TOC manifest
const tocPath = join(OUT_DIR, "toc.json");
const toc = { sections };
writeFileSync(tocPath, JSON.stringify(toc, null, 2), "utf-8");

console.log(`\nDone! ${sections.length} sections written to ${OUT_DIR}`);
console.log(`TOC: ${tocPath}`);
