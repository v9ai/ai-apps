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
          "zoe.bg": { value: "#FAFAF7" },
          "zoe.surface": { value: "#FFFFFF" },
          "zoe.surfaceAlt": { value: "#F5F3EE" },
          "zoe.border": { value: "rgba(0, 0, 0, 0.08)" },
          "zoe.borderHover": { value: "rgba(0, 0, 0, 0.16)" },

          "zoe.yellow": { value: "#F5C518" },
          "zoe.yellowLight": { value: "#FFF8E1" },
          "zoe.purple": { value: "#6B4FA0" },
          "zoe.purpleLight": { value: "#F3EEFA" },
          "zoe.green": { value: "#2E7D5B" },
          "zoe.greenLight": { value: "#E8F5EC" },
          "zoe.coral": { value: "#E85D4A" },
          "zoe.coralLight": { value: "#FFF0ED" },

          "text.primary": { value: "#1A1A1A" },
          "text.secondary": { value: "#555555" },
          "text.muted": { value: "#888888" },
          "text.inverse": { value: "#FFFFFF" },
        },

        fonts: {
          display: { value: "var(--font-display), system-ui, sans-serif" },
          body: { value: "var(--font-body), system-ui, sans-serif" },
        },

        fontSizes: {
          hero: { value: "clamp(2.5rem, 5vw + 1rem, 4rem)" },
          h1: { value: "clamp(1.75rem, 3vw + 0.5rem, 2.5rem)" },
          h2: { value: "clamp(1.25rem, 2vw + 0.5rem, 1.5rem)" },
          h3: { value: "clamp(1rem, 1vw + 0.5rem, 1.125rem)" },
          body: { value: "1rem" },
          small: { value: "0.875rem" },
          label: { value: "0.75rem" },
        },

        radii: {
          card: { value: "16px" },
          pill: { value: "999px" },
          tag: { value: "8px" },
        },

        shadows: {
          card: {
            value: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)",
          },
          "card.hover": {
            value: "0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)",
          },
        },
      },
    },
  },

  outdir: "styled-system",
  jsxFramework: "react",
});
