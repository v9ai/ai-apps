"use client";

import { Flex } from "@radix-ui/themes";
import {
  AlertTriangle,
  BookOpen,
  FileSearch,
  Home,
  LayoutDashboard,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sessions", label: "Sessions", icon: FileSearch },
  { href: "/findings", label: "Findings", icon: AlertTriangle },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <Flex gap="1" align="center">
      {links.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`nav-link ${active ? "nav-link-active" : ""}`}
          >
            <Icon size={16} />
            <span className="nav-link-label">{label}</span>
          </Link>
        );
      })}
      <Link
        href="/sessions"
        className="nav-link"
        style={{
          background: "var(--crimson-a3)",
          border: "1px solid var(--crimson-a5)",
        }}
      >
        <Plus size={16} />
        <span className="nav-link-label">New Session</span>
      </Link>
    </Flex>
  );
}
