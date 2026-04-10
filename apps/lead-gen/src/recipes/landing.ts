import { cva } from "styled-system/css";

/**
 * Landing section — consistent vertical padding and max-width wrapper for
 * full-width landing page sections. Centers content and handles responsive
 * spacing between stacked sections.
 */
export const landingSection = cva({
  base: {
    width: "100%",
    mx: "auto",
    px: "4",
    py: { base: "sectionMobile", md: "section" },
  },
  variants: {
    width: {
      narrow: { maxWidth: "720px" },
      default: { maxWidth: "1200px" },
      wide: { maxWidth: "1440px" },
      full: { maxWidth: "none" },
    },
    spacing: {
      compact: {
        py: { base: "6", md: "10" },
      },
      default: {},
      loose: {
        py: { base: "16", md: "24" },
      },
    },
    border: {
      top: {
        borderTop: "1px solid",
        borderTopColor: "ui.border",
      },
      bottom: {
        borderBottom: "1px solid",
        borderBottomColor: "ui.border",
      },
      both: {
        borderTop: "1px solid",
        borderTopColor: "ui.border",
        borderBottom: "1px solid",
        borderBottomColor: "ui.border",
      },
      none: {},
    },
  },
  defaultVariants: {
    width: "default",
    spacing: "default",
    border: "none",
  },
});

/**
 * Landing heading — display-level heading with optional gradient text.
 * Larger than regular headings, designed for hero and section titles.
 */
export const landingHeading = cva({
  base: {
    fontWeight: "bold",
    color: "ui.heading",
    lineHeight: "tight",
    letterSpacing: "tighter",
  },
  variants: {
    level: {
      hero: {
        fontSize: { base: "4xl", md: "6xl" },
        lineHeight: "none",
      },
      section: {
        fontSize: { base: "3xl", md: "4xl" },
        lineHeight: "tight",
      },
      subtitle: {
        fontSize: { base: "xl", md: "2xl" },
        fontWeight: "medium",
        color: "ui.secondary",
        letterSpacing: "tight",
        lineHeight: "snug",
      },
    },
    gradient: {
      true: {
        backgroundImage: "linear-gradient(135deg, {colors.ui.heading}, {colors.accent.primary})",
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        color: "transparent",
        WebkitTextFillColor: "transparent",
      },
      accent: {
        backgroundImage:
          "linear-gradient(135deg, {colors.accent.primary}, {colors.status.positive})",
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        color: "transparent",
        WebkitTextFillColor: "transparent",
      },
      false: {},
    },
  },
  defaultVariants: {
    level: "section",
    gradient: false,
  },
});

/**
 * Landing subtext — secondary descriptive text below headings.
 * Larger line height for readability in long-form landing copy.
 */
export const landingSubtext = cva({
  base: {
    color: "ui.secondary",
    lineHeight: "relaxed",
    letterSpacing: "normal",
    maxWidth: "640px",
  },
  variants: {
    size: {
      sm: {
        fontSize: "sm",
      },
      md: {
        fontSize: "base",
      },
      lg: {
        fontSize: { base: "base", md: "lg" },
      },
    },
    align: {
      left: { textAlign: "left" },
      center: { textAlign: "center", mx: "auto" },
    },
  },
  defaultVariants: {
    size: "md",
    align: "center",
  },
});

/**
 * Landing grid — responsive grid for feature cards, metric blocks, etc.
 * Handles column counts and gap sizing across breakpoints.
 */
export const landingGrid = cva({
  base: {
    display: "grid",
    width: "100%",
    gap: "4",
  },
  variants: {
    columns: {
      2: {
        gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)" },
      },
      3: {
        gridTemplateColumns: {
          base: "1fr",
          md: "repeat(2, 1fr)",
          lg: "repeat(3, 1fr)",
        },
      },
      4: {
        gridTemplateColumns: {
          base: "1fr",
          md: "repeat(2, 1fr)",
          lg: "repeat(4, 1fr)",
        },
      },
    },
    gap: {
      compact: { gap: "3" },
      default: { gap: "4" },
      loose: { gap: "6" },
    },
  },
  defaultVariants: {
    columns: 3,
    gap: "default",
  },
});

/**
 * Section header — consistent title + subtitle block for landing page sections.
 * Handles alignment variants and responsive sizing.
 */
export const sectionHeader = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "3",
    maxWidth: "720px",
  },
  variants: {
    align: {
      left: {
        alignItems: "flex-start",
        textAlign: "left",
      },
      center: {
        alignItems: "center",
        textAlign: "center",
        mx: "auto",
      },
      right: {
        alignItems: "flex-end",
        textAlign: "right",
        ml: "auto",
      },
    },
    spacing: {
      compact: {
        mb: "6",
      },
      default: {
        mb: "10",
      },
      loose: {
        mb: "16",
      },
    },
  },
  defaultVariants: {
    align: "center",
    spacing: "default",
  },
});

/**
 * Stat card — metric display with large value, label, and optional comparison text.
 * Used for KPI sections on the landing page.
 */
export const statCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2",
    padding: "5",
    bg: "ui.surface",
    border: "1px solid",
    borderColor: "ui.border",
    borderRadius: "0",
    transition: "background 150ms ease, border-color 150ms ease",
    _hover: {
      bg: "ui.surfaceHover",
      borderColor: "ui.borderHover",
    },
  },
  variants: {
    variant: {
      default: {},
      highlighted: {
        borderColor: "accent.border",
        bg: "accent.subtle",
        _hover: {
          borderColor: "accent.primary",
          bg: "accent.subtle",
        },
      },
      positive: {
        borderColor: "rgba(48, 164, 108, 0.30)",
        bg: "status.positiveDim",
        _hover: {
          borderColor: "status.positive",
          bg: "status.positiveDim",
        },
      },
    },
    size: {
      sm: {
        padding: "3",
        gap: "1",
      },
      md: {
        padding: "5",
        gap: "2",
      },
      lg: {
        padding: "6",
        gap: "3",
      },
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

/**
 * Trust badge — compact trust signal for logos, certifications, social proof.
 * Minimal chrome, designed to sit in a row of peer badges.
 */
export const trustBadge = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2",
    padding: "2 3",
    bg: "whiteAlpha.5",
    border: "1px solid",
    borderColor: "ui.border",
    borderRadius: "0",
    fontSize: "xs",
    fontWeight: "medium",
    color: "ui.secondary",
    letterSpacing: "wide",
    textTransform: "lowercase",
    whiteSpace: "nowrap",
    userSelect: "none",
    transition: "background 150ms ease, border-color 150ms ease, color 150ms ease",
    _hover: {
      bg: "whiteAlpha.8",
      borderColor: "ui.borderHover",
      color: "ui.body",
    },
  },
  variants: {
    variant: {
      default: {},
      accent: {
        borderColor: "accent.border",
        color: "accent.primary",
        bg: "accent.subtle",
        _hover: {
          borderColor: "accent.primary",
          bg: "accent.subtle",
        },
      },
      muted: {
        borderColor: "transparent",
        bg: "whiteAlpha.3",
        color: "ui.tertiary",
        _hover: {
          bg: "whiteAlpha.6",
          color: "ui.secondary",
        },
      },
    },
    size: {
      sm: {
        padding: "1 2",
        fontSize: "2xs",
        gap: "1",
      },
      md: {
        padding: "2 3",
        fontSize: "xs",
        gap: "2",
      },
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

/**
 * Comparison row — "us vs them" layout for feature comparison tables.
 * Each row shows a feature label and two value columns.
 */
export const comparisonRow = cva({
  base: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    alignItems: "center",
    gap: "3",
    padding: "3 4",
    borderBottom: "1px solid",
    borderBottomColor: "ui.border",
    fontSize: "sm",
    lineHeight: "compact",
    transition: "background 150ms ease",
    _hover: {
      bg: "whiteAlpha.3",
    },
    _last: {
      borderBottom: "none",
    },
  },
  variants: {
    variant: {
      default: {},
      header: {
        fontSize: "2xs",
        fontWeight: "medium",
        color: "ui.dim",
        letterSpacing: "editorial",
        textTransform: "uppercase",
        borderBottomColor: "ui.borderHover",
        bg: "whiteAlpha.3",
        _hover: {
          bg: "whiteAlpha.3",
        },
      },
      winner: {
        bg: "status.positiveDim",
        _hover: {
          bg: "status.positiveDim",
        },
      },
    },
    highlight: {
      ours: {
        "& > :nth-child(2)": {
          color: "status.positive",
          fontWeight: "semibold",
        },
      },
      theirs: {
        "& > :nth-child(3)": {
          color: "status.positive",
          fontWeight: "semibold",
        },
      },
      none: {},
    },
  },
  defaultVariants: {
    variant: "default",
    highlight: "ours",
  },
});
