"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type Theme = "night" | "day";

type ThemeContextValue = {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "plugz-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("night");

  // Sync from the DOM attribute set by the inline pre-paint script.
  useEffect(() => {
    const current = document.documentElement.getAttribute(
      "data-theme"
    ) as Theme | null;
    if (current === "day" || current === "night") setThemeState(current);
  }, []);

  const apply = useCallback((t: Theme) => {
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore private-mode storage errors */
    }
    setThemeState(t);
  }, []);

  const toggle = useCallback(
    () => apply(theme === "night" ? "day" : "night"),
    [theme, apply]
  );

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme: apply }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
