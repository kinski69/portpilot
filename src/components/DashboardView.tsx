import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Box,
  CheckCircle2,
  Cpu,
  HardDrive,
  Layers,
  LayoutGrid,
  MemoryStick,
  Network,
  Radio,
  Rows3,
  ShieldAlert,
} from 'lucide-react';
import type {
  ContainerItem,
  DockerImage,
  DockerNetwork,
  DockerSystemEvent,
  DockerVolume,
  PortCollision,
} from '../types';
import { formatBytes, formatUptime } from '../utils/dockerUtils';
import { StatBox } from './ui/StatBox';
import { GaugeRing } from './ui/GaugeRing';

interface DashboardViewProps {
  containers: ContainerItem[];
  images: DockerImage[];
  volumes: DockerVolume[];
  networks: DockerNetwork[];
  events: DockerSystemEvent[];
  collisions: PortCollision[];
  onSelectContainer: (container: ContainerItem) => void;
  onNavigate: (tab: 'containers' | 'ports' | 'images' | 'volumes' | 'networks' | 'events') => void;
}

/**
 * V2-Startseite: Kennzahlen, Auslastungsring, Lastverlauf und Kachelansicht
 * aller Container — der Gesamtzustand des Hosts ohne Scrollen.
 */
export const DashboardView = ({
  containers,
  images,
  volumes,
  networks,
  events,
  collisions,
  onSelectContainer,
  onNavigate,
}: DashboardViewProps) => {
  const [cardMode, setCardMode] = useState(true);

  const stats = useMemo(() => {
    const running = containers.filter((c) => c.status === 'running');
    const failed = containers.filter((c) => c.status === 'error' || c.status === 'exited');
    const cpu = running.reduce((sum, c) => sum + c.stats.cpuPercent, 0);
    const memUsed = running.reduce((sum, c) => sum + c.stats.memoryUsageMB, 0);
    const publishedPorts = containers.reduce((sum, c) => sum + c.ports.length, 0);
    const imageBytes = images.reduce((sum, i) => sum + i.sizeBytes, 0);

    return {
      running,
      failed,
      cpu,
      memUsed,
      publishedPorts,
      imageBytes,
      healthPercent: containers.length ? (running.length / containers.length) * 100 : 100,
    };
  }, [containers, images]);

  const allGood = collisions.length === 0 && stats.failed.length === 0;

  // Summierte CPU-Historie aller laufenden Container — grobe Hostlast.
  const loadHistory = useMemo(() => {
    const len = Math.max(0, ...stats.running.map((c) => c.stats.cpuHistory.length));
    return Array.from({ length: len }, (_, i) =>
      stats.running.reduce((sum, c) => sum + (c.stats.cpuHistory[i] ?? 0), 0),
    );
  }, [stats.running]);

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {/* Lagebericht ------------------------------------------------------ */}
      <div
        className={`pp-card pp-enter flex items-center gap-3 px-4 py-3 ${
          allGood ? 'border-emerald-500/25' : 'border-rose-500/30'
        }`}
      >
        <span
          className={`grid h-9 w-9 place-items-center rounded-xl ${
            allGood ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
          }`}
        >
          {allGood ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
        </span>
        <div className="flex-1">
          <p className={`text-sm font-semibold ${allGood ? 'text-emerald-300' : 'text-rose-300'}`}>
            {allGood ? 'Alle Dienste laufen sauber' : 'Auffälligkeiten auf dem Host'}
          </p>
          <p className="text-[11px] text-zinc-400">
            {stats.running.length} von {containers.length} Containern aktiv ·{' '}
            {collisions.length} Port-Konflikte · {stats.failed.length} gestoppt oder fehlerhaft
          </p>
        </div>
        {collisions.length > 0 && (
          <button
            onClick={() => onNavigate('ports')}
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/12 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Konflikte ansehen
          </button>
        )}
      </div>

      {/* Kennzahlen-Boxen -------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatBox
          icon={Box}
          label="Container gesamt"
          value={containers.length}
          tone="neutral"
          onClick={() => onNavigate('containers')}
        />
        <StatBox
          icon={Activity}
          label="Laufend"
          value={stats.running.length}
          tone="good"
          onClick={() => onNavigate('containers')}
        />
        <StatBox
          icon={AlertTriangle}
          label="Gestoppt / Fehler"
          value={stats.failed.length}
          tone={stats.failed.length > 0 ? 'warn' : 'neutral'}
          onClick={() => onNavigate('containers')}
        />
        <StatBox
          icon={Radio}
          label="Offene Ports"
          value={stats.publishedPorts}
          hint={collisions.length > 0 ? `${collisions.length} Konflikte` : 'konfliktfrei'}
          tone={collisions.length > 0 ? 'bad' : 'info'}
          onClick={() => onNavigate('ports')}
        />
        <StatBox
          icon={Layers}
          label="Images"
          value={images.length}
          hint={formatBytes(stats.imageBytes)}
          tone="neutral"
          onClick={() => onNavigate('images')}
        />
        <StatBox
          icon={HardDrive}
          label="Volumes"
          value={volumes.length}
          hint={`${networks.length} Netzwerke`}
          tone="neutral"
          onClick={() => onNavigate('volumes')}
        />
      </div>

      {/* Ring, Lastverlauf, Ressourcen ------------------------------------- */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="pp-card grid place-items-center p-5">
          <GaugeRing
            percent={stats.healthPercent}
            label="Aktive Dienste"
            caption={`${stats.running.length} von ${containers.length} Containern`}
            tone={stats.healthPercent > 80 ? 'good' : stats.healthPercent > 50 ? 'warn' : 'bad'}
          />
        </div>

        <div className="pp-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="pp-eyebrow">Hostlast</p>
              <p className="mt-1 text-sm text-zinc-300">Summierte CPU-Last der laufenden Container</p>
            </div>
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-lg font-semibold text-cyan-300">{stats.cpu.toFixed(1)}%</p>
                <p className="text-[10px] text-zinc-500">CPU gesamt</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-emerald-300">
                  {stats.memUsed.toFixed(0)} MB
                </p>
                <p className="text-[10px] text-zinc-500">RAM belegt</p>
              </div>
            </div>
          </div>

          <LoadChart data={loadHistory} />

          <div className="mt-4 grid grid-cols-3 gap-3">
            <MiniStat icon={Cpu} label="Ø CPU je Container" value={
              stats.running.length ? `${(stats.cpu / stats.running.length).toFixed(1)}%` : '—'
            } />
            <MiniStat icon={MemoryStick} label="Ø RAM je Container" value={
              stats.running.length ? `${(stats.memUsed / stats.running.length).toFixed(0)} MB` : '—'
            } />
            <MiniStat icon={Network} label="Ereignisse" value={`${events.length}`} />
          </div>
        </div>
      </div>

      {/* Container-Kacheln -------------------------------------------------- */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="pp-eyebrow">Alle</p>
          <h2 className="text-lg font-semibold text-zinc-100">Container</h2>
        </div>

        <button
          onClick={() => setCardMode(!cardMode)}
          className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-cyan-500/40 hover:text-cyan-300"
        >
          {cardMode ? <LayoutGrid className="h-3.5 w-3.5" /> : <Rows3 className="h-3.5 w-3.5" />}
          {cardMode ? 'Kachelansicht' : 'Kompaktliste'}
        </button>
      </div>

      {containers.length === 0 ? (
        <div className="pp-card grid place-items-center p-10 text-sm text-zinc-500">
          Keine Container auf diesem Host gefunden.
        </div>
      ) : cardMode ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {containers.map((c) => (
            <ContainerCard key={c.id} container={c} collisions={collisions} onOpen={onSelectContainer} />
          ))}
        </div>
      ) : (
        <div className="pp-card divide-y divide-zinc-800/70 overflow-hidden">
          {containers.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectContainer(c)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-zinc-800/40"
            >
              <StatusDot status={c.status} />
              <span className="w-56 truncate text-sm font-medium text-zinc-200">{c.name}</span>
              <span className="flex-1 truncate font-mono text-[11px] text-zinc-500">{c.image}</span>
              <span className="font-mono text-[11px] text-cyan-300">
                {c.ports.map((p) => p.hostPort).join(', ') || '—'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* --------------------------------------------------------------------- */

const MiniStat = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
}) => (
  <div className="flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2">
    <Icon className="h-4 w-4 flex-none text-zinc-500" />
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-zinc-200">{value}</p>
      <p className="truncate text-[10px] text-zinc-500">{label}</p>
    </div>
  </div>
);

const LoadChart = ({ data }: { data: number[] }) => {
  const width = 640;
  const height = 120;

  if (data.length < 2) {
    return (
      <div className="grid h-[120px] place-items-center rounded-xl border border-dashed border-zinc-800 text-xs text-zinc-500">
        Noch keine Messwerte — Live-Stats einschalten.
      </div>
    );
  }

  const max = Math.max(...data, 10);
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * (height - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[120px] w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="pp-load" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-cyan-400)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-cyan-400)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        fill="url(#pp-load)"
        points={`0,${height} ${points.join(' ')} ${width},${height}`}
      />
      <polyline
        fill="none"
        stroke="var(--color-cyan-400)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(' ')}
      />
    </svg>
  );
};

const StatusDot = ({ status }: { status: ContainerItem['status'] }) => {
  const color =
    status === 'running'
      ? 'bg-emerald-400 shadow-emerald-500/50'
      : status === 'restarting'
        ? 'bg-amber-400 shadow-amber-500/50'
        : status === 'error'
          ? 'bg-rose-400 shadow-rose-500/50'
          : 'bg-zinc-600 shadow-transparent';

  return <span className={`h-2 w-2 flex-none rounded-full shadow-[0_0_10px_2px] ${color}`} />;
};

const ContainerCard = ({
  container,
  collisions,
  onOpen,
}: {
  container: ContainerItem;
  collisions: PortCollision[];
  onOpen: (c: ContainerItem) => void;
}) => {
  const isRunning = container.status === 'running';
  const collidingPorts = new Set(collisions.map((c) => c.port));
  const hasConflict = container.ports.some((p) => collidingPorts.has(p.hostPort));

  const rows: { label: string; value: string; tone: string }[] = [
    {
      label: 'Status',
      value: container.statusText || container.status,
      tone: isRunning ? 'text-emerald-300 border-emerald-500/30' : 'text-zinc-400 border-zinc-700',
    },
    {
      label: 'Laufzeit',
      value: formatUptime(container.created),
      tone: 'text-zinc-300 border-zinc-700',
    },
    {
      label: 'Ports',
      value: container.ports.length ? container.ports.map((p) => p.hostPort).join(', ') : 'keine',
      tone: hasConflict ? 'text-rose-300 border-rose-500/40' : 'text-cyan-300 border-cyan-500/25',
    },
    {
      label: 'CPU',
      value: isRunning ? `${container.stats.cpuPercent.toFixed(1)} %` : '—',
      tone: 'text-zinc-300 border-zinc-700',
    },
    {
      label: 'RAM',
      value: isRunning ? `${container.stats.memoryUsageMB.toFixed(0)} MB` : '—',
      tone: 'text-zinc-300 border-zinc-700',
    },
  ];

  return (
    <button
      onClick={() => onOpen(container)}
      className="pp-card pp-card-hover flex flex-col p-0 text-left"
    >
      <div className="flex items-center gap-2.5 border-b border-zinc-800/70 px-4 py-3">
        <StatusDot status={container.status} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-100">{container.name}</p>
          <p className="truncate font-mono text-[10.5px] text-zinc-500">{container.image}</p>
        </div>
        {hasConflict && <ShieldAlert className="h-4 w-4 flex-none text-rose-400" />}
      </div>

      <div className="space-y-2 px-4 py-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-zinc-500">{row.label}</span>
            <span className="flex-1 border-b border-dotted border-zinc-800" />
            <span className={`pp-pill ${row.tone}`}>{row.value}</span>
          </div>
        ))}

        <div className="pt-2">
          <p className="mb-1.5 text-[10px] font-semibold text-zinc-400">CPU-Verlauf</p>
          <HistoryBars history={container.stats.cpuHistory} active={isRunning} />
        </div>
      </div>
    </button>
  );
};

/** Balkenreihe im Stil der Uptime-Historie klassischer Statusseiten. */
const HistoryBars = ({ history, active }: { history: number[]; active: boolean }) => {
  const slots = 30;
  const values = history.slice(-slots);
  const pad = Array.from({ length: Math.max(0, slots - values.length) }, () => null);
  const cells: (number | null)[] = [...pad, ...values];
  const max = Math.max(10, ...values);

  return (
    <div className="flex h-8 items-end gap-[3px]">
      {cells.map((v, i) => {
        if (v === null) {
          return <span key={i} className="h-2 flex-1 rounded-sm bg-zinc-800/70" />;
        }
        const h = Math.max(15, (v / max) * 100);
        const tone = !active
          ? 'bg-zinc-700'
          : v / max > 0.75
            ? 'bg-amber-400'
            : 'bg-emerald-500';
        return (
          <span
            key={i}
            className={`flex-1 rounded-sm ${tone}`}
            style={{ height: `${h}%` }}
            title={`${v.toFixed(1)} %`}
          />
        );
      })}
    </div>
  );
};
