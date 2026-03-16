import { auth } from "@/app/lib/auth/server";
import { NextRequest } from "next/server";

const handlers = auth.handler();

// The Neon Auth proxy forwards the browser's Origin header to the upstream
// Better Auth server, which validates it against trusted_origins. Override
// the Origin to the upstream's own origin so the server-side proxy is always
// accepted — origin validation is a browser-level CORS concern, not relevant
// for a trusted server-side proxy.
const upstreamOrigin = new URL(process.env.NEON_AUTH_BASE_URL!).origin;

function withUpstreamOrigin(
  handler: (req: NextRequest, ctx: any) => Promise<Response>
) {
  return async (request: NextRequest, context: any) => {
    const headers = new Headers(request.headers);
    headers.set("origin", upstreamOrigin);
    const patched = new NextRequest(request.url, {
      method: request.method,
      headers,
      body: request.body,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      duplex: "half" as any,
    });
    return handler(patched, context);
  };
}

export const GET = withUpstreamOrigin(handlers.GET);
export const POST = withUpstreamOrigin(handlers.POST);
