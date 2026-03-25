import { DeepSeekClient } from "@ai-apps/deepseek";

function lazy<T>(fn: () => T): () => T {
  let instance: T;
  return () => (instance ??= fn());
}

const getDeepseekClient = lazy(() => new DeepSeekClient({
  apiKey: process.env.DEEPSEEK_API_KEY,
  defaultModel: "deepseek-chat",
}));

const getDeepseekReasoner = lazy(() => new DeepSeekClient({
  apiKey: process.env.DEEPSEEK_API_KEY,
  defaultModel: "deepseek-reasoner",
}));

const getQwenClient = lazy(() => new DeepSeekClient({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  defaultModel: "qwen-plus",
}));

const getLocalClient = lazy(() => new DeepSeekClient({
  apiKey: "local",
  baseURL: process.env.CANDLE_BASE_URL ?? "http://localhost:9877/v1",
  defaultModel: "phi-3.5-mini",
}));

export { getDeepseekClient, getDeepseekReasoner, getQwenClient, getLocalClient };
