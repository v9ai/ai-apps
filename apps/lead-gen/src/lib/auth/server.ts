import { createAuth } from "@ai-apps/auth";
import { db } from "@/db";

export const auth = createAuth(db, undefined, {
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  trustedOrigins: [
    "https://agentic-lead-gen.vercel.app",
    "https://agenticleadgen.xyz",
  ],
});
