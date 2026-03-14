"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/src/db";
import { userPreferences } from "@/src/db/schema";

export async function updatePreferencesAction(data: {
  chronotype?: string;
  chunkSize?: number;
  gamificationEnabled?: boolean;
  bufferPercentage?: number;
  priorityWeights?: {
    deadlineUrgency: number;
    userValue: number;
    dependencyImpact: number;
    projectWeight: number;
  };
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const existing = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.user.id))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(userPreferences).values({
      userId: session.user.id,
      ...data,
    });
  } else {
    await db
      .update(userPreferences)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userPreferences.userId, session.user.id));
  }

  revalidatePath("/app");
}
