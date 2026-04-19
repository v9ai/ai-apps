import type { MutationResolvers } from "./../../types.generated";
import { db, insertRecommendedBooks } from "@/src/db";
import {
  listTherapyResearch,
  getFamilyMember,
  getIssuesForFamilyMember,
} from "@/src/db";
import { generateObject } from "@/src/lib/deepseek";
import { isSexTherapyGoal, withRo } from "@/src/lib/ro";
import { z } from "zod";

export const generateRecommendedBooks: NonNullable<MutationResolvers['generateRecommendedBooks']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const goalId = args.goalId;
  const goal = await db.getGoal(goalId, userEmail);

  // Build goal context
  const contextText = [
    `Goal: ${goal.title}`,
    goal.description ? `Description: ${goal.description}` : "",
  ].filter(Boolean).join("\n");

  // Build family member context
  let familyContextText = "";
  if (goal.familyMemberId) {
    const [member, allIssues] = await Promise.all([
      getFamilyMember(goal.familyMemberId),
      getIssuesForFamilyMember(goal.familyMemberId, undefined, userEmail),
    ]);

    const sections: string[] = [];
    if (member) {
      const parts = [`**${member.firstName}${member.name ? ` ${member.name}` : ""}**`];
      if (member.ageYears) parts.push(`Age: ${member.ageYears}`);
      if (member.relationship) parts.push(`Relationship: ${member.relationship}`);
      if (member.bio) parts.push(`Bio: ${member.bio}`);
      sections.push(`### Person Profile\n${parts.join(" | ")}`);
    }
    if (allIssues.length > 0) {
      const issueLines = allIssues.slice(0, 10).map((i: { title: string; severity: string; category: string; description: string }) =>
        `- **${i.title}** [${i.severity}/${i.category}]: ${i.description.slice(0, 150)}`
      );
      sections.push(`### Known Issues (${allIssues.length})\n${issueLines.join("\n")}`);
    }
    if (sections.length > 0) {
      familyContextText = `\n## Family Context\n${sections.join("\n\n")}`;
    }
  }

  // Fetch research
  const research = await listTherapyResearch(goalId);
  if (!research.length) {
    return {
      success: false,
      message: "No research found. Generate research first before recommending books.",
      books: [],
    };
  }

  // Build research summary
  const researchSummary = research
    .slice(0, 10)
    .map((r, i) => {
      const kf = r.keyFindings.slice(0, 3).join("; ");
      const tt = r.therapeuticTechniques.slice(0, 3).join("; ");
      return [
        `[${i + 1}] "${r.title}"`,
        r.abstract ? `  Abstract: ${r.abstract.slice(0, 200)}` : "",
        kf ? `  Key findings: ${kf}` : "",
        tt ? `  Techniques: ${tt}` : "",
        r.evidenceLevel ? `  Evidence: ${r.evidenceLevel}` : "",
      ].filter(Boolean).join("\n");
    })
    .join("\n\n");

  const bookSchema = z.object({
    books: z.array(z.object({
      title: z.string().describe("Exact book title"),
      authors: z.array(z.string()).describe("Author full names"),
      year: z.number().optional().describe("Publication year"),
      isbn: z.string().optional().describe("ISBN-13 if known"),
      description: z.string().describe("Brief description of the book's content and therapeutic approach"),
      whyRecommended: z.string().describe("Personalized rationale linking this book to the goal, research findings, and family context"),
      category: z.enum(["parenting", "therapy", "self-help", "child development", "education", "psychology", "neuroscience"]).describe("Book category"),
    })).min(3).max(8),
  });

  const prompt = [
    `You are a clinical bibliotherapist. Based on the therapeutic goal, family context, and academic research papers below, recommend 4-6 real, published books that would be most helpful.`,
    ``,
    `## Therapeutic Goal`,
    contextText,
    familyContextText,
    ``,
    `## Research Papers (for grounding)`,
    researchSummary,
    ``,
    `## Instructions`,
    `Recommend 4-6 books that:`,
    `- Are REAL, well-known published books (do NOT invent titles)`,
    `- Cover diverse categories (mix of parenting guides, therapy workbooks, psychology, child development)`,
    `- Are directly relevant to the therapeutic goal and research findings`,
    `- Would be accessible and practical for a parent or caregiver`,
    `- Range from introductory to advanced where appropriate`,
    ``,
    `For each book:`,
    `- Provide the exact title and author(s)`,
    `- Write a brief description of the book's content`,
    `- Write a personalized "why recommended" rationale that connects the book to this specific goal, the research evidence, and the family member's context`,
    `- Classify into one category`,
    ``,
    `Prioritize evidence-based, well-reviewed books from recognized experts in the field.`,
  ].join("\n");

  const isRo = await isSexTherapyGoal({ goalId });

  const { object } = await generateObject({
    schema: bookSchema,
    prompt: withRo(prompt, isRo),
  });

  const saved = await insertRecommendedBooks(
    object.books.map((b) => ({
      goalId,
      title: b.title,
      authors: b.authors,
      year: b.year,
      isbn: b.isbn,
      description: b.description,
      whyRecommended: b.whyRecommended,
      category: b.category,
    })),
  );

  return {
    success: true,
    message: `Recommended ${saved.length} books based on ${research.length} research papers.`,
    books: saved,
  };
};
