import type { MutationResolvers } from "./../../types.generated";
import { deleteIssueScreenshot as _deleteIssueScreenshot } from "@/src/db";
import { deleteFromR2 } from "@ai-apps/r2";

const SCREENSHOTS_BUCKET = "longform-tts";

export const deleteIssueScreenshot: NonNullable<MutationResolvers['deleteIssueScreenshot']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const r2Key = await _deleteIssueScreenshot(args.id, userEmail);

  if (r2Key) {
    try {
      await deleteFromR2(r2Key, { bucket: SCREENSHOTS_BUCKET });
    } catch (err) {
      console.error("Failed to delete screenshot from R2:", err);
    }
  }

  return { success: true };
};
