import { createClient } from "@/lib/supabase/server";
import { getArgumentGraph } from "@/lib/argument-graph";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: stressSession } = await supabase
    .from("stress_test_sessions")
    .select("id")
    .eq("id", id)
    .single();
  if (!stressSession) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const graph = await getArgumentGraph(id);
    return NextResponse.json(graph);
  } catch {
    return NextResponse.json({ nodes: [], links: [] });
  }
}
