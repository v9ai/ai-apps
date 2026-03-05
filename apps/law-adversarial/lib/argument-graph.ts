import { createClient } from "@/lib/supabase/server";

export type ClaimNode = {
  text: string;
  strength: number;
  confidence: number;
  source_agent: "attacker" | "defender" | "judge";
  round: number;
  session_id: string;
};

export type AttackEdge = {
  strength: number;
  type: "undermine" | "undercut" | "rebut";
  created_by: string;
  round: number;
};

export type SupportEdge = {
  strength: number;
  type: "evidential" | "inferential" | "authoritative";
  created_by: string;
  round: number;
};

export async function createClaim(claim: ClaimNode): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("argument_graph_nodes")
    .insert({
      session_id: claim.session_id,
      text: claim.text,
      strength: claim.strength,
      confidence: claim.confidence,
      source_agent: claim.source_agent,
      round: claim.round,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function createAttack(
  sessionId: string,
  fromId: string,
  toId: string,
  edge: AttackEdge,
) {
  const supabase = await createClient();
  const { error } = await supabase.from("argument_graph_edges").insert({
    session_id: sessionId,
    source_id: fromId,
    target_id: toId,
    type: "ATTACKS",
    strength: edge.strength,
    edge_subtype: edge.type,
    created_by: edge.created_by,
    round: edge.round,
  });
  if (error) throw error;
}

export async function createSupport(
  sessionId: string,
  fromId: string,
  toId: string,
  edge: SupportEdge,
) {
  const supabase = await createClient();
  const { error } = await supabase.from("argument_graph_edges").insert({
    session_id: sessionId,
    source_id: fromId,
    target_id: toId,
    type: "SUPPORTS",
    strength: edge.strength,
    edge_subtype: edge.type,
    created_by: edge.created_by,
    round: edge.round,
  });
  if (error) throw error;
}

export async function getArgumentGraph(sessionId: string) {
  const supabase = await createClient();

  const [nodesResult, edgesResult] = await Promise.all([
    supabase
      .from("argument_graph_nodes")
      .select("id, text, strength, confidence, source_agent, round")
      .eq("session_id", sessionId),
    supabase
      .from("argument_graph_edges")
      .select("source_id, target_id, type, strength")
      .eq("session_id", sessionId),
  ]);

  const nodes = (nodesResult.data ?? []).map((n) => ({
    id: n.id,
    label: (n.text as string).slice(0, 80),
    group: n.source_agent,
    strength: n.strength,
  }));

  const links = (edgesResult.data ?? []).map((e) => ({
    source: e.source_id,
    target: e.target_id,
    type: e.type,
    strength: e.strength ?? 0.5,
  }));

  return { nodes, links };
}

export async function deleteArgumentGraph(sessionId: string) {
  const supabase = await createClient();
  // Edges cascade-delete with nodes, but explicit delete is faster
  await supabase
    .from("argument_graph_edges")
    .delete()
    .eq("session_id", sessionId);
  await supabase
    .from("argument_graph_nodes")
    .delete()
    .eq("session_id", sessionId);
}
