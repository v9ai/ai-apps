import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest } from "next/server";
import { typeDefs } from "../../../schema/typeDefs.generated";
import { resolvers } from "../../../schema/resolvers.generated";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { GraphQLContext } from "../../apollo/context";
import { auth, currentUser } from "@clerk/nextjs/server";

const schema = makeExecutableSchema({ typeDefs, resolvers });
const apolloServer = new ApolloServer<GraphQLContext>({ schema });

const handler = startServerAndCreateNextHandler<NextRequest, GraphQLContext>(
  apolloServer,
  {
    context: async (req) => {
      const { userId } = await auth();

      let userEmail: string | undefined;
      if (userId) {
        try {
          const user = await currentUser();
          userEmail = user?.emailAddresses[0]?.emailAddress;
        } catch (error) {
          console.error("Error getting current user:", error);
        }
      }

      return {
        userId: userId || undefined,
        userEmail,
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
