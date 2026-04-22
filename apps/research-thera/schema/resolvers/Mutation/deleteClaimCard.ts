import type { MutationResolvers } from "../../types.generated";
import { GraphQLError } from "graphql";
import { claimCardsTools } from "../../../src/tools/claim-cards.tools";
import { getNoteById } from "@/src/db";
import { sql as neonSql } from "@/src/db/neon";

export const deleteClaimCard: NonNullable<MutationResolvers['deleteClaimCard']> = async (_parent, { id }, ctx) => {
  const userId = ctx.userId;
  if (!userId) {
    throw new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }

  // Resolve the parent note id. The ClaimCard type doesn't expose it, so
  // read `note_id` (and any linked rows in `notes_claims`) directly.
  const rows = await neonSql`
    SELECT cc.note_id AS direct_note_id, nc.note_id AS linked_note_id
    FROM claim_cards cc
    LEFT JOIN notes_claims nc ON nc.claim_id = cc.id
    WHERE cc.id = ${id}
    LIMIT 1
  `;
  if (rows.length === 0) {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }
  const noteId =
    (rows[0].direct_note_id as number | null) ??
    (rows[0].linked_note_id as number | null);
  if (noteId == null) {
    // Orphan card with no parent note — treat as not found for this caller.
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  const note = await getNoteById(noteId, userId);
  if (!note) {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  await claimCardsTools.deleteClaimCard(id);
  return true;
};
