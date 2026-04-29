"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Separator,
  Spinner,
  Text,
} from "@radix-ui/themes";
import {
  useVehicleQuery,
  useDeleteVehicleMutation,
  VehiclesDocument,
} from "../../__generated__/hooks";
import { AuthGate } from "../../components/AuthGate";
import { PhotoUploader } from "../../components/vehicles/PhotoUploader";
import { PhotosGrid } from "../../components/vehicles/PhotosGrid";
import { ServiceLog } from "../../components/vehicles/ServiceLog";

export default function VehicleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return (
    <AuthGate
      pageName="Vehicle"
      description="Sign in to view this vehicle."
    >
      <VehicleDetailContent slug={slug} />
    </AuthGate>
  );
}

function VehicleDetailContent({ slug }: { slug: string }) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  // Pass the route param as both slug and id; the resolver tries slug first
  // and falls back to id-lookup. This keeps UUID URLs working for vehicles
  // that don't have a slug yet (e.g. just created).
  const looksLikeUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  const { data, loading, error } = useVehicleQuery({
    variables: looksLikeUuid ? { id: slug } : { slug },
  });
  const [deleteVehicle, { loading: deleting }] = useDeleteVehicleMutation({
    refetchQueries: [{ query: VehiclesDocument }],
  });

  const v = data?.vehicle;

  if (loading) {
    return (
      <Box py="6">
        <Flex align="center" gap="2">
          <Spinner /> <Text size="2">Loading vehicle…</Text>
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

  const vehicleId = v.id;
  const title = v.nickname || `${v.year} ${v.make} ${v.model}`;
  const subtitle = v.nickname ? `${v.year} ${v.make} ${v.model}` : null;
  const photos = (v.photos ?? []).map((p) => ({
    id: p.id,
    url: p.url ?? `/api/vehicles/photo/${p.id}`,
    caption: p.caption,
  }));
  const records = (v.serviceRecords ?? []).map((r) => ({
    id: r.id,
    type: r.type,
    serviceDate: r.serviceDate,
    odometerMiles: r.odometerMiles,
    costCents: r.costCents,
    vendor: r.vendor,
    notes: r.notes,
  }));

  async function handleDelete() {
    try {
      await deleteVehicle({ variables: { id: vehicleId } });
      router.push("/vehicles");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <Box py="6">
      <Flex direction="column" gap="5">
        <Flex justify="between" align="start" gap="3" wrap="wrap">
          <Flex direction="column" gap="1">
            <Button asChild variant="ghost" color="gray">
              <Link href="/vehicles">← All vehicles</Link>
            </Button>
            <Heading size="7">{title}</Heading>
            {subtitle && (
              <Text size="3" color="gray">
                {subtitle}
              </Text>
            )}
            <Flex gap="2" wrap="wrap" mt="1">
              {v.color && <Badge color="gray">{v.color}</Badge>}
              {v.odometerMiles != null && (
                <Badge color="gray">
                  {v.odometerMiles.toLocaleString()} mi
                </Badge>
              )}
              {v.licensePlate && (
                <Badge color="gray">Plate: {v.licensePlate}</Badge>
              )}
              {v.vin && <Badge color="gray">VIN: {v.vin}</Badge>}
            </Flex>
          </Flex>

          <AlertDialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialog.Trigger>
              <Button color="red" variant="soft" disabled={deleting}>
                Delete vehicle
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>Delete vehicle?</AlertDialog.Title>
              <AlertDialog.Description>
                This permanently removes the vehicle, photos, and service
                records.
              </AlertDialog.Description>
              <Flex gap="2" justify="end" mt="3">
                <AlertDialog.Cancel>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action>
                  <Button color="red" onClick={handleDelete} disabled={deleting}>
                    Delete
                  </Button>
                </AlertDialog.Action>
              </Flex>
            </AlertDialog.Content>
          </AlertDialog.Root>
        </Flex>

        {v.notes && (
          <Card size="2">
            <Text size="2" style={{ whiteSpace: "pre-wrap" }}>
              {v.notes}
            </Text>
          </Card>
        )}

        <Box>
          <Heading size="4" mb="3">
            Photos
          </Heading>
          <Flex direction="column" gap="3">
            <PhotosGrid
              vehicleId={vehicleId}
              vehicleSlug={slug}
              photos={photos}
            />
            <Card size="2">
              <PhotoUploader vehicleId={vehicleId} vehicleSlug={slug} />
            </Card>
          </Flex>
        </Box>

        <Separator size="4" />

        <ServiceLog
          vehicleId={vehicleId}
          vehicleSlug={slug}
          records={records}
        />
      </Flex>
    </Box>
  );
}
