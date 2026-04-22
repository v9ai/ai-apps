import type { MutationResolvers } from "./../../types.generated";
import { getUserSettings, upsertUserSettings } from "@/src/db";

export const updateUserSettings: NonNullable<MutationResolvers['updateUserSettings']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const existing = await getUserSettings(userEmail);
  const settings = await upsertUserSettings(
    userEmail,
    args.storyLanguage,
    args.storyMinutes ?? existing.storyMinutes,
  );

  return {
    userId: settings.userId,
    storyLanguage: settings.storyLanguage,
    storyMinutes: settings.storyMinutes,
  };
};
