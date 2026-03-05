import { createClient } from "@/lib/supabase/server";
import { getArgumentGraph } from "@/lib/neo4j/argument-graph";
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
    const records = await getArgumentGraph(id);

    const nodesMap = new Map<string, { id: string; label: string; group: string; strength?: number }>();
    const links: { source: string; target: string; type: string; strength: number }[] = [];

    for (const record of records) {
      const n = record.get("n");
      if (n) {
        const props = n.properties;
        nodesMap.set(props.id, {
          id: props.id,
          label: (props.text as string)?.slice(0, 80) || props.id,
          group: props.source_agent || (n.labels.includes("Evidence") ? "evidence" : "unknown"),
          strength: props.strength,
        });
      }

      const m = record.get("m");
      if (m) {
        const props = m.properties;
        nodesMap.set(props.id, {
          id: props.id,
          label: (props.text as string)?.slice(0, 80) || props.id,
          group: props.source_agent || (m.labels.includes("Evidence") ? "evidence" : "unknown"),
          strength: props.strength,
        });
      }

      const r = record.get("r");
      if (r && n && m) {
        links.push({
          source: n.properties.id,
          target: m.properties.id,
          type: r.type,
          strength: r.properties.strength ?? 0.5,
        });
      }
    }

    return NextResponse.json({
      nodes: Array.from(nodesMap.values()),
      links,
    });
  } catch {
    return NextResponse.json({ nodes: [], links: [] });
  }
}
