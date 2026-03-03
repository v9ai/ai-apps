"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UnstructuredClient } from "unstructured-client";
import { Strategy } from "unstructured-client/sdk/models/shared";

const unstructured = new UnstructuredClient({
  security: { apiKeyAuth: process.env.UNSTRUCTURED_API_KEY! },
});

type Marker = {
  name: string;
  value: string;
  unit: string;
  reference_range: string;
  flag: string;
};

function parseMarkers(elements: Array<{ [k: string]: any }>): Marker[] {
  const markers: Marker[] = [];

  const text = elements.map((el) => el.text ?? "").join("\n");

  // Match patterns like: "Glucose   95   mg/dL   70-99"
  const linePattern =
    /([A-Za-z][A-Za-z0-9 \-\/()]+?)\s{2,}([\d.]+)\s+([\w\/µ%]+)\s+([\d.]+-[\d.]+(?:\s*[\w\/µ%]*)?)/gm;

  let match;
  while ((match = linePattern.exec(text)) !== null) {
    const [, name, value, unit, reference_range] = match;
    const numVal = parseFloat(value);
    const [low, high] = reference_range.split("-").map(parseFloat);
    let flag = "normal";
    if (!isNaN(low) && !isNaN(high)) {
      if (numVal < low) flag = "low";
      else if (numVal > high) flag = "high";
    }
    markers.push({ name: name.trim(), value, unit, reference_range, flag });
  }

  return markers;
}

export async function uploadBloodTest(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

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
