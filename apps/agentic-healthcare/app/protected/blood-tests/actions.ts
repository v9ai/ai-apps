"use server";

import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { bloodTests, bloodMarkers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { UnstructuredClient } from "unstructured-client";
import { Strategy } from "unstructured-client/sdk/models/shared";
import { parseMarkers } from "./parsers";
import { embedBloodTest, embedBloodMarkers, embedHealthState } from "@/lib/embeddings";
import { uploadFile, deleteFile } from "@/lib/storage";

const unstructured = new UnstructuredClient({
  security: { apiKeyAuth: process.env.UNSTRUCTURED_API_KEY! },
});

export async function uploadBloodTest(formData: FormData) {
  const { userId } = await withAuth();

  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  const testDate = (formData.get("test_date") as string) || null;

  const filePath = `${userId}/${Date.now()}_${file.name}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadFile(filePath, buffer, file.type);

  const [test] = await db
    .insert(bloodTests)
    .values({
      userId,
      fileName: file.name,
      filePath,
      status: "processing",
      testDate,
    })
    .returning();

  try {
    const res = await unstructured.general.partition({
      partitionParameters: {
        files: { content: buffer, fileName: file.name },
        strategy: Strategy.HiRes,
      },
    });

    const elements = Array.isArray(res) ? res : [];
    const markers = parseMarkers(elements);

    let insertedMarkerIds: string[] = [];
    if (markers.length > 0) {
      const inserted = await db
        .insert(bloodMarkers)
        .values(
          markers.map((m) => ({
            testId: test.id,
            name: m.name,
            value: m.value,
            unit: m.unit,
            referenceRange: m.reference_range,
            flag: m.flag,
          }))
        )
        .returning({ id: bloodMarkers.id });
      insertedMarkerIds = inserted.map((r) => r.id);
    }

    await db
      .update(bloodTests)
      .set({ status: "done", errorMessage: null })
      .where(eq(bloodTests.id, test.id));

    // Auto-embed (non-blocking)
    if (markers.length > 0) {
      try {
        const meta = { fileName: file.name, uploadedAt: new Date().toISOString() };
        await embedBloodTest(test.id, userId, markers, meta);

        const markersWithIds = markers.map((m, i) => ({
          ...m,
          id: insertedMarkerIds[i],
        }));
        await embedBloodMarkers(test.id, userId, markersWithIds, {
          fileName: file.name,
          testDate: testDate ?? new Date().toISOString(),
        });

        await embedHealthState(test.id, userId, markers, meta);
      } catch {
        // Embedding failure is non-blocking
      }
    }
  } catch (err: any) {
    await db
      .update(bloodTests)
      .set({ status: "error", errorMessage: err.message })
      .where(eq(bloodTests.id, test.id));
  }

  redirect(`/protected/blood-tests/${test.id}`);
}

export async function deleteBloodTest(id: string) {
  await withAuth();

  const [test] = await db
    .select({ filePath: bloodTests.filePath })
    .from(bloodTests)
    .where(eq(bloodTests.id, id));

  await db.delete(bloodTests).where(eq(bloodTests.id, id));

  if (test?.filePath) {
    try {
      await deleteFile(test.filePath);
    } catch {
      // Storage cleanup failure is non-blocking
    }
  }

  redirect("/protected/blood-tests");
}
