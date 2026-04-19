"use client";

import { useState } from "react";
import { css } from "styled-system/css";
import { useSession, signOut } from "@/lib/auth-client";
import { LegoName } from "./LegoName";

const LEGO_COLORS = ["#E3000B", "#FFD500", "#006CB7", "#00852B", "#FE8A18"];

export function Header() {
  const { data: session, isPending } = useSession();
  const user = session?.user;
  const [signingOut, setSigningOut] = useState(false);

  return (
    <>
      {/* 5-color LEGO strip */}
      <div
        className={css({
          h: "3px",
          background:
            "linear-gradient(90deg, #E3000B 0%, #E3000B 20%, #FFD500 20%, #FFD500 40%, #006CB7 40%, #006CB7 60%, #00852B 60%, #00852B 80%, #FE8A18 80%, #FE8A18 100%)",
          position: "sticky",
          top: 0,
          zIndex: 101,
        })}
      />

      <header
        className={css({
          position: "sticky",
          top: "3px",
          zIndex: 100,
          bg: "plate.surface",
          borderBottom: "1px solid",
          borderColor: "plate.border",
          boxShadow:
            "0 2px 0 rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
        })}
      >
        <div
          className={css({
            mx: "auto",
            maxW: "6xl",
            px: "5",
            h: "14",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "4",
          })}
        >
          {/* LEFT — Logo + nav */}
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              gap: "6",
            })}
          >
            <a
              href="/"
              className={css({
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "2.5",
              })}
            >
              {/* 5 micro studs */}
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

            <nav className={css({ display: "flex", gap: "1" })}>
              {[
                { label: "Analyze", href: "/" },
                { label: "My Parts", href: "/my-parts" },
                { label: "Want List", href: "/want-list" },
                { label: "Stores", href: "/stores" },
                { label: "Scripts", href: "/scripts" },
                { label: "Favorites", href: "/favorites" },
                { label: "Videos", href: "/videos" },
                { label: "Firmware", href: "/firmware" },
                { label: "How It Works", href: "/how-it-works" },
                { label: "Settings", href: "/settings" },
              ].map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  className={css({
                    fontFamily: "display",
                    fontWeight: "700",
                    fontSize: "xs",
                    color: "ink.secondary",
                    textDecoration: "none",
                    px: "2.5",
                    py: "1",
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
              ))}
            </nav>
          </div>

          {/* RIGHT — Auth */}
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              gap: "3",
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
                  "@media (prefers-reduced-motion: reduce)": {
                    animation: "none",
                    opacity: 0.5,
                  },
                })}
              />
            ) : user ? (
              <>
                <LegoName name={user.name || user.email || ""} />
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
        </div>
      </header>
    </>
  );
}
