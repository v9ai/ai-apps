export type LLMRole = 'system' | 'user' | 'assistant';

export interface LLMMessage {
  role: LLMRole;
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  id: string;
  model: string;
  content: string;
  provider: 'deepseek' | 'qwen';
}

export type ProviderName = 'deepseek' | 'qwen';

export interface ProviderConfig {
  provider: ProviderName;
  apiKey: string;
  model?: string;
  baseURL?: string;
}

export type RoutingStrategy = 'fallback' | 'round-robin' | 'model';

export interface RouterConfig {
  strategy: RoutingStrategy;
  providers: [ProviderConfig, ...ProviderConfig[]];
}

export interface Strategy {
  execute(
    request: LLMRequest,
    providers: ProviderConfig[],
    invoker: (cfg: ProviderConfig, req: LLMRequest) => Promise<LLMResponse>
  ): Promise<LLMResponse>;
}
