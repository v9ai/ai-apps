import type { NoteResolvers } from "./../types.generated";
import { d1Tools } from "@/src/db";
import { createD1StorageAdapter } from "@/src/adapters/d1-storage.adapter";

export const Note: NoteResolvers = {
  linkedResearch: async (parent, _args, _ctx) => {
    const research = await d1Tools.getResearchForNote(parent.id);
    return research;
  },

  claimCards: async (parent, _args, _ctx) => {
    const storage = createD1StorageAdapter();
    const cards = await storage.getCardsForItem?.(parent.id);
    return (cards || []) as any;
  },

  goal: async (parent, _args, _ctx) => {
    // Only fetch goal if the note is linked to a Goal entity
    if (parent.entityType !== "Goal") {
      return null;
    }

    try {
      const goal = await d1Tools.getGoal(parent.entityId, parent.createdBy);
      return {
        ...goal,
        notes: [],
        research: [],
        questions: [],
        stories: [],
        userStories: [],
      } as any;
    } catch (error) {
      // Goal not found or user doesn't have access
      return null;
    }
  },

  shares: async (parent, _args, ctx) => {
    const userEmail = ctx.userEmail;

    // Only return shares if viewer is the owner
    if (!userEmail || userEmail !== parent.createdBy) {
      return [];
    }

    const shares = await d1Tools.getNoteShares(parent.id);
    return shares.map((share) => ({
      noteId: share.noteId,
      email: share.email,
      role: (share.role as "READER" | "EDITOR") || "READER",
      createdBy: share.createdBy,
      createdAt: share.createdAt,
    }));
  },

  viewerAccess: async (parent, _args, ctx) => {
    const userEmail = ctx.userEmail;

    const access = await d1Tools.canViewerReadNote(
      parent.id,
      userEmail || null,
    );

    return {
      canRead: access.canRead,
      canEdit: access.canEdit,
      reason: access.reason || null,
    };
  },
};
