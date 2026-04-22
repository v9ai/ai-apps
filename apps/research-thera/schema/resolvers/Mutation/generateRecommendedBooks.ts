import type { MutationResolvers } from "./../../types.generated";
import { runGraphAndWait } from "@/src/lib/langgraph-client";

type BookResult = {
  id: number;
  goalId: number | null;
  journalEntryId: number | null;
  title: string;
  authors: string[];
  year: number | null;
  isbn: string | null;
  description: string;
  whyRecommended: string;
  category: string;
  amazonUrl: string | null;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
};

type BooksGraphResponse = {
  success?: boolean;
  message?: string;
  books?: BookResult[];
};

export const generateRecommendedBooks: NonNullable<MutationResolvers['generateRecommendedBooks']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const { goalId, journalEntryId } = args;
  if (!goalId && !journalEntryId) {
    return {
      success: false,
      message: "goalId or journalEntryId is required",
      books: [],
    };
  }

  const input: Record<string, unknown> = { user_email: userEmail };
  if (goalId) input.goal_id = goalId;
  if (journalEntryId) input.journal_entry_id = journalEntryId;

  const result = (await runGraphAndWait("books", { input })) as BooksGraphResponse;

  return {
    success: Boolean(result.success),
    message: result.message ?? "",
    books: result.books ?? [],
  };
};
