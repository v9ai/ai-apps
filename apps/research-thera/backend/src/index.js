import { Container, getContainer } from "@cloudflare/containers";

export class ResearchTheraContainer extends Container {
  defaultPort = 8080;
  sleepAfter = "10m";

  constructor(ctx, env) {
    super(ctx, env);
    this.envVars = {
      NEON_DATABASE_URL: env.NEON_DATABASE_URL ?? "",
      DEEPSEEK_API_KEY: env.DEEPSEEK_API_KEY ?? "",
      OPENAI_API_KEY: env.OPENAI_API_KEY ?? "",
      DASHSCOPE_API_KEY: env.DASHSCOPE_API_KEY ?? "",
      R2_ACCOUNT_ID: env.R2_ACCOUNT_ID ?? "",
      R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID ?? "",
      R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY ?? "",
      R2_BUCKET_NAME: env.R2_BUCKET_NAME ?? "",
      R2_PUBLIC_DOMAIN: env.R2_PUBLIC_DOMAIN ?? "",
      LANGGRAPH_AUTH_TOKEN: env.LANGGRAPH_AUTH_TOKEN ?? "",
      LLM_BASE_URL: env.LLM_BASE_URL ?? "https://api.deepseek.com",
      LLM_MODEL: env.LLM_MODEL ?? "deepseek-chat",
    };
  }
}

export default {
  async fetch(request, env) {
    return getContainer(env.CONTAINER).fetch(request);
  },
};
