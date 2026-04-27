/**
 * HMAC-signed fan-in to the Cloudflare GraphQL gateway.
 *
 * Vercel-side code (mutation handlers, langgraph webhook) calls
 * `publishIntelRunUpdate` after writing run state to Postgres. The gateway
 * Durable Object broadcasts to subscribed WebSocket clients.
 *
 * No-ops in environments where the gateway is not configured, so polling can
 * remain as a fallback during rollout.
 */

const GATEWAY_URL = process.env.GATEWAY_URL ?? "";
const GATEWAY_HMAC = process.env.GATEWAY_HMAC ?? "";

export interface IntelRunPublishPayload {
  productId: number;
  kind: string;
  intelRun: {
    id: string;
    productId: number;
    kind: string;
    status: string;
    startedAt: string;
    finishedAt: string | null;
    error: string | null;
  };
}

export async function publishIntelRunUpdate(
  payload: IntelRunPublishPayload,
): Promise<void> {
  if (!GATEWAY_URL || !GATEWAY_HMAC) return;
  const body = JSON.stringify(payload);
  const signature = await sign(body, GATEWAY_HMAC);
  try {
    const res = await fetch(`${GATEWAY_URL}/internal/publish`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-signature": signature,
      },
      body,
      // Fire-and-forget; never block the caller on the gateway.
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) {
      console.warn(
        `[gateway-publish] non-2xx from gateway: ${res.status} ${res.statusText}`,
      );
    }
  } catch (err) {
    console.warn("[gateway-publish] fetch failed:", err);
  }
}

async function sign(body: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const bytes = new Uint8Array(sig);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}
