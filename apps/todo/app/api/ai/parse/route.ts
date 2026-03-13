import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { parseNaturalLanguageTask } from "@/lib/ai/qwen";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { input } = await request.json();
  if (!input || typeof input !== "string") {
    return NextResponse.json({ error: "Input required" }, { status: 400 });
  }

  try {
    const result = await parseNaturalLanguageTask(input);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to parse task" },
      { status: 500 }
    );
  }
}
