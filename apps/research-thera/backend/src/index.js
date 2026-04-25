import { Container, getContainer } from "@cloudflare/containers";

export class ResearchTheraContainer extends Container {
  defaultPort = 8080;
  sleepAfter = "30m";
  // TODO: when @cloudflare/containers v0.X+ exposes readiness hooks,
  // gate traffic on GET /healthz instead of TCP-open at :8080.
  // For now, the FastAPI /healthz endpoint exists for explicit probes.

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
      LANGCHAIN_TRACING_V2: env.LANGCHAIN_TRACING_V2 ?? "",
      LANGCHAIN_API_KEY: env.LANGCHAIN_API_KEY ?? "",
      LANGSMITH_PROJECT: env.LANGSMITH_PROJECT ?? "research-thera-agent",
      ENVIRONMENT: env.ENVIRONMENT ?? "",
    };
  }
}

export default {
  async fetch(request, env) {
    return getContainer(env.CONTAINER).fetch(request);
  },
};
