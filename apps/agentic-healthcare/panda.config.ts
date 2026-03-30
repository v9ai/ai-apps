import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  // Disable CSS reset — Radix UI Themes handles this
  preflight: false,

  include: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],

  exclude: [],

  theme: {
    extend: {
      // Bridge Panda tokens to Radix UI CSS variables
      tokens: {
        colors: {
          indigo: {
            1: { value: "var(--indigo-1)" },
            2: { value: "var(--indigo-2)" },
            3: { value: "var(--indigo-3)" },
            4: { value: "var(--indigo-4)" },
            5: { value: "var(--indigo-5)" },
            6: { value: "var(--indigo-6)" },
            7: { value: "var(--indigo-7)" },
            8: { value: "var(--indigo-8)" },
            9: { value: "var(--indigo-9)" },
            10: { value: "var(--indigo-10)" },
            11: { value: "var(--indigo-11)" },
            12: { value: "var(--indigo-12)" },
            a2: { value: "var(--indigo-a2)" },
            a3: { value: "var(--indigo-a3)" },
            a4: { value: "var(--indigo-a4)" },
            a5: { value: "var(--indigo-a5)" },
            a6: { value: "var(--indigo-a6)" },
          },
          gray: {
            1: { value: "var(--gray-1)" },
            2: { value: "var(--gray-2)" },
            3: { value: "var(--gray-3)" },
            4: { value: "var(--gray-4)" },
            5: { value: "var(--gray-5)" },
            6: { value: "var(--gray-6)" },
            7: { value: "var(--gray-7)" },
            8: { value: "var(--gray-8)" },
            9: { value: "var(--gray-9)" },
            10: { value: "var(--gray-10)" },
            11: { value: "var(--gray-11)" },
            12: { value: "var(--gray-12)" },
            a2: { value: "var(--gray-a2)" },
            a3: { value: "var(--gray-a3)" },
            a4: { value: "var(--gray-a4)" },
          },
          surface: { value: "var(--color-surface)" },
          background: { value: "var(--color-background)" },
          accent: { value: "var(--accent-9)" },
        },
        spacing: {
          1: { value: "var(--space-1)" },
          2: { value: "var(--space-2)" },
          3: { value: "var(--space-3)" },
          4: { value: "var(--space-4)" },
          5: { value: "var(--space-5)" },
          6: { value: "var(--space-6)" },
          7: { value: "var(--space-7)" },
          8: { value: "var(--space-8)" },
          9: { value: "var(--space-9)" },
        },
        radii: {
          1: { value: "var(--radius-1)" },
          2: { value: "var(--radius-2)" },
          3: { value: "var(--radius-3)" },
          4: { value: "var(--radius-4)" },
          full: { value: "var(--radius-full)" },
        },
      },
    },
  },

  outdir: "styled-system",
});
