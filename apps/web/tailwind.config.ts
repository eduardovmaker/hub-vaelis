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
      colors: {
        primary: "var(--bg-primary)",
        surface: "var(--bg-surface)",
        "border-theme": "var(--border-color)",
        "text-main": "var(--text-primary)",
        "text-sub": "var(--text-secondary)",
        "brand-main": "var(--brand-primary)",
        "brand-accent": "var(--brand-accent)",
      },
    },
  },
  plugins: [],
};

export default config;
