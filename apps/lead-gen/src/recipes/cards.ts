import { cva } from "styled-system/css";

export const pipelineCard = cva({
  base: {
    bg: "ui.surface",
    border: "1px solid",
    borderColor: "ui.border",
    p: "5",
    borderRadius: "lg",
    transition: "background 150ms ease, border-color 150ms ease",
    _hover: {
      bg: "ui.surfaceHover",
      borderColor: "ui.borderHover",
    },
  },
});

export const iconHolder = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    bg: "ui.surfaceRaised",
    border: "1px solid",
    borderColor: "ui.border",
    borderRadius: "md",
    color: "accent.primary",
  },
  variants: {
    size: {
      sm: { w: "6", h: "6" },
      md: { w: "8", h: "8" },
    },
  },
  defaultVariants: {
    size: "md",
  },
});

/**
 * Feature card — icon + title + description layout for feature grids.
 * Vertical stack with accent-colored icon area and descriptive text.
 */
export const featureCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "3",
    padding: "6",
    bg: "ui.surface",
    border: "1px solid",
    borderColor: "ui.border",
    borderRadius: "lg",
    transition: "background 150ms ease, border-color 150ms ease",
    _hover: {
      bg: "ui.surfaceHover",
      borderColor: "ui.borderHover",
    },
  },
  variants: {
    variant: {
      default: {},
      accent: {
        borderColor: "accent.border",
        _hover: {
          borderColor: "accent.primary",
        },
      },
    },
    size: {
      sm: {
        padding: "4",
        gap: "2",
      },
      md: {
        padding: "6",
        gap: "3",
      },
      lg: {
        padding: "8",
        gap: "4",
      },
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

/**
 * Metric card — large number + label layout for KPI / stats displays.
 * Emphasizes the value with large font and a subtle label beneath.
 */
export const metricCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "1",
    padding: "6",
    bg: "ui.surface",
    border: "1px solid",
    borderColor: "ui.border",
    borderRadius: "lg",
    textAlign: "center",
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
        padding: "4",
        "& > :first-child": {
          fontSize: "2xl",
        },
      },
      md: {
        padding: "6",
        "& > :first-child": {
          fontSize: "4xl",
        },
      },
      lg: {
        padding: "8",
        "& > :first-child": {
          fontSize: "5xl",
        },
      },
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

/**
 * Glass card — glass-morphism card with backdrop blur and semi-transparent
 * background. Designed for layered UI over gradient or image backgrounds.
 */
export const glassCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "3",
    padding: "6",
    bg: "whiteAlpha.5",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid",
    borderColor: "whiteAlpha.10",
    borderRadius: "lg",
    transition: "background 150ms ease, border-color 150ms ease",
    _hover: {
      bg: "whiteAlpha.8",
      borderColor: "whiteAlpha.15",
    },
  },
  variants: {
    variant: {
      default: {},
      accent: {
        borderColor: "accent.border",
        bg: "rgba(62, 99, 221, 0.06)",
        _hover: {
          borderColor: "accent.primary",
          bg: "rgba(62, 99, 221, 0.10)",
        },
      },
    },
    blur: {
      light: {
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      },
      default: {
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      },
      heavy: {
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
      },
    },
    size: {
      sm: {
        padding: "4",
        gap: "2",
      },
      md: {
        padding: "6",
        gap: "3",
      },
      lg: {
        padding: "8",
        gap: "4",
      },
    },
  },
  defaultVariants: {
    variant: "default",
    blur: "default",
    size: "md",
  },
});
