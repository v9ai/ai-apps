"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UnstructuredClient } from "unstructured-client";
import { Strategy } from "unstructured-client/sdk/models/shared";
import { parseMarkers } from "./parsers";
import { embedBloodTest, embedBloodMarkers, embedHealthState } from "@/lib/embeddings";
import { gqlMutate, gqlQuery } from "@/lib/graphql/execute";
import {
  DeleteBloodTestDocument,
  GetBloodTestDocument,
  InsertBloodTestDocument,
  InsertBloodMarkersDocument,
  UpdateBloodTestStatusDocument,
} from "@/lib/graphql/__generated__/graphql";

const unstructured = new UnstructuredClient({
  security: { apiKeyAuth: process.env.UNSTRUCTURED_API_KEY! },
});

export async function uploadBloodTest(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/auth/login");

  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  const testDate = (formData.get("test_date") as string) || null;

  const filePath = `${session.user.id}/${Date.now()}_${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("blood-tests")
    .upload(filePath, file);
  if (uploadError) throw new Error(uploadError.message);

  const insertData = await gqlMutate(
    InsertBloodTestDocument,
    {
      user_id: session.user.id,
      file_name: file.name,
      file_path: filePath,
      status: "processing",
      test_date: testDate,
    },
    session.access_token,
  );
  const test = insertData.insertIntoblood_testsCollection?.records[0];
  if (!test) throw new Error("Failed to insert blood test record");

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

    let insertedMarkerIds: string[] = [];
    if (markers.length > 0) {
      const markerData = await gqlMutate(
        InsertBloodMarkersDocument,
        { objects: markers.map((m) => ({ ...m, test_id: test.id })) },
        session.access_token,
      );
      insertedMarkerIds =
        markerData.insertIntoblood_markersCollection?.records.map((r) => r.id) ?? [];
    }

    await gqlMutate(
      UpdateBloodTestStatusDocument,
      { id: test.id, status: "done", error_message: null },
      session.access_token,
    );

    // Auto-embed (non-blocking — upload succeeds even if embedding fails)
    if (markers.length > 0) {
      try {
        const meta = { fileName: file.name, uploadedAt: new Date().toISOString() };
        await embedBloodTest(supabase, test.id, session.user.id, markers, meta);

        const markersWithIds = markers.map((m, i) => ({
          ...m,
          id: insertedMarkerIds[i],
        }));
        await embedBloodMarkers(supabase, test.id, session.user.id, markersWithIds, {
          fileName: file.name,
          testDate: testDate ?? new Date().toISOString(),
        });

        await embedHealthState(supabase, test.id, session.user.id, markers, meta);
      } catch {
        // Embedding failure is non-blocking
      }
    }
  } catch (err: any) {
    await gqlMutate(
      UpdateBloodTestStatusDocument,
      { id: test.id, status: "error", error_message: err.message },
      session.access_token,
    );
  }

  redirect(`/protected/blood-tests/${test.id}`);
}

export async function deleteBloodTest(id: string) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/auth/login");

  const data = await gqlQuery(GetBloodTestDocument, { id }, session.access_token);
  const filePath = data.blood_testsCollection?.edges[0]?.node?.file_path;

  await gqlMutate(DeleteBloodTestDocument, { id }, session.access_token);

  if (filePath) {
    await supabase.storage.from("blood-tests").remove([filePath]);
  }

  redirect("/protected/blood-tests");
}
