import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  preflight: true,

  include: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
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
          // Page background
          "ui.base": { value: "#0B0B0F" },

          // Card / surface layers
          "card.bg": { value: "#15141A" },
          "card.bgRaised": { value: "#17151E" },
          "card.bgHover": { value: "#1C1C22" },
          "card.border": { value: "rgba(255, 255, 255, 0.06)" },
          "card.borderHover": { value: "rgba(255, 255, 255, 0.10)" },

          // Text hierarchy
          "ui.heading": { value: "#E8E8ED" },
          "ui.body": { value: "#C4C4CC" },
          "ui.secondary": { value: "#9B9BA6" },
          "ui.tertiary": { value: "#8B8B96" },
          "ui.dim": { value: "#7B7B86" },
          "ui.faint": { value: "#5A5A65" },
          "ui.dark": { value: "#3A3A45" },

          // White-alpha scale
          "whiteAlpha.3": { value: "rgba(255, 255, 255, 0.03)" },
          "whiteAlpha.4": { value: "rgba(255, 255, 255, 0.04)" },
          "whiteAlpha.5": { value: "rgba(255, 255, 255, 0.05)" },
          "whiteAlpha.6": { value: "rgba(255, 255, 255, 0.06)" },
          "whiteAlpha.7": { value: "rgba(255, 255, 255, 0.07)" },
          "whiteAlpha.8": { value: "rgba(255, 255, 255, 0.08)" },
          "whiteAlpha.10": { value: "rgba(255, 255, 255, 0.10)" },
          "whiteAlpha.12": { value: "rgba(255, 255, 255, 0.12)" },
          "whiteAlpha.13": { value: "rgba(255, 255, 255, 0.13)" },
          "whiteAlpha.15": { value: "rgba(255, 255, 255, 0.15)" },
          "whiteAlpha.18": { value: "rgba(255, 255, 255, 0.18)" },
          "whiteAlpha.20": { value: "rgba(255, 255, 255, 0.20)" },
          "whiteAlpha.22": { value: "rgba(255, 255, 255, 0.22)" },

          // Accent purple
          "accent.purple": { value: "#A78BFA" },
          "accent.purpleLight": { value: "#c4b5fd" },
          "accent.purpleBorder": { value: "rgba(139, 92, 246, 0.25)" },
          "accent.purpleBg": { value: "rgba(139, 92, 246, 0.12)" },
          "accent.purpleFocus": { value: "rgba(139, 92, 246, 0.5)" },
          "accent.purpleGlow": { value: "rgba(139, 92, 246, 0.18)" },
          "accent.purpleDivider": { value: "rgba(167, 139, 250, 0.35)" },
          "accent.purplePulse": { value: "rgba(167, 139, 250, 0.22)" },

          // Brand
          spotify: { value: "#1DB954" },

          // Category accent colors
          "cat.research": { value: "#7B8FA1" },
          "cat.engineering": { value: "#8B7E74" },
          "cat.product": { value: "#9B8E7B" },
          "cat.philosophy": { value: "#8A7F9B" },
          "cat.business": { value: "#7B9486" },
          "cat.infrastructure": { value: "#8C8577" },
          "cat.safety": { value: "#9B7B7B" },
          "cat.openSource": { value: "#7B8B7B" },
        },

        fonts: {
          sans: {
            value: "var(--font-inter), sans-serif",
          },
        },

        fontSizes: {
          "5xl": { value: "2.5rem" },
          "6xl": { value: "2.75rem" },
          "7xl": { value: "4.5rem" },
          "8xl": { value: "6.25rem" },
        },

        letterSpacings: {
          tighter: { value: "-0.04em" },
          tight: { value: "-0.02em" },
          editorial: { value: "0.08em" },
          wide: { value: "0.06em" },
        },

        shadows: {
          card: {
            value:
              "0 1px 2px rgba(0,0,0,0.35), 0 4px 16px -4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)",
          },
          "card.hover": {
            value:
              "0 2px 4px rgba(0,0,0,0.45), 0 12px 36px -6px rgba(0,0,0,0.4), 0 24px 56px -12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
          },
          "card.focus": {
            value:
              "0 0 0 3px rgba(139,92,246,0.18), 0 2px 4px rgba(0,0,0,0.45), 0 12px 36px -6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
          },
          "card.active": {
            value:
              "0 1px 3px rgba(0,0,0,0.5), 0 6px 20px -4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
          },
          navBorder: { value: "0 1px 0 rgba(255, 255, 255, 0.08)" },
          titleGlow: { value: "0 0 20px rgba(255, 255, 255, 0.05)" },
        },

        radii: {
          editorial: { value: "2px" },
        },

        durations: {
          fast: { value: "150ms" },
          normal: { value: "300ms" },
          slow: { value: "400ms" },
          slower: { value: "500ms" },
        },

        easings: {
          smooth: { value: "cubic-bezier(0.25, 0.46, 0.45, 0.94)" },
          expoOut: { value: "cubic-bezier(0.16, 1, 0.3, 1)" },
        },
      },
    },
  },

  outdir: "styled-system",
  jsxFramework: "react",
});
