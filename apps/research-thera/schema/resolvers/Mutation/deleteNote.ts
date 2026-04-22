import type { MutationResolvers } from "./../../types.generated";
import { sql as neonSql } from "@/src/db/neon";

export const deleteNote: NonNullable<MutationResolvers['deleteNote']> = async (
  _parent,
  args,
  ctx,
) => {
  const userId = ctx.userId;
  if (!userId) {
    throw new Error("Authentication required");
  }

  // Delete associated claim card links first
  await neonSql`DELETE FROM notes_claims WHERE note_id = ${args.id}`;

  // Delete research links
  await neonSql`DELETE FROM notes_research WHERE note_id = ${args.id}`;

  // Delete the note itself
  await neonSql`DELETE FROM notes WHERE id = ${args.id} AND user_id = ${userId}`;

  return {
    success: true,
    message: "Note deleted successfully",
  };
};
