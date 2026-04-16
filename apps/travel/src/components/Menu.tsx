"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { css } from "styled-system/css";

const DESTINATIONS = [
  { label: "Katowice", href: "/" },
  { label: "Naples", href: "/napoli" },
  { label: "Ischia", href: "/ischia" },
  { label: "Maronti", href: "/maronti" },
  { label: "Tifeo", href: "/tifeo" },
  { label: "Greece", href: "/greece" },
  { label: "Spain", href: "/spain" },
  { label: "Long Stay", href: "/greece/long-stay" },
];

export function Menu() {
  const pathname = usePathname();

  return (
    <nav
      className={css({
        position: "fixed",
        top: "4",
        left: "4",
        zIndex: "50",
        display: "flex",
        bg: "rgba(18, 16, 14, 0.88)",
        backdropFilter: "blur(12px)",
        border: "1px solid",
        borderColor: "steel.borderHover",
        rounded: "pill",
        overflow: "hidden",
      })}
    >
      {DESTINATIONS.map(({ label, href }) => {
        const isActive =
          href === "/" ? pathname === "/" : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={css({
              px: "3.5",
              py: "1.5",
              fontSize: "xs",
              fontWeight: "700",
              fontFamily: "display",
              letterSpacing: "0.06em",
              textDecoration: "none",
              transition: "all 0.15s ease",
              display: "block",
            })}
            style={{
              background: isActive ? "#C9922A" : "transparent",
              color: isActive ? "#12100E" : "#A89E90",
            }}
            onMouseEnter={(e) => {
              if (!isActive)
                (e.currentTarget as HTMLAnchorElement).style.color = "#EDE8DF";
            }}
            onMouseLeave={(e) => {
              if (!isActive)
                (e.currentTarget as HTMLAnchorElement).style.color = "#A89E90";
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
