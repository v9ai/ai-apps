"use client";

import { TabNav } from "@radix-ui/themes";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/sessions", label: "Sessions" },
  { href: "/findings", label: "Findings" },
  { href: "/knowledge", label: "Knowledge" },
  { href: "/search", label: "Search" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <TabNav.Root>
      {navLinks.map((link) => (
        <TabNav.Link
          key={link.href}
          asChild
          active={pathname.startsWith(link.href)}
        >
          <Link href={link.href}>{link.label}</Link>
        </TabNav.Link>
      ))}
    </TabNav.Root>
  );
}
