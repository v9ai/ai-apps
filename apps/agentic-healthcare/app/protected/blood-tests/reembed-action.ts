"use server";

import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { bloodTests, bloodMarkers, bloodTestEmbeddings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { embedBloodTest, embedBloodMarkers } from "@/lib/embeddings";

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

  const existingTest = await db
    .select({ testId: bloodTestEmbeddings.testId })
    .from(bloodTestEmbeddings)
    .where(eq(bloodTestEmbeddings.userId, userId));

  const existingTestIds = new Set(existingTest.map((e) => e.testId));
  const missing = tests.filter((t) => !existingTestIds.has(t.id));

  let embedded = 0;
  for (const test of missing) {
    const markers = await db
      .select()
      .from(bloodMarkers)
      .where(eq(bloodMarkers.testId, test.id));

    if (markers.length === 0) continue;

    const markerInputs = markers.map((m) => ({
      name: m.name,
      value: m.value,
      unit: m.unit,
      reference_range: m.referenceRange ?? "",
      flag: m.flag,
    }));

    const meta = {
      fileName: test.fileName,
      uploadedAt: test.uploadedAt.toISOString(),
    };
    await embedBloodTest(test.id, userId, markerInputs, meta);

    const markersWithIds = markerInputs.map((m, i) => ({
      ...m,
      id: markers[i].id,
    }));
    await embedBloodMarkers(test.id, userId, markersWithIds, {
      fileName: test.fileName,
      testDate: test.testDate ?? test.uploadedAt.toISOString(),
    });

    embedded++;
  }

  return { embedded };
}
