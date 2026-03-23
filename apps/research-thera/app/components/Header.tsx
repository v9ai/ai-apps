"use client";

import { Box, Container, Flex, Heading, IconButton, Button, Separator, DropdownMenu } from "@radix-ui/themes";
import { GitHubLogoIcon, HamburgerMenuIcon } from "@radix-ui/react-icons";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import UserMenu from "./UserMenu";

const NAV_LINKS = [
  { href: "/goals", label: "Goals" },
  { href: "/habits", label: "Habits" },
  { href: "/notes", label: "Notes" },
  { href: "/stories", label: "Stories" },
  { href: "/family", label: "Family" },
  { href: "/journal", label: "Journal" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Box
      asChild
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
    >
      <header>
        <Container size="3" px={{ initial: "3", md: "5" }}>
          <Flex justify="between" align="center" py="3">
            {/* Left: logo + divider + nav */}
            <Flex align="center" gap="4">
              <Link
                href="/"
                aria-label="ResearchThera — home"
                style={{ textDecoration: "none", color: "inherit", flexShrink: 0 }}
              >
                <Heading
                  size="4"
                  style={{ letterSpacing: "-0.025em", whiteSpace: "nowrap" }}
                >
                  ResearchThera
                </Heading>
              </Link>

              {/* Desktop nav */}
              <Flex align="center" gap="4" display={{ initial: "none", md: "flex" }}>
                <Separator orientation="vertical" style={{ height: "16px", opacity: 0.4 }} />

                <nav aria-label="Main navigation">
                  <Flex gap="5">
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
                          style={
                            isActive
                              ? { boxShadow: "inset 0 -2px 0 var(--indigo-9)" }
                              : undefined
                          }
                        >
                          <Link href={link.href}>{link.label}</Link>
                        </Button>
                      );
                    })}
                  </Flex>
                </nav>
              </Flex>
            </Flex>

            {/* Right: user controls */}
            <Flex align="center" gap="3">
              <UserMenu />
              <IconButton
                asChild
                variant="ghost"
                size="2"
                color="gray"
                aria-label="View source on GitHub"
              >
                <a
                  href="https://github.com/nicolad/research-thera"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <GitHubLogoIcon width="16" height="16" />
                </a>
              </IconButton>

              {/* Mobile hamburger menu */}
              <Box display={{ initial: "block", md: "none" }}>
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
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </Box>
            </Flex>
          </Flex>
        </Container>
      </header>
    </Box>
  );
}
