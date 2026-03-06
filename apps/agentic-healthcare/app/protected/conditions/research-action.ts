"use server";

import { createClient } from "@/lib/supabase/server";
import { qwen } from "@/lib/embeddings";
import {
  searchBulk,
  getPaper,
  PAPER_FIELDS_FULL,
} from "@/lib/semantic-scholar";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type PaperRecord = {
  paper_id: string;
  title: string;
  year: number | null;
  citation_count: number | null;
  abstract: string | null;
  tldr: string | null;
  url: string | null;
  authors: string[];
};

export async function runConditionResearch(conditionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // 1. Fetch condition
  const { data: condition, error: condErr } = await supabase
    .from("conditions")
    .select("id, user_id, name, notes")
    .eq("id", conditionId)
    .single();

  if (condErr || !condition) throw new Error("Condition not found");
  if (condition.user_id !== user.id) throw new Error("Unauthorized");

  // 2. Generate enhanced search query via Qwen
  let searchQuery: string;
  try {
    const queryResp = await qwen.chat({
      model: "qwen-plus",
      messages: [
        {
          role: "system",
          content:
            "Generate a concise academic search query for Semantic Scholar. Return ONLY the query text, nothing else.",
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

  // 3. Search Semantic Scholar
  const scholarKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
  const bulk = await searchBulk(searchQuery, {
    year: "2019-",
    minCitationCount: 3,
    sort: "citationCount:desc",
    limit: 15,
    apiKey: scholarKey,
  });

  if (bulk.data.length === 0) {
    throw new Error(`No papers found for: ${searchQuery}`);
  }

  // 4. Get TLDR details for top 3 papers
  const topIds = bulk.data
    .slice(0, 3)
    .map((p) => p.paperId)
    .filter(Boolean) as string[];

  const detailed = await Promise.allSettled(
    topIds.map((id) => getPaper(id, { fields: PAPER_FIELDS_FULL, apiKey: scholarKey }))
  );

  const detailedPapers = detailed
    .filter(
      (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof getPaper>>> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value);

  // 5. Build paper records
  const paperRecords: PaperRecord[] = bulk.data.slice(0, 15).map((p) => {
    const dp = detailedPapers.find((d) => d.paperId === p.paperId);
    return {
      paper_id: p.paperId ?? "",
      title: p.title ?? "",
      year: p.year ?? null,
      citation_count: p.citationCount ?? null,
      abstract: p.abstract ?? null,
      tldr: dp?.tldr?.text ?? null,
      url: p.url ?? null,
      authors: (p.authors ?? []).map((a) => a.name).filter(Boolean) as string[],
    };
  });

  // 6. Build paper context for synthesis
  const paperText = paperRecords
    .map((pr, i) => {
      const lines = [
        `### Paper ${i + 1} — ${pr.title} (${pr.year ?? "n/a"})`,
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

  // 7. Generate unified synthesis via Qwen
  const synthResp = await qwen.chat({
    model: "qwen-plus",
    messages: [
      {
        role: "system",
        content:
          "You are a medical research synthesizer. Given a health condition and " +
          "relevant academic papers, produce a clear, evidence-based synthesis that: " +
          "(1) summarizes the key findings across papers, " +
          "(2) identifies consensus and disagreements, " +
          "(3) highlights practical clinical implications, " +
          "(4) notes gaps in the research. " +
          "Write for a knowledgeable but non-specialist audience. Use Markdown.",
      },
      {
        role: "user",
        content: `Condition: ${condition.name}${notesSection}\n\nAcademic papers found (${paperRecords.length} total):\n\n${paperText}\n\nPlease synthesize the research findings for this condition.`,
      },
    ],
    temperature: 0.3,
    max_completion_tokens: 4096,
  });

  const synthesis =
    synthResp.choices[0]?.message.content ?? "Synthesis generation failed.";

  // 8. Upsert to condition_researches
  const { error: upsertErr } = await supabase
    .from("condition_researches")
    .upsert(
      {
        condition_id: condition.id,
        user_id: user.id,
        papers: paperRecords,
        synthesis,
        paper_count: paperRecords.length,
        search_query: searchQuery,
      },
      { onConflict: "condition_id" }
    );

  if (upsertErr) throw new Error(`Failed to save research: ${upsertErr.message}`);

  revalidatePath(`/protected/conditions/${conditionId}`);
}
