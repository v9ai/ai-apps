import { Flex, Heading, Text, Button, Card } from "@radix-ui/themes";
import NextLink from "next/link";

export default function NotFound() {
  return (
    <Flex justify="center" align="center" style={{ minHeight: "300px" }} p="5">
      <Card style={{ maxWidth: 480, width: "100%" }}>
        <Flex direction="column" gap="3" p="5" align="center">
          <Heading size="4">Page Not Found</Heading>
          <Text size="2" color="gray" align="center">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </Text>
          <Button variant="soft" asChild mt="2">
            <NextLink href="/">Go Home</NextLink>
          </Button>
        </Flex>
      </Card>
    </Flex>
  );
}
