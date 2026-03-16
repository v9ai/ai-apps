import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth/server";
import { spawn } from "child_process";
import path from "path";
import * as d1Tools from "@/src/db/index";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email;
  if (!userEmail) {
    return NextResponse.json({ error: "User email not found" }, { status: 401 });
  }

  const { issueId } = await request.json();
  if (!issueId) {
    return NextResponse.json(
      { error: "issueId required" },
      { status: 400 },
    );
  }

  const issue = await d1Tools.getIssue(issueId, userEmail);
  if (!issue) {
    return NextResponse.json(
      { error: "Issue not found" },
      { status: 404 },
    );
  }

  const fm = await d1Tools.getFamilyMember(issue.familyMemberId);

  const inputJson = JSON.stringify({
    id: issue.id,
    title: issue.title,
    description: issue.description,
    category: issue.category,
    severity: issue.severity,
    ageYears: fm?.ageYears,
    recommendations: issue.recommendations,
    familyMemberName: fm?.firstName,
  });

  const binaryPath =
    process.env.RESEARCH_BINARY_PATH ||
    path.resolve(
      process.cwd(),
      "../../crates/research/target/release/issue-research",
    );

  // Spawn binary in background.
  const proc = spawn(binaryPath, [], {
    stdio: ["pipe", "pipe", "pipe"],
    env: process.env,
  });

  let stdout = "";
  let stderr = "";
  proc.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
  proc.stderr.on("data", (d: Buffer) => {
    stderr += d.toString();
    // Log progress to server console
    process.stderr.write(d);
  });

  proc.stdin.write(inputJson);
  proc.stdin.end();

  proc.on("close", async (code) => {
    try {
      if (code === 0 && stdout.trim()) {
        const output = JSON.parse(stdout.trim());

        // Create synthesis note linked to the issue.
        const noteId = await d1Tools.createNote({
          entityId: issueId,
          entityType: "issue",
          userId: userEmail,
          content: output.synthesis,
          noteType: "DEEP_RESEARCH_SYNTHESIS",
          createdBy: userEmail,
          tags: ["deep-research", "synthesis"],
        });

        // Set the note title.
        await d1Tools.updateNote(noteId, userEmail, { title: `Research Synthesis: ${issue.title}` });

        // Store per-agent findings as separate notes.
        for (const finding of output.findings) {
          const fNoteId = await d1Tools.createNote({
            entityId: issueId,
            entityType: "issue",
            userId: userEmail,
            content: finding.content,
            noteType: "DEEP_RESEARCH_FINDING",
            createdBy: userEmail,
            tags: ["deep-research", finding.subject],
          });
          await d1Tools.updateNote(fNoteId, userEmail, {
            title: `Research: ${finding.subject.replace(/-/g, " ")}`,
          });
        }

        console.log(
          `[deep-research] Done: ${output.findings.length} findings + synthesis for issue ${issueId}`,
        );
      } else {
        console.error(
          `[deep-research] Binary exited ${code}: ${stderr.slice(-500)}`,
        );
      }
    } catch (err) {
      console.error("[deep-research] Error processing results:", err);
    }
  });

  proc.on("error", (err) => {
    console.error("[deep-research] Failed to spawn binary:", err.message);
  });

  return NextResponse.json({
    success: true,
    message: `Deep research started for "${issue.title}". Results will appear as notes in 5-10 minutes.`,
  });
}

export async function GET(request: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email;
  if (!userEmail) {
    return NextResponse.json({ error: "User email not found" }, { status: 401 });
  }

  const issueId = request.nextUrl.searchParams.get("issueId");
  if (!issueId) {
    return NextResponse.json(
      { error: "issueId required" },
      { status: 400 },
    );
  }

  // Check for existing synthesis notes.
  const notes = await d1Tools.listNotesForEntity(
    parseInt(issueId, 10),
    "issue",
    userEmail,
  );

  const synthesisNote = notes.find(
    (n: { noteType: string | null }) =>
      n.noteType === "DEEP_RESEARCH_SYNTHESIS",
  );

  return NextResponse.json({
    hasSynthesis: !!synthesisNote,
    synthesisNote: synthesisNote || null,
  });
}
