/**
 * DeepSeek API Client
 *
 * Direct API implementation (no SDK dependencies)
 * OpenAI-compatible format
 */

export { DeepSeekClient, createDeepSeekClient, getDefaultClient, chat } from './client';
export {
  DEEPSEEK_MODELS,
  DEEPSEEK_API_BASE_URL,
  DEEPSEEK_API_V1_URL,
  DEEPSEEK_API_BETA_URL,
  DEFAULT_CONFIG
} from './constants';
export type {
  ChatMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionStreamChunk,
  FIMCompletionRequest,
  FIMCompletionResponse,
  FIMCompletionStreamChunk,
  DeepSeekConfig,
  DeepSeekError,
  MessageRole,
  TokenUsage,
  FunctionTool,
  ToolCall,
} from './types';
