import { createClient } from "@/lib/supabase/server";
import { runStressTest } from "@/lib/agents/orchestrator";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: stressSession } = await supabase
    .from("stress_test_sessions")
    .select("id, status")
    .eq("id", id)
    .single();

  if (!stressSession) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (stressSession.status !== "pending") {
    return NextResponse.json(
      { error: "Session already started or completed" },
      { status: 409 },
    );
  }

  // Kick off in background (fire-and-forget)
  runStressTest(id).catch((err) => {
    console.error(`Stress test failed for session ${id}:`, err);
  });

  return NextResponse.json({ status: "started" }, { status: 202 });
}
