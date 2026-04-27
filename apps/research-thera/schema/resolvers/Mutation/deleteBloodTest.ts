import type { MutationResolvers } from "./../../types.generated";
import { deleteBloodTestViaPython } from "@/src/lib/healthcare-backend";

export const deleteBloodTest: NonNullable<MutationResolvers['deleteBloodTest']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  // Python DELETE handles cascade: blood_markers + *_embeddings + R2 file
  await deleteBloodTestViaPython(args.id, userEmail);
  return { success: true };
};
