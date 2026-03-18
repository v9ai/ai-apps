import { createWithAuth } from "@ai-apps/auth";
import { auth } from "@/lib/auth";

export const withAuth = createWithAuth(auth);
