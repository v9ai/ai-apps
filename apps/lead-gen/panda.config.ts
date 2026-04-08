import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  preflight: true,

  include: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/recipes/**/*.ts",
  ],

  exclude: [],

  layers: {
    reset: "panda_reset",
    base: "panda_base",
    tokens: "panda_tokens",
    recipes: "panda_recipes",
    utilities: "panda_utilities",
  },

  // ---- Global CSS (base body styles) ----
  globalCss: {
    body: {
      fontFamily: "sans",
      fontSize: "base",
      lineHeight: "relaxed",
      fontVariationSettings: '"wght" 420',
      letterSpacing: "normal",
      color: "ui.body",
      background: "ui.bg",
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
      textRendering: "optimizeLegibility",
    },
  },

  // ---- Breakpoints ----
  conditions: {
    extend: {
      sm: "@media (min-width: 640px)",
      md: "@media (min-width: 968px)",
      lg: "@media (min-width: 1200px)",
      xl: "@media (min-width: 1440px)",
    },
  },

  theme: {
    extend: {
      // ---- Breakpoints ----
      breakpoints: {
        sm: "640px",
        md: "968px",
        lg: "1200px",
        xl: "1440px",
      },

      // ---- Keyframes ----
      keyframes: {
        mask: {
          "0%": {
            maskImage:
              "linear-gradient(60deg, #000 25%, rgba(0, 0, 0, 0.4) 50%, #000 75%)",
            maskSize: "400%",
            maskPosition: "100%",
          },
          "70%, 100%": {
            maskImage:
              "linear-gradient(60deg, #000 25%, rgba(0, 0, 0, 0.4) 50%, #000 75%)",
            maskSize: "400%",
            maskPosition: "0",
          },
        },
        pulse: {
          "0%, 100%": { opacity: "0.3", transform: "scale(0.85)" },
          "50%": { opacity: "1", transform: "scale(1)" },
        },
        "pipeline-card-enter": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scanline-sweep": {
          "0%": { left: "-100%", opacity: "1" },
          "100%": { left: "100%", opacity: "1" },
        },
        "stat-slot-up": {
          from: {
            opacity: "0",
            transform: "translateY(16px)",
            filter: "blur(4px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
            filter: "blur(0)",
          },
        },
        "arrow-flow-pulse": {
          "0%": { opacity: "0.3", transform: "translateX(0)" },
          "50%": { opacity: "1", transform: "translateX(3px)" },
          "100%": { opacity: "0.3", transform: "translateX(0)" },
        },
        "badge-scan": {
          "0%": { left: "-30%" },
          "100%": { left: "130%" },
        },
        "headline-word-enter": {
          from: {
            opacity: "0",
            transform: "translateY(8px)",
            filter: "blur(2px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
            filter: "blur(0)",
          },
        },
        "toolbar-enter": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "toolbar-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "toolbar-spin": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "tab-fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },

      // ---- Text Styles ----
      textStyles: {
        heading1: {
          value: {
            fontSize: "4xl",
            fontWeight: "bold",
            lineHeight: "tight",
            letterSpacing: "tighter",
            color: "ui.heading",
          },
        },
        heading2: {
          value: {
            fontSize: "2xl",
            fontWeight: "bold",
            lineHeight: "snug",
            letterSpacing: "tight",
            color: "ui.heading",
          },
        },
        heading3: {
          value: {
            fontSize: "lg",
            fontWeight: "semibold",
            lineHeight: "compact",
            letterSpacing: "snug",
            color: "ui.heading",
          },
        },
        body: {
          value: {
            fontSize: "base",
            fontWeight: "normal",
            lineHeight: "normal",
            letterSpacing: "normal",
            color: "ui.body",
          },
        },
        caption: {
          value: {
            fontSize: "sm",
            fontWeight: "normal",
            lineHeight: "normal",
            letterSpacing: "normal",
            color: "ui.secondary",
          },
        },
        label: {
          value: {
            fontSize: "2xs",
            fontWeight: "medium",
            letterSpacing: "editorial",
            textTransform: "uppercase",
            color: "ui.dim",
          },
        },
        mono: {
          value: {
            fontFamily: "mono",
            fontSize: "sm",
            lineHeight: "normal",
          },
        },
        rowTitle: {
          value: {
            fontSize: "md",
            fontWeight: "semibold",
            lineHeight: "compact",
            color: "ui.heading",
          },
        },
        rowMeta: {
          value: {
            fontSize: "sm",
            fontWeight: "normal",
            letterSpacing: "normal",
            color: "ui.secondary",
          },
        },
      },

      tokens: {
        colors: {
          // ---- page background ----
          "ui.bg": { value: "#0A0A0F" },

          // ---- surface layers (Radix dark gray scale) ----
          "ui.surface": { value: "#111113" },
          "ui.surfaceRaised": { value: "#18191B" },
          "ui.surfaceHover": { value: "#18191B" },

          // ---- borders ----
          "ui.border": { value: "#2C2C2F" },
          "ui.borderHover": { value: "#393939" },

          // ---- text hierarchy ----
          "ui.heading": { value: "#EDEDEF" },
          "ui.body": { value: "#EDEDEF" },
          "ui.secondary": { value: "#B0B0B3" },
          "ui.tertiary": { value: "#737376" },
          "ui.dim": { value: "#5A5A5E" },

          // ---- overlays ----
          "ui.overlay": { value: "rgba(10, 10, 15, 0.85)" },
          "ui.overlayHeavy": { value: "rgba(10, 10, 15, 0.95)" },

          // ---- accent (Radix indigo dark) ----
          "accent.primary": { value: "#3E63DD" },
          "accent.hover": { value: "#4D72E5" },
          "accent.contrast": { value: "#FFFFFF" },
          "accent.subtle": { value: "rgba(62, 99, 221, 0.12)" },
          "accent.border": { value: "rgba(62, 99, 221, 0.30)" },

          // ---- status (Radix green dark) ----
          "status.positive": { value: "#30A46C" },
          "status.positiveHover": { value: "#2B9362" },
          "status.positiveDim": { value: "rgba(48, 164, 108, 0.15)" },

          // ---- status: warning ----
          "status.warning": { value: "#F5A623" },
          "status.warningDim": { value: "rgba(245, 166, 35, 0.15)" },

          // ---- status: negative ----
          "status.negative": { value: "#E5484D" },
          "status.negativeDim": { value: "rgba(229, 72, 77, 0.15)" },

          // ---- white-alpha scale ----
          "whiteAlpha.3": { value: "rgba(255, 255, 255, 0.03)" },
          "whiteAlpha.5": { value: "rgba(255, 255, 255, 0.05)" },
          "whiteAlpha.6": { value: "rgba(255, 255, 255, 0.06)" },
          "whiteAlpha.8": { value: "rgba(255, 255, 255, 0.08)" },
          "whiteAlpha.10": { value: "rgba(255, 255, 255, 0.10)" },
          "whiteAlpha.12": { value: "rgba(255, 255, 255, 0.12)" },
          "whiteAlpha.15": { value: "rgba(255, 255, 255, 0.15)" },
          "whiteAlpha.20": { value: "rgba(255, 255, 255, 0.20)" },
        },

        fonts: {
          sans: {
            value:
              "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          },
          mono: {
            value:
              "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Monaco, Consolas, monospace",
          },
        },

        fontSizes: {
          "2xs": { value: "10px" },
          xs: { value: "11px" },
          sm: { value: "12px" },
          md: { value: "13px" },
          base: { value: "14px" },
          lg: { value: "16px" },
          xl: { value: "18px" },
          "2xl": { value: "22px" },
          "3xl": { value: "28px" },
          "4xl": { value: "36px" },
          "5xl": { value: "48px" },
          "6xl": { value: "60px" },
        },

        fontWeights: {
          light: { value: "350" },
          normal: { value: "420" },
          medium: { value: "500" },
          semibold: { value: "600" },
          bold: { value: "700" },
        },

        letterSpacings: {
          tighter: { value: "-0.025em" },
          tight: { value: "-0.02em" },
          snug: { value: "-0.01em" },
          normal: { value: "0.01em" },
          wide: { value: "0.04em" },
          editorial: { value: "0.08em" },
        },

        lineHeights: {
          none: { value: "1" },
          tight: { value: "1.08" },
          snug: { value: "1.15" },
          compact: { value: "1.3" },
          normal: { value: "1.5" },
          relaxed: { value: "1.6" },
          loose: { value: "1.75" },
        },

        spacing: {
          "1": { value: "4px" },
          "2": { value: "8px" },
          "3": { value: "12px" },
          "4": { value: "16px" },
          "5": { value: "20px" },
          "6": { value: "24px" },
          "8": { value: "32px" },
          "10": { value: "40px" },
          "12": { value: "48px" },
          "16": { value: "64px" },
          rowHeight: { value: "64px" },
          topbarHeight: { value: "36px" },
          navHeight: { value: "48px" },
          sidebarWidth: { value: "200px" },
          sidebarCollapsed: { value: "56px" },
          section: { value: "64px" },
          sectionMobile: { value: "40px" },
        },

        shadows: {
          card: { value: "0 1px 2px rgba(0, 0, 0, 0.30)" },
          navBorder: { value: "0 1px 0 rgba(255, 255, 255, 0.08)" },
        },

        radii: {
          none: { value: "0px" },
          editorial: { value: "2px" },
        },

        durations: {
          fast: { value: "150ms" },
          normal: { value: "300ms" },
          slow: { value: "400ms" },
        },

        easings: {
          smooth: { value: "cubic-bezier(0.25, 0.46, 0.45, 0.94)" },
          expoOut: { value: "cubic-bezier(0.16, 1, 0.30, 1)" },
        },

        zIndex: {
          base: { value: 0 },
          sticky: { value: 10 },
          overlay: { value: 40 },
          modal: { value: 50 },
          popover: { value: 60 },
          toast: { value: 70 },
        },
      },
    },
  },

  outdir: "styled-system",
  jsxFramework: "react",
});
