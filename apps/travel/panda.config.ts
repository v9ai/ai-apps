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
          // Katowice — warm editorial dark palette
          // Deep charcoal with a faint warm undertone rather than cold blue-black
          "steel.dark": { value: "#12100E" },      // page bg — near-black with warmth
          "steel.base": { value: "#1A1714" },
          "steel.surface": { value: "#211E1A" },   // card bg
          "steel.raised": { value: "#2A2620" },
          "steel.hover": { value: "#333028" },
          // Borders use warm white (not pure white) for a parchment-like quality
          "steel.border": { value: "rgba(240, 220, 180, 0.08)" },
          "steel.borderHover": { value: "rgba(240, 220, 180, 0.16)" },

          // Accent — Silesian amber & copper
          // Pulled slightly warmer/richer; less saturated to read as precious metal, not UI widget
          "amber.warm": { value: "#C9922A" },       // primary — deep antique gold
          "amber.bright": { value: "#E0A83A" },     // hover / highlight
          "amber.glow": { value: "rgba(201, 146, 42, 0.14)" },
          "copper.main": { value: "#A05E32" },      // secondary — aged copper
          "copper.light": { value: "#BC7A4E" },

          // Category colors — muted, travel-magazine palette
          // Each hue is desaturated ~40% and shifted toward earthy/atmospheric tones
          "cat.culture": { value: "#7C6E9E" },      // dusty violet — theatre, arts
          "cat.nature": { value: "#5A7A5C" },       // forest green — parks, nature
          "cat.food": { value: "#B55C3A" },         // terracotta — food & drink
          "cat.nightlife": { value: "#8E4E7E" },    // plum — bars, clubs
          "cat.architecture": { value: "#4A7A9B" }, // steel blue — brutalist buildings
          "cat.history": { value: "#8C6E4A" },      // parchment brown — museums, heritage
          "cat.entertainment": { value: "#9A7E3A" }, // antique brass — events, shows

          // Text — warm off-whites, not stark white
          "text.primary": { value: "#EDE8DF" },
          "text.secondary": { value: "#A89E90" },
          "text.muted": { value: "#6E6458" },
          "text.faint": { value: "#473F36" },
        },

        fonts: {
          display: { value: "var(--font-display), system-ui, sans-serif" },
          body: { value: "var(--font-body), system-ui, sans-serif" },
        },

        fontSizes: {
          // Named scale mapped to CSS vars so a single change propagates everywhere
          h1: { value: "var(--text-h1-size)" },
          h2: { value: "var(--text-h2-size)" },
          h3: { value: "var(--text-h3-size)" },
          body: { value: "var(--text-body-size)" },
          label: { value: "var(--text-label-size)" },
          meta: { value: "var(--text-meta-size)" },
        },

        lineHeights: {
          h1: { value: "var(--text-h1-leading)" },
          h2: { value: "var(--text-h2-leading)" },
          h3: { value: "var(--text-h3-leading)" },
          body: { value: "var(--text-body-leading)" },
          label: { value: "var(--text-label-leading)" },
          meta: { value: "var(--text-meta-leading)" },
        },

        letterSpacings: {
          h1: { value: "var(--text-h1-tracking)" },
          h2: { value: "var(--text-h2-tracking)" },
          h3: { value: "var(--text-h3-tracking)" },
          body: { value: "var(--text-body-tracking)" },
          label: { value: "var(--text-label-tracking)" },
          meta: { value: "var(--text-meta-tracking)" },
        },

        radii: {
          card: { value: "12px" },
          pill: { value: "999px" },
        },

        shadows: {
          // Shadows use warm amber tones in the glow, not neutral black
          card: {
            value:
              "0 2px 0 rgba(0,0,0,0.25), 0 4px 16px -2px rgba(0,0,0,0.4), inset 0 1px 0 rgba(240,220,180,0.05)",
          },
          "card.hover": {
            value:
              "0 4px 0 rgba(0,0,0,0.3), 0 10px 24px -4px rgba(0,0,0,0.45), inset 0 1px 0 rgba(240,220,180,0.08)",
          },
          glow: {
            value: "0 0 24px rgba(201, 146, 42, 0.18)",
          },
        },
      },
    },
  },

  outdir: "styled-system",
  jsxFramework: "react",
});
