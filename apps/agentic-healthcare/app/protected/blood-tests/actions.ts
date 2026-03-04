"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UnstructuredClient } from "unstructured-client";
import { Strategy } from "unstructured-client/sdk/models/shared";
import { parseMarkers } from "./parsers";
import { gqlMutate } from "@/lib/graphql/execute";
import { DeleteBloodTestDocument } from "@/lib/graphql/generated";

const unstructured = new UnstructuredClient({
  security: { apiKeyAuth: process.env.UNSTRUCTURED_API_KEY! },
});

export async function uploadBloodTest(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  const testDate = (formData.get("test_date") as string) || null;

  const filePath = `${user.id}/${Date.now()}_${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("blood-tests")
    .upload(filePath, file);
  if (uploadError) throw new Error(uploadError.message);

  const { data: test, error: dbError } = await supabase
    .from("blood_tests")
    .insert({
      user_id: user.id,
      file_name: file.name,
      file_path: filePath,
      status: "processing",
      test_date: testDate,
    })
    .select()
    .single();
  if (dbError) throw new Error(dbError.message);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const res = await unstructured.general.partition({
      partitionParameters: {
        files: { content: buffer, fileName: file.name },
        strategy: Strategy.HiRes,
      },
    });

    const elements = Array.isArray(res) ? res : [];
    const markers = parseMarkers(elements);

    if (markers.length > 0) {
      await supabase
        .from("blood_markers")
        .insert(markers.map((m) => ({ ...m, test_id: test.id })));
    }

    await supabase
      .from("blood_tests")
      .update({ status: "done" })
      .eq("id", test.id);
  } catch (err: any) {
    await supabase
      .from("blood_tests")
      .update({ status: "error", error_message: err.message })
      .eq("id", test.id);
  }

  redirect(`/protected/blood-tests/${test.id}`);
}

export async function deleteBloodTest(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: test } = await supabase
    .from("blood_tests")
    .select("file_path")
    .eq("id", id)
    .single();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/auth/login");

  await gqlMutate(DeleteBloodTestDocument, { id }, session.access_token);

  if (test?.file_path) {
    await supabase.storage.from("blood-tests").remove([test.file_path]);
  }

  redirect("/protected/blood-tests");
}
