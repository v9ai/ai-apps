"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import {
  useAddVehicleMutation,
  VehiclesDocument,
} from "@/app/__generated__/hooks";
import { AuthGate } from "@/app/components/AuthGate";

export default function NewVehiclePage() {
  return (
    <AuthGate pageName="Add vehicle" description="Sign in to add a vehicle.">
      <NewVehicleContent />
    </AuthGate>
  );
}

function NewVehicleContent() {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [addVehicle, { loading }] = useAddVehicleMutation({
    refetchQueries: [{ query: VehiclesDocument }],
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const fd = new FormData(form);
    const make = String(fd.get("make") ?? "").trim();
    const model = String(fd.get("model") ?? "").trim();
    const yearStr = String(fd.get("year") ?? "").trim();
    if (!make || !model || !yearStr) {
      setError("Make, model, and year are required");
      return;
    }
    const yearNum = Number.parseInt(yearStr, 10);
    if (!Number.isFinite(yearNum)) {
      setError("Year must be a number");
      return;
    }
    const odo = String(fd.get("odometerMiles") ?? "").trim();
    try {
      const res = await addVehicle({
        variables: {
          input: {
            make,
            model,
            year: yearNum,
            vin: (String(fd.get("vin") ?? "").trim() || null) as string | null,
            licensePlate:
              (String(fd.get("licensePlate") ?? "").trim() || null) as
                | string
                | null,
            nickname:
              (String(fd.get("nickname") ?? "").trim() || null) as
                | string
                | null,
            color: (String(fd.get("color") ?? "").trim() || null) as
              | string
              | null,
            odometerMiles: odo ? Number.parseInt(odo, 10) : null,
            notes: (String(fd.get("notes") ?? "").trim() || null) as
              | string
              | null,
          },
        },
      });
      const id = res.data?.addVehicle?.id;
      if (id) router.push(`/vehicles/${id}`);
      else router.push("/vehicles");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add vehicle");
    }
  }

  return (
    <Box py="6">
      <Flex direction="column" gap="5">
        <Flex justify="between" align="center" wrap="wrap" gap="3">
          <Heading size="6">Add a vehicle</Heading>
          <Button asChild variant="soft" color="gray">
            <Link href="/vehicles">Cancel</Link>
          </Button>
        </Flex>

        <Card size="3">
          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="3">
              <Flex gap="3" wrap="wrap">
                <Flex
                  direction="column"
                  gap="1"
                  style={{ flex: 2, minWidth: 160 }}
                >
                  <Text as="label" size="2" weight="medium">
                    Make
                  </Text>
                  <TextField.Root name="make" placeholder="Toyota" required />
                </Flex>
                <Flex
                  direction="column"
                  gap="1"
                  style={{ flex: 2, minWidth: 160 }}
                >
                  <Text as="label" size="2" weight="medium">
                    Model
                  </Text>
                  <TextField.Root name="model" placeholder="Camry" required />
                </Flex>
                <Flex
                  direction="column"
                  gap="1"
                  style={{ flex: 1, minWidth: 100 }}
                >
                  <Text as="label" size="2" weight="medium">
                    Year
                  </Text>
                  <TextField.Root
                    name="year"
                    type="number"
                    min={1900}
                    defaultValue={new Date().getFullYear()}
                    required
                  />
                </Flex>
              </Flex>

              <Flex gap="3" wrap="wrap">
                <Flex
                  direction="column"
                  gap="1"
                  style={{ flex: 1, minWidth: 160 }}
                >
                  <Text as="label" size="2">
                    Nickname
                  </Text>
                  <TextField.Root
                    name="nickname"
                    placeholder="Daily driver"
                  />
                </Flex>
                <Flex
                  direction="column"
                  gap="1"
                  style={{ flex: 1, minWidth: 120 }}
                >
                  <Text as="label" size="2">
                    Color
                  </Text>
                  <TextField.Root name="color" placeholder="Silver" />
                </Flex>
                <Flex
                  direction="column"
                  gap="1"
                  style={{ flex: 1, minWidth: 140 }}
                >
                  <Text as="label" size="2">
                    Odometer (miles)
                  </Text>
                  <TextField.Root
                    name="odometerMiles"
                    type="number"
                    min={0}
                  />
                </Flex>
              </Flex>

              <Flex gap="3" wrap="wrap">
                <Flex
                  direction="column"
                  gap="1"
                  style={{ flex: 1, minWidth: 180 }}
                >
                  <Text as="label" size="2">
                    VIN
                  </Text>
                  <TextField.Root
                    name="vin"
                    placeholder="17-character VIN"
                    maxLength={32}
                  />
                </Flex>
                <Flex
                  direction="column"
                  gap="1"
                  style={{ flex: 1, minWidth: 140 }}
                >
                  <Text as="label" size="2">
                    License plate
                  </Text>
                  <TextField.Root name="licensePlate" maxLength={16} />
                </Flex>
              </Flex>

              <Flex direction="column" gap="1">
                <Text as="label" size="2">
                  Notes
                </Text>
                <TextArea name="notes" rows={3} />
              </Flex>

              {error && (
                <Text size="2" color="red">
                  {error}
                </Text>
              )}

              <Button type="submit" size="3" disabled={loading}>
                {loading ? "Creating…" : "Create vehicle"}
              </Button>
            </Flex>
          </form>
        </Card>
      </Flex>
    </Box>
  );
}
