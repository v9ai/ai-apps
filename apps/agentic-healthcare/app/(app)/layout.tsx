import { AuthButton } from "@/components/auth-button";
import { Box, Flex, Heading, Separator, Text } from "@radix-ui/themes";
import { Logo } from "@/components/logo";
import Link from "next/link";
import { Suspense } from "react";
import { Nav } from "./nav";
import { css } from "styled-system/css";

const headerClass = css({
  position: "sticky",
  top: "0",
  zIndex: "10",
  background:
    "linear-gradient(180deg, color-mix(in srgb, var(--indigo-2) 60%, transparent) 0%, color-mix(in srgb, var(--color-background) 85%, transparent) 100%)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  boxShadow:
    "0 1px 3px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.1)",
  width: "100%",
});

const logoIconClass = css({
  width: "32px",
  height: "32px",
  borderRadius: "8px",
  background: "var(--indigo-a3)",
  border: "1px solid var(--indigo-a5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: "0",
});

const logoLinkClass = css({
  textDecoration: "none",
  display: "flex",
  alignItems: "center",
  gap: "12px",
});

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box
      className={css({ minHeight: "100vh", display: "flex", flexDirection: "column" })}
    >
      <header className={headerClass}>
        <Flex justify="between" align="center" px="6" py="2">
          <Link href="/dashboard" className={logoLinkClass}>
            <span className={logoIconClass}>
              <Logo size={18} />
            </span>
            <Heading size="4">Agentic Healthcare</Heading>
          </Link>
          <Suspense>
            <AuthButton />
          </Suspense>
        </Flex>
        <Box px="6">
          <Nav />
        </Box>
      </header>

      <Box px="6" py="6" className={css({ flex: "1" })}>
        {children}
      </Box>

      <Separator size="4" />
      <Flex direction="column" align="center" gap="1" py="6">
        <Text size="1" color="gray">
          Agentic Healthcare
        </Text>
        <Text size="1" className={css({ color: "var(--gray-8)" })}>
          Powered by AI
        </Text>
      </Flex>
    </Box>
  );
}
