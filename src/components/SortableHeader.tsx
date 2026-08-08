import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import type { SortState } from '../hooks/useSortableRows';

interface SortableHeaderProps<K extends string> {
  columnKey: K;
  label: string;
  sort: SortState<K>;
  onToggle: (key: K) => void;
  /** Zellen-Klassen der Tabelle, damit die Kopfzeile zum Raster passt. */
  className?: string;
  align?: 'left' | 'right';
}

export function SortableHeader<K extends string>({
  columnKey,
  label,
  sort,
  onToggle,
  className = '',
  align = 'left',
}: SortableHeaderProps<K>) {
  const isActive = sort.key === columnKey;
  const ascending = isActive && sort.direction === 'asc';

  const Icon = !isActive ? ChevronsUpDown : ascending ? ChevronUp : ChevronDown;

  return (
    <th
      className={className}
      // aria-sort teilt Screenreadern mit, wonach gerade sortiert ist.
      aria-sort={isActive ? (ascending ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onToggle(columnKey)}
        title={`Nach ${label} sortieren`}
        className={`group flex w-full items-center gap-1 font-semibold transition hover:text-zinc-200 focus:outline-none focus-visible:text-emerald-400 ${
          align === 'right' ? 'justify-end' : 'justify-start'
        } ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`}
      >
        <span>{label}</span>
        <Icon
          className={`h-3 w-3 shrink-0 transition ${
            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
          }`}
        />
      </button>
    </th>
  );
}
