import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  suggestCategorization,
  generateSubtaskBreakdown,
} from "@/lib/ai/qwen";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, description, type } = await request.json();
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

  try {
    if (type === "subtasks") {
      const subtasks = await generateSubtaskBreakdown(title, description);
      return NextResponse.json({ subtasks });
    }

    const categorization = await suggestCategorization(title, description);
    return NextResponse.json(categorization);
  } catch {
    return NextResponse.json(
      { error: "Failed to generate suggestion" },
      { status: 500 }
    );
  }
}
