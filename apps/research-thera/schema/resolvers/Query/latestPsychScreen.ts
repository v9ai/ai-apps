import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const latestPsychScreen: NonNullable<QueryResolvers["latestPsychScreen"]> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const screen = await db.getLatestPsychScreen(userEmail, args.familyMemberId ?? undefined);
  return (screen as any) ?? null;
};
