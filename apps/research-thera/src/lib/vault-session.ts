import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

export const VAULT_COOKIE_NAME = "vs";
export const VAULT_SESSION_TTL_SECONDS = 30 * 60; // 30 min

const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_BYTES = 16;
// Matches node defaults; keep cheap enough for Vercel cold starts.
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function getSessionSecret(): Buffer {
  const raw = process.env.VAULT_SESSION_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error("VAULT_SESSION_SECRET missing or too short (>=32 chars required)");
  }
  return Buffer.from(raw, "utf8");
}

export function hashPin(pin: string): string {
  const salt = randomBytes(SCRYPT_SALT_BYTES);
  const hash = scryptSync(pin, salt, SCRYPT_KEYLEN, SCRYPT_OPTS);
  return `scrypt$${b64urlEncode(salt)}$${b64urlEncode(hash)}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  if (!stored || !stored.startsWith("scrypt$")) return false;
  const parts = stored.split("$");
  if (parts.length !== 3) return false;
  const salt = b64urlDecode(parts[1]);
  const expected = b64urlDecode(parts[2]);
  let actual: Buffer;
  try {
    actual = scryptSync(pin, salt, expected.length, SCRYPT_OPTS);
  } catch {
    return false;
  }
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export interface VaultTokenPayload {
  uid: string;
  exp: number;
}

export function signVaultToken(payload: VaultTokenPayload): string {
  const secret = getSessionSecret();
  const body = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const mac = b64urlEncode(createHmac("sha256", secret).update(body).digest());
  return `${body}.${mac}`;
}

export function verifyVaultToken(token: string, userId: string): boolean {
  if (!token || typeof token !== "string") return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const body = token.slice(0, dot);
  const providedMac = token.slice(dot + 1);
  const secret = getSessionSecret();
  const expectedMac = b64urlEncode(createHmac("sha256", secret).update(body).digest());
  const a = Buffer.from(providedMac);
  const b = Buffer.from(expectedMac);
  if (a.length !== b.length) return false;
  if (!timingSafeEqual(a, b)) return false;

  let payload: VaultTokenPayload;
  try {
    payload = JSON.parse(b64urlDecode(body).toString("utf8"));
  } catch {
    return false;
  }
  if (!payload || typeof payload !== "object") return false;
  if (payload.uid !== userId) return false;
  if (typeof payload.exp !== "number") return false;
  return Math.floor(Date.now() / 1000) < payload.exp;
}

// In-memory rate limiter: 5 attempts per 60s window, keyed by userId.
// Process-local is fine here — PIN-guessing a 30-min cookie across instances
// offers no advantage to an attacker with access to the local machine.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(userId: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = rateBuckets.get(userId);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, retryAfterMs: 0 };
  }
  if (bucket.count >= RATE_MAX) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

export function resetRateLimit(userId: string): void {
  rateBuckets.delete(userId);
}

export function buildVaultCookie(token: string | null): string {
  const isProd = process.env.NODE_ENV === "production";
  const attrs = [
    `${VAULT_COOKIE_NAME}=${token ?? ""}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    ...(isProd ? ["Secure"] : []),
    token ? `Max-Age=${VAULT_SESSION_TTL_SECONDS}` : "Max-Age=0",
  ];
  return attrs.join("; ");
}
