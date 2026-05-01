"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { css } from "styled-system/css";
import { useSession, signOut } from "@/lib/auth-client";
import { LegoName } from "./LegoName";

const LEGO_COLORS = ["#E3000B", "#FFD500", "#006CB7", "#00852B", "#FE8A18"];

const NAV_ITEMS = [
  { label: "Analyze", href: "/" },
  { label: "My Parts", href: "/my-parts" },
  { label: "Want List", href: "/want-list" },
  { label: "Stores", href: "/stores" },
  { label: "Scripts", href: "/scripts" },
  { label: "Games", href: "/games" },
  { label: "Favorites", href: "/favorites" },
  { label: "Videos", href: "/videos" },
  { label: "Firmware", href: "/firmware" },
  { label: "Building Instructions", href: "/building-instructions" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Settings", href: "/settings" },
];

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const { data: session, isPending } = useSession();
  const user = session?.user;
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <aside
      className={css({
        position: "sticky",
        top: 0,
        flexShrink: 0,
        w: "220px",
        h: "100vh",
        display: "flex",
        flexDirection: "column",
        bg: "plate.surface",
        borderRight: "1px solid",
        borderColor: "plate.border",
        boxShadow:
          "2px 0 0 rgba(0,0,0,0.3), 4px 0 16px rgba(0,0,0,0.35), inset -1px 0 0 rgba(255,255,255,0.04)",
        zIndex: 100,
      })}
    >
      {/* 5-color LEGO strip — vertical, on right edge */}
      <div
        className={css({
          position: "absolute",
          top: 0,
          right: 0,
          w: "3px",
          h: "100%",
          background:
            "linear-gradient(180deg, #E3000B 0%, #E3000B 20%, #FFD500 20%, #FFD500 40%, #006CB7 40%, #006CB7 60%, #00852B 60%, #00852B 80%, #FE8A18 80%, #FE8A18 100%)",
        })}
      />

      {/* Logo */}
      <a
        href="/"
        className={css({
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: "2.5",
          px: "5",
          h: "14",
          borderBottom: "1px solid",
          borderColor: "plate.border",
          flexShrink: 0,
        })}
      >
        <div className={css({ display: "flex", gap: "1" })}>
          {LEGO_COLORS.map((color, i) => (
            <div
              key={i}
              className={css({
                w: "3",
                h: "3",
                rounded: "stud",
                flexShrink: 0,
                boxShadow: "stud",
              })}
              style={{ background: color }}
            />
          ))}
        </div>
        <span
          className={css({
            fontFamily: "display",
            fontWeight: "900",
            fontSize: "md",
            letterSpacing: "-0.03em",
            color: "ink.primary",
            lineHeight: 1,
            textShadow:
              "0 1px 0 rgba(0,0,0,0.5), 0 -1px 0 rgba(255,255,255,0.06)",
          })}
        >
          Bricks
        </span>
      </a>

      {/* Nav */}
      <nav
        className={css({
          display: "flex",
          flexDirection: "column",
          gap: "1",
          p: "3",
          overflowY: "auto",
        })}
      >
        {NAV_ITEMS.map(({ label, href }) => {
          const active = isActive(pathname, href);
          return (
            <a
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={css({
                fontFamily: "display",
                fontWeight: "700",
                fontSize: "sm",
                color: active ? "ink.primary" : "ink.secondary",
                bg: active ? "plate.raised" : "transparent",
                boxShadow: active
                  ? "0 1px 0 rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)"
                  : "none",
                textDecoration: "none",
                px: "3",
                py: "2",
                rounded: "brick",
                transition: "all 0.15s ease",
                _hover: {
                  color: "ink.primary",
                  bg: "plate.raised",
                  boxShadow:
                    "0 1px 0 rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
                },
              })}
            >
              {label}
            </a>
          );
        })}
      </nav>

      {/* Spacer pushes auth to bottom */}
      <div className={css({ flex: 1 })} />

      {/* Auth */}
      <div
        className={css({
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: "2",
          p: "3",
          borderTop: "1px solid",
          borderColor: "plate.border",
          flexShrink: 0,
        })}
      >
        {isPending ? (
          <div
            role="status"
            aria-label="Loading user session"
            className={css({
              w: "7",
              h: "7",
              rounded: "stud",
              bg: "plate.raised",
              boxShadow: "stud",
              animation: "spin 1.2s linear infinite",
              alignSelf: "center",
              "@media (prefers-reduced-motion: reduce)": {
                animation: "none",
                opacity: 0.5,
              },
            })}
          />
        ) : user ? (
          <>
            <div className={css({ display: "flex", justifyContent: "center" })}>
              <LegoName name={user.name || user.email || ""} />
            </div>
            <button
              disabled={signingOut}
              onClick={async () => {
                if (signingOut) return;
                setSigningOut(true);
                await signOut();
                window.location.reload();
              }}
              className={css({
                fontSize: "xs",
                fontWeight: "700",
                fontFamily: "display",
                color: "ink.faint",
                bg: "transparent",
                border: "1.5px solid",
                borderColor: "plate.border",
                cursor: "pointer",
                px: "3",
                py: "1.5",
                rounded: "brick",
                transition: "all 0.15s ease",
                _hover: {
                  color: "lego.red",
                  borderColor: "rgba(227,0,11,0.3)",
                  bg: "rgba(227,0,11,0.06)",
                },
              })}
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <a
              href="/login"
              className={css({
                fontSize: "xs",
                fontWeight: "700",
                fontFamily: "display",
                color: "ink.secondary",
                textDecoration: "none",
                bg: "transparent",
                border: "1.5px solid",
                borderColor: "plate.border",
                rounded: "brick",
                px: "3",
                py: "1.5",
                textAlign: "center",
                transition: "all 0.15s ease",
                _hover: {
                  color: "ink.primary",
                  borderColor: "plate.borderHover",
                  bg: "plate.raised",
                },
              })}
            >
              Sign In
            </a>
            <a
              href="/signup"
              className={css({
                fontSize: "xs",
                fontWeight: "800",
                fontFamily: "display",
                color: "white",
                textDecoration: "none",
                bg: "lego.red",
                rounded: "brick",
                px: "3",
                py: "1.5",
                textAlign: "center",
                transition: "all 0.15s ease",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #A30008, 0 3px 6px rgba(0,0,0,0.3)",
                _hover: {
                  bg: "#FF1A1A",
                  transform: "translateY(-1px)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.25), 0 3px 0 #A30008, 0 5px 10px rgba(0,0,0,0.35)",
                },
                _active: {
                  transform: "translateY(1px)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.1), 0 1px 0 #A30008",
                },
              })}
            >
              Sign Up
            </a>
          </>
        )}
      </div>
    </aside>
  );
}
