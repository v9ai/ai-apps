import Link from "next/link";
import {
  Button,
  Card,
  Container,
  Flex,
  Heading,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import { requireUser } from "@/lib/require-user";
import { createCarAction } from "@/lib/actions/cars";

export const dynamic = "force-dynamic";

export default async function NewCarPage() {
  await requireUser();

  return (
    <Container size="2" p="5">
      <Flex direction="column" gap="4">
        <Flex justify="between" align="center">
          <Heading size="6">Add a car</Heading>
          <Button asChild variant="soft" color="gray">
            <Link href="/">Cancel</Link>
          </Button>
        </Flex>

        <Card size="3">
          <form action={createCarAction}>
            <Flex direction="column" gap="3">
              <Flex gap="3" wrap="wrap">
                <Flex direction="column" gap="1" style={{ flex: 2, minWidth: 160 }}>
                  <Text as="label" size="2" weight="medium">
                    Make
                  </Text>
                  <TextField.Root name="make" placeholder="Toyota" required />
                </Flex>
                <Flex direction="column" gap="1" style={{ flex: 2, minWidth: 160 }}>
                  <Text as="label" size="2" weight="medium">
                    Model
                  </Text>
                  <TextField.Root name="model" placeholder="Camry" required />
                </Flex>
                <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 100 }}>
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
                <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 160 }}>
                  <Text as="label" size="2">
                    Nickname
                  </Text>
                  <TextField.Root name="nickname" placeholder="Daily driver" />
                </Flex>
                <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 120 }}>
                  <Text as="label" size="2">
                    Color
                  </Text>
                  <TextField.Root name="color" placeholder="Silver" />
                </Flex>
                <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 140 }}>
                  <Text as="label" size="2">
                    Odometer (miles)
                  </Text>
                  <TextField.Root name="odometerMiles" type="number" min={0} />
                </Flex>
              </Flex>

              <Flex gap="3" wrap="wrap">
                <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 180 }}>
                  <Text as="label" size="2">
                    VIN
                  </Text>
                  <TextField.Root name="vin" placeholder="17-character VIN" maxLength={32} />
                </Flex>
                <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 140 }}>
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

              <Button type="submit" size="3">
                Create car
              </Button>
            </Flex>
          </form>
        </Card>
      </Flex>
    </Container>
  );
}
