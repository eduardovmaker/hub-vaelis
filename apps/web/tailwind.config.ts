import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Public Sans"', "Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        "2xl": "16px",
        card: "16px",
      },
      colors: {
        primary: "var(--bg-primary)",
        surface: "var(--bg-surface)",
        "border-theme": "var(--border-color)",
        "text-main": "var(--text-primary)",
        "text-sub": "var(--text-secondary)",
        "brand-main": "var(--brand-primary)",
        "brand-accent": "var(--brand-accent)",
      },
      boxShadow: {
        minimal: "0 0 2px 0 rgba(145, 158, 171, 0.2), 0 12px 24px -4px rgba(145, 158, 171, 0.12)",
        "minimal-hover": "0 0 2px 0 rgba(145, 158, 171, 0.24), 0 20px 40px -4px rgba(145, 158, 171, 0.24)",
        "minimal-dropdown": "0 0 2px 0 rgba(145, 158, 171, 0.24), -20px 20px 40px -4px rgba(145, 158, 171, 0.24)",
        "minimal-dialog": "-40px 40px 80px -8px rgba(0, 0, 0, 0.24)",
      },
    },
  },
  plugins: [],
};

export default config;
