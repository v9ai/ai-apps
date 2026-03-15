/**
 * Seed research_embeddings from therapy_research rows in Neon.
 *
 * Run: npx tsx scripts/seed-embeddings.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import OpenAI from "openai";

const sql = neon(process.env.NEON_DATABASE_URL!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function embed(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return res.data[0].embedding;
}

async function main() {
  const rows = await sql(
    `SELECT id, goal_id, title, abstract, key_findings, therapeutic_techniques
     FROM therapy_research
     ORDER BY id`,
  );

  console.log(`Seeding ${rows.length} therapy_research rows…`);

  let done = 0;
  for (const row of rows) {
    const keyFindings: string[] = Array.isArray(row.key_findings)
      ? row.key_findings
      : typeof row.key_findings === "string"
        ? JSON.parse(row.key_findings)
        : [];

    const techniques: string[] = Array.isArray(row.therapeutic_techniques)
      ? row.therapeutic_techniques
      : typeof row.therapeutic_techniques === "string"
        ? JSON.parse(row.therapeutic_techniques)
        : [];

    const content = [
      row.title ?? "",
      row.abstract ?? "",
      ...keyFindings,
      ...techniques,
    ]
      .filter(Boolean)
      .join("\n");

    const embedding = await embed(content);

    await sql(
      `INSERT INTO research_embeddings
         (goal_id, entity_type, entity_id, title, content, embedding, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (entity_type, entity_id) DO UPDATE
         SET title     = EXCLUDED.title,
             content   = EXCLUDED.content,
             embedding = EXCLUDED.embedding,
             metadata  = EXCLUDED.metadata,
             goal_id   = EXCLUDED.goal_id`,
      [
        row.goal_id ?? null,
        "TherapyResearch",
        row.id,
        row.title,
        content,
        JSON.stringify(embedding),
        JSON.stringify({ keyFindings, techniques }),
      ],
    );

    done++;
    if (done % 10 === 0) console.log(`  ${done}/${rows.length}`);
  }

  console.log(`Done — ${done} embeddings upserted.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
