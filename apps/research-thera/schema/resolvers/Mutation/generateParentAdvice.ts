import type { MutationResolvers } from "./../../types.generated";
import { GraphQLError } from "graphql";
import { getGoal } from "@/src/db";
import { runGraphAndWait } from "@/src/lib/langgraph-client";

export const generateParentAdvice: NonNullable<MutationResolvers['generateParentAdvice']> = async (_parent, args, ctx) => {
  const userId = ctx.userId;
  if (!userId) {
    throw new Error("Authentication required");
  }

  const { goalId } = args;
  const language = args.language ?? "English";

  // Verify goal ownership before forwarding to LangGraph.
  try {
    await getGoal(goalId, userId);
  } catch {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  try {
    const result = await runGraphAndWait("parent_advice", {
      input: {
        goal_id: goalId,
        user_email: userId,
        language,
      },
    });

    const error = result?.error as string | undefined;
    if (error) {
      return {
        success: false,
        message: error,
        parentAdvice: null,
      };
    }

    const advice = result?.advice as string | undefined;
    return {
      success: true,
      message: `Parent advice generated in ${language}.`,
      parentAdvice: advice ?? null,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to generate advice: ${err.message}`,
      parentAdvice: null,
    };
  }
};
