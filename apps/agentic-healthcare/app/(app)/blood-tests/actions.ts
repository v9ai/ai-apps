"use server";

import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { bloodTests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { uploadToPython, deletePython } from "@/lib/python-api";
import { redirect } from "next/navigation";

export async function uploadBloodTest(formData: FormData) {
  const { userId } = await withAuth();

  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  const testDate = (formData.get("test_date") as string) || null;

  const result = await uploadToPython(file, testDate, userId);

  redirect(`/blood-tests/${result.test_id}`);
}

/** Upload a single file without redirecting — used by batch/directory upload. */
export async function uploadBloodTestNoRedirect(formData: FormData) {
  const { userId } = await withAuth();

  const file = formData.get("file") as File;
  if (!file) return { ok: false as const, error: "No file provided" };

  const testDate = (formData.get("test_date") as string) || null;

  try {
    const result = await uploadToPython(file, testDate, userId);
    return { ok: true as const, test_id: result.test_id, fileName: file.name, status: result.status };
  } catch (e: any) {
    return { ok: false as const, error: e?.message ?? "Upload failed" };
  }
}

/** Return file names already uploaded by this user — used for duplicate detection. */
export async function getExistingFileNames(): Promise<string[]> {
  const { userId } = await withAuth();
  const rows = await db
    .select({ fileName: bloodTests.fileName })
    .from(bloodTests)
    .where(eq(bloodTests.userId, userId));
  return rows.map((r) => r.fileName);
}

export async function deleteBloodTest(id: string) {
  const { userId } = await withAuth();
  await deletePython(id, userId);
  redirect("/blood-tests");
}
