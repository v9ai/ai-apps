import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const psychScreens: NonNullable<QueryResolvers["psychScreens"]> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const screens = await db.listPsychScreens(userEmail, args.familyMemberId ?? undefined);
  return screens as any;
};
