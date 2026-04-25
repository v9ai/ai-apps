/**
 * Fire the bogdan_discussion LangGraph end-to-end without going through the UI.
 *
 *   pnpm trigger:bogdan                                   # hits prod by default
 *   BOGDAN_TRIGGER_URL=http://localhost:2024 pnpm trigger:bogdan
 *   BOGDAN_USER_EMAIL=other@x.y pnpm trigger:bogdan
 *
 * Note: this intentionally does NOT read LANGGRAPH_URL — that var points at the
 * local backend in .env.local for the Next.js dev server, and we don't want the
 * trigger to silently target localhost.
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { runGraphAndWait } from "../src/lib/langgraph-client";

const PROD_LANGGRAPH_URL = "https://research-thera-langgraph.eeeew.workers.dev";
const USER_EMAIL = process.env.BOGDAN_USER_EMAIL || "nicolai.vadim@gmail.com";
const LANGGRAPH_URL = (process.env.BOGDAN_TRIGGER_URL || PROD_LANGGRAPH_URL).trim();

const SCORE_LABEL: Record<string, string> = {
  romanianFluency: "fluență",
  actionability: "acțiune",
  citationCoverage: "surse",
  ageAppropriateness: "vârstă",
  internalConsistency: "coerență",
  microScriptDepth: "mini-dialog",
};

async function main() {
  if (!process.env.NEON_DATABASE_URL) {
    console.error("NEON_DATABASE_URL not set in .env.local");
    process.exit(1);
  }

  const sql = neon(process.env.NEON_DATABASE_URL);

  const fmRows = (await sql(
    `SELECT id FROM family_members WHERE user_id = $1 AND LOWER(first_name) = 'bogdan' LIMIT 1`,
    [USER_EMAIL],
  )) as Array<{ id: number }>;

  if (fmRows.length === 0) {
    console.error(`No family_member named "Bogdan" found for user ${USER_EMAIL}.`);
    process.exit(1);
  }
  const familyMemberId = fmRows[0].id;

  console.log(
    `→ Triggering bogdan_discussion at ${LANGGRAPH_URL}\n` +
      `  user: ${USER_EMAIL}  family_member_id: ${familyMemberId}`,
  );
  const t0 = Date.now();

  const result = (await runGraphAndWait(
    "bogdan_discussion",
    {
      input: {
        family_member_id: familyMemberId,
        user_email: USER_EMAIL,
        is_ro: true,
      },
    },
    LANGGRAPH_URL,
  )) as { success?: boolean; message?: string; error?: string };

  const elapsedSec = ((Date.now() - t0) / 1000).toFixed(1);

  if (result.error || result.success === false) {
    console.error(`✗ Graph failed (${elapsedSec}s): ${result.error || result.message}`);
    process.exit(1);
  }

  // Read back the freshly persisted row
  const guideRows = (await sql(
    `SELECT
       id,
       created_at,
       jsonb_array_length(citations::jsonb) AS n_citations,
       critique::json -> 'scores' AS scores,
       talking_points::jsonb AS talking_points
     FROM bogdan_discussion_guides
     WHERE user_id = $1 AND family_member_id = $2
     ORDER BY id DESC
     LIMIT 1`,
    [USER_EMAIL, familyMemberId],
  )) as Array<{
    id: number;
    created_at: string;
    n_citations: number;
    scores: Record<string, number> | null;
    talking_points: Array<Record<string, unknown>>;
  }>;

  if (guideRows.length === 0) {
    console.error(`✗ Graph reported success but no row was persisted.`);
    process.exit(1);
  }
  const g = guideRows[0];

  const tps = Array.isArray(g.talking_points) ? g.talking_points : [];
  const microFull = tps.filter((t) => {
    const m = (t as { microScript?: { parentOpener?: string; childResponse?: string; parentFollowUp?: string } }).microScript;
    return Boolean(m && m.parentOpener && m.childResponse && m.parentFollowUp);
  }).length;

  const firstOpener = (tps[0] as { microScript?: { parentOpener?: string } } | undefined)?.microScript?.parentOpener;

  console.log(`✓ guide #${g.id} (${g.created_at})  in ${elapsedSec}s`);

  if (g.scores) {
    const vals = Object.values(g.scores).filter((v) => typeof v === "number") as number[];
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const breakdown = Object.entries(g.scores)
      .map(([k, v]) => `${SCORE_LABEL[k] ?? k} ${v}`)
      .join("  ");
    console.log(`  calitate: ${avg.toFixed(1)}/10  ${breakdown}`);
  } else {
    console.log("  calitate: (no critique persisted)");
  }

  console.log(`  citations: ${g.n_citations}`);
  console.log(`  microScripts: ${microFull}/${tps.length} talking points`);
  if (firstOpener) {
    console.log(`  opener: "${firstOpener}"`);
  }
  console.log(`\nView: https://researchthera.com/discussions`);
}

main().catch((err) => {
  console.error("✗ Fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
