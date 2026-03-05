import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import { KnowledgeTabs } from "./knowledge-tabs";

export default function KnowledgePage() {
  return (
    <Box py="8" style={{ maxWidth: 700, margin: "0 auto" }}>
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="2">
          <Heading size="6">Knowledge Base</Heading>
          <Text size="2" color="gray">
            Browse NYC public law data including NYPD complaint records and civil
            litigation cases from the City of New York Open Data portal.
          </Text>
        </Flex>
        <KnowledgeTabs />
      </Flex>
    </Box>
  );
}
