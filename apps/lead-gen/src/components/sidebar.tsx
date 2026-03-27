"use client";

import { Flex, Box, IconButton, Text } from "@radix-ui/themes";
import {
  GitHubLogoIcon,
  PersonIcon,
  CubeIcon,
  LayersIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavLink } from "@/components/ui";
import { AuthHeader } from "@/components/auth-header";
import { AdminNav } from "@/components/admin-nav";
import { useSidebar } from "@/components/sidebar-provider";

const SIDEBAR_WIDTH = 200;
const SIDEBAR_COLLAPSED_WIDTH = 56;

const NAV_ITEMS = [
  { href: "/companies", label: "companies", icon: <CubeIcon width={15} height={15} /> },
  { href: "/contacts", label: "contacts", icon: <PersonIcon width={15} height={15} /> },
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
        fontSize: 14,
        letterSpacing: "0.01em",
        transition: "width 0.2s ease, padding 0.2s ease",
        zIndex: 10,
      }}
    >
      <nav>
        {/* logo */}
        <Flex asChild align="center" justify="center" style={{ paddingLeft: collapsed ? 0 : 10, overflow: "hidden" }}>
        <Link href="/">
          {collapsed ? (
            <Image src="/logo.svg" alt="Lead-Gen" width={32} height={32} priority style={{ objectFit: "contain" }} />
          ) : (
            <Image src="/logo.svg" alt="Lead-Gen" width={160} height={36} priority />
          )}
        </Link>
        </Flex>

        {/* primary links */}
        <Flex direction="column" gap="1" mt="5" flexGrow="1">
          {NAV_ITEMS.map(({ href, label, icon }) => (
            <NavLink
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                justifyContent: collapsed ? "center" : "flex-start",
                padding: collapsed ? "5px 0" : "5px 8px",
              }}
            >
              {icon}
              {!collapsed && <Text as="span" size="2">{label}</Text>}
            </NavLink>
          ))}
          {!collapsed && <AdminNav />}
        </Flex>

        {/* bottom link */}
        <Flex direction="column" gap="1" mt="auto" pb="3">
          <NavLink
            href="/how-it-works"
            title={collapsed ? "how it works" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? "5px 0" : "5px 8px",
            }}
          >
            <LayersIcon width={15} height={15} />
            {!collapsed && <Text as="span" size="2">how it works</Text>}
          </NavLink>
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
                  href="https://github.com/nicolad/lead-gen"
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
