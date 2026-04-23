"use client";

import { Flex, Heading, Text, Card, Callout } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { AuthGate } from "@/app/components/AuthGate";

export default function RoutinesPage() {
  return (
    <AuthGate pageName="Routines">
      <Flex direction="column" gap="4">
        <Flex align="center" justify="between" wrap="wrap" gap="3">
          <Heading size="6">Routines</Heading>
        </Flex>

        <Callout.Root color="indigo" variant="surface">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            Routines are coming soon — scheduled sequences of habits, reflections, and
            therapeutic practices that run on a cadence.
          </Callout.Text>
        </Callout.Root>

        <Card>
          <Flex direction="column" gap="2" p="2">
            <Text size="2" color="gray">
              No routines yet. Once available, you&apos;ll be able to compose morning,
              evening, and weekly routines from existing habits and practices.
            </Text>
          </Flex>
        </Card>
      </Flex>
    </AuthGate>
  );
}
