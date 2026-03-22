import type { MutationResolvers } from "./../../types.generated";
import { runGraphAndWait } from "@/src/lib/langgraph-client";

export const generateParentAdvice: NonNullable<MutationResolvers['generateParentAdvice']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const { goalId } = args;
  const language = args.language ?? "English";

  try {
    const result = await runGraphAndWait("parent_advice", {
      input: {
        goal_id: goalId,
        user_email: userEmail,
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
