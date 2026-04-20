"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Flex, Text, TextField } from "@radix-ui/themes";

export function PhotoUploader({ carId }: { carId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Please choose an image");
      return;
    }
    setError("");
    setLoading(true);

    const form = new FormData();
    form.set("carId", carId);
    form.set("file", file);
    if (caption) form.set("caption", caption);

    const res = await fetch("/api/photos", { method: "POST", body: form });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Upload failed" }));
      setError(body.error || "Upload failed");
      return;
    }

    setCaption("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
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
        <Button type="submit" disabled={loading || !file}>
          {loading ? "Uploading..." : "Upload photo"}
        </Button>
      </Flex>
    </form>
  );
}
