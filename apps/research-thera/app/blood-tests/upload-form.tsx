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
import { BloodTestsDocument } from "../__generated__/hooks";

export function UploadBloodTestForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
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

    setUploading(true);
    try {
      const res = await fetch("/api/healthcare/upload-blood-test", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      // Refetch list — the server-side ingestion runs in a background task
      // so the row may show as "processing" until embeddings complete; the
      // page polls every 5s.
      await apollo.refetchQueries({ include: [BloodTestsDocument] });
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
    <form onSubmit={handleSubmit}>
      <Flex direction="column" gap="3">
        <Flex gap="3" wrap="wrap" align="end">
          <Flex direction="column" gap="1" style={{ flex: 2, minWidth: 240 }}>
            <Text size="2" color="gray">
              Blood test PDF
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
          <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 180 }}>
            <Text size="2" color="gray">
              Test date (optional)
            </Text>
            <TextField.Root name="test_date" type="date" />
          </Flex>
        </Flex>
        {error && (
          <Text size="2" color="red">
            {error}
          </Text>
        )}
        <Box>
          <Button type="submit" disabled={uploading || !file}>
            <Upload size={14} />
            {uploading ? "Uploading…" : "Upload & ingest"}
          </Button>
        </Box>
        <Text size="1" color="gray">
          PDF is sent to Python /upload at :2024 — parsed by LlamaParse,
          embedded with bge-large-en-v1.5, persisted to pgvector. Status updates
          via 5s polling.
        </Text>
      </Flex>
    </form>
  );
}
