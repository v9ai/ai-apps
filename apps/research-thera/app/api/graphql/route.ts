import { ApolloServer, ApolloServerPlugin } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { typeDefs } from "../../../schema/typeDefs.generated";
import { resolvers } from "../../../schema/resolvers.generated";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { GraphQLContext } from "../../apollo/context";
import { auth } from "@/app/lib/auth/server";
import { VAULT_COOKIE_NAME, verifyVaultToken } from "@/src/lib/vault-session";

const vaultCookiePlugin: ApolloServerPlugin<GraphQLContext> = {
  async requestDidStart() {
    return {
      async willSendResponse({ contextValue, response }) {
        if (contextValue.pendingVaultCookie && response.http) {
          response.http.headers.set("set-cookie", contextValue.pendingVaultCookie);
        }
      },
    };
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });
const apolloServer = new ApolloServer<GraphQLContext>({
  schema,
  plugins: [vaultCookiePlugin],
  allowBatchedHttpRequests: true,
});

const handler = startServerAndCreateNextHandler<NextRequest, GraphQLContext>(
  apolloServer,
  {
    context: async () => {
      const { data: session } = await auth.getSession();
      const userId = session?.user?.id;
      let vaultUnlocked = false;
      if (userId) {
        try {
          const cookieStore = await cookies();
          const token = cookieStore.get(VAULT_COOKIE_NAME)?.value;
          if (token) vaultUnlocked = verifyVaultToken(token, userId);
        } catch {
          vaultUnlocked = false;
        }
      }
      return {
        userId,
        userEmail: session?.user?.email,
        userName: session?.user?.name ?? undefined,
        vaultUnlocked,
      };
    },
  },
);

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
