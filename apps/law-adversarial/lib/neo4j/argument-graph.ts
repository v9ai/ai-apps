import { getDriver } from "./client";

// Types
export type ClaimNode = {
  id: string;
  text: string;
  strength: number;
  confidence: number;
  jurisdiction?: string;
  source_agent: "attacker" | "defender" | "judge";
  round: number;
  session_id: string;
};

export type EvidenceNode = {
  id: string;
  text: string;
  type: "documentary" | "testimonial" | "statistical";
  citation_ref?: string;
  verified: boolean;
  confidence: number;
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

// Create claim
export async function createClaim(claim: Omit<ClaimNode, "id">): Promise<string> {
  const session = getDriver().session();
  const id = crypto.randomUUID();
  try {
    await session.run(
      `CREATE (c:Claim $props) RETURN c.id`,
      { props: { id, ...claim } },
    );
    return id;
  } finally {
    await session.close();
  }
}

// Create evidence
export async function createEvidence(evidence: Omit<EvidenceNode, "id">): Promise<string> {
  const session = getDriver().session();
  const id = crypto.randomUUID();
  try {
    await session.run(
      `CREATE (e:Evidence $props) RETURN e.id`,
      { props: { id, ...evidence } },
    );
    return id;
  } finally {
    await session.close();
  }
}

// Create attack relationship
export async function createAttack(fromId: string, toId: string, edge: AttackEdge) {
  const session = getDriver().session();
  try {
    await session.run(
      `MATCH (a {id: $fromId}), (b {id: $toId})
       CREATE (a)-[:ATTACKS $props]->(b)`,
      { fromId, toId, props: edge },
    );
  } finally {
    await session.close();
  }
}

// Create support relationship
export async function createSupport(fromId: string, toId: string, edge: SupportEdge) {
  const session = getDriver().session();
  try {
    await session.run(
      `MATCH (a {id: $fromId}), (b {id: $toId})
       CREATE (a)-[:SUPPORTS $props]->(b)`,
      { fromId, toId, props: edge },
    );
  } finally {
    await session.close();
  }
}

// Get full argument graph for a session
export async function getArgumentGraph(sessionId: string) {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `MATCH (n {session_id: $sessionId})
       OPTIONAL MATCH (n)-[r]->(m {session_id: $sessionId})
       RETURN n, r, m`,
      { sessionId },
    );
    return result.records;
  } finally {
    await session.close();
  }
}

// Delete argument graph for a session
export async function deleteArgumentGraph(sessionId: string) {
  const session = getDriver().session();
  try {
    await session.run(
      `MATCH (n {session_id: $sessionId}) DETACH DELETE n`,
      { sessionId },
    );
  } finally {
    await session.close();
  }
}
