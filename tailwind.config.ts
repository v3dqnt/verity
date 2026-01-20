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
        // High-contrast "Youth Brand" Palette
        background: "#0a0a0a",
        foreground: "#ededed",
        brand: {
          neon: "#ccff00", // "Brat" green / Cyber yellow
          purple: "#8b5cf6",
          pink: "#ec4899",
          cyber: "#00f0ff",
        },
        card: {
          DEFAULT: "#151515",
          border: "rgba(255, 255, 255, 0.1)",
        }
      },
      borderRadius: {
        '3xl': '1.5rem', // Softer, more modern corners
        '4xl': '2rem',
      },
      animation: {
        'pulse-slow': 'pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
export default config;