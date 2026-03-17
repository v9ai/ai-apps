import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function withAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/auth/login");
  return { userId: session.user.id, user: session.user };
}
