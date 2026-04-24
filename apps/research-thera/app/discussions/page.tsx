"use client";

import { Flex, Heading, Text, Card } from "@radix-ui/themes";
import { AuthGate } from "../components/AuthGate";

export default function DiscussionsPage() {
  return (
    <AuthGate
      pageName="Discussions"
      description="Discussions are private. Sign in to participate."
    >
      <Flex direction="column" gap="4">
        <Flex direction="column" gap="1">
          <Heading size={{ initial: "6", md: "8" }}>Discussions</Heading>
          <Text size="3" color="gray">
            Threaded conversations on therapeutic topics
          </Text>
        </Flex>

        <Card>
          <Flex direction="column" align="center" p="6" gap="2">
            <Text size="4" weight="bold">
              No discussions yet
            </Text>
            <Text size="2" color="gray">
              Coming soon
            </Text>
          </Flex>
        </Card>
      </Flex>
    </AuthGate>
  );
}
