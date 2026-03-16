import { createNeonAuth } from "@neondatabase/auth/next/server";

// Vercel's fetch adds Sec-Fetch-Mode: cors to cross-origin requests,
// which causes Neon Auth's Better Auth server to reject with INVALID_ORIGIN.
// Patch globalThis.fetch to strip Sec-Fetch-Mode for Neon Auth proxy requests.
const neonAuthBaseUrl = process.env.NEON_AUTH_BASE_URL;
if (neonAuthBaseUrl) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith(neonAuthBaseUrl)) {
      const headers = new Headers(init?.headers);
      headers.delete("sec-fetch-mode");
      headers.delete("sec-fetch-site");
      headers.delete("sec-fetch-dest");
      return originalFetch(input, { ...init, headers });
    }
    return originalFetch(input, init);
  };
}

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});
