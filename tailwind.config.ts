import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
      colors: {
        primary: "#1e3a8a",
        "primary-light": "#3b82f6",
        surface: "#ffffff",
        background: "#f0f4ff",
        "text-main": "#1e293b",
        "text-muted": "#64748b",
        "ui-border": "#e2e8f0",
        danger: "#ef4444",
        warning: "#f97316",
        caution: "#eab308",
        success: "#22c55e",
      },
    },
  },
  plugins: [],
};

export default config;
