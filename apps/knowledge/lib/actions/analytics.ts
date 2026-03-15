"use server";

import { db } from "@/src/db";
import { analyticsEvents, papers } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export async function trackAnalyticsEvent(
  eventName: string,
  lessonSlug: string,
  sessionId: string,
  properties?: Record<string, unknown>,
) {
  try {
    const paper = await db.query.papers.findFirst({
      where: eq(papers.slug, lessonSlug),
      columns: { id: true },
    });

    await db.insert(analyticsEvents).values({
      eventCategory: "reading",
      eventName,
      paperId: paper?.id ?? null,
      sessionId,
      userId: null,
      properties: properties ?? {},
      durationMs: (properties?.duration_ms as number) ?? null,
    });
  } catch {
    // Silent fail — analytics should never break the app
  }
}
