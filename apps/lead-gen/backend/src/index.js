import { Container, getContainer } from "@cloudflare/containers";

export class LeadgenContainer extends Container {
  defaultPort = 7860;
  sleepAfter = "10m";

  constructor(ctx, env) {
    super(ctx, env);
    this.envVars = {
      DATABASE_URL: env.DATABASE_URL ?? "",
      NEON_DATABASE_URL: env.NEON_DATABASE_URL ?? "",
      DEEPSEEK_API_KEY: env.DEEPSEEK_API_KEY ?? "",
      LANGGRAPH_AUTH_TOKEN: env.LANGGRAPH_AUTH_TOKEN ?? "",
      LLM_BASE_URL: env.LLM_BASE_URL ?? "https://api.deepseek.com",
      LLM_MODEL: env.LLM_MODEL ?? "deepseek-chat",
      EMAIL_LLM_BASE_URL: env.EMAIL_LLM_BASE_URL ?? "",
      EMAIL_LLM_API_KEY: env.EMAIL_LLM_API_KEY ?? "",
      EMAIL_LLM_MODEL: env.EMAIL_LLM_MODEL ?? "",
    };
  }
}

export default {
  async fetch(request, env) {
    return getContainer(env.CONTAINER).fetch(request);
  },
};
