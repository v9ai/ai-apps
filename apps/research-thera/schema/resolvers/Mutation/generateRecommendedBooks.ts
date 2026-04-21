import type { MutationResolvers } from "./../../types.generated";
import { db, insertRecommendedBooks } from "@/src/db";
import {
  listTherapyResearch,
  getFamilyMember,
  getIssuesForFamilyMember,
} from "@/src/db";
import { generateObject } from "@/src/lib/deepseek";
import { isRoGoal, withRo } from "@/src/lib/ro";
import { z } from "zod";

const VALID_CATEGORIES = [
  "parenting",
  "therapy",
  "self-help",
  "child development",
  "education",
  "psychology",
  "neuroscience",
] as const;

const bookItemSchema = z.object({
  title: z.string(),
  authors: z.preprocess(
    (v) => {
      if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
      if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
      return [];
    },
    z.array(z.string()),
  ),
  year: z.preprocess((v) => {
    if (typeof v === "number") return v;
    if (typeof v === "string" && /^\d{4}$/.test(v)) return Number(v);
    return undefined;
  }, z.number().optional()),
  isbn: z.string().optional(),
  description: z.string().default(""),
  whyRecommended: z
    .string()
    .or(z.string().optional())
    .transform((v) => v ?? ""),
  category: z
    .string()
    .transform((v) => (VALID_CATEGORIES.includes(v as (typeof VALID_CATEGORIES)[number]) ? v : "self-help")),
});

// Accept the preferred `{books: [...]}` shape AND common variants DeepSeek
// sometimes emits (bare array, aliased key, single-object). The previous
// strict `z.object({books: z.array(...)})` rejected all of these and surfaced
// `invalid_type: books required`.
const BOOK_ARRAY_KEYS = ["books", "recommendations", "results", "items", "data"] as const;

function extractBooksArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    for (const key of BOOK_ARRAY_KEYS) {
      const val = obj[key];
      if (Array.isArray(val)) return val;
    }
    if (typeof obj.title === "string" && "authors" in obj) return [obj];
    for (const val of Object.values(obj)) {
      if (Array.isArray(val) && val.length && val[0] && typeof val[0] === "object") {
        return val;
      }
    }
  }
  return [];
}

const bookResponseSchema = z
  .unknown()
  .transform((raw) => ({ books: extractBooksArray(raw).slice(0, 8) }))
  .pipe(z.object({ books: z.array(bookItemSchema) }));

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

async function generateViaContainer(
  url: string,
  goalId: number,
  userEmail: string,
): Promise<{ success: boolean; message: string; books: BookResult[] } | null> {
  const resp = await fetch(`${url}/runs/wait`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      assistant_id: "books",
      input: { goal_id: goalId, user_email: userEmail },
    }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Books container failed (${resp.status}): ${text.slice(0, 300)}`);
  }
  const body = (await resp.json()) as {
    success?: boolean;
    message?: string;
    books?: BookResult[];
  };
  return {
    success: Boolean(body.success),
    message: body.message ?? "",
    books: body.books ?? [],
  };
}

export const generateRecommendedBooks: NonNullable<MutationResolvers['generateRecommendedBooks']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const goalId = args.goalId;

  // If a books-specific CF Container URL is configured, delegate to it.
  const containerUrl = process.env.LANGGRAPH_URL_BOOKS;
  if (containerUrl) {
    const result = await generateViaContainer(containerUrl, goalId, userEmail);
    if (result) return result;
  }

  const goal = await db.getGoal(goalId, userEmail);

  const contextText = [
    `Goal: ${goal.title}`,
    goal.description ? `Description: ${goal.description}` : "",
  ].filter(Boolean).join("\n");

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

  const research = await listTherapyResearch(goalId);
  if (!research.length) {
    return {
      success: false,
      message: "No research found. Generate research first before recommending books.",
      books: [],
    };
  }

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
    `- Classify into one category (parenting | therapy | self-help | child development | education | psychology | neuroscience)`,
    ``,
    `Prioritize evidence-based, well-reviewed books from recognized experts in the field.`,
    ``,
    `Respond with a JSON object of the exact shape {"books": [ {"title": "...", "authors": ["..."], "year": 2020, "isbn": "...", "description": "...", "whyRecommended": "...", "category": "..."}, ... ]}. The top-level key MUST be "books" and its value MUST be a JSON array.`,
  ].join("\n");

  const isRo = await isRoGoal({ userEmail, goalId });

  const { object } = await generateObject({
    schema: bookResponseSchema,
    prompt: withRo(prompt, isRo),
  });

  if (!object.books.length) {
    return {
      success: false,
      message: "DeepSeek returned no valid books. Please try again.",
      books: [],
    };
  }

  type ParsedBook = z.infer<typeof bookItemSchema>;
  const parsedBooks = object.books as ParsedBook[];
  const saved = await insertRecommendedBooks(
    parsedBooks.map((b) => ({
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
