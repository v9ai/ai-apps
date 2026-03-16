import { auth } from "@/lib/auth/server";
import { NextRequest } from "next/server";

// The Neon Auth proxy forwards the browser's Origin header to the upstream
// Better Auth server, which validates it against trusted_origins. Override
// the Origin to the upstream's own origin so the server-side proxy is always
// accepted — origin validation is a browser-level CORS concern, not relevant
// for a trusted server-side proxy.
async function handle(request: NextRequest, context: unknown): Promise<Response> {
  const handlers = auth.handler();
  const upstreamOrigin = new URL(process.env.NEON_AUTH_BASE_URL!).origin;

  const headers = new Headers(request.headers);
  headers.set("origin", upstreamOrigin);
  const patched = new NextRequest(request.url, {
    method: request.method,
    headers,
    body: request.body,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    duplex: "half" as any,
  });

  const method = request.method.toUpperCase();
  if (method === "GET") return handlers.GET(patched, context);
  return handlers.POST(patched, context);
}

export const GET = handle;
export const POST = handle;
