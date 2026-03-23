import { GraphQLContext } from "@/apollo/context";

export const promptResolvers = {
  Query: {
    prompt: async (
      _: any,
      {
        name,
      }: {
        name: string;
        version?: number;
        label?: string;
        resolveComposition?: boolean;
      },
      _context: GraphQLContext,
    ) => {
      // Prompt management removed (was backed by Langfuse)
      throw new Error(
        `Prompt "${name}" not available — remote prompt management has been removed.`,
      );
    },

    prompts: async (_: any, __: any, _context: GraphQLContext) => {
      return [];
    },

    myPromptUsage: async (
      _: any,
      _args: { limit?: number },
      _context: GraphQLContext,
    ) => {
      return [];
    },
  },

  Mutation: {
    createPrompt: async (
      _: any,
      { input }: { input: any },
      context: GraphQLContext,
    ) => {
      if (!context.userEmail) {
        throw new Error("Authentication required to create prompts");
      }
      throw new Error(
        "Prompt creation not available — remote prompt management has been removed.",
      );
    },

    updatePromptLabel: async (
      _: any,
      _args: { name: string; version: number; label: string },
      context: GraphQLContext,
    ) => {
      if (!context.userEmail) {
        throw new Error("Authentication required to update prompt labels");
      }
      throw new Error(
        "Prompt label updates not available — remote prompt management has been removed.",
      );
    },
  },
};
