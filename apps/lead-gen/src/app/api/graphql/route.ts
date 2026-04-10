import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest, NextResponse } from "next/server";
import { Kind, GraphQLError, type DocumentNode, type ValidationContext } from "graphql";
import { schema } from "@/apollo/schema";
import { GraphQLContext } from "@/apollo/context";
import { auth } from "@/lib/auth/server";
import { db } from "@/db";
import { createLoaders } from "@/apollo/loaders";

const MAX_DEPTH = 10;

function depthLimitRule(context: ValidationContext) {
  function measure(selections: readonly any[], depth: number): number {
    let max = depth;
    for (const sel of selections) {
      if (sel.kind === Kind.FIELD && sel.selectionSet) {
        max = Math.max(max, measure(sel.selectionSet.selections, depth + 1));
      } else if ((sel.kind === Kind.INLINE_FRAGMENT || sel.kind === Kind.FRAGMENT_SPREAD) && sel.selectionSet) {
        max = Math.max(max, measure(sel.selectionSet.selections, depth));
      }
    }
    return max;
  }
  return {
    Document(node: DocumentNode) {
      for (const def of node.definitions) {
        if (def.kind === Kind.OPERATION_DEFINITION && def.selectionSet) {
          const depth = measure(def.selectionSet.selections, 1);
          if (depth > MAX_DEPTH) {
            context.reportError(
              new GraphQLError(
                `Query depth ${depth} exceeds maximum allowed depth of ${MAX_DEPTH}`,
              ),
            );
          }
        }
      }
    },
  };
}

// Node.js runtime for full module compatibility (AI agents, SQL execution)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CORS policy — allow only the app's own origin
const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function getAllowedOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  // Exact match against the configured app URL
  if (origin === ALLOWED_ORIGIN) return origin;
  // In development, also allow localhost variants
  if (process.env.NODE_ENV === "development" && origin.startsWith("http://localhost:")) {
    return origin;
  }
  return null;
}

function withCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const allowedOrigin = getAllowedOrigin(request);
  if (allowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

// Simple in-memory rate limiter
// TODO: Replace with Redis/Vercel KV-based rate limiting for multi-instance deployments.
// This in-memory store is per-process and will not share state across serverless invocations
// or multiple deployment instances, allowing users to bypass limits by hitting different instances.
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = {
  WINDOW_MS: 60 * 1000, // 1 minute window
  MAX_REQUESTS: 100, // 100 requests per minute
};

function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetTime) {
    // New window
    rateLimitStore.set(identifier, { count: 1, resetTime: now + RATE_LIMIT.WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT.MAX_REQUESTS - 1, resetTime: now + RATE_LIMIT.WINDOW_MS };
  }

  if (record.count >= RATE_LIMIT.MAX_REQUESTS) {
    // Rate limit exceeded
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  // Increment count
  record.count++;
  return { allowed: true, remaining: RATE_LIMIT.MAX_REQUESTS - record.count, resetTime: record.resetTime };
}

// Cleanup old entries periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, RATE_LIMIT.WINDOW_MS);

const apolloServer = new ApolloServer<GraphQLContext>({
  schema,
  validationRules: [depthLimitRule],
  introspection: process.env.NODE_ENV !== "production",
});

const handler = startServerAndCreateNextHandler<NextRequest, GraphQLContext>(
  apolloServer,
  {
    context: async (req) => {
      try {
        const loaders = createLoaders(db);

        // Dev bypass: use ADMIN_EMAIL in development
        if (process.env.NODE_ENV === "development" && process.env.ADMIN_EMAIL) {
          return { userId: "dev-local", userEmail: process.env.ADMIN_EMAIL, db, loaders };
        }

        let userId: string | null = null;
        let userEmail: string | null = null;
        try {
          const session = await auth.api.getSession({ headers: req.headers });
          userId = session?.user.id ?? null;
          userEmail = session?.user.email ?? null;
        } catch {
          // Auth unavailable — treat as unauthenticated
        }

        return { userId, userEmail, db, loaders };
      } catch (error) {
        console.error("❌ [GraphQL] Error in context setup:", error);
        console.error("❌ [GraphQL] Make sure environment variables are set in .env.local");
        console.error("❌ [GraphQL] Required: NEON_DATABASE_URL or DATABASE_URL");
        // Re-throw to show proper error to client
        throw error;
      }
    },
  },
);

async function getRateLimitIdentifier(request: NextRequest): Promise<string> {
  if (process.env.NODE_ENV === "development") {
    return `dev:local`;
  }
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (session?.user.id) {
      return `user:${session.user.id}`;
    }
  } catch {
    // Auth unavailable
  }

  // Fallback to IP address
  const ip = request.headers.get("x-forwarded-for") ||
             request.headers.get("x-real-ip") ||
             "anonymous";
  return `ip:${ip}`;
}

export async function GET(request: NextRequest) {
  const identifier = await getRateLimitIdentifier(request);
  const rateLimit = checkRateLimit(identifier);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        message: `Too many requests. Please try again after ${new Date(rateLimit.resetTime).toISOString()}`
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(RATE_LIMIT.MAX_REQUESTS),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rateLimit.resetTime),
        },
      }
    );
  }

  return handler(request);
}

export async function POST(request: NextRequest) {
  const identifier = await getRateLimitIdentifier(request);
  const rateLimit = checkRateLimit(identifier);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        message: `Too many requests. Please try again after ${new Date(rateLimit.resetTime).toISOString()}`
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(RATE_LIMIT.MAX_REQUESTS),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rateLimit.resetTime),
        },
      }
    );
  }

  return handler(request);
}
