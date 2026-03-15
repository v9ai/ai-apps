import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import * as d1Tools from "@/src/db/index";

export const runtime = "nodejs";

const DASHSCOPE_BASE = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const QWEN_MODEL = "qwen-plus";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;
  if (!userEmail) {
    return NextResponse.json({ error: "User email not found" }, { status: 401 });
  }

  const { noteIds, entityId, entityType } = await request.json();
  if (!noteIds?.length || !entityId || !entityType) {
    return NextResponse.json(
      { error: "noteIds, entityId, and entityType required" },
      { status: 400 },
    );
  }

  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "DASHSCOPE_API_KEY not configured" },
      { status: 500 },
    );
  }

  // Fetch all notes.
  const notes = await d1Tools.listNotesForEntity(
    entityId,
    entityType,
    userEmail,
  );

  const selected = notes.filter((n: { id: number }) =>
    noteIds.includes(n.id),
  );

  if (selected.length < 2) {
    return NextResponse.json(
      { error: "Need at least 2 notes to merge" },
      { status: 400 },
    );
  }

  // Build the prompt with all note contents.
  const noteSections = selected
    .map(
      (n: { id: number; title: string | null; content: string; tags: string[] }, i: number) =>
        `## Note ${i + 1}: ${n.title || "Untitled"}\n\n${n.content}`,
    )
    .join("\n\n---\n\n");

  const systemPrompt = `You are a clinical research synthesiser. You merge multiple research notes into a single comprehensive, well-structured document. Rules:
- Write in Markdown
- Deduplicate overlapping information
- Preserve all unique findings, tools, and recommendations
- Use clear section headings
- Keep evidence ratings and psychometric data intact
- Add a "Sources Merged" section at the end listing the original note titles
- Be comprehensive but avoid redundancy
- Write in the same language as the input notes`;

  const userPrompt = `Merge the following ${selected.length} research notes into one comprehensive document:\n\n${noteSections}`;

  // Call Qwen via DashScope.
  const response = await fetch(`${DASHSCOPE_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: QWEN_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 8192,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[merge-notes] Qwen API error:", response.status, errorBody);
    return NextResponse.json(
      { error: `Qwen API error: ${response.status}` },
      { status: 502 },
    );
  }

  const result = await response.json();
  const mergedContent = result.choices?.[0]?.message?.content;

  if (!mergedContent) {
    return NextResponse.json(
      { error: "No content returned from Qwen" },
      { status: 502 },
    );
  }

  // Create the merged note.
  const mergedTitle = `Merged Research: ${selected.map((n: { title: string | null }) => n.title || "Untitled").join(" + ")}`;
  const mergedTags = [
    "deep-research",
    "merged",
    ...new Set(
      selected.flatMap((n: { tags: string[] }) => n.tags || []),
    ),
  ];

  const noteId = await d1Tools.createNote({
    entityId,
    entityType,
    userId: userEmail,
    content: mergedContent,
    noteType: "DEEP_RESEARCH_MERGED",
    createdBy: userEmail,
    tags: mergedTags,
  });

  // Update the title (createNote doesn't accept title directly).
  await d1Tools.updateNote(noteId, userEmail, { title: mergedTitle });

  return NextResponse.json({
    success: true,
    noteId,
    title: mergedTitle,
    contentLength: mergedContent.length,
    model: result.model,
    usage: result.usage,
  });
}
