// Top-level dispatcher Worker for the 3-container lead-gen LangGraph split.
//
// External clients (Vercel frontend, Chrome extension) hit one hostname:
//   lead-gen-langgraph.eeeew.workers.dev
//
// This Worker path-routes to the right container via service bindings.
// Internal-only paths (_ml/*, _research/*) are rejected from the public
// surface — core reaches ml/research through service bindings with their
// own bearer tokens, never via the public hostname.
//
// Bearer auth on every external request: Authorization: Bearer $LANGGRAPH_AUTH_TOKEN.
// Comparison is constant-time via SHA-256 of the token (stored as LANGGRAPH_AUTH_TOKEN_HASH).

const PUBLIC_CORE_PREFIXES = [
  "/linkedin/",
  "/runs",
  "/threads",
  "/assistants",
  "/dispatch/",
  "/health",
  "/ok",
  "/info",
];

const INTERNAL_ONLY_PREFIXES = ["/_ml/", "/_research/"];

async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function unauthorized(message = "unauthorized") {
  return new Response(message, {
    status: 401,
    headers: { "content-type": "text/plain" },
  });
}

function notFound() {
  return new Response("not found", {
    status: 404,
    headers: { "content-type": "text/plain" },
  });
}

function forbidden(message = "forbidden") {
  return new Response(message, {
    status: 403,
    headers: { "content-type": "text/plain" },
  });
}

async function requireBearer(request, env) {
  const header = request.headers.get("authorization") || "";
  const [scheme, token] = header.split(" ", 2);
  if (scheme !== "Bearer" || !token) {
    return unauthorized("missing bearer token");
  }
  const expectedHash = (env.LANGGRAPH_AUTH_TOKEN_HASH || "").toLowerCase();
  if (!expectedHash) {
    // Fail closed if the Worker is misconfigured.
    return unauthorized("server misconfigured: LANGGRAPH_AUTH_TOKEN_HASH unset");
  }
  const actual = await sha256Hex(token);
  if (actual !== expectedHash) {
    return unauthorized("invalid bearer token");
  }
  return null;
}

function pickBinding(env, pathname) {
  for (const prefix of PUBLIC_CORE_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix)) {
      return { binding: env.CORE, name: "core" };
    }
  }
  // Anything else also goes to core — core owns the public LangGraph
  // Server API surface. /_ml and /_research are handled above (rejected).
  return { binding: env.CORE, name: "core" };
}

// Rewrite the outbound request so the container sees a stable hostname
// and so we can inject the internal bearer + caller header.
async function forwardToContainer(request, binding, name, env) {
  const url = new URL(request.url);
  // Service bindings accept any URL; the downstream uses the path + method.
  const upstream = new URL(`http://${name}${url.pathname}${url.search}`);
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer();
  const headers = new Headers(request.headers);
  // Strip client-provided internal headers; we set them ourselves.
  headers.delete("x-internal-caller");
  return binding.fetch(new Request(upstream.toString(), {
    method: request.method,
    headers,
    body,
    redirect: "manual",
  }));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Reject internal-only paths on the public surface.
    for (const prefix of INTERNAL_ONLY_PREFIXES) {
      if (url.pathname.startsWith(prefix)) {
        return forbidden("internal-only path");
      }
    }

    // 2. /ok + /info bypass auth so health probes + CF Tail work.
    if (url.pathname === "/ok" || url.pathname === "/info") {
      return forwardToContainer(request, env.CORE, "core", env);
    }

    // 3. Every other request requires a valid bearer token.
    const authFail = await requireBearer(request, env);
    if (authFail) return authFail;

    // 4. Path-route to the right container (currently all public paths
    //    terminate in core; ml/research are service-bind-only from core).
    const { binding, name } = pickBinding(env, url.pathname);
    if (!binding) return notFound();
    return forwardToContainer(request, binding, name, env);
  },
};
