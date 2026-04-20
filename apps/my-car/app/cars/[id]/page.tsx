import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Heading,
  Separator,
  Text,
} from "@radix-ui/themes";
import { requireUser } from "@/lib/require-user";
import { db } from "@/src/db";
import { cars, carPhotos, serviceRecords } from "@/src/db/schema";
import { resolvePhotoUrl } from "@/lib/r2";
import { PhotoUploader } from "@/components/photo-uploader";
import { PhotosGrid, type PhotoItem } from "@/components/photos-grid";
import { ServiceLog } from "@/components/service-log";
import { DeleteCarButton } from "./delete-car-button";

export const dynamic = "force-dynamic";

export default async function CarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await requireUser();
  const { id } = await params;

  const carRows = await db
    .select()
    .from(cars)
    .where(and(eq(cars.id, id), eq(cars.userId, userId)))
    .limit(1);

  if (carRows.length === 0) notFound();
  const car = carRows[0];

  const [photoRows, serviceRows] = await Promise.all([
    db
      .select()
      .from(carPhotos)
      .where(eq(carPhotos.carId, id))
      .orderBy(desc(carPhotos.createdAt)),
    db
      .select()
      .from(serviceRecords)
      .where(eq(serviceRecords.carId, id))
      .orderBy(desc(serviceRecords.serviceDate), asc(serviceRecords.createdAt)),
  ]);

  const photos: PhotoItem[] = await Promise.all(
    photoRows.map(async (p) => ({
      id: p.id,
      url: await resolvePhotoUrl(p.r2Key),
      caption: p.caption,
    })),
  );

  const title = car.nickname || `${car.year} ${car.make} ${car.model}`;
  const subtitle = car.nickname ? `${car.year} ${car.make} ${car.model}` : null;

  return (
    <Container size="4" p="5">
      <Flex direction="column" gap="5">
        <Flex justify="between" align="start" gap="3" wrap="wrap">
          <Flex direction="column" gap="1">
            <Flex gap="2" align="center">
              <Button asChild variant="ghost" color="gray">
                <Link href="/">← All cars</Link>
              </Button>
            </Flex>
            <Heading size="7">{title}</Heading>
            {subtitle && (
              <Text size="3" color="gray">
                {subtitle}
              </Text>
            )}
            <Flex gap="2" wrap="wrap" mt="1">
              {car.color && <Badge color="gray">{car.color}</Badge>}
              {car.odometerMiles != null && (
                <Badge color="gray">{car.odometerMiles.toLocaleString()} mi</Badge>
              )}
              {car.licensePlate && <Badge color="gray">Plate: {car.licensePlate}</Badge>}
              {car.vin && <Badge color="gray">VIN: {car.vin}</Badge>}
            </Flex>
          </Flex>
          <DeleteCarButton id={car.id} />
        </Flex>

        {car.notes && (
          <Card size="2">
            <Text size="2" style={{ whiteSpace: "pre-wrap" }}>
              {car.notes}
            </Text>
          </Card>
        )}

        <Box>
          <Heading size="4" mb="3">
            Photos
          </Heading>
          <Flex direction="column" gap="3">
            <PhotosGrid photos={photos} />
            <Card size="2">
              <PhotoUploader carId={car.id} />
            </Card>
          </Flex>
        </Box>

        <Separator size="4" />

        <ServiceLog
          carId={car.id}
          records={serviceRows.map((r) => ({
            id: r.id,
            type: r.type,
            serviceDate: r.serviceDate,
            odometerMiles: r.odometerMiles,
            costCents: r.costCents,
            vendor: r.vendor,
            notes: r.notes,
          }))}
        />
      </Flex>
    </Container>
  );
}
