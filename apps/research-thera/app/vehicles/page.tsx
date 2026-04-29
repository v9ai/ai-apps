"use client";

import Link from "next/link";
import {
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Heading,
  Spinner,
  Text,
} from "@radix-ui/themes";
import { useVehiclesQuery } from "../__generated__/hooks";
import { AuthGate } from "../components/AuthGate";

export default function VehiclesPage() {
  return (
    <AuthGate
      pageName="Vehicles"
      description="Track your cars, photos, and service history. Sign in to view your fleet."
    >
      <VehiclesContent />
    </AuthGate>
  );
}

function VehiclesContent() {
  const { data, loading, error } = useVehiclesQuery();
  const vehicles = data?.vehicles ?? [];

  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Flex justify="between" align="start" wrap="wrap" gap="3">
          <Flex direction="column" gap="1">
            <Heading size={{ initial: "6", md: "8" }} weight="bold">
              Vehicles
            </Heading>
            <Text size="3" color="gray">
              Track cars, upload photos, and log service records.
            </Text>
          </Flex>
          <Button asChild>
            <Link href="/vehicles/new">Add vehicle</Link>
          </Button>
        </Flex>

        {loading && (
          <Flex align="center" gap="2">
            <Spinner /> <Text size="2">Loading…</Text>
          </Flex>
        )}

        {error && (
          <Card>
            <Text color="red" size="2">
              {error.message}
            </Text>
          </Card>
        )}

        {!loading && vehicles.length === 0 && (
          <Card size="2">
            <Flex direction="column" gap="3" align="center" py="4">
              <Text color="gray">No vehicles yet.</Text>
              <Button asChild>
                <Link href="/vehicles/new">Add your first vehicle</Link>
              </Button>
            </Flex>
          </Card>
        )}

        {vehicles.length > 0 && (
          <Grid columns={{ initial: "1", sm: "2", md: "3" }} gap="4">
            {vehicles.map((v) => {
              const title = v.nickname || `${v.year} ${v.make} ${v.model}`;
              const subtitle = v.nickname
                ? `${v.year} ${v.make} ${v.model}`
                : null;
              const href = v.slug
                ? `/vehicles/${v.slug}`
                : `/vehicles/${v.id}`;
              return (
                <Link
                  key={v.id}
                  href={href}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <Card size="2">
                    <Flex direction="column" gap="3">
                      {v.thumbnailUrl ? (
                        <img
                          src={v.thumbnailUrl}
                          alt={title}
                          style={{
                            width: "100%",
                            aspectRatio: "16 / 10",
                            objectFit: "cover",
                            borderRadius: 6,
                            background: "var(--gray-3)",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            aspectRatio: "16 / 10",
                            borderRadius: 6,
                            background: "var(--gray-3)",
                          }}
                        />
                      )}
                      <Flex direction="column" gap="1">
                        <Heading size="3">{title}</Heading>
                        {subtitle && (
                          <Text size="2" color="gray">
                            {subtitle}
                          </Text>
                        )}
                      </Flex>
                    </Flex>
                  </Card>
                </Link>
              );
            })}
          </Grid>
        )}
      </Flex>
    </Box>
  );
}
