import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import * as path from "node:path";
import { auth } from "@/lib/auth";
import { db } from "@/src/db";
import { applications } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function whereApp(id: string, userId: string) {
  const col = UUID_RE.test(id) ? applications.id : applications.slug;
  return and(eq(col, id), eq(applications.userId, userId));
}

const BACKEND_DIR = path.resolve(process.cwd(), "backend");

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [session, { id }] = await Promise.all([getSession(), params]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [app] = await db
    .select({
      id: applications.id,
      jobDescription: applications.jobDescription,
    })
    .from(applications)
    .where(whereApp(id, session.user.id));

  if (!app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  if (!app.jobDescription) {
    return NextResponse.json(
      { error: "Application has no job description — add one first" },
      { status: 400 },
    );
  }

  // Spawn the Python pipeline in background (fire-and-forget)
  const child = spawn(
    path.join(BACKEND_DIR, ".venv", "bin", "python"),
    ["-m", "graph.cli", "app-prep", "--app-id", id, "--save"],
    {
      cwd: BACKEND_DIR,
      detached: true,
      stdio: "ignore",
    },
  );
  child.unref();

  return NextResponse.json({ status: "started", appId: id });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [session, { id }] = await Promise.all([getSession(), params]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [app] = await db
    .select({
      aiInterviewQuestions: applications.aiInterviewQuestions,
      aiTechStack: applications.aiTechStack,
    })
    .from(applications)
    .where(whereApp(id, session.user.id));

  if (!app) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ready: !!(app.aiInterviewQuestions && app.aiTechStack),
    hasInterview: !!app.aiInterviewQuestions,
    hasTech: !!app.aiTechStack,
  });
}
