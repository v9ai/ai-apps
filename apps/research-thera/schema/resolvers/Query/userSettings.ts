import type { QueryResolvers } from "./../../types.generated";
import { getUserSettings } from "@/src/db";

export const userSettings: NonNullable<QueryResolvers['userSettings']> = async (
  _parent,
  _args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const settings = await getUserSettings(userEmail);

  return {
    userId: settings.userId,
    storyLanguage: settings.storyLanguage,
    storyMinutes: settings.storyMinutes,
  };
};
