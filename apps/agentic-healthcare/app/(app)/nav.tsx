"use client";

import { Flex, Separator, Tooltip } from "@radix-ui/themes";
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
import { css, cx } from "styled-system/css";

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

const navListClass = css({
  display: "flex",
  flexDirection: "column",
  gap: "1px",
  flex: 1,
});

const linkClass = css({
  display: "flex",
  alignItems: "center",
  gap: "var(--space-3)",
  padding: "var(--space-2) var(--space-3)",
  borderRadius: "var(--radius-2)",
  textDecoration: "none",
  color: "var(--gray-11)",
  fontSize: "var(--font-size-2)",
  lineHeight: 1,
  transition: "background 150ms ease, color 150ms ease",
  flexShrink: 0,
  "&:hover": {
    background: "var(--gray-a3)",
  },
  "@media (max-width: 768px)": {
    justifyContent: "center",
    padding: "var(--space-2)",
  },
});

const linkActiveClass = css({
  background: "var(--indigo-a3)",
  color: "var(--indigo-11)",
  "&:hover": {
    background: "var(--indigo-a4)",
  },
});

const labelClass = css({
  whiteSpace: "nowrap",
  "@media (max-width: 768px)": {
    display: "none",
  },
});

const separatorClass = css({
  margin: "var(--space-2) 0",
});

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className={navListClass}>
      {navLinks.map((link) => {
        const isActive = pathname.startsWith(link.href);
        return (
          <div key={link.href}>
            {link.separator && (
              <Separator size="4" className={separatorClass} />
            )}
            <Tooltip content={link.label} side="right" delayDuration={400}>
              <Link
                href={link.href}
                className={cx(linkClass, isActive && linkActiveClass)}
              >
                <link.icon size={16} style={{ flexShrink: 0 }} />
                <span className={labelClass}>{link.label}</span>
              </Link>
            </Tooltip>
          </div>
        );
      })}
    </nav>
  );
}
