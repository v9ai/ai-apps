"use client";

import { Flex, Heading, Text, Card } from "@radix-ui/themes";

export default function GamesPage() {
  return (
    <Flex direction="column" gap="4">
      <Heading size={{ initial: "6", md: "8" }}>Games</Heading>
      <Card>
        <Flex direction="column" gap="2" p="4" align="center">
          <Text color="gray">No games yet.</Text>
          <Text size="2" color="gray">
            Games and interactive exercises will appear here.
          </Text>
        </Flex>
      </Card>
    </Flex>
  );
}
