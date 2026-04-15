/**
 * Integration tests for HuggingFace Inference API (JobBERT-v3).
 *
 * These hit the real HF API — require HF_TOKEN in .env.local.
 * Run: pnpm vitest run src/lib/candle/client.test.ts
 */

import { config } from "dotenv";
import { describe, it, expect, beforeAll } from "vitest";
import { embedPost, embedPostBatch, health } from "./client";

// Load .env.local so HF_TOKEN is available
config({ path: ".env.local" });

describe("HF Inference API — JobBERT-v3", () => {
  beforeAll(() => {
    if (!process.env.HF_TOKEN) {
      throw new Error("HF_TOKEN not set in .env.local — cannot run integration tests");
    }
  });

  it("health check returns ok with dimension info", async () => {
    const status = await health();
    expect(status).toMatch(/^ok \(dim=\d+, model=TechWolf\/JobBERT-v3\)$/);
  });

  it("embedPost returns a 768-dim vector", async () => {
    const embedding = await embedPost("Software Engineer");
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBe(768);
    // Values should be normalized floats
    expect(typeof embedding[0]).toBe("number");
    expect(Math.abs(embedding[0])).toBeLessThan(1);
  });

  it("embedPost returns normalized vectors (unit length)", async () => {
    const embedding = await embedPost("Machine Learning Engineer");
    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    // L2 norm should be ~1.0 for normalized vectors
    expect(norm).toBeCloseTo(1.0, 1);
  });

  it("similar job titles produce high cosine similarity", async () => {
    const [a, b] = await embedPostBatch([
      "Software Engineer",
      "Senior Software Developer",
    ]);
    const similarity = cosine(a, b);
    expect(similarity).toBeGreaterThan(0.7);
  });

  it("dissimilar titles produce lower cosine similarity", async () => {
    const [a, b] = await embedPostBatch([
      "Software Engineer",
      "Head of Marketing",
    ]);
    const similarity = cosine(a, b);
    expect(similarity).toBeLessThan(0.5);
  });

  it("embedPostBatch returns correct number of embeddings", async () => {
    const titles = [
      "Data Scientist",
      "ML Engineer",
      "Product Manager",
      "DevOps Engineer",
    ];
    const embeddings = await embedPostBatch(titles);
    expect(embeddings.length).toBe(4);
    for (const emb of embeddings) {
      expect(emb.length).toBe(768);
    }
  });

  it("embedPostBatch with empty array returns empty", async () => {
    const result = await embedPostBatch([]);
    expect(result).toEqual([]);
  });

  it("deterministic: same input produces same embedding", async () => {
    const [a, b] = await Promise.all([
      embedPost("AI Research Scientist"),
      embedPost("AI Research Scientist"),
    ]);
    const similarity = cosine(a, b);
    expect(similarity).toBeGreaterThan(0.99);
  });

  it("multilingual: related titles across languages are similar", async () => {
    const [en, de, es] = await embedPostBatch([
      "Software Engineer",
      "Softwareentwickler",       // German
      "Ingeniero de Software",    // Spanish
    ]);
    // v3 is multilingual — cross-language similarity should be meaningful
    expect(cosine(en, de)).toBeGreaterThan(0.5);
    expect(cosine(en, es)).toBeGreaterThan(0.5);
  });
});

function cosine(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
