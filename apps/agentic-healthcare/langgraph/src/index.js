import { Container, getContainer } from "@cloudflare/containers";

export class AgenticHealthcareContainer extends Container {
  defaultPort = 8001;
  sleepAfter = "10m";

  constructor(ctx, env) {
    super(ctx, env);
    this.envVars = {
      DATABASE_URL: env.DATABASE_URL ?? "",
      R2_ACCOUNT_ID: env.R2_ACCOUNT_ID ?? "",
      R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID ?? "",
      R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY ?? "",
      R2_BUCKET_NAME: env.R2_BUCKET_NAME ?? "healthcare-blood-tests",
      LLAMA_CLOUD_API_KEY: env.LLAMA_CLOUD_API_KEY ?? "",
      INTERNAL_API_KEY: env.INTERNAL_API_KEY ?? "",
      LLM_BASE_URL: env.LLM_BASE_URL ?? "https://api.deepseek.com",
      LLM_MODEL: env.LLM_MODEL ?? "deepseek-chat",
      LLM_API_KEY: env.LLM_API_KEY ?? "unused",
    };
  }
}

export default {
  async fetch(request, env) {
    return getContainer(env.CONTAINER).fetch(request);
  },
};
