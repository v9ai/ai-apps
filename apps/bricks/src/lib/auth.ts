import { createAuth } from "@ai-apps/auth";
import { db } from "@/lib/db";

export const auth = createAuth(db);
