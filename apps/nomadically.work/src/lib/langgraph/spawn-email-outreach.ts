import { spawn } from "node:child_process";
import * as path from "node:path";

const LANGGRAPH_DIR = path.resolve(process.cwd(), "langgraph");
const PYTHON_BIN = path.join(LANGGRAPH_DIR, ".venv", "bin", "python");

export interface EmailOutreachInput {
  recipientName: string;
  recipientRole?: string;
  postText: string;
  postUrl?: string;
  recipientEmail: string;
  tone?: string;
}

export interface EmailOutreachResult {
  subject: string;
  html: string;
  text: string;
}

export function spawnEmailOutreach(
  input: EmailOutreachInput,
): Promise<EmailOutreachResult> {
  const stdinJson = JSON.stringify({
    recipient_name: input.recipientName || "",
    recipient_role: input.recipientRole || "",
    post_text: (input.postText || "").slice(0, 2000),
    post_url: input.postUrl || "",
    recipient_email: input.recipientEmail,
    tone: input.tone || "professional and friendly",
  });

  return new Promise((resolve, reject) => {
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

    child.stdin.write(stdinJson);
    child.stdin.end();

    child.on("close", (code) => {
      if (code !== 0) {
        console.error("[email-outreach] stderr:", stderr.slice(-500));
        reject(new Error(`Pipeline failed (exit ${code})`));
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()) as EmailOutreachResult);
      } catch {
        console.error(
          "[email-outreach] Invalid JSON stdout:",
          stdout.slice(0, 500),
        );
        reject(new Error("Failed to parse pipeline output"));
      }
    });

    child.on("error", (err) => {
      reject(new Error(`Spawn error: ${err.message}`));
    });
  });
}
