import { DeepSeekClient } from "@repo/deepseek";

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

export { getDeepseekClient, getDeepseekReasoner, getQwenClient };
