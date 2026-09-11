import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/**
 * Omarchy-Theme für die Web-UI lesbar machen.
 *
 * Die App folgt dem aktiven Omarchy-Theme (Farben aus colors.toml) zur
 * Laufzeit: Das Frontend fragt /api/theme und schreibt die Werte als
 * CSS-Variablen. Ohne Omarchy (oder bei Fehlern) meldet die API ok:false
 * und das Frontend bleibt auf den eingebauten Evergreen-Defaults.
 * Alles nur lesend — wie der Rest des Servers.
 */

export interface OmarchyTheme {
  ok: boolean;
  name?: string;
  mode?: string;
  colors?: Record<string, string>;
  error?: string;
}

const OMARCHY_BINARIES = ['omarchy', '/usr/share/omarchy/bin/omarchy'];
const NAME_PATTERN = /^[A-Za-z0-9 _\-.]{1,64}$/;
const TIMEOUT_MS = 4000;

// Aktuelles Theme kurz cachen: `omarchy theme current` kostet einen Prozess.
let cache: { at: number; name: string | null; colors: Record<string, string> | null } = {
  at: 0,
  name: null,
  colors: null,
};
const CACHE_MS = 10_000;

function run(binary: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(binary, args, { timeout: TIMEOUT_MS }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });
}

async function omarchy(args: string[]): Promise<string | null> {
  for (const bin of OMARCHY_BINARIES) {
    try {
      return await run(bin, args);
    } catch (err) {
      // ENOENT beim ersten Kandidaten → nächsten versuchen, sonst aufgeben.
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT' || bin === OMARCHY_BINARIES.at(-1)) {
        return null;
      }
    }
  }
  return null;
}

/** Minimaler TOML-Ausschnitt: es kommen nur `schlüssel = "wert"`-Zeilen vor. */
function parseColorsToml(text: string): Record<string, string> {
  const colors: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"([^"]*)"\s*(?:#.*)?$/);
    if (match) colors[match[1]] = match[2];
  }
  return colors;
}

async function readThemeColors(name: string): Promise<Record<string, string> | null> {
  if (!NAME_PATTERN.test(name)) return null;
  const dir = await resolveThemeDir(name);
  if (!dir) return null;
  try {
    // Nur genau diese eine Datei, kein Pfad vom Client übernehmbar.
    const text = await readFile(path.join(dir, 'colors.toml'), 'utf8');
    return parseColorsToml(text);
  } catch {
    return null;
  }
}

/**
 * Anzeigename („Tokyo Night") → Verzeichnis („tokyo-night").
 * `omarchy theme dir` löst Anzeigenamen mit Leer-/Großschreibung falsch auf
 * (liefert dann einen nicht existierenden Pfad), darum erst slug-Kandidaten
 * prüfen (User- vor System-Themes, wie Omarchy selbst) und die CLI-Ausgabe
 * nur übernehmen, wenn der Pfad wirklich eine colors.toml enthält.
 */
function slugify(name: string): string {
  return name.toLowerCase().replace(/[\s_]+/g, '-');
}

async function hasColorsToml(dir: string): Promise<boolean> {
  try {
    await readFile(path.join(dir, 'colors.toml'), 'utf8');
    return true;
  } catch {
    return false;
  }
}

async function resolveThemeDir(name: string): Promise<string | null> {
  const slug = slugify(name);
  if (/^\.+$/.test(slug) || slug.includes('..')) return null;
  const home = os.homedir();
  const candidates = [
    path.join(home, '.config/omarchy/themes', slug),
    path.join('/usr/share/omarchy/themes', slug),
    path.join(home, '.config/omarchy/themes', name),
    path.join('/usr/share/omarchy/themes', name),
  ];
  for (const dir of candidates) {
    if (await hasColorsToml(dir)) return dir;
  }
  const viaCli = (await omarchy(['theme', 'dir', name]))?.trim();
  if (viaCli && (await hasColorsToml(viaCli))) return viaCli;
  return null;
}

export async function getOmarchyTheme(name?: string): Promise<OmarchyTheme> {
  // Explizit gewähltes Theme (Frontend-Dropdown) — nicht cachen, selten.
  if (name) {
    const colors = await readThemeColors(name);
    if (!colors) return { ok: false, error: `Theme nicht gefunden: ${name}` };
    return { ok: true, name, colors };
  }

  if (Date.now() - cache.at < CACHE_MS && cache.name && cache.colors) {
    return { ok: true, name: cache.name, colors: cache.colors };
  }

  const current = (await omarchy(['theme', 'current']))?.trim();
  if (!current) return { ok: false, error: 'Omarchy nicht gefunden' };
  const colors = await readThemeColors(current);
  if (!colors) return { ok: false, error: `Theme ohne colors.toml: ${current}` };

  cache = { at: Date.now(), name: current, colors };
  return { ok: true, name: current, colors };
}

export async function listOmarchyThemes(): Promise<string[]> {
  const out = await omarchy(['theme', 'list']);
  if (!out) return [];
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && NAME_PATTERN.test(line));
}
