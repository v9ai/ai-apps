"use client";

import { Flex, Heading, Text, Button, Card } from "@radix-ui/themes";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Flex justify="center" align="center" style={{ minHeight: "300px" }} p="5">
      <Card style={{ maxWidth: 480, width: "100%" }}>
        <Flex direction="column" gap="3" p="5" align="center">
          <Heading size="4">Something went wrong</Heading>
          <Text size="2" color="gray" align="center">
            {error.message || "An unexpected error occurred."}
          </Text>
          <Flex gap="3" mt="2">
            <Button variant="soft" color="gray" onClick={() => window.history.back()}>
              Go Back
            </Button>
            <Button onClick={() => reset()}>Try Again</Button>
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
}
