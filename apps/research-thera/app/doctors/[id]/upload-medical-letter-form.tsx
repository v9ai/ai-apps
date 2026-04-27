"use client";

import { useRef, useState } from "react";
import { useApolloClient } from "@apollo/client";
import {
  Box,
  Button,
  Flex,
  TextField,
  Text,
} from "@radix-ui/themes";
import { Upload } from "lucide-react";
import { DoctorDocument } from "../../__generated__/hooks";

export function UploadMedicalLetterForm({ doctorId }: { doctorId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apollo = useApolloClient();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Choose a PDF first.");
      return;
    }

    const fd = new FormData(e.currentTarget);
    fd.set("file", file);
    fd.set("doctor_id", doctorId);

    setUploading(true);
    try {
      const res = await fetch("/api/healthcare/upload-medical-letter", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      await apollo.refetchQueries({ include: [DoctorDocument] });
      e.currentTarget.reset();
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Box mt="2">
      <form onSubmit={handleSubmit}>
        <Flex direction="column" gap="3">
          <Flex gap="3" wrap="wrap" align="end">
            <Flex direction="column" gap="1" style={{ flex: 2, minWidth: 200 }}>
              <Text size="2" color="gray">
                Letter PDF
              </Text>
              <input
                ref={fileRef}
                type="file"
                name="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
                style={{
                  padding: 8,
                  border: "1px solid var(--gray-a6)",
                  borderRadius: 6,
                  background: "var(--color-surface)",
                }}
              />
            </Flex>
            <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 160 }}>
              <Text size="2" color="gray">
                Letter date (optional)
              </Text>
              <TextField.Root name="letter_date" type="date" />
            </Flex>
          </Flex>
          <Flex direction="column" gap="1">
            <Text size="2" color="gray">
              Description (optional)
            </Text>
            <TextField.Root
              name="description"
              placeholder="e.g. Annual check-up summary"
            />
          </Flex>
          {error && (
            <Text size="2" color="red">
              {error}
            </Text>
          )}
          <Box>
            <Button type="submit" disabled={uploading || !file} variant="soft">
              <Upload size={14} />
              {uploading ? "Uploading…" : "Upload letter"}
            </Button>
          </Box>
        </Flex>
      </form>
    </Box>
  );
}
