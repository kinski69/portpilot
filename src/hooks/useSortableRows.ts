import { useCallback, useMemo, useState } from 'react';

export type SortValue = string | number | null | undefined;
export type SortDirection = 'asc' | 'desc';

export interface SortState<K extends string> {
  key: K;
  direction: SortDirection;
}

export type SortAccessors<T, K extends string> = Record<K, (row: T) => SortValue>;

/**
 * Natuerliche Sortierung: "container-2" vor "container-10", Umlaute an der
 * erwarteten Stelle, Gross-/Kleinschreibung egal.
 */
const collator = new Intl.Collator('de', { numeric: true, sensitivity: 'base' });

function isEmpty(value: SortValue): boolean {
  return value === null || value === undefined || value === '' || value === '—';
}

function compareValues(a: SortValue, b: SortValue): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return collator.compare(String(a), String(b));
}

/**
 * Sortiert Zeilen nach dem angegebenen Zustand.
 *
 * Bewusst als reine Funktion: bei nach Compose gruppierten Tabellen teilen
 * sich mehrere Tabellen einen Sortierzustand, den die Elternkomponente haelt.
 */
export function sortRows<T, K extends string>(
  rows: T[],
  accessors: SortAccessors<T, K>,
  sort: SortState<K>,
): T[] {
  const accessor = accessors[sort.key];
  if (!accessor) return rows;

  // Kopie sortieren — Array.prototype.sort veraendert sonst die Quelle.
  return [...rows].sort((x, y) => {
    const a = accessor(x);
    const b = accessor(y);

    // Leere Werte stehen immer am Ende, unabhaengig von der Richtung. Sonst
    // fuellt ein Umschalten auf absteigend die erste Bildschirmseite mit
    // Strichen statt mit Daten.
    const aEmpty = isEmpty(a);
    const bEmpty = isEmpty(b);
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;

    const result = compareValues(a, b);
    return sort.direction === 'asc' ? result : -result;
  });
}

/**
 * Haelt nur den Sortierzustand — fuer Faelle, in denen mehrere Tabellen
 * gemeinsam sortiert werden sollen.
 */
export function useSortState<K extends string>(initial: SortState<K>) {
  const [sort, setSort] = useState<SortState<K>>(initial);

  const toggle = useCallback((key: K) => {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    );
  }, []);

  return { sort, toggle };
}

/**
 * Zustand und Sortierung fuer eine einzelne Tabelle.
 *
 * `accessors` bildet jeden Spaltenschluessel auf den Wert ab, nach dem sortiert
 * wird — bewusst getrennt von der Darstellung, damit z.B. nach Bytes sortiert
 * werden kann, waehrend "1,4 GB" angezeigt wird.
 */
export function useSortableRows<T, K extends string>(
  rows: T[],
  accessors: SortAccessors<T, K>,
  // NoInfer: der Spaltentyp kommt aus `accessors`. Sonst wuerde TypeScript ihn
  // auf den einen Literaltyp des Startwerts verengen.
  initial: SortState<NoInfer<K>>,
) {
  const { sort, toggle } = useSortState(initial);

  const sorted = useMemo(
    () => sortRows(rows, accessors, sort),
    // accessors wird pro Render neu erzeugt; die Sortierung haengt nur an
    // Zeilen und Sortierzustand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, sort],
  );

  return { sorted, sort, toggle };
}
