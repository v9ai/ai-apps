/**
 * Integration tests against the live DashScope API.
 *
 * Uses text-embedding-v4 and qwen-turbo (cheapest models).
 * Skips automatically when DASHSCOPE_API_KEY is not set.
 *
 * Run: pnpm --filter @repo/qwen test:integration
 */
import { describe, it, expect, beforeAll } from "@jest/globals";
import { QwenClient } from "../src/client";

let client: QwenClient;
let skip = false;

beforeAll(() => {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    skip = true;
    return;
  }
  client = new QwenClient({ apiKey });
});

function skipIfNoKey() {
  if (skip) {
    console.log("DASHSCOPE_API_KEY not set, skipping");
    return true;
  }
  return false;
}

function cosineSim(a: number[], b: number[]): number {
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ─── Embedding tests ─────────────────────────────────────────────────────────

describe("embeddings", () => {
  it("single string returns 1024-dim vector", async () => {
    if (skipIfNoKey()) return;

    const resp = await client.embed({
      input: "Hemoglobin level is 14.2 g/dL",
    });

    expect(resp.data).toHaveLength(1);
    expect(resp.data[0].embedding).toHaveLength(1024);
    expect(resp.data[0].index).toBe(0);
    expect(resp.usage.total_tokens).toBeGreaterThan(0);
  });

  it("batch returns multiple vectors", async () => {
    if (skipIfNoKey()) return;

    const resp = await client.embed({
      input: [
        "White blood cell count: 7.2 x10^9/L",
        "Platelet count: 250 x10^9/L",
        "Glucose: 95 mg/dL",
      ],
    });

    expect(resp.data).toHaveLength(3);
    for (let i = 0; i < 3; i++) {
      expect(resp.data[i].index).toBe(i);
      expect(resp.data[i].embedding).toHaveLength(1024);
    }
  });

  it("custom dimensions (512)", async () => {
    if (skipIfNoKey()) return;

    const resp = await client.embed({
      input: "cholesterol test results",
      dimensions: 512,
    });

    expect(resp.data[0].embedding).toHaveLength(512);
  });

  it("embedOne convenience returns vector directly", async () => {
    if (skipIfNoKey()) return;

    const vec = await client.embedOne("iron levels are low");

    expect(vec).toHaveLength(1024);
    // Should be roughly unit-normalized
    const norm = Math.sqrt(vec.reduce((s, x) => s + x * x, 0));
    expect(Math.abs(norm - 1.0)).toBeLessThan(0.1);
  });

  it("similar texts have higher similarity than dissimilar", async () => {
    if (skipIfNoKey()) return;

    const resp = await client.embed({
      input: [
        "high cholesterol levels detected",
        "elevated cholesterol in blood test",
        "the weather is sunny today",
      ],
    });

    const a = resp.data[0].embedding;
    const b = resp.data[1].embedding;
    const c = resp.data[2].embedding;

    const simAB = cosineSim(a, b);
    const simAC = cosineSim(a, c);

    console.log(`sim(cholesterol, cholesterol_synonym) = ${simAB.toFixed(4)}`);
    console.log(`sim(cholesterol, weather) = ${simAC.toFixed(4)}`);

    expect(simAB).toBeGreaterThan(simAC);
  });
});

// ─── Chat tests ──────────────────────────────────────────────────────────────

describe("chat", () => {
  it("returns a non-empty response", async () => {
    if (skipIfNoKey()) return;

    const resp = await client.chat({
      model: "qwen-turbo",
      messages: [{ role: "user", content: "Reply with exactly: pong" }],
      max_completion_tokens: 16,
      temperature: 0,
    });

    expect(resp.choices.length).toBeGreaterThan(0);
    expect(resp.choices[0].message.content).toBeTruthy();
    console.log("reply:", resp.choices[0].message.content);
  });

  it("respects system prompt", async () => {
    if (skipIfNoKey()) return;

    const resp = await client.chat({
      model: "qwen-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a calculator. Reply only with the numeric result.",
        },
        { role: "user", content: "2 + 2" },
      ],
      max_completion_tokens: 16,
      temperature: 0,
    });

    expect(resp.choices[0].message.content).toContain("4");
  });
});

// ─── Error handling ──────────────────────────────────────────────────────────

describe("errors", () => {
  it("invalid API key throws", async () => {
    const badClient = new QwenClient({ apiKey: "invalid-key-000" });

    await expect(
      badClient.embed({ input: "test" })
    ).rejects.toThrow("DashScope API error");
  });
});
