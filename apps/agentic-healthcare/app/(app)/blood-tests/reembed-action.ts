"use server";

import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { bloodTests, bloodMarkers, bloodTestEmbeddings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const PYTHON_API_URL = process.env.PYTHON_API_URL ?? "http://localhost:8001";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? "";

/**
 * Re-embed all blood tests that are missing embeddings by calling the
 * Python /upload ingestion pipeline for each test's markers.
 */
export async function reembedAllTests() {
  const { userId } = await withAuth();

  const tests = await db
    .select({
      id: bloodTests.id,
      fileName: bloodTests.fileName,
      uploadedAt: bloodTests.uploadedAt,
      testDate: bloodTests.testDate,
    })
    .from(bloodTests)
    .where(and(eq(bloodTests.userId, userId), eq(bloodTests.status, "done")));

  if (tests.length === 0) return { embedded: 0 };

  const existing = await db
    .select({ testId: bloodTestEmbeddings.testId })
    .from(bloodTestEmbeddings)
    .where(eq(bloodTestEmbeddings.userId, userId));

  const existingIds = new Set(existing.map((e) => e.testId));
  const missing = tests.filter((t) => !existingIds.has(t.id));

  let embedded = 0;
  for (const test of missing) {
    const markers = await db
      .select()
      .from(bloodMarkers)
      .where(eq(bloodMarkers.testId, test.id));

    if (markers.length === 0) continue;

    // Build Unstructured-style elements so the Python parser can process them
    const elements = [
      {
        type: "Table",
        text: "",
        metadata: {
          text_as_html: `<table>${markers.map((m) => `<tr><td>${m.name}</td><td>${m.value}</td><td>${m.unit}</td><td>${m.referenceRange ?? ""}</td></tr>`).join("")}</table>`,
        },
      },
    ];

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (INTERNAL_API_KEY) headers["x-api-key"] = INTERNAL_API_KEY;

    try {
      const res = await fetch(`${PYTHON_API_URL}/embed/reembed`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          test_id: test.id,
          user_id: userId,
          file_name: test.fileName,
          test_date: test.testDate ?? test.uploadedAt.toISOString(),
          marker_ids: markers.map((m) => m.id),
          elements,
        }),
      });
      if (res.ok) embedded++;
    } catch {
      // Non-blocking
    }
  }

  return { embedded };
}
