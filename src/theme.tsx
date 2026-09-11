import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

const STORAGE_KEY = 'portpilot-theme';
const FOLLOW_INTERVAL_MS = 30_000;

/** TOML-Schlüssel aus colors.toml → CSS-Variable --om-*. */
const VAR_MAP: Record<string, string> = {
  darker_background: 'bg-darker',
  dark_background: 'bg-dark',
  background: 'bg',
  lighter_background: 'bg-light',
  dark_foreground: 'fg-dim',
  foreground: 'fg',
  light_foreground: 'fg-light',
  bright_foreground: 'fg-bright',
  accent: 'accent',
  selection: 'selection',
  muted: 'muted',
  red: 'red',
  yellow: 'yellow',
  orange: 'orange',
  green: 'green',
  cyan: 'cyan',
  blue: 'blue',
  magenta: 'magenta',
  bright_red: 'b-red',
  bright_yellow: 'b-yellow',
  bright_green: 'b-green',
  bright_cyan: 'b-cyan',
  bright_blue: 'b-blue',
  bright_magenta: 'b-magenta',
  brown: 'brown',
};

const HEX = /^#[0-9a-fA-F]{6}$/;

interface ThemeResponse {
  ok: boolean;
  name?: string;
  colors?: Record<string, string>;
}

/**
 * Omarchy-Theme live in die Web-UI übernehmen.
 * Modus "auto" (Standard) folgt dem aktiven System-Theme — wechselt der
 * Benutzer in Omarchy z. B. auf Tokyo Night, zieht die App beim nächsten
 * Tick (spätestens nach 30 s, sofort bei Fenster-Fokus) nach. Alternativ
 * lässt sich ein Theme fest wählen; die Wahl persistiert in localStorage.
 * Ohne Omarchy/Server bleibt alles auf den Evergreen-Defaults aus index.css.
 */
function applyColors(colors: Record<string, string>): void {
  const root = document.documentElement;
  for (const [tomlKey, varName] of Object.entries(VAR_MAP)) {
    const value = colors[tomlKey];
    if (typeof value === 'string' && HEX.test(value)) {
      root.style.setProperty(`--om-${varName}`, value);
    }
  }
  const bg = colors.darker_background;
  if (typeof bg === 'string' && HEX.test(bg)) {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
  }
}

async function fetchTheme(name: string | null): Promise<ThemeResponse | null> {
  try {
    const res = await fetch(`/api/theme${name ? `?name=${encodeURIComponent(name)}` : ''}`);
    return (await res.json()) as ThemeResponse;
  } catch {
    return null;
  }
}

interface ThemeContextValue {
  /** 'auto' oder ein Theme-Name aus /api/themes */
  choice: string;
  setChoice: (choice: string) => void;
  themes: string[];
  /** Tatsächlich angewendetes Theme (aus der API-Antwort) */
  activeName: string;
}

const ThemeContext = createContext<ThemeContextValue>({
  choice: 'auto',
  setChoice: () => {},
  themes: [],
  activeName: '',
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<string>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) ?? 'auto';
    } catch {
      return 'auto';
    }
  });
  const [themes, setThemes] = useState<string[]>([]);
  const [activeName, setActiveName] = useState<string>('');

  const load = useCallback(async (name: string | null) => {
    const res = await fetchTheme(name);
    if (res?.ok && res.colors) {
      applyColors(res.colors);
      setActiveName(res.name ?? '');
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      /* Private Mode — Wahl gilt nur für diese Sitzung. */
    }
    void load(choice === 'auto' ? null : choice);
  }, [choice, load]);

  // Auto-Modus: Systemwechsel nachziehen — per Tick und sofort bei Fokus.
  useEffect(() => {
    if (choice !== 'auto') return;
    const tick = () => void load(null);
    const id = setInterval(tick, FOLLOW_INTERVAL_MS);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [choice, load]);

  useEffect(() => {
    fetch('/api/themes')
      .then((res) => res.json())
      .then((list: unknown) => {
        if (Array.isArray(list)) setThemes(list.filter((x): x is string => typeof x === 'string'));
      })
      .catch(() => {
        /* Ohne Liste kein Dropdown — Auto-Modus funktioniert trotzdem. */
      });
  }, []);

  const setChoice = useCallback((next: string) => setChoiceState(next), []);

  return (
    <ThemeContext.Provider value={{ choice, setChoice, themes, activeName }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
