import { getDriver } from "./client";

export type CaseNode = {
  citation: string;
  court: string;
  jurisdiction: string;
  decision_date: string;
  holding: string;
  status: "good_law" | "overruled" | "distinguished" | "superseded";
};

export type StatuteNode = {
  citation: string;
  title: string;
  version: string;
  enacted: string;
  amended?: string;
  sunset?: string;
};

// Upsert case into knowledge graph
export async function upsertCase(caseNode: CaseNode) {
  const session = getDriver().session();
  try {
    await session.run(
      `MERGE (c:Case {citation: $citation})
       SET c += $props`,
      { citation: caseNode.citation, props: caseNode },
    );
  } finally {
    await session.close();
  }
}

// Upsert statute
export async function upsertStatute(statute: StatuteNode) {
  const session = getDriver().session();
  try {
    await session.run(
      `MERGE (s:Statute {citation: $citation})
       SET s += $props`,
      { citation: statute.citation, props: statute },
    );
  } finally {
    await session.close();
  }
}

// Create case-interprets-statute relationship
export async function createInterpretation(caseCitation: string, statuteCitation: string, date: string, type: string) {
  const session = getDriver().session();
  try {
    await session.run(
      `MATCH (c:Case {citation: $caseCitation}), (s:Statute {citation: $statuteCitation})
       CREATE (c)-[:INTERPRETS {date: $date, interpretation_type: $type}]->(s)`,
      { caseCitation, statuteCitation, date, type },
    );
  } finally {
    await session.close();
  }
}

// Get precedent network for a case
export async function getPrecedentNetwork(citation: string, depth: number = 2) {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `MATCH path = (c:Case {citation: $citation})-[*1..${depth}]-(related)
       RETURN path`,
      { citation },
    );
    return result.records;
  } finally {
    await session.close();
  }
}
