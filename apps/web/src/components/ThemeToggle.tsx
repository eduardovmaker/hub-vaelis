"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem("captive_hub_theme") as "light" | "dark" | null;
    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.setAttribute("data-theme", storedTheme);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initialTheme = prefersDark ? "dark" : "light";
      setTheme(initialTheme);
      document.documentElement.setAttribute("data-theme", initialTheme);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("captive_hub_theme", nextTheme);
  };

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Alternar tema"
        className={`p-2 rounded-lg border transition-all opacity-50 ${className}`}
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-color)",
          color: "var(--text-primary)",
        }}
      >
        <Sun className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Alternar tema"
      title={`Alternar para modo ${theme === "light" ? "escuro" : "claro"}`}
      className={`p-2.5 rounded-lg border flex items-center justify-center gap-2 text-sm font-medium transition-all shadow-sm hover:shadow hover:scale-105 active:scale-95 ${className}`}
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-color)",
        color: "var(--text-primary)",
      }}
    >
      {theme === "light" ? (
        <>
          <Moon className="w-4 h-4 text-slate-700" />
          <span className="hidden sm:inline text-xs font-semibold text-slate-700">Dark Mode</span>
        </>
      ) : (
        <>
          <Sun className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline text-xs font-semibold text-amber-300">Light Mode</span>
        </>
      )}
    </button>
  );
}
