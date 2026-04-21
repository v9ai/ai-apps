import { Container, getContainer } from "@cloudflare/containers";

export class ResearchTheraContainer extends Container {
  defaultPort = 8080;
  sleepAfter = "10m";

  constructor(ctx, env) {
    super(ctx, env);
    this.envVars = {
      NEON_DATABASE_URL: env.NEON_DATABASE_URL ?? "",
      DEEPSEEK_API_KEY: env.DEEPSEEK_API_KEY ?? "",
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
