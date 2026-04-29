"use client";

import { Box, Flex, Heading, IconButton, Button, DropdownMenu } from "@radix-ui/themes";
import { GitHubLogoIcon, HamburgerMenuIcon } from "@radix-ui/react-icons";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import UserMenu from "./UserMenu";
import { SIDEBAR_WIDTH } from "./sidebar-constants";

export { SIDEBAR_WIDTH };

const NAV_LINKS = [
  { href: "/allergies", label: "Allergies & Intolerances" },
  { href: "/appointments", label: "Appointments" },
  { href: "/blood-tests", label: "Blood Tests" },
  { href: "/books", label: "Books" },
  { href: "/brain-memory", label: "Brain & Memory" },
  { href: "/chat", label: "Chat" },
  { href: "/conditions", label: "Conditions" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/discussions", label: "Discuții" },
  { href: "/doctors", label: "Doctors" },
  { href: "/family", label: "Family" },
  { href: "/games", label: "Games" },
  { href: "/goals", label: "Goals" },
  { href: "/habits", label: "Habits" },
  { href: "/issues", label: "Issues" },
  { href: "/journal", label: "Journal" },
  { href: "/medications", label: "Medications" },
  { href: "/notes", label: "Notes" },
  { href: "/protocols", label: "Protocols" },
  { href: "/routines", label: "Routines" },
  { href: "/search", label: "Search" },
  { href: "/stories", label: "Stories" },
  { href: "/symptoms", label: "Symptoms" },
  { href: "/tasks", label: "Tasks" },
  { href: "/trajectory", label: "Trajectory" },
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
              {NAV_LINKS.map((link) => {
                const isActive = pathname.startsWith(link.href);
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
                      ...(isActive && {
                        borderLeft: "2px solid var(--indigo-9)",
                        paddingLeft: "10px",
                        background: "var(--indigo-a3)",
                      }),
                    }}
                  >
                    <Link href={link.href}>{link.label}</Link>
                  </Button>
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
