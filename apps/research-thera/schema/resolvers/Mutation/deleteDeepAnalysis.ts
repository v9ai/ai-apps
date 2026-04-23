import type { MutationResolvers } from "./../../types.generated";
import { deleteDeepAnalysis as deleteAnalysis } from "@/src/db";

export const deleteDeepAnalysis: NonNullable<MutationResolvers['deleteDeepAnalysis']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  await deleteAnalysis(args.id, userEmail);

  return { success: true, message: "Deep analysis deleted" };
};
