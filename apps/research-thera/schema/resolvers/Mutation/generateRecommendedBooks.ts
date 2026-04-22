import type { MutationResolvers } from "./../../types.generated";
import { runGraphAndWait } from "@/src/lib/langgraph-client";

type BookResult = {
  id: number;
  goalId: number | null;
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

  const goalId = args.goalId;

  // All generation + DB persistence happens inside the Python books_graph.
  const result = (await runGraphAndWait("books", {
    input: { goal_id: goalId, user_email: userEmail },
  })) as BooksGraphResponse;

  return {
    success: Boolean(result.success),
    message: result.message ?? "",
    books: result.books ?? [],
  };
};
