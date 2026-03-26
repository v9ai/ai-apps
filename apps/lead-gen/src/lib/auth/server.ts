import { createAuth } from "@ai-apps/auth";
import { db } from "@/db";

export const auth = createAuth(db, undefined, {
  trustedOrigins: ["https://neural-lead-gen.vercel.app"],
});
