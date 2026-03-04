import type { MutationResolvers } from "../../types.generated";
import { d1Tools, d1 } from "@/src/db";
import { buildClaimCardsFromItem } from "@/src/tools/generic-claim-cards.tools";
import { createDeepSeekAdapters } from "@/src/adapters/deepseek.adapter";
import { createResearchSourceResolver } from "@/src/adapters/research-resolver.adapter";
import { createD1StorageAdapter } from "@/src/adapters/d1-storage.adapter";
import type { LinkedSourceRef } from "@/src/tools/generic-claim-cards.tools";

export const checkNoteClaims: NonNullable<MutationResolvers['checkNoteClaims']> = async (_parent, { input }, _ctx) => {
  const {
    noteId,
    maxClaims = 12,
    maxSourcesToResolve = 120,
    evidenceTopK = 8,
    useJudge = true,
    sources,
  } = input;

  try {
    // 1. Fetch the note
    const noteResult = await d1.execute({
      sql: `SELECT * FROM notes WHERE id = ?`,
      args: [noteId],
    });

    if (noteResult.rows.length === 0) {
      return {
        success: false,
        message: `Note ${noteId} not found`,
        cards: [],
        noteId,
      };
    }

    const noteRow = noteResult.rows[0];
    const note = {
      id: noteRow.id as number,
      title: `Note ${noteRow.id}`,
      content: noteRow.content as string,
      tags: noteRow.tags ? JSON.parse(noteRow.tags as string) : [],
      createdAt: noteRow.created_at as string,
    };

    // 2. Fetch linked research papers
    const linkedResearch = await d1Tools.getResearchForNote(noteId);

    if (linkedResearch.length === 0) {
      return {
        success: false,
        message:
          "No linked research found for this note. Add research papers to enable claim checking.",
        cards: [],
        noteId,
      };
    }

    // 3. Convert research papers to LinkedSourceRef format
    const linkedSources: LinkedSourceRef[] = linkedResearch.map((r) => ({
      title: r.title,
      authors: Array.isArray(r.authors)
        ? r.authors
        : r.authors
          ? JSON.parse(r.authors as string)
          : [],
      year: r.year ?? undefined,
      url: r.url ?? undefined,
      doi: r.doi ?? undefined,
    }));

    // 4. Set up adapters
    const { extractor, judge } = createDeepSeekAdapters();
    const resolver = createResearchSourceResolver();
    const storage = createD1StorageAdapter();

    // Map GraphQL sources to resolution hints
    const resolutionHints = sources
      ? { sources: sources.map((s) => s.toLowerCase()) }
      : undefined;

    // 5. Build claim cards
    const cards = await buildClaimCardsFromItem(
      {
        id: noteId,
        title: note.title,
        tags: note.tags,
        createdAt: note.createdAt,
        summary: note.content.slice(0, 500), // First 500 chars as summary
      },
      linkedSources,
      {
        resolver,
        extractor,
        judge: useJudge ? judge : undefined,
        useJudge: useJudge ?? undefined,
        storage,
        maxClaims: maxClaims ?? undefined,
        maxSourcesToResolve: maxSourcesToResolve ?? undefined,
        evidenceTopK: evidenceTopK ?? undefined,
        resolutionHints,
      },
    );

    return {
      success: true,
      message: `Generated ${cards.length} claim cards for note ${noteId}`,
      cards: cards as any, // GraphQL type mapping
      noteId,
    };
  } catch (error) {
    console.error("Error checking note claims:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
      cards: [],
      noteId,
    };
  }
};
