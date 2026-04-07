import { AuthButton } from "@/components/auth-button";
import { Box, Flex, Heading, Separator, Text } from "@radix-ui/themes";
import { Logo } from "@/components/logo";
import Link from "next/link";
import { Suspense } from "react";
import { Nav } from "./nav";
import { css } from "styled-system/css";

const shellClass = css({
  minHeight: "100vh",
  display: "flex",
  flexDirection: "row",
});

const sidebarClass = css({
  width: "220px",
  minHeight: "100vh",
  position: "sticky",
  top: 0,
  display: "flex",
  flexDirection: "column",
  borderRight: "1px solid var(--gray-a4)",
  background:
    "linear-gradient(180deg, color-mix(in srgb, var(--indigo-2) 60%, transparent) 0%, color-mix(in srgb, var(--color-background) 95%, transparent) 100%)",
  padding: "var(--space-3)",
  flexShrink: 0,
  zIndex: 10,
  overflowY: "auto",
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { display: "none" },
  "@media (max-width: 768px)": {
    width: "56px",
    padding: "var(--space-2)",
  },
});

const logoLinkClass = css({
  textDecoration: "none",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "var(--space-2) var(--space-3)",
  marginBottom: "var(--space-3)",
  "@media (max-width: 768px)": {
    justifyContent: "center",
    padding: "var(--space-2)",
  },
});

const logoIconClass = css({
  width: "28px",
  height: "28px",
  borderRadius: "6px",
  background: "var(--indigo-a3)",
  border: "1px solid var(--indigo-a5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

const logoTextClass = css({
  "@media (max-width: 768px)": {
    display: "none",
  },
});

const authWrapperClass = css({
  marginTop: "auto",
  padding: "var(--space-2) var(--space-3)",
  "@media (max-width: 768px)": {
    padding: "var(--space-2)",
    justifyContent: "center",
    display: "flex",
  },
});

const mainClass = css({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
});

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={shellClass}>
      {/* Sidebar */}
      <aside className={sidebarClass}>
        <Link href="/dashboard" className={logoLinkClass}>
          <span className={logoIconClass}>
            <Logo size={16} />
          </span>
          <Heading size="3" className={logoTextClass}>Healthcare</Heading>
        </Link>

        <Nav />

        <div className={authWrapperClass}>
          <Suspense>
            <AuthButton />
          </Suspense>
        </div>
      </aside>

      {/* Main content */}
      <div className={mainClass}>
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
      </div>
    </div>
  );
}
