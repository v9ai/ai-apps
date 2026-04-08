"use client";

import {
  GitHubLogoIcon,
  CubeIcon,
  LayersIcon,
  BellIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { css, cx } from "styled-system/css";
import { flex } from "styled-system/patterns";
import { button } from "@/recipes/button";
import { NavLink } from "@/components/ui";
import { AuthHeader } from "@/components/auth-header";
import { AdminNav } from "@/components/admin-nav";
import { useSidebar } from "@/components/sidebar-provider";

const SIDEBAR_WIDTH = 200;
const SIDEBAR_COLLAPSED_WIDTH = 56;

const NAV_ITEMS = [
  { href: "/companies", label: "companies", icon: <CubeIcon width={15} height={15} /> },
  { href: "/follow-ups", label: "follow-ups", icon: <BellIcon width={15} height={15} /> },
];

export function Sidebar() {
  const { collapsed, toggle } = useSidebar();
  const pathname = usePathname();
  const isHomepage = pathname === "/";

  if (isHomepage) return null;

  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <nav
      className={css({
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        gap: "2",
        p: collapsed ? "2" : "4",
        fontSize: "base",
        letterSpacing: "normal",
        borderRight: "1px solid",
        borderColor: "ui.border",
        bg: "ui.surface",
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        overflowY: "hidden",
        overflowX: "hidden",
        transition: "width 0.2s ease, padding 0.2s ease",
        zIndex: 10,
      })}
      style={{ width }}
    >
      {/* logo */}
      <Link
        href="/"
        className={flex({
          align: "center",
          justify: "center",
        })}
        style={{ paddingLeft: collapsed ? 0 : 10, overflow: "hidden" }}
      >
        {collapsed ? (
          <Image src="/logo.svg" alt="Agentic Lead Gen" width={32} height={32} priority style={{ objectFit: "contain" }} />
        ) : (
          <Image src="/logo.svg" alt="Agentic Lead Gen" width={160} height={36} priority />
        )}
      </Link>

      {/* primary links */}
      <div className={css({ display: "flex", flexDirection: "column", gap: "1", mt: "5", flexGrow: 1 })}>
        {NAV_ITEMS.map(({ href, label, icon }) => (
          <NavLink
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? "5px 0" : "5px 8px",
            }}
          >
            {icon}
            {!collapsed && <span className={css({ fontSize: "sm" })}>{label}</span>}
          </NavLink>
        ))}
        {!collapsed && <AdminNav />}
      </div>

      {/* bottom link */}
      <div className={css({ display: "flex", flexDirection: "column", gap: "1", mt: "auto", pb: "3" })}>
        <NavLink
          href="/how-it-works"
          title={collapsed ? "how it works" : undefined}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            justifyContent: collapsed ? "center" : "flex-start",
            padding: collapsed ? "5px 0" : "5px 8px",
          }}
        >
          <LayersIcon width={15} height={15} />
          {!collapsed && <span className={css({ fontSize: "sm" })}>how it works</span>}
        </NavLink>
      </div>

      {/* footer: auth + github + toggle */}
      <div
        className={css({
          display: "flex",
          flexDirection: "column",
          gap: "3",
          pt: "3",
          mt: "auto",
          borderTop: "1px solid",
          borderColor: "ui.border",
        })}
      >
        {!collapsed && <AuthHeader />}
        <div className={flex({ align: "center", justify: collapsed ? "center" : "space-between" })}>
          {!collapsed && (
            <Link
              href="https://github.com/nicolad/ai-apps/tree/main/apps/lead-gen"
              target="_blank"
              rel="noopener noreferrer"
              className={css({ display: "flex", alignItems: "center" })}
            >
              <GitHubLogoIcon width={18} height={18} className={css({ color: "ui.tertiary" })} />
            </Link>
          )}
          <button
            onClick={toggle}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cx(
              button({ variant: "ghost", size: "sm" }),
              css({ p: "1", height: "auto", minWidth: 0 }),
            )}
          >
            {collapsed ? (
              <DoubleArrowRightIcon width={16} height={16} />
            ) : (
              <DoubleArrowLeftIcon width={16} height={16} />
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}

export function MainContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const pathname = usePathname();
  const isHomepage = pathname === "/";
  const marginLeft = isHomepage ? 0 : collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <main
      id="main-content"
      className={css({
        flexGrow: 1,
        minWidth: 0,
      })}
      style={{
        marginLeft,
        transition: "margin-left 0.2s ease",
      }}
    >
      {children}
    </main>
  );
}
