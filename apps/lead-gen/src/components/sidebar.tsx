"use client";

import { Flex, Box, IconButton, Text } from "@radix-ui/themes";
import {
  GitHubLogoIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { css } from "styled-system/css";
import { AuthHeader } from "@/components/auth-header";
import { useSidebar } from "@/components/sidebar-provider";

const SIDEBAR_WIDTH = 200;
const SIDEBAR_COLLAPSED_WIDTH = 56;

export function Sidebar() {
  const { collapsed, toggle } = useSidebar();
  const pathname = usePathname();
  const isHomepage = pathname === "/";

  if (isHomepage) return null;

  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <Flex
      asChild
      direction="column"
      p={collapsed ? "2" : "4"}
      gap="2"
      flexShrink="0"
      className={css({ fontSize: "base", letterSpacing: "normal" })}
      style={{
        width,
        borderRight: "1px solid var(--gray-6)",
        background: "var(--gray-2)",
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        overflowY: "hidden",
        overflowX: "hidden",
        transition: "width 0.2s ease, padding 0.2s ease",
        zIndex: 10,
      }}
    >
      <nav>
        {/* logo */}
        <Flex asChild align="center" justify="center" style={{ paddingLeft: collapsed ? 0 : 10, overflow: "hidden" }}>
        <Link href="/dashboard" style={{ textDecoration: "none" }}>
          {collapsed ? (
            <Text size="4" weight="bold" style={{ color: "var(--accent-11)", letterSpacing: "-0.02em" }}>A</Text>
          ) : (
            <Text size="3" weight="bold" style={{ color: "var(--accent-11)", letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>agentic lead gen</Text>
          )}
        </Link>
        </Flex>

        {/* footer: auth + github + toggle */}
        <Flex
          direction="column"
          gap="3"
          pt="3"
          mt="auto"
          style={{ borderTop: "1px solid var(--gray-6)" }}
        >
          {!collapsed && <AuthHeader />}
          <Flex align="center" justify={collapsed ? "center" : "between"}>
            {!collapsed && (
              <Flex asChild align="center">
                <Link
                  href="https://github.com/v9ai/ai-apps/tree/main/apps/lead-gen"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <GitHubLogoIcon width={18} height={18} style={{ color: "var(--gray-9)" }} />
                </Link>
              </Flex>
            )}
            <IconButton
              onClick={toggle}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              variant="ghost"
              color="gray"
              size="1"
            >
              {collapsed ? (
                <DoubleArrowRightIcon width={16} height={16} />
              ) : (
                <DoubleArrowLeftIcon width={16} height={16} />
              )}
            </IconButton>
          </Flex>
        </Flex>
      </nav>
    </Flex>
  );
}

export function MainContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const pathname = usePathname();
  const isHomepage = pathname === "/";
  const marginLeft = isHomepage ? 0 : collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <Box
      asChild
      flexGrow="1"
      minWidth="0"
      style={{
        marginLeft,
        transition: "margin-left 0.2s ease",
      }}
    >
      <main id="main-content">
        {children}
      </main>
    </Box>
  );
}
