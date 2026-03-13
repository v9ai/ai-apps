export { createRouter, LLMRouter } from './router';
export type {
  LLMMessage,
  LLMRequest,
  LLMResponse,
  LLMRole,
  ProviderConfig,
  ProviderName,
  RouterConfig,
  RoutingStrategy,
} from './types';

export type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatMessage as DeepSeekMessage,
  DeepSeekConfig,
  MessageRole,
} from '@ai-apps/deepseek';
export { DEEPSEEK_MODELS } from '@ai-apps/deepseek';

export type {
  ChatRequest as QwenChatRequest,
  ChatResponse as QwenChatResponse,
  ChatMessage as QwenMessage,
  QwenClientOptions,
} from '@ai-apps/qwen';
