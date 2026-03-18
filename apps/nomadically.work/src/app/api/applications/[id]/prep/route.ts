import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import * as path from "node:path";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { eq } from "drizzle-orm";

const LANGGRAPH_DIR = path.resolve(process.cwd(), "langgraph");

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const appId = Number(id);
  if (isNaN(appId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const [app] = await db
    .select({
      id: applications.id,
      job_description: applications.job_description,
    })
    .from(applications)
    .where(eq(applications.id, appId));

  if (!app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  if (!app.job_description) {
    return NextResponse.json(
      { error: "Application has no job description — add one first" },
      { status: 400 },
    );
  }

  // Spawn the Python pipeline in background (fire-and-forget)
  const child = spawn(
    path.join(LANGGRAPH_DIR, ".venv", "bin", "python"),
    ["-m", "cli", "app-prep", "--app-id", String(appId), "--save"],
    {
      cwd: LANGGRAPH_DIR,
      detached: true,
      stdio: "ignore",
    },
  );
  child.unref();

  return NextResponse.json({ status: "started", appId });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const appId = Number(id);
  if (isNaN(appId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const [app] = await db
    .select({
      ai_interview_questions: applications.ai_interview_questions,
      ai_tech_stack: applications.ai_tech_stack,
    })
    .from(applications)
    .where(eq(applications.id, appId));

  if (!app) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ready: !!(app.ai_interview_questions && app.ai_tech_stack),
    hasInterview: !!app.ai_interview_questions,
    hasTech: !!app.ai_tech_stack,
  });
}
