/**
 * Apollo Server context — built per-request by the integration in server.ts.
 */

import type { GatewayDb } from "../db/client";
import type { SessionUser } from "../auth/session";

export interface GatewayEnv {
  ORIGIN: string;
  GATEWAY_URL: string;
  GATEWAY_HMAC: string;
  LANGGRAPH_URL: string;
  LANGGRAPH_AUTH_TOKEN?: string;
  PRODUCT_INTEL_GRAPH_VERSION?: string;
  NEON_DATABASE_URL: string;
  JOB_PUBSUB: DurableObjectNamespace;
}

export interface GatewayContext {
  env: GatewayEnv;
  db: GatewayDb;
  user: SessionUser | null;
  request: Request;
}
