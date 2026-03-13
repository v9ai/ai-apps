/**
 * Integration tests against live DeepSeek and DashScope (Qwen) APIs.
 *
 * Uses cheapest models: deepseek-chat and qwen-turbo.
 * Each suite skips automatically when the required API key(s) are absent.
 *
 * Run: pnpm --filter @ai-apps/llm-router test:integration
 */
import { describe, it, expect, beforeAll } from '@jest/globals';
import { createRouter } from '../src/router';
import type { RouterConfig, LLMRequest } from '../src/types';

// ─── Env ─────────────────────────────────────────────────────────────────────

const DS_KEY = process.env.DEEPSEEK_API_KEY ?? '';
const QW_KEY = process.env.DASHSCOPE_API_KEY ?? '';
const hasDS = Boolean(DS_KEY);
const hasQW = Boolean(QW_KEY);
const hasBoth = hasDS && hasQW;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const pingReq: LLMRequest = {
  messages: [{ role: 'user', content: 'Reply with exactly one word: pong' }],
  temperature: 0,
  maxTokens: 16,
};

function skipUnless(condition: boolean, label: string): boolean {
  if (!condition) {
    console.log(`Skipping — ${label} not set`);
    return true;
  }
  return false;
}

// ─── DeepSeek only ───────────────────────────────────────────────────────────

describe('deepseek provider', () => {
  it('returns a non-empty response (fallback strategy)', async () => {
    if (skipUnless(hasDS, 'DEEPSEEK_API_KEY')) return;

    const router = createRouter({
      strategy: 'fallback',
      providers: [{ provider: 'deepseek', apiKey: DS_KEY, model: 'deepseek-chat' }],
    });

    const res = await router.chat(pingReq);

    expect(res.provider).toBe('deepseek');
    expect(res.id).toBeTruthy();
    expect(res.model).toBeTruthy();
    expect(res.content.length).toBeGreaterThan(0);
    console.log('deepseek reply:', res.content);
  });

  it('respects a system prompt', async () => {
    if (skipUnless(hasDS, 'DEEPSEEK_API_KEY')) return;

    const router = createRouter({
      strategy: 'fallback',
      providers: [{ provider: 'deepseek', apiKey: DS_KEY, model: 'deepseek-chat' }],
    });

    const res = await router.chat({
      messages: [
        { role: 'system', content: 'You are a calculator. Reply only with the numeric result.' },
        { role: 'user', content: '3 + 5' },
      ],
      temperature: 0,
      maxTokens: 16,
    });

    expect(res.content).toContain('8');
  });

  it('invalid key throws', async () => {
    const router = createRouter({
      strategy: 'fallback',
      providers: [{ provider: 'deepseek', apiKey: 'invalid-key-000' }],
    });

    await expect(router.chat(pingReq)).rejects.toThrow();
  });
});

// ─── Qwen only ───────────────────────────────────────────────────────────────

describe('qwen provider', () => {
  it('returns a non-empty response (fallback strategy)', async () => {
    if (skipUnless(hasQW, 'DASHSCOPE_API_KEY')) return;

    const router = createRouter({
      strategy: 'fallback',
      providers: [{ provider: 'qwen', apiKey: QW_KEY, model: 'qwen-turbo' }],
    });

    const res = await router.chat(pingReq);

    expect(res.provider).toBe('qwen');
    expect(res.id).toBeTruthy();
    expect(res.model).toBeTruthy();
    expect(res.content.length).toBeGreaterThan(0);
    console.log('qwen reply:', res.content);
  });

  it('respects a system prompt', async () => {
    if (skipUnless(hasQW, 'DASHSCOPE_API_KEY')) return;

    const router = createRouter({
      strategy: 'fallback',
      providers: [{ provider: 'qwen', apiKey: QW_KEY, model: 'qwen-turbo' }],
    });

    const res = await router.chat({
      messages: [
        { role: 'system', content: 'You are a calculator. Reply only with the numeric result.' },
        { role: 'user', content: '6 + 7' },
      ],
      temperature: 0,
      maxTokens: 16,
    });

    expect(res.content).toContain('13');
  });

  it('invalid key throws', async () => {
    const router = createRouter({
      strategy: 'fallback',
      providers: [{ provider: 'qwen', apiKey: 'invalid-key-000' }],
    });

    await expect(router.chat(pingReq)).rejects.toThrow();
  });
});

// ─── Cross-provider (both keys required) ─────────────────────────────────────

describe('round-robin strategy', () => {
  it('alternates between DeepSeek and Qwen across two calls', async () => {
    if (skipUnless(hasBoth, 'DEEPSEEK_API_KEY + DASHSCOPE_API_KEY')) return;

    const router = createRouter({
      strategy: 'round-robin',
      providers: [
        { provider: 'deepseek', apiKey: DS_KEY, model: 'deepseek-chat' },
        { provider: 'qwen', apiKey: QW_KEY, model: 'qwen-turbo' },
      ],
    });

    const first = await router.chat(pingReq);
    const second = await router.chat(pingReq);

    expect(first.provider).toBe('deepseek');
    expect(second.provider).toBe('qwen');
    console.log('round-robin first:', first.provider, '|', first.content);
    console.log('round-robin second:', second.provider, '|', second.content);
  });
});

describe('model strategy', () => {
  it('routes deepseek-chat to DeepSeek', async () => {
    if (skipUnless(hasBoth, 'DEEPSEEK_API_KEY + DASHSCOPE_API_KEY')) return;

    const router = createRouter({
      strategy: 'model',
      providers: [
        { provider: 'deepseek', apiKey: DS_KEY },
        { provider: 'qwen', apiKey: QW_KEY },
      ],
    });

    const res = await router.chat({ ...pingReq, model: 'deepseek-chat' });
    expect(res.provider).toBe('deepseek');
  });

  it('routes qwen-turbo to Qwen', async () => {
    if (skipUnless(hasBoth, 'DEEPSEEK_API_KEY + DASHSCOPE_API_KEY')) return;

    const router = createRouter({
      strategy: 'model',
      providers: [
        { provider: 'deepseek', apiKey: DS_KEY },
        { provider: 'qwen', apiKey: QW_KEY },
      ],
    });

    const res = await router.chat({ ...pingReq, model: 'qwen-turbo' });
    expect(res.provider).toBe('qwen');
  });
});

describe('fallback strategy cross-provider', () => {
  it('falls back to Qwen when DeepSeek key is invalid', async () => {
    if (skipUnless(hasQW, 'DASHSCOPE_API_KEY')) return;

    const router = createRouter({
      strategy: 'fallback',
      providers: [
        { provider: 'deepseek', apiKey: 'invalid-key-000' },
        { provider: 'qwen', apiKey: QW_KEY, model: 'qwen-turbo' },
      ],
    });

    const res = await router.chat(pingReq);
    expect(res.provider).toBe('qwen');
    console.log('fallback landed on:', res.provider, '|', res.content);
  });

  it('throws AggregateError when both keys are invalid', async () => {
    const router = createRouter({
      strategy: 'fallback',
      providers: [
        { provider: 'deepseek', apiKey: 'bad-ds-key' },
        { provider: 'qwen', apiKey: 'bad-qw-key' },
      ],
    });

    await expect(router.chat(pingReq)).rejects.toBeInstanceOf(AggregateError);
  });
});
