// Durable-Object wrapper for the research CF Container.
// Mirrors backend/src/index.js (core container) but binds a different class
// name and forwards secrets needed by research graphs (GitHub, OpenAlex,
// Semantic Scholar, Brave, plus the LLM creds used by research_agent +
// agentic_search). Defaults are NOT set here — everything flows from Cloudflare
// secrets at deploy time.
import { Container, getContainer } from "@cloudflare/containers";

export class ResearchContainer extends Container {
  defaultPort = 8000;
  sleepAfter = "30m";

  constructor(ctx, env) {
    super(ctx, env);
    this.envVars = {
      // Neon (pooled connection — used by AsyncPostgresSaver + scholar/
      // lead_papers/common_crawl/gh_patterns direct SQL).
      NEON_DATABASE_URL: env.NEON_DATABASE_URL ?? "",
      DATABASE_URL: env.DATABASE_URL ?? "",

      // Bearer-token for the container's own HTTP surface.
      RESEARCH_INTERNAL_AUTH_TOKEN: env.RESEARCH_INTERNAL_AUTH_TOKEN ?? "",

      // LLM creds for research_agent + agentic_search tool loops.
      DEEPSEEK_API_KEY: env.DEEPSEEK_API_KEY ?? "",
      DEEPSEEK_BASE_URL: env.DEEPSEEK_BASE_URL ?? "",
      LLM_BASE_URL: env.LLM_BASE_URL ?? "",
      LLM_MODEL: env.LLM_MODEL ?? "",

      // Third-party research APIs.
      SEMANTIC_SCHOLAR_API_KEY: env.SEMANTIC_SCHOLAR_API_KEY ?? "",
      GITHUB_TOKEN: env.GITHUB_TOKEN ?? "",
      GH_TOKEN: env.GH_TOKEN ?? "",
      OPENALEX_MAILTO: env.OPENALEX_MAILTO ?? "",
      BRAVE_API_KEY: env.BRAVE_API_KEY ?? "",

      // Embeddings sidecar (BGE-M3 server; used by lead_papers + gh_patterns).
      ICP_EMBED_URL: env.ICP_EMBED_URL ?? "",
    };
  }
}

export default {
  async fetch(request, env) {
    return getContainer(env.RESEARCH_CONTAINER).fetch(request);
  },
};
