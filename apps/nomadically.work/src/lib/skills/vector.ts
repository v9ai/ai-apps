import { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_WORKERS_AI_KEY } from "@/config/env";

export type EmbeddingVector = number[];

export { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_WORKERS_AI_KEY };

/**
 * Embeds text using Cloudflare Workers AI:
 *   @cf/baai/bge-small-en-v1.5
 *
 * Outputs 384-dim vectors, 512 token input limit.
 */
export async function embedWithCloudflareBgeSmall(
  values: string[],
): Promise<EmbeddingVector[]> {
  if (!Array.isArray(values) || values.some((v) => typeof v !== "string")) {
    throw new TypeError("values must be an array of strings");
  }

  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_WORKERS_AI_KEY) {
    throw new Error(
      "Missing Cloudflare credentials. Please set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_WORKERS_AI_KEY in your .env file",
    );
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/baai/bge-small-en-v1.5`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_WORKERS_AI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: values }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudflare API error (${response.status}): ${errorText}`);
  }

  const result = (await response.json()) as {
    success: boolean;
    result?: { shape: number[]; data: number[][] };
  };

  if (!result.success || !result.result?.data) {
    throw new Error(
      `Unexpected Cloudflare API response: ${JSON.stringify(result)}`,
    );
  }

  return result.result.data;
}
