/**
 * Integration tests for the lead-gen-email-llm Cloudflare Worker.
 *
 * Hits the REAL deployed Worker — requires EMAIL_LLM_API_KEY in .env.local
 * (the same value as the EMAIL_LLM_SHARED_SECRET that was put on the Worker
 * via `wrangler secret put`).
 *
 * Run: pnpm vitest run workers/email-llm/integration.test.ts
 */

import { config } from "dotenv";
import { beforeAll, describe, expect, it } from "vitest";

config({ path: ".env.local" });

const WORKER_URL = "https://lead-gen-email-llm.eeeew.workers.dev";

describe("CF email-llm Worker — real integration", () => {
  beforeAll(() => {
    if (!process.env.EMAIL_LLM_API_KEY) {
      throw new Error(
        "EMAIL_LLM_API_KEY not set in .env.local — cannot run Worker integration tests",
      );
    }
  });

  it("GET /health reports liveness + LoRA flag", async () => {
    const r = await fetch(`${WORKER_URL}/health`);
    expect(r.status).toBe(200);
    const body = (await r.json()) as { ok: boolean; model: string; lora: boolean };
    expect(body.ok).toBe(true);
    expect(body.model).toBe("mistral-email-lora");
    expect(typeof body.lora).toBe("boolean");
  });

  it("GET /v1/models requires bearer auth", async () => {
    const unauth = await fetch(`${WORKER_URL}/v1/models`);
    expect(unauth.status).toBe(401);

    const auth = await fetch(`${WORKER_URL}/v1/models`, {
      headers: { Authorization: `Bearer ${process.env.EMAIL_LLM_API_KEY}` },
    });
    expect(auth.status).toBe(200);
    const body = (await auth.json()) as { object: string; data: Array<{ id: string }> };
    expect(body.object).toBe("list");
    expect(body.data[0]?.id).toBe("mistral-email-lora");
  });

  it("POST /v1/chat/completions rejects requests without bearer", async () => {
    const r = await fetch(`${WORKER_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
    });
    expect(r.status).toBe(401);
  });

  it("POST /v1/chat/completions generates a non-empty cold-outreach email", async () => {
    const r = await fetch(`${WORKER_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.EMAIL_LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: "mistral-email-lora",
        messages: [
          {
            role: "system",
            content:
              "You write short cold-outreach emails. Respond ONLY with JSON: {\"subject\": \"...\", \"body\": \"...\"}.",
          },
          {
            role: "user",
            content:
              "Write a brief 60-word warm cold-outreach email from Vadim to Jane Doe at Acme Corp asking for a 15-minute intro call.",
          },
        ],
        max_tokens: 250,
        temperature: 0.2,
      }),
    });

    expect(r.status, `worker status ${r.status}: ${await r.clone().text()}`).toBe(200);
    const body = (await r.json()) as {
      id: string;
      object: string;
      model: string;
      choices: Array<{ message: { role: string; content: string }; finish_reason: string }>;
      usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    expect(body.object).toBe("chat.completion");
    expect(body.id).toMatch(/^chatcmpl-/);
    expect(body.choices).toHaveLength(1);
    expect(body.choices[0].message.role).toBe("assistant");
    expect(body.choices[0].message.content.length).toBeGreaterThan(30);
    expect(body.usage.completion_tokens).toBeGreaterThan(0);
  }, 60_000);

  it("rejects streaming requests (the Worker's /v1/chat/completions is non-streaming)", async () => {
    const r = await fetch(`${WORKER_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.EMAIL_LLM_API_KEY}`,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: "hi" }],
        stream: true,
      }),
    });
    expect(r.status).toBe(400);
    const body = (await r.json()) as { error: { message: string } };
    expect(body.error.message).toMatch(/streaming/i);
  });
});
