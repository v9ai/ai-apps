import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const addCondition: NonNullable<MutationResolvers['addCondition']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const name = args.input.name.trim();
  if (!name) throw new Error("Condition name is required");
  const notes = args.input.notes?.trim() || null;

  const condition = await db.createCondition({ userId: userEmail, name, notes });

  // Embedding is non-blocking — log and continue if it fails
  try {
    await db.embedCondition(condition.id, userEmail, name, notes);
  } catch (err) {
    console.error("[addCondition] embedding failed:", err);
  }

  return condition;
};
