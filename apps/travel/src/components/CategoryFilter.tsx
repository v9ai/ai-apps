"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { css, cx } from "styled-system/css";
import { CATEGORY_META as SHARED_META, type Category } from "@/lib/categories";
import type { Place } from "@/lib/types";
import { PlaceCard } from "./PlaceCard";

// ----- design tokens --------------------------------------------------------

const CATEGORY_META: Record<
  string,
  { icon: string; color: string; colorToken: string }
> = {
  culture:       { icon: "\u2726", color: "#7C6E9E", colorToken: "cat.culture"       },
  architecture:  { icon: "\u25B2", color: "#4A7A9B", colorToken: "cat.architecture"  },
  nature:        { icon: "\u25C8", color: "#5A7A5C", colorToken: "cat.nature"        },
  entertainment: { icon: "\u25C7", color: "#9A7E3A", colorToken: "cat.entertainment" },
  history:       { icon: "\u25C9", color: "#8C6E4A", colorToken: "cat.history"       },
  nightlife:     { icon: "\u25CF", color: "#8E4E7E", colorToken: "cat.nightlife"     },
  food:          { icon: "\u25C6", color: "#B55C3A", colorToken: "cat.food"          },
};

// ----- sub-components -------------------------------------------------------

function FilterPill({
  label,
  count,
  icon,
  color,
  isActive,
  href,
}: {
  label: string;
  count: number;
  icon?: string;
  color?: string;
  isActive: boolean;
  href: string;
}) {
  const base = css({
    display: "inline-flex",
    alignItems: "center",
    gap: "1.5",
    fontSize: { base: "xs", sm: "sm" },
    fontWeight: "600",
    fontFamily: "display",
    rounded: "pill",
    px: { base: "3", sm: "4" },
    py: { base: "1", sm: "1.5" },
    cursor: "pointer",
    transition: "all 0.18s ease",
    border: "1px solid",
    whiteSpace: "nowrap",
    userSelect: "none",
    letterSpacing: "0.01em",
    textDecoration: "none",
  });

  if (!color) {
    return (
      <Link
        href={href}
        scroll={false}
        className={cx(
          base,
          css({
            bg: isActive ? "amber.warm" : "steel.surface",
            color: isActive ? "steel.dark" : "text.secondary",
            borderColor: isActive ? "amber.warm" : "steel.border",
            _hover: {
              bg: isActive ? "amber.bright" : "steel.raised",
              borderColor: isActive ? "amber.bright" : "steel.borderHover",
            },
          })
        )}
      >
        {label}{" "}
        <span
          className={css({
            fontSize: "xs",
            fontWeight: "400",
            opacity: "0.75",
          })}
        >
          {count}
        </span>
      </Link>
    );
  }

  const activeStyle = isActive
    ? ({
        "--pill-bg": color,
        "--pill-border": color,
        "--pill-color": "#0F1114",
      } as React.CSSProperties)
    : ({
        "--pill-bg": `${color}1A`,
        "--pill-border": `${color}44`,
        "--pill-color": color,
      } as React.CSSProperties);

  return (
    <Link
      href={href}
      scroll={false}
      style={activeStyle}
      className={cx(
        base,
        css({
          textTransform: "capitalize",
          bg: "var(--pill-bg)",
          color: "var(--pill-color)",
          borderColor: "var(--pill-border)",
          _hover: {
            filter: isActive ? "brightness(1.1)" : "brightness(1.25)",
          },
        })
      )}
    >
      {icon && (
        <span aria-hidden className={css({ fontSize: "base", lineHeight: "1" })}>
          {icon}
        </span>
      )}
      {label}{" "}
      <span
        className={css({
          fontSize: "xs",
          fontWeight: "400",
          opacity: "0.75",
        })}
      >
        {count}
      </span>
    </Link>
  );
}

// Sticky bar wrapper
function StickyFilterBar({ children }: { children: React.ReactNode }) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { threshold: 1, rootMargin: "-1px 0px 0px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} aria-hidden />

      <div
        data-stuck={stuck || undefined}
        className={css({
          position: "sticky",
          top: "0",
          zIndex: "10",
          mx: { base: "-4", md: "-6" },
          px: { base: "4", md: "6" },
          py: { base: "2.5", sm: "3" },
          mb: { base: "4", sm: "6" },
          bg: "transparent",
          borderBottom: "1px solid transparent",
          transition: "background 0.25s ease, border-color 0.25s ease, backdrop-filter 0.25s ease",
          "&[data-stuck]": {
            bg: "rgba(15, 17, 20, 0.82)",
            backdropFilter: "blur(14px) saturate(160%)",
            borderBottomColor: "steel.border",
            boxShadow: "0 1px 0 rgba(255,255,255,0.03)",
          },
        })}
      >
        {children}
      </div>
    </>
  );
}

// ----- main export ----------------------------------------------------------

export function CategoryFilter({
  places,
  lang = "ro",
  activeCategory,
  rankingMap,
}: {
  places: Place[];
  lang?: "ro" | "en";
  activeCategory: string | null;
  rankingMap?: Map<string, { bestRank?: number; cheapestRank?: number }>;
}) {
  const [animKey, setAnimKey] = useState(0);

  // Bump animKey when category changes so cards re-animate
  const prevCategory = useRef(activeCategory);
  useEffect(() => {
    if (prevCategory.current !== activeCategory) {
      setAnimKey((k) => k + 1);
      prevCategory.current = activeCategory;
    }
  }, [activeCategory]);

  const categories = [...new Set(places.map((p) => p.category))];

  const filtered = activeCategory
    ? places.filter((p) => p.category === activeCategory)
    : places;

  const countByCategory = Object.fromEntries(
    categories.map((cat) => [cat, places.filter((p) => p.category === cat).length])
  );

  return (
    <>
      <StickyFilterBar>
        <div
          className={css({
            display: "flex",
            flexWrap: "wrap",
            gap: "2",
            alignItems: "center",
          })}
        >
          <FilterPill
            label="All"
            count={places.length}
            isActive={activeCategory === null}
            href="/"
          />

          {categories.map((cat) => {
            const meta = CATEGORY_META[cat];
            return (
              <FilterPill
                key={cat}
                label={cat}
                count={countByCategory[cat]}
                icon={meta?.icon}
                color={meta?.color}
                isActive={activeCategory === cat}
                href={activeCategory === cat ? "/" : `/${cat}`}
              />
            );
          })}
        </div>
      </StickyFilterBar>

      <p
        className={css({
          fontSize: "xs",
          fontWeight: "600",
          fontFamily: "display",
          color: "text.muted",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          mb: "4",
        })}
      >
        {activeCategory
          ? `${filtered.length} place${filtered.length !== 1 ? "s" : ""} \u2014 ${activeCategory}`
          : `All ${places.length} places`}
      </p>

      <div
        key={animKey}
        className={css({
          display: "grid",
          gap: { base: "4", sm: "6", md: "8" },
          gridTemplateColumns: {
            base: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(3, 1fr)",
          },
          "& > *": {
            animation: "fadeUp 0.35s ease-out both",
          },
          "& > *:nth-child(3n+2)": { animationDelay: "0.07s" },
          "& > *:nth-child(3n+3)": { animationDelay: "0.14s" },
          "& > *:nth-child(n+4)":  { animationDelay: "0.12s" },
          "& > *:nth-child(n+7)":  { animationDelay: "0.18s" },
          "& > *:nth-child(n+10)": { animationDelay: "0.22s" },
        })}
      >
        {filtered.map((place) => (
          <PlaceCard
            key={place.name}
            place={place}
            index={places.indexOf(place)}
            lang={lang}
            ranking={rankingMap?.get(place.name)}
          />
        ))}
      </div>
    </>
  );
}
