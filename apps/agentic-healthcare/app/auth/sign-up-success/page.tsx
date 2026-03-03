import { Card, Flex, Heading, Text } from "@radix-ui/themes";

export default function Page() {
  return (
    <Flex align="center" justify="center" style={{ minHeight: "100svh", padding: "var(--space-5)" }}>
      <Card size="3" style={{ width: "100%", maxWidth: 400 }}>
        <Flex direction="column" gap="3">
          <Heading size="6">Check your email</Heading>
          <Text size="2" color="gray">
            You&apos;ve successfully signed up. Please check your email to confirm your account before signing in.
          </Text>
        </Flex>
      </Card>
    </Flex>
  );
}
