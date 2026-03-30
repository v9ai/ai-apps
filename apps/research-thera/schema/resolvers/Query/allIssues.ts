import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const allIssues: NonNullable<QueryResolvers['allIssues']> = async (
  _parent,
  _args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const issues = await db.getAllIssues(userEmail);

  return issues.map((issue) => ({
    ...issue,
    createdBy: issue.userId,
    feedback: null,
    journalEntry: null,
    familyMember: null,
    relatedFamilyMember: null,
    stories: [],
    questions: [],
    relatedIssues: [],
  })) as any;
};
