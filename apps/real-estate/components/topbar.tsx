"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_GROUPS = [
  {
    label: "Analyze",
    items: [
      { href: "/analyzer", label: "Analyzer" },
      { href: "/analyzer/batch", label: "Batch" },
    ],
  },
  {
    label: "Market",
    items: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/trends", label: "Trends" },
      { href: "/predict", label: "Predict" },
    ],
  },
  {
    label: "Invest",
    items: [
      { href: "/portfolio", label: "Portfolio" },
      { href: "/pipeline", label: "Pipeline" },
      { href: "/cashflow", label: "Cash Flow" },
      { href: "/alerts", label: "Alerts" },
    ],
  },
  {
    label: "Advisor",
    items: [{ href: "/advisor", label: "Chat" }],
  },
];

export function Topbar() {
  const pathname = usePathname();

  return (
    <div className="yc-topbar">
      <Link href="/">
        <span className="yc-topbar-logo" />
        PropertyAI
      </Link>
      {NAV_GROUPS.map((group) => (
        <div
          key={group.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "var(--gray-7)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginRight: 4,
            }}
          >
            {group.label}
          </span>
          {group.items.map((item) => {
            const isActive =
              pathname === item.href ||
              (pathname?.startsWith(item.href + "/") ?? false);
            return (
              <Link key={item.href} href={item.href}>
                <span
                  style={{
                    fontSize: 12,
                    opacity: isActive ? 1 : 0.7,
                    color: isActive ? "var(--accent-11)" : undefined,
                    fontWeight: isActive ? 600 : undefined,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: isActive
                      ? "rgba(99,102,241,0.08)"
                      : undefined,
                    transition: "opacity 0.15s, color 0.15s",
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
      <span className="yc-topbar-count">MD &middot; RO</span>
    </div>
  );
}
