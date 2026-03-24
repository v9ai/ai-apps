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
          // Katowice industrial palette
          "steel.dark": { value: "#0F1114" },
          "steel.base": { value: "#181B20" },
          "steel.surface": { value: "#1E2128" },
          "steel.raised": { value: "#262A33" },
          "steel.hover": { value: "#2E333D" },
          "steel.border": { value: "rgba(255, 255, 255, 0.08)" },
          "steel.borderHover": { value: "rgba(255, 255, 255, 0.15)" },

          // Accent — Silesian amber & copper
          "amber.warm": { value: "#E8A838" },
          "amber.bright": { value: "#F5C542" },
          "amber.glow": { value: "rgba(232, 168, 56, 0.15)" },
          "copper.main": { value: "#C07040" },
          "copper.light": { value: "#D4885A" },

          // Category colors
          "cat.culture": { value: "#7B68EE" },
          "cat.nature": { value: "#4CAF50" },
          "cat.food": { value: "#FF7043" },
          "cat.nightlife": { value: "#E040FB" },
          "cat.architecture": { value: "#42A5F5" },
          "cat.history": { value: "#AB8B6B" },
          "cat.entertainment": { value: "#FFD54F" },

          // Text
          "text.primary": { value: "#F0ECE4" },
          "text.secondary": { value: "#B0AAA0" },
          "text.muted": { value: "#787068" },
          "text.faint": { value: "#504840" },
        },

        fonts: {
          display: { value: "var(--font-display), system-ui, sans-serif" },
          body: { value: "system-ui, -apple-system, sans-serif" },
        },

        radii: {
          card: { value: "12px" },
          pill: { value: "999px" },
        },

        shadows: {
          card: {
            value:
              "0 2px 0 rgba(0,0,0,0.2), 0 4px 12px -2px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
          },
          "card.hover": {
            value:
              "0 4px 0 rgba(0,0,0,0.25), 0 8px 20px -4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
          },
          glow: {
            value: "0 0 20px rgba(232, 168, 56, 0.15)",
          },
        },
      },
    },
  },

  outdir: "styled-system",
  jsxFramework: "react",
});
