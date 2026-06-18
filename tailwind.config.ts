import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0f1f35',
          800: '#172d4a',
          700: '#1e3a5f',
          600: '#1e40af',
          500: '#2563eb',
          400: '#3b82f6',
          300: '#93c5fd',
          200: '#bfdbfe',
          100: '#dbeafe',
          50:  '#eff6ff',
        },
        surface: '#ffffff',
        background: '#f8fafc',
        border: '#e2e8f0',
        'border-light': '#f1f5f9',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
      },
      borderRadius: {
        'xl':  '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};
export default config;
