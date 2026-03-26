import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";
import { ADMIN_EMAIL } from "@/lib/constants";

/**
 * Check if the current user is an admin
 * @returns Object with isAdmin boolean and user info
 */
export async function checkIsAdmin(): Promise<{
  isAdmin: boolean;
  userId: string | null;
  userEmail: string | null;
}> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      return { isAdmin: false, userId: null, userEmail: null };
    }

    const userEmail = session.user.email;

    return {
      isAdmin: userEmail === ADMIN_EMAIL,
      userId: session.user.id,
      userEmail,
    };
  } catch (error) {
    console.error("Error checking admin status:", error);
    return { isAdmin: false, userId: null, userEmail: null };
  }
}

/**
 * Check if a specific email is an admin email
 * @param email - Email to check
 * @returns true if email is admin
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  return email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
