import { describe, it, expect } from '@jest/globals';
import { toDeepSeekRequest, toQwenRequest, fromDeepSeekResponse, fromQwenResponse } from '../src/adapters';
import type { LLMRequest } from '../src/types';
import type { ChatCompletionResponse } from '@ai-apps/deepseek';
import type { ChatResponse } from '@ai-apps/qwen';

const baseRequest: LLMRequest = {
  messages: [{ role: 'user', content: 'Hello' }],
  model: 'deepseek-chat',
  temperature: 0.7,
  maxTokens: 512,
};

describe('toDeepSeekRequest', () => {
  it('maps maxTokens to max_tokens', () => {
    const req = toDeepSeekRequest(baseRequest);
    expect(req.max_tokens).toBe(512);
    expect((req as any).maxTokens).toBeUndefined();
  });

  it('uses provided model', () => {
    const req = toDeepSeekRequest(baseRequest);
    expect(req.model).toBe('deepseek-chat');
  });

  it('falls back to defaultModel when model is undefined', () => {
    const req = toDeepSeekRequest({ messages: baseRequest.messages }, 'deepseek-reasoner');
    expect(req.model).toBe('deepseek-reasoner');
  });
});

describe('toQwenRequest', () => {
  it('maps maxTokens to max_completion_tokens', () => {
    const req = toQwenRequest({ ...baseRequest, model: 'qwen-plus' });
    expect(req.max_completion_tokens).toBe(512);
    expect((req as any).maxTokens).toBeUndefined();
    expect((req as any).max_tokens).toBeUndefined();
  });

  it('falls back to defaultModel when model is undefined', () => {
    const req = toQwenRequest({ messages: baseRequest.messages }, 'qwen-turbo');
    expect(req.model).toBe('qwen-turbo');
  });
});

describe('fromDeepSeekResponse', () => {
  it('unwraps content and sets provider to deepseek', () => {
    const raw = {
      id: 'ds-1',
      model: 'deepseek-chat',
      choices: [{ message: { role: 'assistant', content: 'Hi there' }, finish_reason: 'stop', index: 0 }],
    } as ChatCompletionResponse;

    const res = fromDeepSeekResponse(raw);
    expect(res.id).toBe('ds-1');
    expect(res.content).toBe('Hi there');
    expect(res.provider).toBe('deepseek');
  });

  it('returns empty string when choices is empty', () => {
    const raw = { id: 'x', model: 'deepseek-chat', choices: [] } as unknown as ChatCompletionResponse;
    expect(fromDeepSeekResponse(raw).content).toBe('');
  });
});

describe('fromQwenResponse', () => {
  it('unwraps content and sets provider to qwen', () => {
    const raw: ChatResponse = {
      id: 'qw-1',
      model: 'qwen-plus',
      choices: [{ index: 0, message: { role: 'assistant', content: 'Hello' }, finish_reason: 'stop' }],
    };

    const res = fromQwenResponse(raw);
    expect(res.id).toBe('qw-1');
    expect(res.content).toBe('Hello');
    expect(res.provider).toBe('qwen');
  });
});
