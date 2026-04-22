import type { QueryResolvers } from "../../types.generated";
import { GraphQLError } from "graphql";
import { claimCardsTools } from "../../../src/tools/claim-cards.tools";
import { getNoteById } from "@/src/db";

export const claimCardsForNote: NonNullable<QueryResolvers['claimCardsForNote']> = async (_parent, { noteId }, ctx) => {
  const userId = ctx.userId;
  if (!userId) {
    throw new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }

  const note = await getNoteById(noteId, userId);
  if (!note) {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  const cards = await claimCardsTools.getClaimCardsForNote(noteId);
  return cards as any;
};
