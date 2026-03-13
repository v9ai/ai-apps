import type { LLMRequest, LLMResponse, ProviderConfig, Strategy } from '../types';

export class ModelStrategy implements Strategy {
  async execute(
    request: LLMRequest,
    providers: ProviderConfig[],
    invoker: (cfg: ProviderConfig, req: LLMRequest) => Promise<LLMResponse>
  ): Promise<LLMResponse> {
    const model = request.model ?? '';
    let cfg: ProviderConfig | undefined;

    if (model.startsWith('deepseek-')) {
      cfg = providers.find(p => p.provider === 'deepseek');
    } else if (model.startsWith('qwen-')) {
      cfg = providers.find(p => p.provider === 'qwen');
    }

    return invoker(cfg ?? providers[0], request);
  }
}
