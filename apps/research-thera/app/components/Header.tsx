"use client";

import { useState } from "react";
import { Box, Flex, Heading, IconButton, Button, DropdownMenu } from "@radix-ui/themes";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  GitHubLogoIcon,
  HamburgerMenuIcon,
} from "@radix-ui/react-icons";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import UserMenu from "./UserMenu";
import { SIDEBAR_WIDTH } from "./sidebar-constants";

export { SIDEBAR_WIDTH };

type NavLeaf = { href: string; label: string };
type NavItem =
  | ({ kind: "link" } & NavLeaf)
  | { kind: "group"; key: string; label: string; children: NavLeaf[] };

const NAV_ITEMS: NavItem[] = [
  { kind: "link", href: "/appointments", label: "Appointments" },
  { kind: "link", href: "/books", label: "Books" },
  { kind: "link", href: "/chat", label: "Chat" },
  { kind: "link", href: "/dashboard", label: "Dashboard" },
  { kind: "link", href: "/discussions", label: "Discuții" },
  { kind: "link", href: "/family", label: "Family" },
  { kind: "link", href: "/games", label: "Games" },
  { kind: "link", href: "/goals", label: "Goals" },
  {
    kind: "group",
    key: "health",
    label: "Health",
    children: [
      { href: "/allergies", label: "Allergies & Intolerances" },
      { href: "/blood-tests", label: "Blood Tests" },
      { href: "/brain-memory", label: "Brain & Memory" },
      { href: "/conditions", label: "Conditions" },
      { href: "/doctors", label: "Doctors" },
      { href: "/issues", label: "Issues" },
      { href: "/medications", label: "Medications" },
      { href: "/protocols", label: "Protocols" },
      { href: "/symptoms", label: "Symptoms" },
    ],
  },
  { kind: "link", href: "/habits", label: "Habits" },
  { kind: "link", href: "/journal", label: "Journal" },
  { kind: "link", href: "/notes", label: "Notes" },
  { kind: "link", href: "/routines", label: "Routines" },
  { kind: "link", href: "/search", label: "Search" },
  { kind: "link", href: "/stories", label: "Stories" },
  { kind: "link", href: "/tasks", label: "Tasks" },
  { kind: "link", href: "/trajectory", label: "Trajectory" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const isPathActive = (href: string) => pathname.startsWith(href);
  const isGroupActive = (children: NavLeaf[]) =>
    children.some((c) => isPathActive(c.href));

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of NAV_ITEMS) {
      if (item.kind === "group") {
        initial[item.key] = isGroupActive(item.children);
      }
    }
    return initial;
  });

  const renderLeafButton = (link: NavLeaf, indent = false) => {
    const isActive = isPathActive(link.href);
    return (
      <Button
        key={link.href}
        variant="ghost"
        size="2"
        color={isActive ? "indigo" : "gray"}
        highContrast={isActive}
        asChild
        style={{
          justifyContent: "flex-start",
          ...(indent && { paddingLeft: "20px" }),
          ...(isActive && {
            borderLeft: "2px solid var(--indigo-9)",
            paddingLeft: indent ? "18px" : "10px",
            background: "var(--indigo-a3)",
          }),
        }}
      >
        <Link href={link.href}>{link.label}</Link>
      </Button>
    );
  };

  return (
    <>
      {/* Desktop sidebar */}
      <Box
        display={{ initial: "none", md: "block" }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: SIDEBAR_WIDTH,
          zIndex: 50,
          background: "rgba(10, 10, 18, 0.82)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRight: "1px solid var(--gray-a4)",
        }}
      >
        <Flex direction="column" height="100%" px="4" py="5" gap="6">
          <Link
            href="/"
            aria-label="ResearchThera — home"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <Heading size="4" style={{ letterSpacing: "-0.025em" }}>
              ResearchThera
            </Heading>
          </Link>

          <nav aria-label="Main navigation" style={{ flex: 1 }}>
            <Flex direction="column" gap="2">
              {NAV_ITEMS.map((item) => {
                if (item.kind === "link") {
                  return renderLeafButton(item);
                }
                const groupActive = isGroupActive(item.children);
                const isOpen = openGroups[item.key] ?? false;
                const subnavId = `subnav-${item.key}`;
                return (
                  <Flex key={item.key} direction="column" gap="1">
                    <Button
                      variant="ghost"
                      size="2"
                      color={groupActive ? "indigo" : "gray"}
                      highContrast={groupActive}
                      onClick={() =>
                        setOpenGroups((prev) => ({
                          ...prev,
                          [item.key]: !isOpen,
                        }))
                      }
                      aria-expanded={isOpen}
                      aria-controls={subnavId}
                      style={{
                        justifyContent: "space-between",
                        ...(groupActive && {
                          background: "var(--indigo-a3)",
                        }),
                      }}
                    >
                      <span>{item.label}</span>
                      {isOpen ? (
                        <ChevronDownIcon width="14" height="14" />
                      ) : (
                        <ChevronRightIcon width="14" height="14" />
                      )}
                    </Button>
                    {isOpen && (
                      <Flex
                        id={subnavId}
                        direction="column"
                        gap="1"
                        style={{ paddingLeft: "8px" }}
                      >
                        {item.children.map((child) =>
                          renderLeafButton(child, true)
                        )}
                      </Flex>
                    )}
                  </Flex>
                );
              })}
            </Flex>
          </nav>

          <Flex direction="column" gap="3">
            <Flex align="center" justify="end" gap="2">
              <IconButton
                asChild
                variant="ghost"
                size="2"
                color="gray"
                aria-label="View source on GitHub"
              >
                <a
                  href="https://github.com/v9ai/research-thera"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <GitHubLogoIcon width="16" height="16" />
                </a>
              </IconButton>
            </Flex>
            <UserMenu />
          </Flex>
        </Flex>
      </Box>

      {/* Mobile top bar */}
      <Box
        display={{ initial: "block", md: "none" }}
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(10, 10, 18, 0.82)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--gray-a4)",
          marginBottom: "var(--space-5)",
        }}
        asChild
      >
        <header>
          <Flex justify="between" align="center" py="3" px="3">
            <Link
              href="/"
              aria-label="ResearchThera — home"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Heading size="4" style={{ letterSpacing: "-0.025em", whiteSpace: "nowrap" }}>
                ResearchThera
              </Heading>
            </Link>
            <Flex align="center" gap="3">
              <UserMenu />
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  <IconButton variant="ghost" size="2" color="gray" aria-label="Open menu">
                    <HamburgerMenuIcon width="18" height="18" />
                  </IconButton>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end">
                  {NAV_ITEMS.map((item) => {
                    if (item.kind === "link") {
                      const isActive = isPathActive(item.href);
                      return (
                        <DropdownMenu.Item
                          key={item.href}
                          color={isActive ? "indigo" : undefined}
                          onClick={() => router.push(item.href)}
                        >
                          {item.label}
                        </DropdownMenu.Item>
                      );
                    }
                    return (
                      <DropdownMenu.Sub key={item.key}>
                        <DropdownMenu.SubTrigger>
                          {item.label}
                        </DropdownMenu.SubTrigger>
                        <DropdownMenu.SubContent>
                          {item.children.map((child) => {
                            const isActive = isPathActive(child.href);
                            return (
                              <DropdownMenu.Item
                                key={child.href}
                                color={isActive ? "indigo" : undefined}
                                onClick={() => router.push(child.href)}
                              >
                                {child.label}
                              </DropdownMenu.Item>
                            );
                          })}
                        </DropdownMenu.SubContent>
                      </DropdownMenu.Sub>
                    );
                  })}
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item asChild>
                    <a
                      href="https://github.com/v9ai/research-thera"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      GitHub
                    </a>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </Flex>
          </Flex>
        </header>
      </Box>
    </>
  );
}
