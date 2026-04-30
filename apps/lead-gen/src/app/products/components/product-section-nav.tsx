"use client";

import { css } from "styled-system/css";
import { useActiveSection } from "@/hooks/use-active-section";

export type SectionNavItem = {
  id: string;
  label: string;
  count?: number;
};

/**
 * ProductSectionNav — sticky pill rail that scroll-spies the product detail
 * sections. Replaces the disabled tab strip on /products/[slug].
 */
export function ProductSectionNav({ items }: { items: SectionNavItem[] }) {
  const activeId = useActiveSection(items.map((i) => i.id));

  return (
    <nav
      aria-label="Product sections"
      className={css({
        position: "sticky",
        top: 0,
        zIndex: "nav",
        background: "ui.surfaceOverlay",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid token(colors.ui.border)",
        marginInline: "calc(-1 * token(spacing.6))",
        paddingInline: "6",
        py: "3",
        mb: "5",
      })}
    >
      <ul
        className={css({
          listStyle: "none",
          p: 0,
          m: 0,
          display: "flex",
          gap: "3",
          flexWrap: "nowrap",
          overflowX: "auto",
          overflowY: "hidden",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        })}
      >
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={isActive ? "true" : undefined}
                className={css({
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "2",
                  px: "3",
                  py: "1.5",
                  borderRadius: "full",
                  border: "1px solid",
                  borderColor: isActive ? "accent.7" : "ui.border",
                  background: isActive ? "accent.3" : "transparent",
                  color: isActive ? "accent.11" : "gray.11",
                  fontSize: "sm",
                  fontWeight: 500,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  transition:
                    "background-color {durations.fast} ease, color {durations.fast} ease, border-color {durations.fast} ease",
                  _hover: {
                    borderColor: isActive ? "accent.8" : "gray.7",
                    color: isActive ? "accent.11" : "gray.12",
                  },
                })}
              >
                {item.label}
                {typeof item.count === "number" && item.count > 0 && (
                  <span
                    aria-hidden="true"
                    className={css({
                      fontSize: "2xs",
                      fontWeight: 600,
                      color: isActive ? "accent.11" : "gray.10",
                      fontVariantNumeric: "tabular-nums",
                    })}
                  >
                    {item.count}
                  </span>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
