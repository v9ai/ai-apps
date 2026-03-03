import { AuthButton } from "@/components/auth-button";
import { Box, Container, Flex, Heading, Separator } from "@radix-ui/themes";
import Link from "next/link";
import { Suspense } from "react";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box style={{ minHeight: "100vh" }}>
      <Box asChild style={{ borderBottom: "1px solid var(--gray-4)" }}>
        <header>
          <Container size="3">
            <Flex justify="between" align="center" py="3" px="4">
              <Flex align="center" gap="5">
                <Heading size="4" asChild>
                  <Link href="/protected">Agentic Healthcare</Link>
                </Heading>
                <Link href="/protected/blood-tests" style={{ fontSize: "var(--font-size-2)", color: "var(--gray-11)" }}>
                  Blood Tests
                </Link>
              </Flex>
              <Suspense>
                <AuthButton />
              </Suspense>
            </Flex>
          </Container>
        </header>
      </Box>

      <Container size="3" px="4">
        {children}
      </Container>

      <Separator size="4" />
      <Flex justify="center" py="6">
        <Box style={{ fontSize: "var(--font-size-1)", color: "var(--gray-9)" }}>Agentic Healthcare</Box>
      </Flex>
    </Box>
  );
}
