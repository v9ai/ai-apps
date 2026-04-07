"use client";

import { Flex, Separator, TabNav, Tooltip } from "@radix-ui/themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Droplet,
  Heart,
  Pill,
  Activity,
  Calendar,
  TrendingUp,
  Search,
  MessageSquare,
  Stethoscope,
  Users,
  Brain,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { css } from "styled-system/css";

const navLinks: { href: string; label: string; icon: LucideIcon; separator?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/blood-tests", label: "Blood Tests", icon: Droplet },
  { href: "/conditions", label: "Conditions", icon: Heart },
  { href: "/medications", label: "Medications", icon: Pill },
  { href: "/symptoms", label: "Symptoms", icon: Activity },
  { href: "/appointments", label: "Appointments", icon: Calendar },
  { href: "/doctors", label: "Doctors", icon: Stethoscope },
  { href: "/family", label: "Family", icon: Users },
  { href: "/protocols", label: "Protocols", icon: Brain },
  { href: "/trajectory", label: "Trajectory", icon: TrendingUp },
  { href: "/search", label: "Search", icon: Search, separator: true },
  { href: "/chat", label: "Chat", icon: MessageSquare },
];

const navRootClass = css({
  overflowX: "auto",
  scrollbarWidth: "none",
  width: "100%",
  "&::-webkit-scrollbar": { display: "none" },
});

const navLinkClass = css({
  transition: "color 150ms ease, background-color 150ms ease, border-color 150ms ease",
  borderRadius: "6px 6px 0 0",
  "&:hover": {
    backgroundColor: "var(--gray-a3) !important",
    borderBottomColor: "var(--gray-a6) !important",
  },
});

const navLabelClass = css({
  display: "inline",
  "@media (max-width: 768px)": {
    display: "none",
  },
});

export function Nav() {
  const pathname = usePathname();

  return (
    <TabNav.Root className={navRootClass}>
      {navLinks.map((link) => {
        const isActive = pathname.startsWith(link.href);
        return (
          <Flex key={link.href} align="center" gap="0">
            {link.separator && (
              <Separator
                orientation="vertical"
                size="1"
                mx="2"
                className={css({ height: "16px", flexShrink: "0" })}
              />
            )}
            <Tooltip content={link.label} side="bottom" delayDuration={400}>
              <TabNav.Link
                asChild
                active={isActive}
                className={navLinkClass}
              >
                <Link href={link.href}>
                  <Flex align="center" gap="2">
                    <link.icon size={16} />
                    <span className={navLabelClass}>{link.label}</span>
                  </Flex>
                </Link>
              </TabNav.Link>
            </Tooltip>
          </Flex>
        );
      })}
    </TabNav.Root>
  );
}
