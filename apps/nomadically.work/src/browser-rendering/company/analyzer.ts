import Cloudflare from "cloudflare";

/**
 * Analyze a company website and produce a rich Markdown narrative.
 * Uses Cloudflare Browser Rendering + DeepSeek (same pattern as extractor.ts).
 *
 * Returns a Markdown string covering business model, target market,
 * tech signals, culture, competitive positioning, etc.
 */
export async function analyzeCompanyWebsite(
  targetUrl: string,
  companyContext?: {
    name?: string;
    description?: string | null;
    industry?: string | null;
    services?: string[];
  },
): Promise<string> {
  const browserRenderingKey = process.env.CLOUDFLARE_BROWSER_RENDERING_KEY;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;

  if (!browserRenderingKey) {
    throw new Error("Missing CLOUDFLARE_BROWSER_RENDERING_KEY environment variable");
  }
  if (!accountId) throw new Error("Missing CLOUDFLARE_ACCOUNT_ID environment variable");
  if (!deepseekKey) throw new Error("Missing DEEPSEEK_API_KEY environment variable");

  const client = new Cloudflare({ apiToken: browserRenderingKey });

  const contextBlock = companyContext
    ? `
Known data about this company:
- Name: ${companyContext.name ?? "unknown"}
- Description: ${companyContext.description ?? "none"}
- Industry: ${companyContext.industry ?? "unknown"}
- Services: ${companyContext.services?.join(", ") || "unknown"}

Build on this — do NOT repeat it verbatim. Add new insight from the webpage.
`
    : "";

  const prompt = `
You are a senior technology analyst writing a deep-dive report on a company.

${contextBlock}

Analyze the webpage at ${targetUrl} and produce a **Markdown** document with the following sections.
Use ## headings. Be specific, cite evidence from the page where possible.

## What They Do
Core product or service in 2-3 sentences.

## Business Model
How they make money. SaaS, consulting, marketplace, etc.

## Target Market
Who are their customers? Enterprise, SMB, consumers, specific verticals?

## Tech Stack Signals
Any technology mentions (languages, frameworks, cloud providers, APIs).

## Culture & Work Style
Remote-friendly signals, team size cues, values, benefits, work culture.

## Growth Indicators
Hiring pace, funding signals, expansion signals, new products.

## Competitive Positioning
How they differentiate. What niche they own.

## Red Flags / Caveats
Anything to be cautious about — vague claims, outdated content, thin presence.

CRITICAL:
- Return ONLY the Markdown text. No JSON wrapping, no code blocks around the whole response.
- If a section has no evidence, write "No clear signals found." for that section.
- Keep each section concise (2-5 sentences).
- Total length: 300-600 words.
  `.trim();

  try {
    const cfResp = await client.browserRendering.json.create({
      account_id: accountId,
      url: targetUrl,
      prompt,
      custom_ai: [
        {
          model: "deepseek/deepseek-chat",
          authorization: `Bearer ${deepseekKey}`,
        },
      ],
      gotoOptions: {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      },
    });

    // The response from Browser Rendering JSON endpoint can vary in shape.
    // We need to extract the text content from whatever structure we get.
    let analysis: string;

    if (typeof cfResp === "string") {
      analysis = cfResp;
    } else if (typeof cfResp === "object" && cfResp !== null) {
      // Try common response shapes
      const resp = cfResp as Record<string, unknown>;
      if (typeof resp.text === "string") {
        analysis = resp.text;
      } else if (typeof resp.content === "string") {
        analysis = resp.content;
      } else if (typeof resp.result === "string") {
        analysis = resp.result;
      } else if (typeof resp.analysis === "string") {
        analysis = resp.analysis;
      } else {
        // Last resort: stringify and hope it's useful markdown
        analysis = JSON.stringify(cfResp, null, 2);
      }
    } else {
      throw new Error("Unexpected response type from Browser Rendering");
    }

    if (!analysis || analysis.trim().length < 50) {
      throw new Error("Analysis response too short or empty");
    }

    console.log(`Successfully analyzed company from ${targetUrl} (${analysis.length} chars)`);
    return analysis.trim();
  } catch (error: any) {
    console.error("Cloudflare Browser Rendering analysis error:");
    console.error("   Status:", error.status);
    console.error("   Message:", error.message);
    if (error.response) {
      console.error("   Response:", JSON.stringify(error.response, null, 2));
    }
    throw error;
  }
}
