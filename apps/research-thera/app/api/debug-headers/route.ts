import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const neonAuthBaseUrl = process.env.NEON_AUTH_BASE_URL;
  return NextResponse.json({
    url: request.url,
    origin: request.headers.get("origin"),
    host: request.headers.get("host"),
    computedOrigin: new URL(request.url).origin,
    neonAuthBaseUrl,
    neonAuthBaseUrlLength: neonAuthBaseUrl?.length,
    neonAuthBaseUrlCharCodes: neonAuthBaseUrl
      ? [...neonAuthBaseUrl].slice(-5).map((c) => c.charCodeAt(0))
      : null,
  });
}

export async function POST(request: NextRequest) {
  const neonAuthBaseUrl = process.env.NEON_AUTH_BASE_URL!;
  const origin = request.headers.get("origin") || new URL(request.url).origin;

  // Test 1: See what headers Vercel actually sends via httpbin
  const echoResp = await fetch("https://httpbin.org/post", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "x-neon-auth-middleware": "true",
    },
    body: JSON.stringify({ test: true }),
  });
  const echoData = await echoResp.json();

  // Test 2: Try upstream with explicit Headers
  const upstreamUrl = `${neonAuthBaseUrl}/sign-up/email`;
  const body = await request.text();
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Origin", origin);
  headers.set("x-neon-auth-middleware", "true");

  let upstreamResult;
  try {
    const resp = await fetch(upstreamUrl, {
      method: "POST",
      headers,
      body,
    });
    upstreamResult = {
      status: resp.status,
      body: await resp.text(),
    };
  } catch (err: unknown) {
    upstreamResult = {
      error: err instanceof Error ? err.message : String(err),
    };
  }

  return NextResponse.json({
    originSent: origin,
    echoHeaders: echoData.headers,
    upstreamUrl,
    upstreamResult,
  });
}
