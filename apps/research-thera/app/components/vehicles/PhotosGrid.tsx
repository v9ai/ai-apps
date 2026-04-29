"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, Flex, Grid, Text } from "@radix-ui/themes";
import {
  useDeleteVehiclePhotoMutation,
  VehicleDocument,
} from "../../__generated__/hooks";

export interface PhotoItem {
  id: string;
  url: string | null | undefined;
  caption?: string | null;
}

export function PhotosGrid({
  vehicleId: _vehicleId,
  vehicleSlug,
  photos,
}: {
  vehicleId: string;
  vehicleSlug: string;
  photos: PhotoItem[];
}) {
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletePhoto] = useDeleteVehiclePhotoMutation({
    refetchQueries: [
      { query: VehicleDocument, variables: { slug: vehicleSlug } },
    ],
  });

  async function handleDelete(id: string) {
    if (!confirm("Delete this photo?")) return;
    setError("");
    setDeletingId(id);
    try {
      await deletePhoto({ variables: { id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
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
              <Link
                href={`/vehicles/${vehicleSlug}/photos/${p.id}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  display: "block",
                }}
              >
                <Flex direction="column" gap="2">
                  {p.url && (
                    <img
                      src={p.url}
                      alt={p.caption ?? ""}
                      style={{
                        width: "100%",
                        aspectRatio: "1 / 1",
                        objectFit: "cover",
                        borderRadius: 4,
                        background: "var(--gray-3)",
                      }}
                    />
                  )}
                  {p.caption && <Text size="1">{p.caption}</Text>}
                </Flex>
              </Link>
              <Button
                size="1"
                variant="soft"
                color="red"
                onClick={() => handleDelete(p.id)}
                disabled={deletingId === p.id}
              >
                {deletingId === p.id ? "Deleting…" : "Delete"}
              </Button>
            </Flex>
          </Card>
        ))}
      </Grid>
    </Flex>
  );
}
