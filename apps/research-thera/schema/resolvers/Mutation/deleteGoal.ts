import type { MutationResolvers } from "./../../types.generated";
import { d1 } from "@/src/db";

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
  await d1.execute({
    sql: `DELETE FROM notes_claims WHERE note_id IN (SELECT id FROM notes WHERE entity_id = ? AND entity_type = 'Goal')`,
    args: [args.id],
  });

  // 2. Delete research links
  await d1.execute({
    sql: `DELETE FROM notes_research WHERE note_id IN (SELECT id FROM notes WHERE entity_id = ? AND entity_type = 'Goal')`,
    args: [args.id],
  });

  // 3. Delete notes
  await d1.execute({
    sql: `DELETE FROM notes WHERE entity_id = ? AND entity_type = 'Goal' AND user_id = ?`,
    args: [args.id, userEmail],
  });

  // 4. Delete therapeutic questions
  await d1.execute({
    sql: `DELETE FROM therapeutic_questions WHERE goal_id = ?`,
    args: [args.id],
  });

  // 5. Delete therapy research
  await d1.execute({
    sql: `DELETE FROM therapy_research WHERE goal_id = ?`,
    args: [args.id],
  });

  // 6. Delete text segments
  await d1.execute({
    sql: `DELETE FROM text_segments WHERE goal_id = ?`,
    args: [args.id],
  });

  // 7. Delete audio assets
  await d1.execute({
    sql: `DELETE FROM audio_assets WHERE goal_id = ?`,
    args: [args.id],
  });

  // 8. Delete goal stories
  await d1.execute({
    sql: `DELETE FROM goal_stories WHERE goal_id = ?`,
    args: [args.id],
  });

  // 9. Delete generation jobs
  await d1.execute({
    sql: `DELETE FROM generation_jobs WHERE goal_id = ?`,
    args: [args.id],
  });

  // 10. Finally, delete the goal itself
  await d1.execute({
    sql: `DELETE FROM goals WHERE id = ? AND user_id = ?`,
    args: [args.id, userEmail],
  });

  return {
    success: true,
    message: "Goal and all associated data deleted successfully",
  };
};
