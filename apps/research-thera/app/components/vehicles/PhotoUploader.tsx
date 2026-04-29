"use client";

import { useRef, useState } from "react";
import { Button, Flex, Text, TextField } from "@radix-ui/themes";
import {
  useRequestVehiclePhotoUploadMutation,
  useAddVehiclePhotoMutation,
  VehicleDocument,
} from "../../__generated__/hooks";

export function PhotoUploader({ vehicleId }: { vehicleId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [requestUpload] = useRequestVehiclePhotoUploadMutation();
  const [addPhoto] = useAddVehiclePhotoMutation({
    refetchQueries: [
      { query: VehicleDocument, variables: { id: vehicleId } },
    ],
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Please choose an image");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const ticketRes = await requestUpload({
        variables: {
          input: {
            vehicleId,
            filename: file.name,
            contentType: file.type || "image/jpeg",
          },
        },
      });
      const ticket = ticketRes.data?.requestVehiclePhotoUpload;
      if (!ticket) throw new Error("No upload URL returned");

      const putRes = await fetch(ticket.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(`Upload failed (${putRes.status})`);
      }

      await addPhoto({
        variables: {
          input: {
            vehicleId,
            r2Key: ticket.r2Key,
            contentType: file.type || "image/jpeg",
            sizeBytes: file.size,
            caption: caption || null,
          },
        },
      });

      setCaption("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Flex direction="column" gap="2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <TextField.Root
          placeholder="Caption (optional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
        {error && (
          <Text size="2" color="red">
            {error}
          </Text>
        )}
        <Button type="submit" disabled={busy || !file}>
          {busy ? "Uploading…" : "Upload photo"}
        </Button>
      </Flex>
    </form>
  );
}
