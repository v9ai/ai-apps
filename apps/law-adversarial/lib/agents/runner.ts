import { deepseekClient, deepseekReasoner, qwenClient } from "./providers";
import { AttackerOutputSchema, DefenderOutputSchema, JudgeOutputSchema } from "./schemas";
import { buildAttackerPrompt, buildDefenderPrompt, buildJudgePrompt } from "./prompts";
import type { AttackerOutput, DefenderOutput, JudgeOutput, RoundContext } from "./types";
import type { DeepSeekClient } from "@repo/deepseek";

async function generateObject<T>(
  client: DeepSeekClient,
  prompt: string,
  schema: { parse: (v: unknown) => T },
): Promise<T> {
  const response = await client.chat({
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });
  const text = response.choices[0]?.message?.content ?? "{}";
  return schema.parse(JSON.parse(text));
}

export async function runAttacker(ctx: RoundContext): Promise<AttackerOutput> {
  return generateObject(deepseekReasoner, buildAttackerPrompt(ctx), AttackerOutputSchema);
}

export async function runDefender(
  ctx: RoundContext,
  attacks: AttackerOutput,
): Promise<DefenderOutput> {
  return generateObject(
    qwenClient,
    buildDefenderPrompt(ctx, JSON.stringify(attacks, null, 2)),
    DefenderOutputSchema,
  );
}

export async function runJudge(
  ctx: RoundContext,
  attacks: AttackerOutput,
  rebuttals: DefenderOutput,
): Promise<JudgeOutput> {
  return generateObject(
    deepseekClient,
    buildJudgePrompt(ctx, JSON.stringify(attacks, null, 2), JSON.stringify(rebuttals, null, 2)),
    JudgeOutputSchema,
  );
}
