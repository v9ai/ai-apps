import { Card, Flex, Heading, Text } from "@radix-ui/themes";
import { Suspense } from "react";

async function ErrorContent({ searchParams }: { searchParams: Promise<{ error: string }> }) {
  const params = await searchParams;
  return (
    <Text size="2" color="gray">
      {params?.error ? `Error: ${params.error}` : "An unspecified error occurred."}
    </Text>
  );
}

export default function Page({ searchParams }: { searchParams: Promise<{ error: string }> }) {
  return (
    <Flex align="center" justify="center" style={{ minHeight: "100svh", padding: "var(--space-5)" }}>
      <Card size="3" style={{ width: "100%", maxWidth: 400 }}>
        <Flex direction="column" gap="3">
          <Heading size="6">Something went wrong</Heading>
          <Suspense>
            <ErrorContent searchParams={searchParams} />
          </Suspense>
        </Flex>
      </Card>
    </Flex>
  );
}
