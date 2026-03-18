import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const withAuth = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/auth/login");
  return { userId: session.user.id, user: session.user };
};
