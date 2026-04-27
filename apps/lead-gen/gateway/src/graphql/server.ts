/**
 * Apollo Server 5 wired through `@as-integrations/cloudflare-workers`.
 * Single instance shared across requests — Apollo's internal state is
 * Worker-safe.
 */

import { ApolloServer } from "@apollo/server";
import { startServerAndCreateCloudflareWorkersHandler } from "@as-integrations/cloudflare-workers";
import { typeDefs } from "./typedefs";
import { resolvers } from "./resolvers";
import { getDb } from "../db/client";
import { validateSession } from "../auth/session";
import type { GatewayContext, GatewayEnv } from "./context";

const apolloServer = new ApolloServer<GatewayContext>({
  typeDefs,
  resolvers,
  introspection: true,
});

export const apolloHandler = startServerAndCreateCloudflareWorkersHandler<
  GatewayEnv,
  GatewayContext
>(apolloServer, {
  context: async ({ request, env }: { request: Request; env: GatewayEnv }) => {
    const db = getDb(env.NEON_DATABASE_URL);
    const user = await validateSession(request, db);
    return { env, db, user, request };
  },
});
