"use client";

import { Flex, Heading, Text, Card } from "@radix-ui/themes";
import { AuthGate } from "@/app/components/AuthGate";

function LsfContent() {
  return (
    <Flex direction="column" gap="4" p="4">
      <Heading size="6">LSF</Heading>
      <Card>
        <Flex direction="column" gap="2" p="4">
          <Text color="gray">Empty for now.</Text>
        </Flex>
      </Card>
    </Flex>
  );
}

export default function LsfPage() {
  return (
    <AuthGate pageName="LSF" description="Sign in to view LSF research.">
      <LsfContent />
    </AuthGate>
  );
}
