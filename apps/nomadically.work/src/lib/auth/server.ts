import { createNeonAuth } from "@neondatabase/auth/next/server";

type NeonAuth = ReturnType<typeof createNeonAuth>;

let _auth: NeonAuth | undefined;

function initAuth(): NeonAuth {
  if (_auth) return _auth;

  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;

  if (!baseUrl || !secret) {
    throw new Error(
      "Missing Neon Auth config. Add NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET to .env.local\n" +
        "Copy these from apps/research-thera/.env.local or provision a new instance with `neon auth provision`."
    );
  }

  // Vercel's fetch adds Sec-Fetch-Mode: cors to cross-origin requests,
  // which causes Neon Auth's Better Auth server to reject with INVALID_ORIGIN.
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (url.startsWith(baseUrl)) {
      const headers = new Headers(init?.headers);
      headers.delete("sec-fetch-mode");
      headers.delete("sec-fetch-site");
      headers.delete("sec-fetch-dest");
      return originalFetch(input, { ...init, headers });
    }
    return originalFetch(input, init);
  };

  _auth = createNeonAuth({
    baseUrl,
    cookies: { secret },
  });

  return _auth;
}

export const auth = new Proxy({} as NeonAuth, {
  get(_target, prop: string | symbol) {
    return initAuth()[prop as keyof NeonAuth];
  },
});
