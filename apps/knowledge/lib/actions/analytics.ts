"use server";

import { db } from "@/src/db";
import { analyticsEvents, lessons } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export async function trackAnalyticsEvent(
  eventName: string,
  lessonSlug: string,
  sessionId: string,
  properties?: Record<string, unknown>,
) {
  try {
    const lesson = await db.query.lessons.findFirst({
      where: eq(lessons.slug, lessonSlug),
      columns: { id: true },
    });

    await db.insert(analyticsEvents).values({
      eventCategory: "reading",
      eventName,
      lessonId: lesson?.id ?? null,
      sessionId,
      userId: null,
      properties: properties ?? {},
      durationMs: (properties?.duration_ms as number) ?? null,
    });
  } catch {
    // Silent fail — analytics should never break the app
  }
}
