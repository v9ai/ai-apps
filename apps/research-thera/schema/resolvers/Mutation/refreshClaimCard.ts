import type { MutationResolvers } from "../../types.generated";
import { GraphQLError } from "graphql";
import { claimCardsTools } from "../../../src/tools/claim-cards.tools";
import { getNoteById } from "@/src/db";
import { sql as neonSql } from "@/src/db/neon";

export const refreshClaimCard: NonNullable<MutationResolvers['refreshClaimCard']> = async (_parent, { id }, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }

  const existing = await claimCardsTools.getClaimCard(id);
  if (!existing) {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  // Resolve parent note id from the underlying row (ClaimCard type omits it).
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
  if (noteId == null) {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  const note = await getNoteById(noteId, userEmail);
  if (!note) {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  const refreshed = await claimCardsTools.refreshClaimCard(existing, {
    perSourceLimit: 15,
    topK: 8,
    useLlmJudge: true,
  });

  await claimCardsTools.saveClaimCard(refreshed);
  return refreshed as any;
};
