"use client";

import { Flex, Box, IconButton, Text } from "@radix-ui/themes";
import {
  GitHubLogoIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
  HomeIcon,
  RocketIcon,
  CountdownTimerIcon,
  PersonIcon,
  EnvelopeClosedIcon,
  Pencil2Icon,
  CubeIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { css } from "styled-system/css";
import type { ComponentType } from "react";
import { AuthHeader } from "@/components/auth-header";
import { useSidebar } from "@/components/sidebar-provider";
import { TenantSelect } from "@/components/tenant-select";

const SIDEBAR_WIDTH = 200;
const SIDEBAR_COLLAPSED_WIDTH = 56;

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ width?: number; height?: number; style?: React.CSSProperties }>;
};

const NAV_ITEMS: readonly NavItem[] = [
  { href: "/companies", label: "Companies", icon: HomeIcon },
  { href: "/opportunities", label: "Opportunities", icon: RocketIcon },
  { href: "/follow-ups", label: "Follow-ups", icon: CountdownTimerIcon },
  { href: "/contacts", label: "Contacts", icon: PersonIcon },
  { href: "/emails", label: "Emails", icon: EnvelopeClosedIcon },
  { href: "/admin/linkedin-posts", label: "Posts", icon: Pencil2Icon },
  { href: "/products", label: "Products", icon: CubeIcon },
];

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

        {/* nav links */}
        <Flex direction="column" gap="1" pt="4" pb="2" style={{ flex: 1, overflowY: "auto" }}>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                style={{ textDecoration: "none" }}
              >
                <Flex
                  align="center"
                  gap="2"
                  px="2"
                  py="1"
                  style={{
                    borderRadius: 6,
                    background: active ? "var(--accent-3)" : "transparent",
                    color: active ? "var(--accent-11)" : "var(--gray-11)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                  }}
                  className={css({ _hover: { background: "var(--accent-3)" } })}
                >
                  <Icon width={16} height={16} style={{ flexShrink: 0 }} />
                  {!collapsed && (
                    <Text size="2" weight={active ? "medium" : "regular"}>
                      {label}
                    </Text>
                  )}
                </Flex>
              </Link>
            );
          })}
        </Flex>

        {/* footer: tenant + auth + github + toggle */}
        <Flex
          direction="column"
          gap="3"
          pt="3"
          mt="auto"
          style={{ borderTop: "1px solid var(--gray-6)" }}
        >
          <TenantSelect />
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
