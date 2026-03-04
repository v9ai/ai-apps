import type { MutationResolvers } from "./../../types.generated";
import { getUserSettings, upsertUserSettings } from "@/src/db";

export const updateUserSettings: NonNullable<MutationResolvers['updateUserSettings']> = async (_parent, args, ctx) => {
  const userId = ctx.userId;
  if (!userId) {
    throw new Error("Authentication required");
  }

  const existing = await getUserSettings(userId);
  const settings = await upsertUserSettings(
    userId,
    args.storyLanguage,
    args.storyMinutes ?? existing.storyMinutes,
  );

  return {
    userId: settings.userId,
    storyLanguage: settings.storyLanguage,
    storyMinutes: settings.storyMinutes,
  };
};
