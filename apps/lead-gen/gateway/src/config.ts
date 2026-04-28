/**
 * Gateway configuration. Centralized like the upstream
 * `cloudflare/workers-graphql-server` template's `graphQLOptions` object so
 * deploy-time tweaks live in one place.
 */

export interface GraphQLOptions {
  /** Path the GraphQL HTTP + WebSocket endpoint is mounted on. */
  baseEndpoint: string;
  /** Render the Apollo Sandbox UI on GET /graphql when the request is from a browser. */
  enableSandbox: boolean;
  /**
   * If true, any POST /graphql whose top-level field isn't in OWNED_OPS gets
   * proxied verbatim to `${ORIGIN}/api/graphql`. Lets the gateway sit in front
   * of the whole GraphQL surface during incremental migration. Set false on
   * a `*.workers.dev` deploy that should only serve the locally-owned subset.
   */
  forwardUnmatchedRequestsToOrigin: boolean;
}

export const graphQLOptions: GraphQLOptions = {
  baseEndpoint: "/graphql",
  enableSandbox: true,
  forwardUnmatchedRequestsToOrigin: true,
};

/**
 * Operation field names served locally by Apollo. Anything else is either
 * proxied (when forwardUnmatchedRequestsToOrigin) or 400'd. Keep in sync with
 * the SDL in `src/schema.graphql`.
 */
export const OWNED_OPS = new Set<string>([
  // Queries
  "productBySlug",
  "productIntelRun",
  "productIntelRuns",
  // Mutations
  "analyzeProductPricingAsync",
  "analyzeProductGTMAsync",
  "runFullProductIntelAsync",
]);
