"use client";

import { Box, Flex, Separator, TabNav, Tooltip } from "@radix-ui/themes";
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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const navLinks: { href: string; label: string; icon: LucideIcon; separator?: boolean }[] = [
  { href: "/protected/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/protected/blood-tests", label: "Blood Tests", icon: Droplet },
  { href: "/protected/conditions", label: "Conditions", icon: Heart },
  { href: "/protected/medications", label: "Medications", icon: Pill },
  { href: "/protected/symptoms", label: "Symptoms", icon: Activity },
  { href: "/protected/appointments", label: "Appointments", icon: Calendar },
  { href: "/protected/trajectory", label: "Trajectory", icon: TrendingUp },
  { href: "/protected/search", label: "Search", icon: Search, separator: true },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .nav-label { display: none !important; }
        }
        .nav-tab-root { scrollbar-width: none; }
        .nav-tab-root::-webkit-scrollbar { display: none; }
        .nav-tab-link:hover {
          background-color: var(--gray-a3) !important;
          border-bottom-color: var(--gray-a6) !important;
        }
      `}</style>
      <TabNav.Root className="nav-tab-root" style={{ overflowX: "auto" }}>
        {navLinks.map((link) => {
          const isActive = pathname.startsWith(link.href);
          return (
            <Flex key={link.href} align="center" gap="0">
              {link.separator && (
                <Separator
                  orientation="vertical"
                  size="1"
                  mx="2"
                  style={{ height: 16, flexShrink: 0 }}
                />
              )}
              <Tooltip content={link.label} side="bottom" delayDuration={400}>
                <TabNav.Link
                  asChild
                  active={isActive}
                  className="nav-tab-link"
                  style={{
                    transition: "color 150ms ease, background-color 150ms ease, border-color 150ms ease",
                    borderRadius: "6px 6px 0 0",
                  }}
                >
                  <Link href={link.href}>
                    <Flex align="center" gap="2">
                      <link.icon size={16} />
                      <span className="nav-label" style={{ display: "inline" }}>
                        {link.label}
                      </span>
                    </Flex>
                  </Link>
                </TabNav.Link>
              </Tooltip>
            </Flex>
          );
        })}
      </TabNav.Root>
    </>
  );
}
