import { generateDeepSeek } from "@/lib/deepseek";
import { SuggestedCompetitorsSchema, type SuggestedCompetitor } from "./schemas";

const DISCOVER_PROMPT = `You are a B2B market analyst. Given a seed product, return exactly 5 direct competitors as JSON.

A direct competitor:
- Serves the same buyer, use case, and job-to-be-done
- Is a live, revenue-generating product (not a concept)
- Has a public marketing website with pricing and features

Return STRICT JSON only — no prose, no code fences:
{"competitors":[{"name":"Company","url":"https://company.com"},...]}

URLs must be the official marketing homepage (https, no tracking params).`;

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    if (first >= 0 && last > first) {
      return JSON.parse(candidate.slice(first, last + 1));
    }
    throw new Error(`Could not parse JSON from LLM output: ${candidate.slice(0, 200)}`);
  }
}

export async function suggestCompetitors(
  productName: string,
  productUrl: string,
): Promise<SuggestedCompetitor[]> {
  const prompt = `${DISCOVER_PROMPT}\n\nSeed product: ${productName}\nSeed URL: ${productUrl}\n\nList 5 direct competitors as JSON.`;

  const raw = await generateDeepSeek({
    promptText: prompt,
    promptType: "text",
    temperature: 0.2,
    max_tokens: 1024,
  });

  const parsed = SuggestedCompetitorsSchema.parse(extractJson(raw));
  return parsed.competitors.slice(0, 5);
}
