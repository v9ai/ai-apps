/**
 * HMAC-SHA256 verification for the internal publish endpoint.
 *
 * Vercel signs the body with `GATEWAY_HMAC` and sends `x-signature: <hex>`.
 * The gateway recomputes and constant-time compares.
 */

export async function verifyHmac(
  bodyText: string,
  signatureHex: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHex) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(bodyText));
  const expected = bufToHex(sigBuf);
  return constantTimeEqual(expected, signatureHex.toLowerCase());
}

function bufToHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
