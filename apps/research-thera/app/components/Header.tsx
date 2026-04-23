"use client";

import { Box, Flex, Heading, IconButton, Button, DropdownMenu } from "@radix-ui/themes";
import { GitHubLogoIcon, HamburgerMenuIcon } from "@radix-ui/react-icons";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import UserMenu from "./UserMenu";
import { JobsIndicator } from "./JobsIndicator";
import { SIDEBAR_WIDTH } from "./sidebar-constants";

export { SIDEBAR_WIDTH };

const NAV_LINKS = [
  { href: "/issues", label: "Issues" },
  { href: "/goals", label: "Goals" },
  { href: "/habits", label: "Habits" },
  { href: "/routines", label: "Routines" },
  { href: "/notes", label: "Notes" },
  { href: "/stories", label: "Stories" },
  { href: "/books", label: "Books" },
  { href: "/family", label: "Family" },
  { href: "/journal", label: "Journal" },
  { href: "/games", label: "Games" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();

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
        <Flex direction="column" height="100%" p="4" gap="5">
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
            <Flex direction="column" gap="1">
              {NAV_LINKS.map((link) => {
                const isActive = pathname.startsWith(link.href);
                return (
                  <Button
                    key={link.href}
                    variant={isActive ? "soft" : "ghost"}
                    size="2"
                    color={isActive ? "indigo" : "gray"}
                    highContrast={isActive}
                    asChild
                    style={{ justifyContent: "flex-start" }}
                  >
                    <Link href={link.href}>{link.label}</Link>
                  </Button>
                );
              })}
            </Flex>
          </nav>

          <Flex direction="column" gap="3">
            <Flex align="center" justify="between" gap="2">
              <JobsIndicator />
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
              <JobsIndicator />
              <UserMenu />
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  <IconButton variant="ghost" size="2" color="gray" aria-label="Open menu">
                    <HamburgerMenuIcon width="18" height="18" />
                  </IconButton>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end">
                  {NAV_LINKS.map((link) => {
                    const isActive = pathname.startsWith(link.href);
                    return (
                      <DropdownMenu.Item
                        key={link.href}
                        color={isActive ? "indigo" : undefined}
                        onClick={() => router.push(link.href)}
                      >
                        {link.label}
                      </DropdownMenu.Item>
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
