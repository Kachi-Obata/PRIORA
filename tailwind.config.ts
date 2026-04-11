import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Muted palette — calm, not alarming
        ink: {
          DEFAULT: "#1a1a1f",
          muted: "#6b6b75",
          soft: "#a0a0aa",
          faint: "#d0d0d8",
        },
        surface: {
          DEFAULT: "#ffffff",
          raised: "#fafafa",
          sunk: "#f4f4f6",
        },
        accent: {
          // Calm teal — primary interactive color
          DEFAULT: "#0d9488",
          soft: "#e6f7f5",
          ink: "#0f766e",
        },
        warn: {
          // Warm amber — approaching threshold / due this week
          DEFAULT: "#d97706",
          soft: "#fef3e6",
          ink: "#b45309",
        },
        danger: {
          // Muted rose — overdue / below threshold
          DEFAULT: "#e11d48",
          soft: "#fdecef",
          ink: "#be123c",
        },
      },
      borderRadius: {
        card: "14px",
        btn: "10px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "'SF Pro Text'",
          "Roboto",
          "'Helvetica Neue'",
          "Arial",
          "sans-serif",
        ],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "sink-down": {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(4px)", opacity: "0.55" },
        },
      },
      animation: {
        "slide-up": "slide-up 240ms cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fade-in 160ms ease-out",
        "sink-down": "sink-down 300ms ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
