import { AuthButton } from "@/components/auth-button";
import { Box, Container, Flex, Heading, Text, Separator } from "@radix-ui/themes";
import { Suspense } from "react";

export default function Home() {
  return (
    <Box style={{ minHeight: "100vh" }}>
      <Box asChild style={{ borderBottom: "1px solid var(--gray-4)" }}>
        <header>
          <Container size="3">
            <Flex justify="between" align="center" py="3" px="4">
              <Heading size="4">Agentic Healthcare</Heading>
              <Suspense>
                <AuthButton />
              </Suspense>
            </Flex>
          </Container>
        </header>
      </Box>

      <Container size="2">
        <Flex direction="column" align="center" gap="4" py="9">
          <Heading size="8" align="center">Your health, analyzed</Heading>
          <Text size="4" color="gray" align="center">
            Upload your blood tests and get instant structured insights.
          </Text>
        </Flex>
      </Container>

      <Separator size="4" />

      <Box asChild>
        <footer>
          <Container size="3">
            <Flex justify="center" py="6">
              <Text size="2" color="gray">Agentic Healthcare</Text>
            </Flex>
          </Container>
        </footer>
      </Box>
    </Box>
  );
}
