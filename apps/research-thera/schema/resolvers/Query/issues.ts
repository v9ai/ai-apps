import type { QueryResolvers } from "./../../types.generated";
import { getIssuesForFamilyMember, getContactFeedback } from "@/src/db";

export const issues: NonNullable<QueryResolvers['issues']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  // First, try to get issues from the issues table
  const issues = await getIssuesForFamilyMember(
    args.familyMemberId,
    args.feedbackId ?? undefined,
    userEmail,
  );

  // If issues table has data, return it
  if (issues.length > 0) {
    return issues.map((issue) => ({
      id: issue.id,
      feedbackId: issue.feedbackId,
      familyMemberId: issue.familyMemberId,
      createdBy: issue.userId,
      title: issue.title,
      description: issue.description,
      category: issue.category,
      severity: issue.severity,
      recommendations: issue.recommendations,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
    })) as any;
  }

  // Fallback: If no issues in table and feedbackId is provided, try to get from legacy extracted_issues field
  if (args.feedbackId) {
    try {
      const feedback = await getContactFeedback(args.feedbackId, userEmail);
      if (feedback?.extractedIssues && Array.isArray(feedback.extractedIssues)) {
        // Map legacy JSON field to Issue format
        return feedback.extractedIssues.map((legacyIssue: any, index: number) => ({
          id: args.feedbackId! * 1000 + index, // Generate synthetic ID
          feedbackId: args.feedbackId!,
          familyMemberId: feedback.familyMemberId,
          createdBy: feedback.userId,
          title: legacyIssue.title || "Unknown Issue",
          description: legacyIssue.description || "",
          category: legacyIssue.category || "other",
          severity: legacyIssue.severity || "low",
          recommendations: legacyIssue.recommendations || null,
          createdAt: feedback.createdAt,
          updatedAt: feedback.updatedAt,
        }));
      }
    } catch {
      // Ignore errors when trying to fetch fallback data
    }
  }

  return [];
};
