import { Box, Flex, Heading, Separator, Text } from "@radix-ui/themes";
import { SearchForm } from "./search-form";
import { QAForm } from "./qa-form";
import { TrendsSection } from "./trends-section";

export default function SearchPage() {
  return (
    <Box py="8" style={{ maxWidth: 800, margin: "0 auto" }}>
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="1">
          <Heading size="7" weight="bold">Search & Health Q&A</Heading>
          <Text size="2" color="gray">
            Search your blood tests, track marker trends, and ask AI-powered
            health questions.
          </Text>
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="2">
          <Heading size="4">Semantic Search</Heading>
          <Text size="2" color="gray">
            Search across your blood tests or individual markers using natural
            language.
          </Text>
        </Flex>
        <SearchForm />

        <Separator size="4" />

        <Flex direction="column" gap="2">
          <Heading size="4">Health Q&A</Heading>
          <Text size="2" color="gray">
            Ask questions about your health data. The AI considers your blood
            test results and known conditions.
          </Text>
        </Flex>
        <QAForm />

        <Separator size="4" />

        <Flex direction="column" gap="2">
          <Heading size="4">Marker Trends</Heading>
          <Text size="2" color="gray">
            Track how a marker changes over time across your tests.
          </Text>
        </Flex>
        <TrendsSection />
      </Flex>
    </Box>
  );
}
