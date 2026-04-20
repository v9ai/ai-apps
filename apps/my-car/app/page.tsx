import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { Box, Button, Container, Flex, Grid, Heading, Text } from "@radix-ui/themes";
import { requireUser } from "@/lib/require-user";
import { db } from "@/src/db";
import { cars, carPhotos } from "@/src/db/schema";
import { resolvePhotoUrl } from "@/lib/r2";
import { CarCard } from "@/components/car-card";
import { SignOutButton } from "@/components/sign-out-button";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId, user } = await requireUser();

  const userCars = await db
    .select()
    .from(cars)
    .where(eq(cars.userId, userId))
    .orderBy(desc(cars.createdAt));

  const thumbMap = new Map<string, string>();
  if (userCars.length > 0) {
    const photoRows = await db
      .select({
        carId: carPhotos.carId,
        r2Key: carPhotos.r2Key,
        createdAt: carPhotos.createdAt,
      })
      .from(carPhotos)
      .where(
        inArray(
          carPhotos.carId,
          userCars.map((c) => c.id),
        ),
      )
      .orderBy(desc(carPhotos.createdAt));

    const firstByCar = new Map<string, string>();
    for (const row of photoRows) {
      if (!firstByCar.has(row.carId)) firstByCar.set(row.carId, row.r2Key);
    }
    for (const [carId, key] of firstByCar) {
      thumbMap.set(carId, await resolvePhotoUrl(key));
    }
  }

  return (
    <Container size="4" p="5">
      <Flex direction="column" gap="5">
        <Flex justify="between" align="center">
          <Flex direction="column">
            <Heading size="7">My Cars</Heading>
            <Text size="2" color="gray">
              Signed in as {user.email}
            </Text>
          </Flex>
          <Flex gap="2">
            <Button asChild>
              <Link href="/cars/new">Add car</Link>
            </Button>
            <SignOutButton />
          </Flex>
        </Flex>

        {userCars.length === 0 ? (
          <Box py="6">
            <Flex direction="column" gap="3" align="center">
              <Text color="gray">No cars yet.</Text>
              <Button asChild>
                <Link href="/cars/new">Add your first car</Link>
              </Button>
            </Flex>
          </Box>
        ) : (
          <Grid columns={{ initial: "1", sm: "2", md: "3" }} gap="4">
            {userCars.map((c) => (
              <CarCard
                key={c.id}
                id={c.id}
                make={c.make}
                model={c.model}
                year={c.year}
                nickname={c.nickname}
                thumbnailUrl={thumbMap.get(c.id) ?? null}
              />
            ))}
          </Grid>
        )}
      </Flex>
    </Container>
  );
}
