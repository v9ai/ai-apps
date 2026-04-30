import type { ComponentType, SVGProps } from "react";
import { HomeIcon } from "@radix-ui/react-icons";

export type NavIcon = ComponentType<
  Omit<SVGProps<SVGSVGElement>, "children"> & {
    width?: string | number;
    height?: string | number;
  }
>;

export type NavLeaf = { href: string; label: string; icon?: NavIcon };

export type NavItem =
  | ({ kind: "link" } & NavLeaf)
  | { kind: "group"; key: string; label: string; children: NavLeaf[] };

export const NAV_ITEMS: NavItem[] = [
  { kind: "link", href: "/family", label: "Family" },
  { kind: "link", href: "/house", label: "House", icon: HomeIcon },
  { kind: "link", href: "/dashboard", label: "Dashboard" },
  { kind: "link", href: "/chat", label: "Chat" },
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
  {
    kind: "group",
    key: "plan",
    label: "Plan",
    children: [
      { href: "/goals", label: "Goals" },
      { href: "/stories", label: "Stories" },
      { href: "/routines", label: "Routines" },
      { href: "/habits", label: "Habits" },
      { href: "/tasks", label: "Tasks" },
      { href: "/appointments", label: "Appointments" },
    ],
  },
  {
    kind: "group",
    key: "journal",
    label: "Journal",
    children: [
      { href: "/journal", label: "Journal" },
      { href: "/notes", label: "Notes" },
      { href: "/discussions", label: "Discuții" },
    ],
  },
  {
    kind: "group",
    key: "library",
    label: "Library",
    children: [
      { href: "/audiobooks", label: "Audiobooks" },
      { href: "/books", label: "Books" },
      { href: "/games", label: "Games" },
      { href: "/movies", label: "Movies" },
    ],
  },
];

export type FlatNavItem = { href: string; label: string; group?: string };

export function flattenNav(items: NavItem[]): FlatNavItem[] {
  const out: FlatNavItem[] = [];
  for (const item of items) {
    if (item.kind === "link") {
      out.push({ href: item.href, label: item.label });
    } else {
      for (const child of item.children) {
        out.push({ href: child.href, label: child.label, group: item.label });
      }
    }
  }
  return out;
}
