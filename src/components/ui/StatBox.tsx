import type { LucideIcon } from 'lucide-react';

export type StatTone = 'neutral' | 'good' | 'warn' | 'bad' | 'info';

const TONE: Record<StatTone, { icon: string; value: string }> = {
  neutral: {
    icon: 'text-zinc-300 border-zinc-800 bg-zinc-900',
    value: 'text-zinc-100',
  },
  good: {
    icon: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/12',
    value: 'text-emerald-300',
  },
  warn: {
    icon: 'text-amber-300 border-amber-500/30 bg-amber-500/12',
    value: 'text-amber-300',
  },
  bad: {
    icon: 'text-rose-300 border-rose-500/30 bg-rose-500/12',
    value: 'text-rose-300',
  },
  info: {
    icon: 'text-cyan-300 border-cyan-500/30 bg-cyan-500/12',
    value: 'text-cyan-300',
  },
};

interface StatBoxProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: StatTone;
  onClick?: () => void;
}

/** Kennzahlen-Box: flache Icon-Kachel links, Zahl und Label rechts. */
export const StatBox = ({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'neutral',
  onClick,
}: StatBoxProps) => {
  const t = TONE[tone];
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      onClick={onClick}
      className={`pp-card ${onClick ? 'pp-card-hover cursor-pointer' : ''} flex items-center gap-3 overflow-hidden px-4 py-3 text-left`}
    >
      <span className={`grid h-9 w-9 flex-none place-items-center rounded-xl border ${t.icon}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className={`block text-xl font-semibold leading-none ${t.value}`}>{value}</span>
        <span className="mt-1 block truncate text-[11px] font-medium text-zinc-400">{label}</span>
        {hint && <span className="mt-0.5 block truncate text-[10px] text-zinc-500">{hint}</span>}
      </span>
    </Tag>
  );
};
