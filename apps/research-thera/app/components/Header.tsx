"use client";

import { useEffect, useState } from "react";
import { Box, Flex, Heading, IconButton, Button, DropdownMenu, Kbd, Text } from "@radix-ui/themes";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  GitHubLogoIcon,
  HamburgerMenuIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import UserMenu from "./UserMenu";
import { SIDEBAR_WIDTH } from "./sidebar-constants";
import { NAV_ITEMS, type NavLeaf } from "./nav-items";
import { CommandPalette } from "./CommandPalette";

export { SIDEBAR_WIDTH };

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
        initial[item.key] = true;
      }
    }
    return initial;
  });

  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const renderLeafButton = (link: NavLeaf, indent = false) => {
    const isActive = isPathActive(link.href);
    const Icon = link.icon;
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
        <Link href={link.href}>
          {Icon ? (
            <Flex as="span" align="center" gap="2">
              <Icon width="14" height="14" />
              <span>{link.label}</span>
            </Flex>
          ) : (
            link.label
          )}
        </Link>
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

          <Button
            variant="soft"
            color="gray"
            size="2"
            onClick={() => setPaletteOpen(true)}
            style={{ justifyContent: "space-between" }}
          >
            <Flex align="center" gap="2">
              <MagnifyingGlassIcon width="14" height="14" />
              <Text size="2" color="gray">
                Search…
              </Text>
            </Flex>
            <Kbd size="1">⌘K</Kbd>
          </Button>

          <nav aria-label="Main navigation" style={{ flex: 1 }}>
            <Flex direction="column" gap="2">
              {NAV_ITEMS.map((item) => {
                if (item.kind === "link") {
                  return renderLeafButton(item);
                }
                const groupActive = isGroupActive(item.children);
                const isOpen = openGroups[item.key] ?? true;
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
                  <DropdownMenu.Item onClick={() => setPaletteOpen(true)}>
                    <Flex align="center" gap="2">
                      <MagnifyingGlassIcon width="14" height="14" />
                      Search…
                    </Flex>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                  {NAV_ITEMS.map((item) => {
                    if (item.kind === "link") {
                      const isActive = isPathActive(item.href);
                      const Icon = item.icon;
                      return (
                        <DropdownMenu.Item
                          key={item.href}
                          color={isActive ? "indigo" : undefined}
                          onClick={() => router.push(item.href)}
                        >
                          {Icon ? (
                            <Flex align="center" gap="2">
                              <Icon width="14" height="14" />
                              {item.label}
                            </Flex>
                          ) : (
                            item.label
                          )}
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

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
