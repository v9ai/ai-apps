// Cloudflare Container entrypoint for lead-gen-core.
// Runs the FastAPI app on port 8000 and forwards every inbound request via
// the Durable-Object-backed Container class. The dispatcher Worker upstream
// is what handles Bearer auth + path routing; this file only wires env vars
// that the Python process reads via os.environ.
import { Container, getContainer } from "@cloudflare/containers";
import { DEEPSEEK_PRO } from "../../_shared/deepseek-constants.js";

export class CoreContainer extends Container {
  defaultPort = 8000;
  sleepAfter = "10m";

  constructor(ctx, env) {
    super(ctx, env);
    this.envVars = {
      // DB — shared Neon pool across all 3 containers.
      DATABASE_URL: env.DATABASE_URL ?? "",
      NEON_DATABASE_URL: env.NEON_DATABASE_URL ?? "",

      // LLM — DeepSeek for reasoning, email-llm worker for outbound drafts.
      DEEPSEEK_API_KEY: env.DEEPSEEK_API_KEY ?? "",
      LLM_BASE_URL: env.LLM_BASE_URL ?? "https://api.deepseek.com",
      LLM_MODEL: env.LLM_MODEL ?? DEEPSEEK_PRO,
      EMAIL_LLM_BASE_URL: env.EMAIL_LLM_BASE_URL ?? "",
      EMAIL_LLM_API_KEY: env.EMAIL_LLM_API_KEY ?? "",
      EMAIL_LLM_MODEL: env.EMAIL_LLM_MODEL ?? "",

      // Perimeter auth — the dispatcher Worker already verifies it; we forward
      // so the Python BearerTokenMiddleware can re-check when the container is
      // hit directly (e.g. via `wrangler dev`).
      LANGGRAPH_AUTH_TOKEN: env.LANGGRAPH_AUTH_TOKEN ?? "",

      // GitHub API — vertical_discovery + consultancies_discovery hit /search/code.
      GITHUB_TOKEN: env.GITHUB_TOKEN ?? "",

      // Cross-container URLs (service bindings resolve to these hostnames).
      ML_URL: env.ML_URL ?? "http://lead-gen-ml",
      RESEARCH_URL: env.RESEARCH_URL ?? "http://lead-gen-research",
      // Internal shared secrets — each container's BearerTokenMiddleware
      // gates on its own token so core can prove it's calling from inside.
      ML_INTERNAL_AUTH_TOKEN: env.ML_INTERNAL_AUTH_TOKEN ?? "",
      RESEARCH_INTERNAL_AUTH_TOKEN: env.RESEARCH_INTERNAL_AUTH_TOKEN ?? "",

      // LinkedIn scorer reload — extension-scoped secret, independent rotation.
      SCORER_AUTH_TOKEN: env.SCORER_AUTH_TOKEN ?? "",
    };
  }
}

export default {
  async fetch(request, env) {
    return getContainer(env.CONTAINER).fetch(request);
  },
};
