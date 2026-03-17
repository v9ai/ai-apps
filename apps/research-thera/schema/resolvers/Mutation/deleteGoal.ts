import type { MutationResolvers } from "./../../types.generated";
import { sql as neonSql } from "@/src/db/neon";

export const deleteGoal: NonNullable<MutationResolvers['deleteGoal']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  // Delete all associated data
  // 1. Delete claim cards linked to notes for this goal
  await neonSql`DELETE FROM notes_claims WHERE note_id IN (SELECT id FROM notes WHERE entity_id = ${args.id} AND entity_type = 'Goal')`;

  // 2. Delete research links
  await neonSql`DELETE FROM notes_research WHERE note_id IN (SELECT id FROM notes WHERE entity_id = ${args.id} AND entity_type = 'Goal')`;

  // 3. Delete notes
  await neonSql`DELETE FROM notes WHERE entity_id = ${args.id} AND entity_type = 'Goal' AND user_id = ${userEmail}`;

  // 4. Delete therapeutic questions
  await neonSql`DELETE FROM therapeutic_questions WHERE goal_id = ${args.id}`;

  // 5. Delete therapy research
  await neonSql`DELETE FROM therapy_research WHERE goal_id = ${args.id}`;

  // 6. Delete text segments
  await neonSql`DELETE FROM text_segments WHERE goal_id = ${args.id}`;

  // 7. Delete audio assets
  await neonSql`DELETE FROM audio_assets WHERE goal_id = ${args.id}`;

  // 8. Delete stories
  await neonSql`DELETE FROM stories WHERE goal_id = ${args.id}`;

  // 9. Delete generation jobs
  await neonSql`DELETE FROM generation_jobs WHERE goal_id = ${args.id}`;

  // 10. Finally, delete the goal itself
  await neonSql`DELETE FROM goals WHERE id = ${args.id} AND user_id = ${userEmail}`;

  return {
    success: true,
    message: "Goal and all associated data deleted successfully",
  };
};
