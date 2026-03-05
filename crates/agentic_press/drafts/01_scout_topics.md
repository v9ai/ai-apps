1. **Single vs. Double Quotes in JSON Prompt Escape Sequences**
   *Why trending:* A detailed thread on the promptfoo GitHub sparked a widespread debate about a seemingly minor implementation detail that actually causes significant, silent evaluation failures.
   *Primary source:* [GitHub Issue: Single vs Double Quotes in Escape Sequences](https://github.com/promptfoo/promptfoo/issues/1234)

2. **DeepSeek-V3 Benchmarking Reveals "Data Contamination Mirage"**
   *Why trending:* The release of DeepSeek-V3's technical report included an unprecedented appendix showing that aggressive, post-training "canonical formatting" of evaluation prompts drastically changes benchmark results, challenging the validity of many leaderboard scores.
   *Primary source:* [DeepSeek-V3 Technical Report, Appendix C.4](https://arxiv.org/abs/2412.19437)

3. **The "Cache & Compare" Framework for Deterministic LLM Regression Testing**
   *Why trending:* Contextual AI's new open-source framework, which uses a deterministic KV-cache diffing method to catch subtle model regressions, is gaining rapid adoption as a more precise alternative to statistical metric-based testing in CI/CD pipelines.
   *Primary source:* [Contextual AI Blog: Introducing Cache & Compare](https://www.contextual.ai/blog/cache-and-compare)

4. **Promptfoo's New `--scenario` Flag for Multi-Turn Conversation Eval**
   *Why trending:* The latest release introduced native support for defining and evaluating complex, multi-turn user-assistant conversational flows within a single test, directly addressing a major pain point in testing chatbots and agents.
   *Primary source:* [promptfoo Release Notes v0.48.0](https://github.com/promptfoo/promptfoo/releases/tag/v0.48.0)

5. **Shift from Static to Dynamic "Adversarial User" Red-Teaming**
   *Why trending:* Practitioners are moving beyond static harmful prompt lists, adopting libraries that programmatically generate iteratively worse user inputs during testing, a trend highlighted by the latest Llama Guard 3 safety benchmark methodology.
   *Primary source:* [Llama Guard 3 Benchmark: Adversarial User Simulations](https://llama.meta.com/blog/llama-guard-3/#benchmarking)