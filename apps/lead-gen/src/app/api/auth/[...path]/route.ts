import { createNextHandler } from "@ai-apps/auth";
import { auth } from "@/lib/auth/server";

export const { GET, POST } = createNextHandler(auth);
