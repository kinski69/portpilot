interface GaugeRingProps {
  /** 0 – 100 */
  percent: number;
  label: string;
  caption?: string;
  size?: number;
  tone?: 'good' | 'warn' | 'bad';
}

const STROKE: Record<NonNullable<GaugeRingProps['tone']>, string> = {
  good: 'var(--color-emerald-500)',
  warn: 'var(--color-amber-400)',
  bad: 'var(--color-rose-500)',
};

/** Ringdiagramm im Stil klassischer Status-Seiten (Uptime-Anzeige). */
export const GaugeRing = ({
  percent,
  label,
  caption,
  size = 168,
  tone = 'good',
}: GaugeRingProps) => {
  const clamped = Math.max(0, Math.min(100, percent));
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <p className="pp-eyebrow">{label}</p>

      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-zinc-800)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={STROKE[tone]}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>

        <div className="absolute inset-0 grid place-items-center">
          <span className="text-3xl font-semibold text-zinc-100">{clamped.toFixed(0)}%</span>
        </div>
      </div>

      {caption && <p className="text-xs text-zinc-400">{caption}</p>}
    </div>
  );
};
