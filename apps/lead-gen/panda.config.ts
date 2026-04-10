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

  theme: {
    extend: {
      tokens: {
        colors: {
          // ---- page background ----
          "ui.bg": { value: "#0A0A0F" },

          // ---- surface layers (Radix dark gray scale) ----
          "ui.surface": { value: "#111113" },
          "ui.surfaceRaised": { value: "#18191B" },
          "ui.surfaceHover": { value: "#18191B" },

          // ---- surface variants ----
          "ui.surfaceGlass": { value: "rgba(17, 17, 19, 0.8)" },
          "ui.surfaceOverlay": { value: "rgba(10, 10, 15, 0.9)" },

          // ---- borders ----
          "ui.border": { value: "#2C2C2F" },
          "ui.borderHover": { value: "#393939" },

          // ---- text hierarchy ----
          "ui.heading": { value: "#EDEDEF" },
          "ui.body": { value: "#EDEDEF" },
          "ui.secondary": { value: "#B0B0B3" },
          "ui.tertiary": { value: "#737376" },
          "ui.dim": { value: "#5A5A5E" },

          // ---- accent (Radix indigo dark) ----
          "accent.primary": { value: "#3E63DD" },
          "accent.hover": { value: "#4D72E5" },
          "accent.contrast": { value: "#FFFFFF" },
          "accent.subtle": { value: "rgba(62, 99, 221, 0.12)" },
          "accent.border": { value: "rgba(62, 99, 221, 0.30)" },

          // ---- secondary accent (amber) ----
          "accent2.primary": { value: "#F5A623" },
          "accent2.hover": { value: "#F7B84E" },
          "accent2.subtle": { value: "rgba(245, 166, 35, 0.12)" },

          // ---- status (Radix green dark) ----
          "status.positive": { value: "#30A46C" },
          "status.positiveHover": { value: "#2B9362" },
          "status.positiveDim": { value: "rgba(48, 164, 108, 0.15)" },

          // ---- status (error / warning / info) ----
          "status.error": { value: "#E5484D" },
          "status.warning": { value: "#F5A623" },
          "status.info": { value: "#3E63DD" },

          // ---- gradients as colors ----
          "gradient.accent": {
            value: "linear-gradient(135deg, #3E63DD, #7B93EE)",
          },
          "gradient.subtle": {
            value:
              "linear-gradient(180deg, rgba(62, 99, 221, 0.08), transparent)",
          },

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
          section: { value: "64px" },
          sectionMobile: { value: "40px" },
        },

        shadows: {
          card: { value: "0 1px 2px rgba(0, 0, 0, 0.30)" },
          navBorder: { value: "0 1px 0 rgba(255, 255, 255, 0.08)" },
          elevated: { value: "0 4px 16px rgba(0, 0, 0, 0.4)" },
          glow: { value: "0 0 24px rgba(62, 99, 221, 0.15)" },
          glowStrong: { value: "0 0 48px rgba(62, 99, 221, 0.25)" },
        },

        zIndex: {
          nav: { value: 100 },
          dropdown: { value: 200 },
          modal: { value: 300 },
          overlay: { value: 400 },
          tooltip: { value: 500 },
        },

        sizes: {
          "container.sm": { value: "640px" },
          "container.md": { value: "768px" },
          "container.lg": { value: "1024px" },
          "container.xl": { value: "1280px" },
        },

        borderWidths: {
          thin: { value: "1px" },
          medium: { value: "2px" },
        },

        radii: {
          none: { value: "0px" },
          xs: { value: "2px" },
          sm: { value: "4px" },
          md: { value: "6px" },
          lg: { value: "8px" },
          xl: { value: "12px" },
          "2xl": { value: "16px" },
          full: { value: "9999px" },
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
      },
    },
  },

  outdir: "styled-system",
  jsxFramework: "react",
});
