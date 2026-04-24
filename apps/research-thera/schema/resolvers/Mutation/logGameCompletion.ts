import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const logGameCompletion: NonNullable<MutationResolvers['logGameCompletion']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const { input } = args;

  // Verify the game exists and is accessible.
  const g = await db.getGame(input.gameId, userEmail);
  if (!g) throw new Error("Game not found");

  // If this is a JOURNAL_PROMPT with writeToNote enabled, create a note and link it.
  let linkedNoteId = input.linkedNoteId ?? null;
  if (!linkedNoteId && g.type === "JOURNAL_PROMPT" && input.responses) {
    try {
      const parsed = JSON.parse(g.content) as { prompts?: string[]; writeToNote?: boolean };
      if (parsed.writeToNote) {
        const noteContent = `# ${g.title}\n\n${input.responses}`;
        const noteId = await db.createNote({
          entityId: g.id,
          entityType: "game",
          userId: userEmail,
          content: noteContent,
          noteType: "journal",
          createdBy: userEmail,
          tags: ["game", "journal"],
        });
        linkedNoteId = noteId;
      }
    } catch {
      // content wasn't JSON or note creation failed — proceed without note link.
    }
  }

  const id = await db.logGameCompletion({
    gameId: input.gameId,
    userId: userEmail,
    durationSeconds: input.durationSeconds ?? null,
    responses: input.responses ?? null,
    linkedNoteId,
  });

  const completions = await db.listGameCompletions(input.gameId, userEmail);
  const completion = completions.find((c) => c.id === id);
  if (!completion) throw new Error("Completion not found after creation");

  return completion;
};
