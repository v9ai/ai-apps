import { DeepSeekClient } from '@ai-apps/deepseek';
import { QwenClient } from '@ai-apps/qwen';
import { toDeepSeekRequest, toQwenRequest, fromDeepSeekResponse, fromQwenResponse } from './adapters';
import { FallbackStrategy } from './strategies/fallback';
import { RoundRobinStrategy } from './strategies/round-robin';
import { ModelStrategy } from './strategies/model';
import type { LLMRequest, LLMResponse, ProviderConfig, ProviderName, RouterConfig } from './types';
import type { Strategy } from './types';

function clientKey(cfg: ProviderConfig): string {
  return `${cfg.provider}::${cfg.apiKey}::${cfg.baseURL ?? ''}`;
}

export class LLMRouter {
  private readonly strategy: Strategy;
  private readonly providers: ProviderConfig[];
  private readonly deepseekClients = new Map<string, DeepSeekClient>();
  private readonly qwenClients = new Map<string, QwenClient>();

  constructor(config: RouterConfig) {
    this.providers = config.providers;

    switch (config.strategy) {
      case 'fallback':
        this.strategy = new FallbackStrategy();
        break;
      case 'round-robin':
        this.strategy = new RoundRobinStrategy();
        break;
      case 'model':
        this.strategy = new ModelStrategy();
        break;
      default:
        throw new Error(`Unknown routing strategy: ${config.strategy}`);
    }

    for (const cfg of config.providers) {
      const key = clientKey(cfg);
      if (cfg.provider === 'deepseek' && !this.deepseekClients.has(key)) {
        this.deepseekClients.set(key, new DeepSeekClient({
          apiKey: cfg.apiKey,
          ...(cfg.baseURL && { baseURL: cfg.baseURL }),
          ...(cfg.model && { defaultModel: cfg.model }),
        }));
      } else if (cfg.provider === 'qwen' && !this.qwenClients.has(key)) {
        this.qwenClients.set(key, new QwenClient({
          apiKey: cfg.apiKey,
          ...(cfg.baseURL && { baseURL: cfg.baseURL }),
        }));
      }
    }
  }

  async chat(req: LLMRequest): Promise<LLMResponse> {
    return this.strategy.execute(req, this.providers, this.invokeProvider.bind(this));
  }

  getProvider(name: ProviderName): DeepSeekClient | QwenClient {
    if (name === 'deepseek') {
      const client = this.deepseekClients.values().next().value;
      if (!client) throw new Error('No deepseek provider configured');
      return client;
    }
    const client = this.qwenClients.values().next().value;
    if (!client) throw new Error('No qwen provider configured');
    return client;
  }

  private async invokeProvider(cfg: ProviderConfig, req: LLMRequest): Promise<LLMResponse> {
    const key = clientKey(cfg);

    if (cfg.provider === 'deepseek') {
      const client = this.deepseekClients.get(key);
      if (!client) throw new Error(`DeepSeek client not found for key: ${key}`);
      const dsReq = toDeepSeekRequest(req, cfg.model);
      const dsRes = await client.chat(dsReq);
      return fromDeepSeekResponse(dsRes);
    }

    const client = this.qwenClients.get(key);
    if (!client) throw new Error(`Qwen client not found for key: ${key}`);
    const qwenReq = toQwenRequest(req, cfg.model);
    const qwenRes = await client.chat(qwenReq);
    return fromQwenResponse(qwenRes);
  }
}

export function createRouter(config: RouterConfig): LLMRouter {
  return new LLMRouter(config);
}
