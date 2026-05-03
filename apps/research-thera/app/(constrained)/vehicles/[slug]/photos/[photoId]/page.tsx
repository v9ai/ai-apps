"use client";

import { use } from "react";
import Link from "next/link";
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Spinner,
  Text,
} from "@radix-ui/themes";
import { useVehicleQuery } from "@/app/__generated__/hooks";
import { AuthGate } from "@/app/components/AuthGate";

export default function VehiclePhotoPage({
  params,
}: {
  params: Promise<{ slug: string; photoId: string }>;
}) {
  const { slug, photoId } = use(params);
  return (
    <AuthGate pageName="Photo" description="Sign in to view this photo.">
      <PhotoContent vehicleSlug={slug} photoId={photoId} />
    </AuthGate>
  );
}

function PhotoContent({
  vehicleSlug,
  photoId,
}: {
  vehicleSlug: string;
  photoId: string;
}) {
  const looksLikeUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      vehicleSlug,
    );
  const { data, loading, error } = useVehicleQuery({
    variables: looksLikeUuid ? { id: vehicleSlug } : { slug: vehicleSlug },
  });

  if (loading) {
    return (
      <Box py="6">
        <Flex align="center" gap="2">
          <Spinner /> <Text size="2">Loading…</Text>
        </Flex>
      </Box>
    );
  }

  if (error) {
    return (
      <Box py="6">
        <Card>
          <Text color="red">{error.message}</Text>
        </Card>
      </Box>
    );
  }

  const v = data?.vehicle;
  if (!v) {
    return (
      <Box py="6">
        <Card>
          <Flex direction="column" gap="2">
            <Heading size="4">Vehicle not found</Heading>
            <Button asChild variant="soft">
              <Link href="/vehicles">Back to vehicles</Link>
            </Button>
          </Flex>
        </Card>
      </Box>
    );
  }

  const photo = (v.photos ?? []).find((p) => p.id === photoId);
  if (!photo) {
    return (
      <Box py="6">
        <Card>
          <Flex direction="column" gap="3">
            <Heading size="4">Photo not found</Heading>
            <Button asChild variant="soft">
              <Link href={`/vehicles/${vehicleSlug}`}>Back to vehicle</Link>
            </Button>
          </Flex>
        </Card>
      </Box>
    );
  }

  const vehicleTitle = v.nickname || `${v.year} ${v.make} ${v.model}`;
  const vehicleSubtitle = v.nickname
    ? `${v.year} ${v.make} ${v.model}`
    : null;
  const photoUrl = photo.url ?? `/api/vehicles/photo/${photo.id}`;
  const uploadedAt = new Date(photo.createdAt).toLocaleString();

  return (
    <Box py="6">
      <Flex direction="column" gap="4">
        <Flex direction="column" gap="1">
          <Button asChild variant="ghost" color="gray" size="2">
            <Link href={`/vehicles/${vehicleSlug}`}>← {vehicleTitle}</Link>
          </Button>
          {vehicleSubtitle && (
            <Text size="2" color="gray">
              {vehicleSubtitle}
            </Text>
          )}
        </Flex>

        {photo.caption && (
          <Heading size={{ initial: "5", md: "7" }} weight="bold">
            {photo.caption}
          </Heading>
        )}

        <Box
          style={{
            width: "100%",
            background: "var(--gray-3)",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <img
            src={photoUrl}
            alt={photo.caption ?? ""}
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              maxHeight: "80vh",
              objectFit: "contain",
              background: "var(--gray-3)",
            }}
          />
        </Box>

        <Text size="2" color="gray">
          Uploaded {uploadedAt}
        </Text>
      </Flex>
    </Box>
  );
}
