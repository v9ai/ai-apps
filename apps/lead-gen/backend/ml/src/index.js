// ml container — Durable Object wrapper that forwards fetch to the FastAPI
// process inside the container. Mirrors backend/src/index.js (the core
// container); class renamed to MlContainer and port bumped to 8000 to match
// the ml FastAPI CMD.
import { Container, getContainer } from "@cloudflare/containers";

export class MlContainer extends Container {
  defaultPort = 8000;
  sleepAfter = "30m";

  constructor(ctx, env) {
    super(ctx, env);
    this.envVars = {
      DATABASE_URL: env.DATABASE_URL ?? "",
      NEON_DATABASE_URL: env.NEON_DATABASE_URL ?? "",
      ML_INTERNAL_AUTH_TOKEN: env.ML_INTERNAL_AUTH_TOKEN ?? "",
      ML_EAGER_LOAD: env.ML_EAGER_LOAD ?? "1",
      HF_HOME: env.HF_HOME ?? "/app/.cache/huggingface",
    };
  }
}

export default {
  async fetch(request, env) {
    return getContainer(env.ML_CONTAINER).fetch(request);
  },
};
