import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest } from "next/server";
import { typeDefs } from "../../../schema/typeDefs.generated";
import { resolvers } from "../../../schema/resolvers.generated";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { GraphQLContext } from "../../apollo/context";
import { auth } from "@/app/lib/auth/server";
import { userContext } from "@/src/db/neon";

const schema = makeExecutableSchema({ typeDefs, resolvers });
const apolloServer = new ApolloServer<GraphQLContext>({ schema });

const handler = startServerAndCreateNextHandler<NextRequest, GraphQLContext>(
  apolloServer,
  {
    context: async () => {
      const { data: session } = await auth.getSession();
      return {
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        userName: session?.user?.name ?? undefined,
      };
    },
  },
);

/**
 * Wraps the Apollo handler so that every resolver in the tree — and every
 * `sql\`…\`` call that fires from it — runs inside an AsyncLocalStorage scope
 * that carries the caller's user id. `src/db/neon.ts` reads that scope and
 * rewrites each query into a transaction that sets `app.current_user_id` /
 * `app.current_user_email` via `set_config(…, true)` first, so PostgreSQL RLS
 * policies can enforce isolation.
 *
 * Anonymous requests (no session) still go through, but without a user scope
 * — RLS policies that require a user will deny-by-default.
 */
async function runInUserContext(
  request: NextRequest,
): Promise<Response> {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  if (!userId) return handler(request);

  return userContext.run({ userId, userEmail }, () => handler(request));
}

export async function GET(request: NextRequest) {
  return runInUserContext(request);
}

export async function POST(request: NextRequest) {
  return runInUserContext(request);
}
