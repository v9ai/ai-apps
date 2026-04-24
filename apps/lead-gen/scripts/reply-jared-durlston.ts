#!/usr/bin/env npx tsx
/**
 * One-off: cold reply to Jared (Durlston Partners) re: AI roles in UAE / London.
 * Dry-run by default. Pass --send to actually fire via Resend.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { Resend } from "resend";
import { FROM } from "@/lib/email/cpn-followup";

const TO = "jared@durlstonpartners.com";

const subject = "Agentic systems in production — AI engineer, remote-only";

const text = `Hi Jared,

Saw your post on the AI roles — the stack you listed (agentic systems, LangGraph, MCP, Deep Research-style agents, LoRA/SFT/DPO) is exactly what I'm building day to day, so figured I'd reach out directly.

What I'm shipping: a B2B lead-gen platform running multi-agent workflows on live data — LangGraph graphs for email compose/reply/outreach, MCP-wired tools over a Neon Postgres catalog, ReAct-style deep research squads that debate competing hypotheses before producing a GO/NO-GO verdict. Not notebooks — actual users, actual inboxes, actual production traffic.

On the post-training side: local Qwen teachers via mlx_lm.server, LoRA distillation for contact scoring, MLX embeddings hitting ~4.6k docs/sec on an M1. Comfortable going from data collection through SFT/DPO to a served endpoint.

One hard constraint: I'm remote-only, globally. I know most of what you listed is UAE or London on-site — if any of the seven support fully remote, I'd love to hear which. If none do, no hard feelings, appreciate you reading this far.

Best,
Vadim Nicolai
contact@vadim.blog
vadim.blog`;

async function main() {
  const send = process.argv.includes("--send");

  console.log(`\nFrom:    ${FROM}`);
  console.log(`To:      ${TO}`);
  console.log(`Subject: ${subject}`);
  console.log(`\n${text}\n`);

  if (!send) {
    console.log("(dry-run — pass --send to actually send)");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: FROM,
    to: TO,
    subject,
    text,
  });

  if (result.error) {
    console.error(`Failed: ${result.error.message}`);
    process.exit(1);
  }

  console.log(`Sent (resend_id=${result.data?.id ?? ""}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
