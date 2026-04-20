"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Flex, Grid, Text } from "@radix-ui/themes";

export interface PhotoItem {
  id: string;
  url: string;
  caption: string | null;
}

export function PhotosGrid({ photos }: { photos: PhotoItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleDelete(id: string) {
    if (!confirm("Delete this photo?")) return;
    setError("");
    setDeletingId(id);
    const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Delete failed" }));
      setError(body.error || "Delete failed");
      return;
    }
    startTransition(() => router.refresh());
  }

  if (photos.length === 0) {
    return (
      <Text size="2" color="gray">
        No photos yet. Upload one below.
      </Text>
    );
  }

  return (
    <Flex direction="column" gap="2">
      {error && (
        <Text size="2" color="red">
          {error}
        </Text>
      )}
      <Grid columns={{ initial: "2", sm: "3", md: "4" }} gap="3">
        {photos.map((p) => (
          <Card key={p.id} size="1">
            <Flex direction="column" gap="2">
              <img src={p.url} alt={p.caption ?? ""} className="photo-thumb-sm" />
              {p.caption && <Text size="1">{p.caption}</Text>}
              <Button
                size="1"
                variant="soft"
                color="red"
                onClick={() => handleDelete(p.id)}
                disabled={pending || deletingId === p.id}
              >
                {deletingId === p.id ? "Deleting..." : "Delete"}
              </Button>
            </Flex>
          </Card>
        ))}
      </Grid>
    </Flex>
  );
}
