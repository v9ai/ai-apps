"use server";

import { createClient } from "@/lib/supabase/server";
import { qwen } from "@/lib/embeddings";
import {
  searchAllApis,
  getPaper,
  PAPER_FIELDS_FULL,
  type ResearchPaperRecord,
} from "@/lib/semantic-scholar";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

  // 3. Search all research APIs in parallel (Semantic Scholar, OpenAlex, Crossref, CORE)
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

  // 4. Get TLDRs for top 3 Semantic Scholar papers
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

  // Enrich records with TLDRs
  const enriched: ResearchPaperRecord[] = paperRecords.map((p) => ({
    ...p,
    tldr: tldrs.get(p.paper_id) ?? p.tldr,
  }));

  // 5. Build paper context for synthesis
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

  // 6. Generate unified synthesis via Qwen
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

  // 7. Upsert to condition_researches
  const { error: upsertErr } = await supabase
    .from("condition_researches")
    .upsert(
      {
        condition_id: condition.id,
        user_id: user.id,
        papers: enriched,
        synthesis,
        paper_count: enriched.length,
        search_query: searchQuery,
      },
      { onConflict: "condition_id" }
    );

  if (upsertErr) throw new Error(`Failed to save research: ${upsertErr.message}`);

  revalidatePath(`/protected/conditions/${conditionId}`);
}
