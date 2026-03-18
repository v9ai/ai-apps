import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base surfaces — warm dark instead of pure black
        base: "#0c0b09",
        "base-dark": "#0a0a0a",
        surface: "rgba(255, 248, 235, 0.03)",
        "surface-hover": "rgba(255, 248, 235, 0.07)",
        "surface-active": "rgba(255, 248, 235, 0.10)",

        // Primary accent — warm amber/gold
        accent: {
          DEFAULT: "#D4A853",
          light: "#E4C47A",
          dark: "#B08A3A",
          muted: "rgba(212, 168, 83, 0.15)",
        },

        // Spotify — preserved for podcast links
        spotify: "#1DB954",

        // Warm neutral palette
        warm: {
          50: "#faf8f5",
          100: "#f3efe8",
          200: "#e8e0d4",
          300: "#d4c8b5",
          400: "#b8a68e",
          500: "#9c876a",
          600: "#7f6b50",
          700: "#5e4e3a",
          800: "#3d3226",
          900: "#1e1a14",
        },

        // Category colors — muted, sophisticated
        category: {
          research: "#7B8FA1",
          engineering: "#8B7E74",
          product: "#9B8E7B",
          philosophy: "#8A7F9B",
          business: "#7B9486",
          infrastructure: "#8C8577",
          safety: "#9B7B7B",
          open_source: "#7B8B7B",
        },

        // Text hierarchy on dark backgrounds
        text: {
          primary: "#faf8f5",
          secondary: "#b8a68e",
          tertiary: "#7f6b50",
          muted: "#5e4e3a",
        },
      },

      fontFamily: {
        serif: [
          "Playfair Display",
          "Georgia",
          "Cambria",
          "Times New Roman",
          "serif",
        ],
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },

      fontSize: {
        "5xl": ["2.5rem", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "6xl": ["2.75rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "7xl": ["4.5rem", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
        "8xl": ["6.25rem", { lineHeight: "1.0", letterSpacing: "-0.04em" }],
      },

      letterSpacing: {
        tighter: "-.04em",
        editorial: "0.08em",
      },

      backdropBlur: {
        xs: "2px",
      },

      animation: {
        "fade-in-up": "fade-in-up 0.6s ease-out both",
        "fade-in": "fade-in 0.5s ease-out both",
        "slide-in": "slide-in-right 0.4s ease-out both",
        "stagger-in": "stagger-in 0.4s ease-out both",
        "row-enter": "row-enter 0.35s ease-out both",
        float: "float 8s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "story-card": "story-card 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
        "story-fade": "story-fade 0.9s cubic-bezier(0.22, 1, 0.36, 1) both",
        "warm-pulse": "warm-pulse 4s ease-in-out infinite",
      },

      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "stagger-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "row-enter": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "story-card": {
          "0%": {
            opacity: "0",
            transform: "translateY(24px) scale(0.97)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0) scale(1)",
          },
        },
        "story-fade": {
          "0%": {
            opacity: "0",
            filter: "blur(4px)",
          },
          "100%": {
            opacity: "1",
            filter: "blur(0px)",
          },
        },
        "warm-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 20px rgba(212, 168, 83, 0.05)",
          },
          "50%": {
            boxShadow: "0 0 30px rgba(212, 168, 83, 0.12)",
          },
        },
      },

      borderRadius: {
        editorial: "2px",
      },

      boxShadow: {
        warm: "0 4px 24px rgba(212, 168, 83, 0.06)",
        "warm-lg": "0 8px 40px rgba(212, 168, 83, 0.10)",
        card: "0 1px 3px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.2)",
        "card-hover":
          "0 2px 8px rgba(0, 0, 0, 0.4), 0 8px 32px rgba(0, 0, 0, 0.3)",
      },

      backgroundImage: {
        "warm-gradient":
          "linear-gradient(135deg, rgba(212, 168, 83, 0.08), rgba(212, 168, 83, 0))",
        "warm-radial":
          "radial-gradient(ellipse at top, rgba(212, 168, 83, 0.06), transparent 70%)",
        "editorial-fade":
          "linear-gradient(to bottom, transparent, #0c0b09)",
      },
    },
  },
  plugins: [],
};
export default config;
