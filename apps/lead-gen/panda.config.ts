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
          "status.errorHover": { value: "#CD3F44" },
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

          // ---- 12-step scales (Radix Colors dark mode) ----

          // Gray (grayDark)
          "gray.1": { value: "#111113" },
          "gray.2": { value: "#18191B" },
          "gray.3": { value: "#212225" },
          "gray.4": { value: "#272A2D" },
          "gray.5": { value: "#2E3135" },
          "gray.6": { value: "#363A3F" },
          "gray.7": { value: "#43484E" },
          "gray.8": { value: "#5A6169" },
          "gray.9": { value: "#696E77" },
          "gray.10": { value: "#777B84" },
          "gray.11": { value: "#B0B4BA" },
          "gray.12": { value: "#EDEEF0" },

          // Indigo (indigoDark)
          "indigo.1": { value: "#11131F" },
          "indigo.2": { value: "#141726" },
          "indigo.3": { value: "#182449" },
          "indigo.4": { value: "#1D2E5C" },
          "indigo.5": { value: "#253974" },
          "indigo.6": { value: "#304384" },
          "indigo.7": { value: "#3A4F97" },
          "indigo.8": { value: "#435DB1" },
          "indigo.9": { value: "#3E63DD" },
          "indigo.10": { value: "#5373E7" },
          "indigo.11": { value: "#849DFF" },
          "indigo.12": { value: "#D6E1FF" },

          // Green (greenDark)
          "green.1": { value: "#0E1512" },
          "green.2": { value: "#121B17" },
          "green.3": { value: "#132D21" },
          "green.4": { value: "#113B29" },
          "green.5": { value: "#174933" },
          "green.6": { value: "#20573E" },
          "green.7": { value: "#28684A" },
          "green.8": { value: "#2F7C57" },
          "green.9": { value: "#30A46C" },
          "green.10": { value: "#33B074" },
          "green.11": { value: "#3DD68C" },
          "green.12": { value: "#B1F1CB" },

          // Red (redDark)
          "red.1": { value: "#191111" },
          "red.2": { value: "#201314" },
          "red.3": { value: "#3B1219" },
          "red.4": { value: "#500F1C" },
          "red.5": { value: "#611623" },
          "red.6": { value: "#72232D" },
          "red.7": { value: "#8C333A" },
          "red.8": { value: "#B54548" },
          "red.9": { value: "#E5484D" },
          "red.10": { value: "#EC5D5E" },
          "red.11": { value: "#FF9592" },
          "red.12": { value: "#FFD1D9" },

          // Amber (amberDark)
          "amber.1": { value: "#16120C" },
          "amber.2": { value: "#1D180F" },
          "amber.3": { value: "#302008" },
          "amber.4": { value: "#3F2700" },
          "amber.5": { value: "#4D3000" },
          "amber.6": { value: "#5C3D05" },
          "amber.7": { value: "#714F19" },
          "amber.8": { value: "#8F6424" },
          "amber.9": { value: "#FFC53D" },
          "amber.10": { value: "#FFD60A" },
          "amber.11": { value: "#FFCA16" },
          "amber.12": { value: "#FFE7B3" },

          // Blue (blueDark)
          "blue.1": { value: "#0D1520" },
          "blue.2": { value: "#111927" },
          "blue.3": { value: "#0D2847" },
          "blue.4": { value: "#003362" },
          "blue.5": { value: "#004074" },
          "blue.6": { value: "#104D87" },
          "blue.7": { value: "#205D9E" },
          "blue.8": { value: "#2870BD" },
          "blue.9": { value: "#0090FF" },
          "blue.10": { value: "#3B9EFF" },
          "blue.11": { value: "#70B8FF" },
          "blue.12": { value: "#C2E6FF" },
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
          display: {
            value:
              "var(--font-instrument), Georgia, 'Times New Roman', serif",
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
          px: { value: "1px" },
          0: { value: "0px" },
          0.5: { value: "2px" },
          1: { value: "4px" },
          1.5: { value: "6px" },
          2: { value: "8px" },
          2.5: { value: "10px" },
          3: { value: "12px" },
          3.5: { value: "14px" },
          4: { value: "16px" },
          5: { value: "20px" },
          6: { value: "24px" },
          7: { value: "28px" },
          8: { value: "32px" },
          9: { value: "36px" },
          10: { value: "40px" },
          12: { value: "48px" },
          14: { value: "56px" },
          16: { value: "64px" },
          20: { value: "80px" },
          24: { value: "96px" },
          section: { value: "64px" },
          sectionMobile: { value: "40px" },
        },

        shadows: {
          card: { value: "0 1px 2px rgba(0, 0, 0, 0.30)" },
          navBorder: { value: "0 1px 0 rgba(255, 255, 255, 0.08)" },
          elevated: { value: "0 4px 16px rgba(0, 0, 0, 0.4)" },
          glow: { value: "0 0 24px rgba(62, 99, 221, 0.15)" },
          glowStrong: { value: "0 0 48px rgba(62, 99, 221, 0.25)" },
          "elevation.0": { value: "none" },
          "elevation.1": { value: "0 1px 2px rgba(0, 0, 0, 0.24)" },
          "elevation.2": { value: "0 2px 8px rgba(0, 0, 0, 0.32)" },
          "elevation.3": { value: "0 4px 16px rgba(0, 0, 0, 0.40)" },
          "elevation.4": { value: "0 8px 32px rgba(0, 0, 0, 0.48)" },
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
          "container.2xl": { value: "1536px" },
          "sidebar.expanded": { value: "200px" },
          "sidebar.collapsed": { value: "56px" },
          "topbar.height": { value: "36px" },
          "row.height": { value: "64px" },
          "row.compact": { value: "48px" },
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
          fastest: { value: "100ms" },
          fast: { value: "150ms" },
          normal: { value: "300ms" },
          slow: { value: "400ms" },
          slower: { value: "600ms" },
          slowest: { value: "1000ms" },
        },

        easings: {
          smooth: { value: "cubic-bezier(0.25, 0.46, 0.45, 0.94)" },
          expoOut: { value: "cubic-bezier(0.16, 1, 0.30, 1)" },
          linear: { value: "linear" },
          easeIn: { value: "cubic-bezier(0.4, 0, 1, 0.5)" },
          easeOut: { value: "cubic-bezier(0, 0, 0.2, 1)" },
          easeInOut: { value: "cubic-bezier(0.4, 0, 0.2, 1)" },
          spring: { value: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
          bounce: { value: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
        },

        animations: {
          fadeIn: { value: "fadeIn 300ms cubic-bezier(0, 0, 0.2, 1) forwards" },
          fadeOut: { value: "fadeOut 200ms ease forwards" },
          slideUp: { value: "slideUp 300ms cubic-bezier(0.16, 1, 0.30, 1) forwards" },
          slideDown: { value: "slideDown 300ms cubic-bezier(0.16, 1, 0.30, 1) forwards" },
          slideLeft: { value: "slideLeft 300ms cubic-bezier(0.16, 1, 0.30, 1) forwards" },
          slideRight: { value: "slideRight 300ms cubic-bezier(0.16, 1, 0.30, 1) forwards" },
          scaleIn: { value: "scaleIn 200ms cubic-bezier(0.16, 1, 0.30, 1) forwards" },
          scaleOut: { value: "scaleOut 150ms ease forwards" },
          spin: { value: "spin 1s linear infinite" },
          pulse: { value: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" },
          ping: { value: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite" },
        },

        opacity: {
          0: { value: "0" },
          5: { value: "0.05" },
          10: { value: "0.10" },
          15: { value: "0.15" },
          20: { value: "0.20" },
          25: { value: "0.25" },
          30: { value: "0.30" },
          40: { value: "0.40" },
          50: { value: "0.50" },
          60: { value: "0.60" },
          70: { value: "0.70" },
          80: { value: "0.80" },
          90: { value: "0.90" },
          95: { value: "0.95" },
          100: { value: "1" },
        },

        aspectRatios: {
          square: { value: "1 / 1" },
          landscape: { value: "16 / 9" },
          portrait: { value: "9 / 16" },
          wide: { value: "21 / 9" },
          photo: { value: "4 / 3" },
          golden: { value: "1.618 / 1" },
        },

        blurs: {
          none: { value: "0" },
          sm: { value: "4px" },
          md: { value: "8px" },
          lg: { value: "12px" },
          xl: { value: "24px" },
          "2xl": { value: "40px" },
        },

        borders: {
          subtle: { value: "1px solid #2C2C2F" },
          default: { value: "1px solid #2C2C2F" },
          accent: { value: "1px solid rgba(62, 99, 221, 0.30)" },
          focus: { value: "2px solid #3E63DD" },
        },
      },
    },
  },

  globalCss: {
    ":root": {
      "--transitions-fast": "all 150ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      "--transitions-normal":
        "all 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      "--transitions-slow": "all 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      "--transitions-colors":
        "color 150ms ease, background-color 150ms ease, border-color 150ms ease",
      "--transitions-transform":
        "transform 300ms cubic-bezier(0.16, 1, 0.30, 1)",
      "--transitions-opacity": "opacity 200ms ease",
    },
  },

  utilities: {
    extend: {
      transition: {
        className: "transition",
        values: {
          fast: "var(--transitions-fast)",
          normal: "var(--transitions-normal)",
          slow: "var(--transitions-slow)",
          colors: "var(--transitions-colors)",
          transform: "var(--transitions-transform)",
          opacity: "var(--transitions-opacity)",
        },
        transform(value: string) {
          return { transition: value };
        },
      },
    },
  },

  outdir: "styled-system",
  jsxFramework: "react",
});
