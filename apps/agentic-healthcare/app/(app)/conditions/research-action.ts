"use server";

import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { conditions, researches } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { qwen } from "@/lib/embeddings";
import {
  searchAllApis,
  getPaper,
  PAPER_FIELDS_FULL,
  type ResearchPaperRecord,
} from "@/lib/semantic-scholar";
import { revalidatePath } from "next/cache";

export async function runConditionResearch(conditionId: string) {
  const { userId } = await withAuth();

  const [condition] = await db
    .select()
    .from(conditions)
    .where(eq(conditions.id, conditionId));

  if (!condition) throw new Error("Condition not found");
  if (condition.userId !== userId) throw new Error("Unauthorized");

  // Generate enhanced search query via Qwen
  let searchQuery: string;
  try {
    const queryResp = await qwen.chat({
      model: "qwen-plus",
      messages: [
        {
          role: "system",
          content:
            "Generate a concise academic search query for finding medical research papers. Return ONLY the query text, nothing else.",
        },
        {
          role: "user",
          content: `Health condition: ${condition.name}${condition.notes ? `\nContext: ${condition.notes.slice(0, 200)}` : ""}`,
        },
      ],
      temperature: 0.3,
      max_completion_tokens: 100,
    });
    searchQuery =
      queryResp.choices[0]?.message.content?.trim() || condition.name;
  } catch {
    searchQuery = condition.name;
  }

  // Search all research APIs in parallel
  const scholarKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
  const coreKey = process.env.CORE_API_KEY;
  const mailto = process.env.OPENALEX_MAILTO;

  const paperRecords = await searchAllApis(searchQuery, {
    limit: 15,
    scholarApiKey: scholarKey,
    coreApiKey: coreKey,
    mailto,
  });

  if (paperRecords.length === 0) {
    throw new Error(`No papers found across any API for: ${searchQuery}`);
  }

  // Get TLDRs for top 3 Semantic Scholar papers
  const scholarIds = paperRecords
    .filter((p) => p.source === "SemanticScholar" && p.paper_id)
    .slice(0, 3)
    .map((p) => p.paper_id);

  const tldrs = new Map<string, string>();
  const detailed = await Promise.allSettled(
    scholarIds.map((id) =>
      getPaper(id, { fields: PAPER_FIELDS_FULL, apiKey: scholarKey })
    )
  );
  for (const r of detailed) {
    if (r.status === "fulfilled" && r.value.tldr?.text && r.value.paperId) {
      tldrs.set(r.value.paperId, r.value.tldr.text);
    }
  }

  const enriched: ResearchPaperRecord[] = paperRecords.map((p) => ({
    ...p,
    tldr: tldrs.get(p.paper_id) ?? p.tldr,
  }));

  // Build paper context for synthesis
  const paperText = enriched
    .map((pr, i) => {
      const lines = [
        `### Paper ${i + 1} — ${pr.title} (${pr.year ?? "n/a"}) [${pr.source}]`,
        `Citations: ${pr.citation_count ?? 0}`,
      ];
      if (pr.tldr) lines.push(`TLDR: ${pr.tldr}`);
      if (pr.abstract) lines.push(`Abstract: ${pr.abstract.slice(0, 500)}`);
      return lines.join("\n");
    })
    .join("\n\n");

  const notesSection = condition.notes
    ? `\n\nPatient notes: ${condition.notes}`
    : "";

  // Generate synthesis via Qwen
  const synthResp = await qwen.chat({
    model: "qwen-plus",
    messages: [
      {
        role: "system",
        content:
          "You are a medical research synthesizer. Given a health condition and " +
          "relevant academic papers from multiple sources (Semantic Scholar, OpenAlex, Crossref, CORE), " +
          "produce a clear, evidence-based synthesis that: " +
          "(1) summarizes the key findings across papers, " +
          "(2) identifies consensus and disagreements, " +
          "(3) highlights practical clinical implications, " +
          "(4) notes gaps in the research. " +
          "Write for a knowledgeable but non-specialist audience. Use Markdown.",
      },
      {
        role: "user",
        content: `Condition: ${condition.name}${notesSection}\n\nAcademic papers found (${enriched.length} total, from multiple databases):\n\n${paperText}\n\nPlease synthesize the research findings for this condition.`,
      },
    ],
    temperature: 0.3,
    max_completion_tokens: 4096,
  });

  const synthesis =
    synthResp.choices[0]?.message.content ?? "Synthesis generation failed.";

  // Check for existing condition research
  const [existing] = await db
    .select({ id: researches.id })
    .from(researches)
    .where(and(eq(researches.type, "condition"), eq(researches.entityId, condition.id)));

  if (existing) {
    await db
      .update(researches)
      .set({
        papers: enriched,
        synthesis,
        paperCount: String(enriched.length),
        searchQuery,
        updatedAt: sql`now()`,
      })
      .where(eq(researches.id, existing.id));
  } else {
    await db.insert(researches).values({
      userId,
      type: "condition",
      entityId: condition.id,
      papers: enriched,
      synthesis,
      paperCount: String(enriched.length),
      searchQuery,
    });
  }

  revalidatePath(`/conditions/${conditionId}`);
}
