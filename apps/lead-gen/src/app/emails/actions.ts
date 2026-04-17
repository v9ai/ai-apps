"use server";

import { eq } from "drizzle-orm";
import { resend } from "@/lib/resend";
import { checkIsAdmin } from "@/lib/admin";
import { db } from "@/db";
import { userSettings } from "@/db/schema";

export async function getSentEmails(limit = 100) {
  const { isAdmin } = await checkIsAdmin();

  if (!isAdmin) {
    return { emails: [], error: "Forbidden" };
  }

  try {
    const data = await resend.instance.listEmails({ limit });
    const all = data?.data ?? [];
    const emails = all.filter(
      (email: { to?: string[]; from?: string }) =>
        email.to?.some((addr) => addr.toLowerCase() === "contact@vadim.blog") ||
        email.from?.toLowerCase().includes("contact@vadim.blog"),
    );
    return { emails, error: null };
  } catch (err) {
    return {
      emails: [],
      error: err instanceof Error ? err.message : "Failed to fetch sent emails",
    };
  }
}

export async function getReceivedEmails(limit = 100) {
  const { isAdmin } = await checkIsAdmin();

  if (!isAdmin) {
    return { emails: [], error: "Forbidden" };
  }

  try {
    const data = await resend.instance.listReceived({ limit });
    const all = data?.data ?? [];
    const emails = all.filter((email: { to?: string[] }) =>
      email.to?.some((addr) => addr.toLowerCase() === "contact@vadim.blog"),
    );
    return { emails, error: null };
  } catch (err) {
    return {
      emails: [],
      error:
        err instanceof Error ? err.message : "Failed to fetch received emails",
    };
  }
}

export interface EmailSubscriber {
  email: string;
  name: string;
}

/**
 * Return all users who have email_notifications enabled.
 * Looks up user emails from Neon Auth database by user_id from the userSettings table.
 */
export async function getEmailSubscribers(): Promise<EmailSubscriber[]> {
  const { isAdmin } = await checkIsAdmin();
  if (!isAdmin) return [];


  const rows = await db
    .select({ user_id: userSettings.user_id })
    .from(userSettings)
    .where(eq(userSettings.email_notifications, true));

  if (rows.length === 0) return [];

  // Look up user emails from Neon Auth database
  const sql = neon(process.env.NEON_DATABASE_URL!);
  const userIds = rows.map((r) => r.user_id);
  const users = await sql`
    SELECT id, email, name FROM "user" WHERE id = ANY(${userIds})
  `;

  return (users as { id: string; email: string; name: string | null }[])
    .filter((u) => u.email)
    .map((u) => ({
      email: u.email,
      name: u.name || u.email.split("@")[0],
    }));
}
