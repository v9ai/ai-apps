import type { LLMRequest, LLMResponse, ProviderConfig, Strategy } from '../types';

export class RoundRobinStrategy implements Strategy {
  private counter = 0;

  async execute(
    request: LLMRequest,
    providers: ProviderConfig[],
    invoker: (cfg: ProviderConfig, req: LLMRequest) => Promise<LLMResponse>
  ): Promise<LLMResponse> {
    const cfg = providers[this.counter++ % providers.length];
    return invoker(cfg, request);
  }
}
