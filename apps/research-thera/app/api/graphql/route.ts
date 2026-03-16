import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest } from "next/server";
import { typeDefs } from "../../../schema/typeDefs.generated";
import { resolvers } from "../../../schema/resolvers.generated";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { GraphQLContext } from "../../apollo/context";
import { auth } from "@/app/lib/auth/server";

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
