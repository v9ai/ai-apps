import { DeepSeekClient } from "@repo/deepseek";

export const deepseekClient = new DeepSeekClient({
  apiKey: process.env.DEEPSEEK_API_KEY,
  defaultModel: "deepseek-chat",
});

export const deepseekReasoner = new DeepSeekClient({
  apiKey: process.env.DEEPSEEK_API_KEY,
  defaultModel: "deepseek-reasoner",
});

export const qwenClient = new DeepSeekClient({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  defaultModel: "qwen-plus",
});
