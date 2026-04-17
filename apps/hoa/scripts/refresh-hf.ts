/**
 * Fetches HuggingFace model data for all personalities with hfUsername
 * and updates the enrichment JSON files (HF portion only, preserves GitHub data).
 *
 * Runs as a prebuild step so every deploy gets fresh download counts.
 *
 * Usage: npx tsx scripts/refresh-hf.ts
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PERSONALITIES_DIR = join(ROOT, "personalities");
const ENRICHMENT_DIR = join(ROOT, "src", "lib", "enrichment");

type HFModelRaw = {
  modelId?: string;
  id: string;
  likes: number;
  downloads: number;
  tags: string[];
  pipeline_tag: string | null;
  createdAt: string | null;
};

type HFModel = {
  id: string;
  likes: number;
  downloads: number;
  tags: string[];
  pipelineTag: string | null;
  createdAt: string | null;
};

function extractHfUsername(filePath: string): string | null {
  const text = readFileSync(filePath, "utf-8");
  const match = text.match(/hfUsername:\s*"([^"]+)"/);
  return match ? match[1] : null;
}

function extractSlug(filePath: string): string {
  const base = filePath.split("/").pop()!;
  return base.replace(/\.ts$/, "");
}

const MAX_MODELS = 20;

async function fetchHFModels(username: string): Promise<{ models: HFModel[]; totalCount: number }> {
  const url = `https://huggingface.co/api/models?author=${encodeURIComponent(username)}&sort=likes`;
  const res = await fetch(url);
  if (!res.ok) return { models: [], totalCount: 0 };
  const raw: HFModelRaw[] = await res.json();
  const all = raw
    .map((m) => ({
      id: m.modelId ?? m.id,
      likes: m.likes ?? 0,
      downloads: m.downloads ?? 0,
      tags: m.tags ?? [],
      pipelineTag: m.pipeline_tag ?? null,
      createdAt: m.createdAt ?? null,
    }))
    .sort((a, b) => b.downloads - a.downloads);
  return { models: all.slice(0, MAX_MODELS), totalCount: all.length };
}

async function main() {
  const files = readdirSync(PERSONALITIES_DIR).filter((f) => f.endsWith(".ts"));
  const tasks: { slug: string; hfUsername: string }[] = [];

  for (const file of files) {
    const filePath = join(PERSONALITIES_DIR, file);
    const hf = extractHfUsername(filePath);
    if (hf) {
      tasks.push({ slug: extractSlug(filePath), hfUsername: hf });
    }
  }

  console.log(`[refresh-hf] Found ${tasks.length} personalities with hfUsername`);

  const BATCH = 5;
  let updated = 0;

  for (let i = 0; i < tasks.length; i += BATCH) {
    const chunk = tasks.slice(i, i + BATCH);
    const results = await Promise.all(
      chunk.map(async ({ slug, hfUsername }) => {
        const { models, totalCount } = await fetchHFModels(hfUsername);
        return { slug, models, totalCount };
      }),
    );

    for (const { slug, models, totalCount } of results) {
      const enrichPath = join(ENRICHMENT_DIR, `${slug}.json`);
      let enrichment: Record<string, unknown> = {
        github: null,
        huggingface: null,
        imageUrl: null,
      };

      if (existsSync(enrichPath)) {
        try {
          enrichment = JSON.parse(readFileSync(enrichPath, "utf-8"));
        } catch {}
      }

      if (models.length > 0) {
        const totalDownloads = models.reduce((s, m) => s + m.downloads, 0);
        enrichment.huggingface = {
          models,
          totalDownloads,
          totalLikes: models.reduce((s, m) => s + m.likes, 0),
          totalModels: totalCount,
        };
        updated++;
        console.log(
          `  ${slug}: ${totalCount} models (top ${models.length}), ${totalDownloads.toLocaleString()} downloads`,
        );
      } else {
        enrichment.huggingface = null;
      }

      writeFileSync(enrichPath, JSON.stringify(enrichment, null, 2) + "\n");
    }
  }

  console.log(`[refresh-hf] Updated ${updated}/${tasks.length} enrichment files`);
}

main().catch((err) => {
  console.error("[refresh-hf] Error:", err);
  process.exit(1);
});
