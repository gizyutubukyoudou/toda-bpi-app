import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          DEFAULT: "#1E40AF",
          700: "#1D4ED8",
          800: "#1E3A8A",
        },
        accent: {
          100: "#FEF3C7",
          200: "#FDE68A",
          DEFAULT: "#F59E0B",
          hover: "#D97706",
          700: "#B45309",
        },
        brand: {
          bg: "#FAFAF9",
        },
        status: {
          draft:     { bg: "#F3F4F6", text: "#6B7280" },
          submitted: { bg: "#DBEAFE", text: "#1D4ED8" },
          approved:  { bg: "#DCFCE7", text: "#15803D" },
          rejected:  { bg: "#FEE2E2", text: "#B91C1C" },
        },
      },
      fontFamily: {
        display: ["BIZ UDPGothic", "Meiryo UI", "sans-serif"],
        body:    ["Noto Sans JP", "Hiragino Sans", "sans-serif"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(30,64,175,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-md": "0 4px 12px rgba(30,64,175,0.08), 0 2px 4px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
