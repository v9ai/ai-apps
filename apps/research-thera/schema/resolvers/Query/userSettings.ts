import type { QueryResolvers } from "./../../types.generated";
import { getUserSettings } from "@/src/db";

export const userSettings: NonNullable<QueryResolvers['userSettings']> = async (
  _parent,
  _args,
  ctx,
) => {
  const userId = ctx.userId;
  if (!userId) {
    throw new Error("Authentication required");
  }

  const settings = await getUserSettings(userId);

  return {
    userId: settings.userId,
    storyLanguage: settings.storyLanguage,
    storyMinutes: settings.storyMinutes,
  };
};
