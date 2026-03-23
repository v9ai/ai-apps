import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import * as path from "node:path";

const LANGGRAPH_DIR = path.resolve(process.cwd(), "langgraph");
const PYTHON_BIN = path.join(LANGGRAPH_DIR, ".venv", "bin", "python");

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { recipientName, recipientRole, postText, postUrl, recipientEmail, tone } = body;

  if (!recipientEmail || !postText) {
    return NextResponse.json(
      { error: "recipientEmail and postText are required" },
      { status: 400 },
    );
  }

  const input = JSON.stringify({
    recipient_name: recipientName || "",
    recipient_role: recipientRole || "",
    post_text: (postText || "").slice(0, 2000),
    post_url: postUrl || "",
    recipient_email: recipientEmail,
    tone: tone || "professional and friendly",
  });

  return new Promise<NextResponse>((resolve) => {
    const child = spawn(
      PYTHON_BIN,
      ["-m", "cli", "email-outreach", "--json-input"],
      {
        cwd: LANGGRAPH_DIR,
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 55_000,
      },
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.stdin.write(input);
    child.stdin.end();

    child.on("close", (code) => {
      if (code !== 0) {
        console.error("[email-outreach] stderr:", stderr.slice(-500));
        resolve(
          NextResponse.json(
            { error: `Pipeline failed (exit ${code})` },
            { status: 500 },
          ),
        );
        return;
      }
      try {
        const result = JSON.parse(stdout.trim());
        resolve(NextResponse.json(result));
      } catch {
        console.error("[email-outreach] Invalid JSON stdout:", stdout.slice(0, 500));
        resolve(
          NextResponse.json(
            { error: "Failed to parse pipeline output" },
            { status: 500 },
          ),
        );
      }
    });

    child.on("error", (err) => {
      resolve(
        NextResponse.json(
          { error: `Spawn error: ${err.message}` },
          { status: 500 },
        ),
      );
    });
  });
}
