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
        // Page background
        base: "#0B0B0F",

        // Card / surface layers
        surface: {
          DEFAULT: "#141418",
          raised: "#16161D",
          hover: "#1C1C22",
        },

        // Text hierarchy
        ink: {
          primary: "#E8E8ED",
          secondary: "#C4C4CC",
          tertiary: "#9B9BA6",
          muted: "#7B7B86",
          subtle: "#5A5A65",
        },

        // Borders (as opaque fallback values — rgba used inline where needed)
        rim: {
          faint: "rgba(255,255,255,0.04)",
          subtle: "rgba(255,255,255,0.06)",
          DEFAULT: "rgba(255,255,255,0.08)",
          strong: "rgba(255,255,255,0.12)",
          active: "rgba(255,255,255,0.15)",
        },

        // Brand
        spotify: "#1DB954",

        // Category accent colors — muted, sophisticated
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
      },

      fontFamily: {
        sans: [
          "var(--font-inter)",
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
      },

      borderRadius: {
        editorial: "2px",
      },

      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.2)",
        "card-hover": "0 2px 8px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.3)",
      },
    },
  },
  plugins: [],
};
export default config;
