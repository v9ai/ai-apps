"use server";

import { sql } from "drizzle-orm";
import { db } from "@/src/db";
import { knowledgeStates } from "@/src/db/schema";
import { updateState, type KnowledgeState } from "@/lib/bkt";

/**
 * Update knowledge state for a user-concept pair after an interaction.
 *
 * Reads current state from DB, sends to BKT server for Bayesian update,
 * writes the new posterior back to DB.
 */
export async function trackKnowledgeMastery(
  userId: string,
  conceptId: string,
  isCorrect: boolean,
): Promise<{ pMastery: number; masteryLevel: string } | null> {
  try {
    // Read current state from DB
    const rows = await db.execute(
      sql`SELECT p_mastery, p_transit, p_slip, p_guess,
                 total_interactions, correct_interactions
          FROM knowledge_states
          WHERE user_id = ${userId}::uuid AND concept_id = ${conceptId}::uuid
          LIMIT 1`,
    );

    const row = rows.rows?.[0] as Record<string, unknown> | undefined;

    const current: KnowledgeState = row
      ? {
          p_mastery: (row.p_mastery as number) || 0.1,
          p_transit: (row.p_transit as number) || 0.1,
          p_slip: (row.p_slip as number) || 0.1,
          p_guess: (row.p_guess as number) || 0.2,
          total_interactions: (row.total_interactions as number) || 0,
          correct_interactions: (row.correct_interactions as number) || 0,
        }
      : {
          p_mastery: 0.1,
          p_transit: 0.1,
          p_slip: 0.1,
          p_guess: 0.2,
          total_interactions: 0,
          correct_interactions: 0,
        };

    // Call BKT server for Bayesian update
    const updated = await updateState(current, isCorrect);

    // Determine mastery level
    const level =
      updated.p_mastery >= 0.8
        ? "expert"
        : updated.p_mastery >= 0.6
          ? "proficient"
          : updated.p_mastery >= 0.4
            ? "intermediate"
            : updated.p_mastery >= 0.2
              ? "beginner"
              : "novice";

    // Upsert back to DB
    await db.execute(
      sql`INSERT INTO knowledge_states (user_id, concept_id, p_mastery, p_transit, p_slip, p_guess,
                                         total_interactions, correct_interactions, mastery_level,
                                         last_interaction_at, updated_at)
          VALUES (${userId}::uuid, ${conceptId}::uuid,
                  ${updated.p_mastery}, ${updated.p_transit}, ${updated.p_slip}, ${updated.p_guess},
                  ${updated.total_interactions}, ${updated.correct_interactions},
                  ${level}::mastery_level, now(), now())
          ON CONFLICT (user_id, concept_id)
          DO UPDATE SET
            p_mastery = ${updated.p_mastery},
            total_interactions = ${updated.total_interactions},
            correct_interactions = ${updated.correct_interactions},
            mastery_level = ${level}::mastery_level,
            last_interaction_at = now(),
            updated_at = now()`,
    );

    return { pMastery: updated.p_mastery, masteryLevel: level };
  } catch (error) {
    console.error("Knowledge tracing error:", error);
    return null;
  }
}

/**
 * Get a user's knowledge map — mastery across all concepts they've interacted with.
 */
export async function getUserKnowledgeMap(
  userId: string,
): Promise<
  { conceptId: string; pMastery: number; masteryLevel: string }[]
> {
  try {
    const rows = await db.execute(
      sql`SELECT concept_id, p_mastery, mastery_level
          FROM knowledge_states
          WHERE user_id = ${userId}::uuid
          ORDER BY p_mastery DESC`,
    );

    return (rows.rows ?? []).map((r: Record<string, unknown>) => ({
      conceptId: r.concept_id as string,
      pMastery: r.p_mastery as number,
      masteryLevel: r.mastery_level as string,
    }));
  } catch (error) {
    console.error("Knowledge map error:", error);
    return [];
  }
}
