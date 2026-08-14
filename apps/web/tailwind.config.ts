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
        background: "#F8FAFC",
        surface: "#FFFFFF",
        border: "#E2E8F0",
        primary: {
          DEFAULT: "#4F46E5",
          hover: "#4338CA",
          light: "#EEF2FF",
          dark: "#3730A3",
        },
        success: {
          DEFAULT: "#10B981",
          light: "#ECFDF5",
          dark: "#047857",
        },
        warning: {
          DEFAULT: "#F59E0B",
          light: "#FFFBEB",
          dark: "#B45309",
        },
        danger: {
          DEFAULT: "#EF4444",
          light: "#FEF2F2",
          dark: "#B91C1C",
        },
        slate: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        elevated: "0 10px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -2px rgba(0, 0, 0, 0.03)",
      },
    },
  },
  plugins: [],
};

export default config;
