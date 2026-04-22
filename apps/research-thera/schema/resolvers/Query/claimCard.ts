import type { QueryResolvers } from "../../types.generated";
import { GraphQLError } from "graphql";
import { claimCardsTools } from "../../../src/tools/claim-cards.tools";
import { getNoteById } from "@/src/db";
import { sql as neonSql } from "@/src/db/neon";

export const claimCard: NonNullable<QueryResolvers['claimCard']> = async (
  _parent,
  { id },
  ctx,
) => {
  const userId = ctx.userId;
  if (!userId) {
    throw new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }

  const card = await claimCardsTools.getClaimCard(id);
  if (!card) return null;

  // Resolve the parent note id from the underlying row and verify the
  // caller owns that note. Orphan cards (no linked note) are treated as
  // not visible.
  const rows = await neonSql`
    SELECT cc.note_id AS direct_note_id, nc.note_id AS linked_note_id
    FROM claim_cards cc
    LEFT JOIN notes_claims nc ON nc.claim_id = cc.id
    WHERE cc.id = ${id}
    LIMIT 1
  `;
  const noteId =
    (rows[0]?.direct_note_id as number | null | undefined) ??
    (rows[0]?.linked_note_id as number | null | undefined) ??
    null;
  if (noteId == null) return null;

  const note = await getNoteById(noteId, userId);
  if (!note) return null;

  return card as any;
};
