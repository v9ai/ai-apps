import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { spawn } from "child_process";
import path from "path";
import * as d1Tools from "@/src/db/index";
import { d1 } from "@/src/db/d1";

export const runtime = "nodejs";

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

  const { characteristicId } = await request.json();
  if (!characteristicId) {
    return NextResponse.json(
      { error: "characteristicId required" },
      { status: 400 },
    );
  }

  const characteristic = await d1Tools.getCharacteristic(
    characteristicId,
    userEmail,
  );
  if (!characteristic) {
    return NextResponse.json(
      { error: "Characteristic not found" },
      { status: 404 },
    );
  }

  const fm = await d1Tools.getFamilyMember(characteristic.familyMemberId);

  const inputJson = JSON.stringify({
    id: characteristic.id,
    title: characteristic.title,
    description: characteristic.description,
    category: characteristic.category,
    severity: characteristic.severity,
    ageYears: fm?.ageYears,
    tags: characteristic.tags,
    impairmentDomains: characteristic.impairmentDomains,
    externalizedName: characteristic.externalizedName,
    strengths: characteristic.strengths,
    familyMemberName: fm?.firstName,
  });

  const binaryPath =
    process.env.RESEARCH_BINARY_PATH ||
    path.resolve(
      process.cwd(),
      "../../crates/research/target/release/characteristic-research",
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

        // Create synthesis note linked to the characteristic.
        const noteId = await d1Tools.createNote({
          entityId: characteristicId,
          entityType: "characteristic",
          userId: userEmail,
          content: output.synthesis,
          noteType: "DEEP_RESEARCH_SYNTHESIS",
          createdBy: userEmail,
          tags: ["deep-research", "synthesis"],
        });

        // Set the note title.
        await d1.execute({
          sql: "UPDATE notes SET title = ? WHERE id = ?",
          args: [`Research Synthesis: ${characteristic.title}`, noteId],
        });

        // Store per-agent findings as separate notes.
        for (const finding of output.findings) {
          const fNoteId = await d1Tools.createNote({
            entityId: characteristicId,
            entityType: "characteristic",
            userId: userEmail,
            content: finding.content,
            noteType: "DEEP_RESEARCH_FINDING",
            createdBy: userEmail,
            tags: ["deep-research", finding.subject],
          });
          await d1.execute({
            sql: "UPDATE notes SET title = ? WHERE id = ?",
            args: [
              `Research: ${finding.subject.replace(/-/g, " ")}`,
              fNoteId,
            ],
          });
        }

        console.log(
          `[deep-research] Done: ${output.findings.length} findings + synthesis for characteristic ${characteristicId}`,
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
    message: `Deep research started for "${characteristic.title}". Results will appear as notes in 5-10 minutes.`,
  });
}

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;
  if (!userEmail) {
    return NextResponse.json({ error: "User email not found" }, { status: 401 });
  }

  const characteristicId = request.nextUrl.searchParams.get("characteristicId");
  if (!characteristicId) {
    return NextResponse.json(
      { error: "characteristicId required" },
      { status: 400 },
    );
  }

  // Check for existing synthesis notes.
  const notes = await d1Tools.listNotesForEntity(
    parseInt(characteristicId, 10),
    "characteristic",
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
