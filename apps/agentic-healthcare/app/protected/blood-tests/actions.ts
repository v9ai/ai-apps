"use server";

import { withAuth } from "@/lib/auth-helpers";
import { uploadToPython, deletePython } from "@/lib/python-api";
import { redirect } from "next/navigation";

export async function uploadBloodTest(formData: FormData) {
  const { userId } = await withAuth();

  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  const testDate = (formData.get("test_date") as string) || null;

  const result = await uploadToPython(file, testDate, userId);

  redirect(`/protected/blood-tests/${result.test_id}`);
}

export async function deleteBloodTest(id: string) {
  const { userId } = await withAuth();
  await deletePython(id, userId);
  redirect("/protected/blood-tests");
}
