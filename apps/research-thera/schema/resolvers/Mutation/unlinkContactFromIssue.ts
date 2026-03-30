import type { MutationResolvers } from "./../../types.generated";
import { unlinkContactFromIssue as _unlinkContactFromIssue } from "@/src/db";

export const unlinkContactFromIssue: NonNullable<MutationResolvers['unlinkContactFromIssue']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  await _unlinkContactFromIssue(args.issueId, args.contactId, userEmail);

  return { success: true };
};
