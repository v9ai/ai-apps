import { createAuth } from "@ai-apps/auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const auth = createAuth(db, schema);
