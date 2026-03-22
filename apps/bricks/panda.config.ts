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
          // LEGO primary palette
          "lego.red": { value: "#E3000B" },
          "lego.yellow": { value: "#FFD500" },
          "lego.blue": { value: "#006CB7" },
          "lego.green": { value: "#00852B" },
          "lego.orange": { value: "#FE8A18" },
          "lego.black": { value: "#1B1B1B" },
          "lego.white": { value: "#F4F4F0" },
          "lego.darkGray": { value: "#6B6E6F" },
          "lego.lightGray": { value: "#C4C4C4" },
          "lego.brightGreen": { value: "#58AB41" },
          "lego.darkBlue": { value: "#003A70" },
          "lego.tan": { value: "#D7C599" },

          // Surfaces — dark baseplate feel
          "plate.base": { value: "#111113" },
          "plate.surface": { value: "#1A1A1E" },
          "plate.raised": { value: "#222228" },
          "plate.hover": { value: "#2A2A32" },
          "plate.border": { value: "rgba(255, 255, 255, 0.08)" },
          "plate.borderHover": { value: "rgba(255, 255, 255, 0.14)" },

          // Text — instruction booklet ink
          "ink.primary": { value: "#F0EDE8" },
          "ink.secondary": { value: "#B8B4AD" },
          "ink.muted": { value: "#807C76" },
          "ink.faint": { value: "#5C5955" },

          // Stud highlight
          "stud.shine": { value: "rgba(255, 255, 255, 0.15)" },
          "stud.shadow": { value: "rgba(0, 0, 0, 0.4)" },
        },

        fonts: {
          display: { value: "var(--font-display), system-ui, sans-serif" },
          body: { value: "system-ui, -apple-system, sans-serif" },
        },

        radii: {
          brick: { value: "10px" },
          stud: { value: "50%" },
        },

        shadows: {
          brick: {
            value:
              "0 2px 0 rgba(0,0,0,0.25), 0 4px 8px -2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
          },
          "brick.hover": {
            value:
              "0 3px 0 rgba(0,0,0,0.3), 0 8px 16px -4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
          },
          stud: {
            value:
              "inset 0 -2px 3px rgba(0,0,0,0.35), inset 0 1px 2px rgba(255,255,255,0.2), 0 1px 2px rgba(0,0,0,0.3)",
          },
          "stud.pressed": {
            value:
              "inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -1px 1px rgba(255,255,255,0.1)",
          },
          plate: {
            value:
              "0 1px 0 rgba(0,0,0,0.2), 0 2px 6px -1px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)",
          },
        },
      },
    },
  },

  outdir: "styled-system",
  jsxFramework: "react",
});
