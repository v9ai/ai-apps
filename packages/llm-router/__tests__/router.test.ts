import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createRouter } from '../src/router';
import type { RouterConfig, LLMRequest, LLMResponse } from '../src/types';

// Mock the provider packages
jest.mock('@ai-apps/deepseek', () => {
  return {
    DeepSeekClient: jest.fn().mockImplementation(() => ({
      chat: jest.fn().mockResolvedValue({
        id: 'ds-mock',
        model: 'deepseek-chat',
        choices: [{ message: { role: 'assistant', content: 'DeepSeek reply' }, finish_reason: 'stop', index: 0 }],
      }),
    })),
    DEEPSEEK_MODELS: { CHAT: 'deepseek-chat', REASONER: 'deepseek-reasoner' },
  };
});

jest.mock('@ai-apps/qwen', () => {
  return {
    QwenClient: jest.fn().mockImplementation(() => ({
      chat: jest.fn().mockResolvedValue({
        id: 'qw-mock',
        model: 'qwen-plus',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Qwen reply' }, finish_reason: 'stop' }],
      }),
    })),
  };
});

const dsProvider = { provider: 'deepseek' as const, apiKey: 'ds-key', model: 'deepseek-chat' };
const qwenProvider = { provider: 'qwen' as const, apiKey: 'qw-key', model: 'qwen-plus' };

const req: LLMRequest = {
  messages: [{ role: 'user', content: 'Hello' }],
};

describe('fallback strategy', () => {
  it('returns first provider response', async () => {
    const router = createRouter({ strategy: 'fallback', providers: [dsProvider] });
    const res = await router.chat(req);
    expect(res.provider).toBe('deepseek');
    expect(res.content).toBe('DeepSeek reply');
  });

  it('falls back to second provider when first fails', async () => {
    const { DeepSeekClient } = await import('@ai-apps/deepseek');
    (DeepSeekClient as jest.Mock).mockImplementationOnce(() => ({
      chat: jest.fn().mockRejectedValue(new Error('DS down')),
    }));

    const router = createRouter({ strategy: 'fallback', providers: [dsProvider, qwenProvider] });
    const res = await router.chat(req);
    expect(res.provider).toBe('qwen');
  });

  it('throws AggregateError when all providers fail', async () => {
    const { DeepSeekClient } = await import('@ai-apps/deepseek');
    (DeepSeekClient as jest.Mock).mockImplementationOnce(() => ({
      chat: jest.fn().mockRejectedValue(new Error('DS down')),
    }));
    const { QwenClient } = await import('@ai-apps/qwen');
    (QwenClient as jest.Mock).mockImplementationOnce(() => ({
      chat: jest.fn().mockRejectedValue(new Error('Qwen down')),
    }));

    const router = createRouter({ strategy: 'fallback', providers: [dsProvider, qwenProvider] });
    await expect(router.chat(req)).rejects.toBeInstanceOf(AggregateError);
  });
});

describe('round-robin strategy', () => {
  it('alternates between providers', async () => {
    const router = createRouter({ strategy: 'round-robin', providers: [dsProvider, qwenProvider] });
    const first = await router.chat(req);
    const second = await router.chat(req);
    expect(first.provider).toBe('deepseek');
    expect(second.provider).toBe('qwen');
  });
});

describe('model strategy', () => {
  it('routes deepseek-* to deepseek provider', async () => {
    const router = createRouter({ strategy: 'model', providers: [dsProvider, qwenProvider] });
    const res = await router.chat({ ...req, model: 'deepseek-chat' });
    expect(res.provider).toBe('deepseek');
  });

  it('routes qwen-* to qwen provider', async () => {
    const router = createRouter({ strategy: 'model', providers: [dsProvider, qwenProvider] });
    const res = await router.chat({ ...req, model: 'qwen-plus' });
    expect(res.provider).toBe('qwen');
  });

  it('falls back to providers[0] for unknown model prefix', async () => {
    const router = createRouter({ strategy: 'model', providers: [dsProvider, qwenProvider] });
    const res = await router.chat({ ...req, model: 'gpt-4' });
    expect(res.provider).toBe('deepseek');
  });
});

describe('getProvider', () => {
  it('returns deepseek client', () => {
    const router = createRouter({ strategy: 'fallback', providers: [dsProvider] });
    expect(router.getProvider('deepseek')).toBeDefined();
  });

  it('throws when provider not configured', () => {
    const router = createRouter({ strategy: 'fallback', providers: [dsProvider] });
    expect(() => router.getProvider('qwen')).toThrow('No qwen provider configured');
  });
});
