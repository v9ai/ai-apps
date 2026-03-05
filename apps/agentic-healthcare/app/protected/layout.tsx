import { AuthButton } from "@/components/auth-button";
import { Box, Container, Flex, Heading, Separator, Text } from "@radix-ui/themes";
import { HeartPulse } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Nav } from "./nav";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Accent gradient bar */}
      <Box
        style={{
          position: "sticky",
          top: 0,
          zIndex: 11,
          height: 3,
          background: "linear-gradient(90deg, var(--indigo-9), var(--indigo-7), var(--indigo-9))",
          flexShrink: 0,
        }}
      />
      <Box
        asChild
        style={{
          position: "sticky",
          top: 3,
          zIndex: 10,
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--indigo-2) 60%, transparent) 0%, color-mix(in srgb, var(--color-background) 85%, transparent) 100%)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.1)",
        }}
      >
        <header>
          <Container size="4" px="4">
            <Flex justify="between" align="center" py="2">
              <Flex align="center" gap="3" asChild>
                <Link href="/protected" style={{ textDecoration: "none" }}>
                  <Flex
                    align="center"
                    justify="center"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "var(--indigo-a3)",
                      border: "1px solid var(--indigo-a5)",
                    }}
                  >
                    <HeartPulse size={18} style={{ color: "var(--indigo-9)" }} />
                  </Flex>
                  <Heading size="4">Agentic Healthcare</Heading>
                </Link>
              </Flex>
              <Suspense>
                <AuthButton />
              </Suspense>
            </Flex>
            <Nav />
          </Container>
        </header>
      </Box>

      <Box style={{ flex: 1 }}>
        <Container size="3" px="4" py="6">
          {children}
        </Container>
      </Box>

      <Separator size="4" />
      <Flex direction="column" align="center" gap="1" py="6">
        <Text size="1" color="gray">Agentic Healthcare</Text>
        <Text size="1" style={{ color: "var(--gray-8)" }}>
          Powered by AI
        </Text>
      </Flex>
    </Box>
  );
}
