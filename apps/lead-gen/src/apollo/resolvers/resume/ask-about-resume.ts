import { eq } from "drizzle-orm";
import { resumes } from "@/db/schema";
import type { GraphQLContext } from "../../context";
import { resumeChat } from "@/lib/langgraph-client";

export async function askAboutResume(
  _parent: any,
  args: { email: string; question: string },
  context: GraphQLContext,
) {
  if (!context.userId) {
    throw new Error("Unauthorized");
  }

  const { question } = args;

  // Check resume exists
  const rows = await context.db
    .select({ raw_text: resumes.raw_text })
    .from(resumes)
    .where(eq(resumes.user_id, context.userId))
    .limit(1);

  if (rows.length === 0 || !rows[0].raw_text?.trim()) {
    throw new Error("No resume found. Please upload your resume first.");
  }

  const result = await resumeChat(context.userId, question);

  return { answer: result.answer, context_count: 1, trace_id: null };
}
