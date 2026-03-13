import type { ChatMessage as DeepSeekChatMessage, ChatCompletionRequest, ChatCompletionResponse } from '@ai-apps/deepseek';
import type { ChatMessage as QwenChatMessage, ChatRequest, ChatResponse } from '@ai-apps/qwen';
import type { LLMRequest, LLMResponse } from './types';

export function toDeepSeekRequest(
  req: LLMRequest,
  defaultModel = 'deepseek-chat'
): ChatCompletionRequest {
  return {
    model: req.model ?? defaultModel,
    messages: req.messages as DeepSeekChatMessage[],
    temperature: req.temperature,
    max_tokens: req.maxTokens,
  };
}

export function toQwenRequest(
  req: LLMRequest,
  defaultModel = 'qwen-plus'
): ChatRequest {
  return {
    model: req.model ?? defaultModel,
    messages: req.messages as QwenChatMessage[],
    temperature: req.temperature,
    max_completion_tokens: req.maxTokens,
  };
}

export function fromDeepSeekResponse(res: ChatCompletionResponse): LLMResponse {
  return {
    id: res.id,
    model: res.model,
    content: res.choices[0]?.message?.content ?? '',
    provider: 'deepseek',
  };
}

export function fromQwenResponse(res: ChatResponse): LLMResponse {
  return {
    id: res.id,
    model: res.model,
    content: res.choices[0]?.message?.content ?? '',
    provider: 'qwen',
  };
}
