import type { LLMRequest, LLMResponse, ProviderConfig, Strategy } from '../types';

export class FallbackStrategy implements Strategy {
  async execute(
    request: LLMRequest,
    providers: ProviderConfig[],
    invoker: (cfg: ProviderConfig, req: LLMRequest) => Promise<LLMResponse>
  ): Promise<LLMResponse> {
    const errors: unknown[] = [];

    for (const cfg of providers) {
      try {
        return await invoker(cfg, request);
      } catch (err) {
        errors.push(err);
      }
    }

    throw new AggregateError(errors, 'All providers failed');
  }
}
