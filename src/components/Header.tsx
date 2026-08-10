import { Activity, Anchor, Cpu, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import type { HealthInfo } from '../api/client';
import type { ActiveTab } from '../types';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setActiveTab: (tab: ActiveTab) => void;
  runningCount: number;
  totalContainers: number;
  collisionCount: number;
  onOpenAbout: () => void;
  onRefresh: () => void;
  isLiveStreaming: boolean;
  setIsLiveStreaming: (on: boolean) => void;
  health: HealthInfo | null;
}

export const Header = ({
  searchQuery,
  setSearchQuery,
  setActiveTab,
  runningCount,
  totalContainers,
  collisionCount,
  onOpenAbout,
  onRefresh,
  isLiveStreaming,
  setIsLiveStreaming,
  health,
}: HeaderProps) => {
  return (
    <header className="sticky top-0 z-40 select-none border-b border-zinc-800/60 bg-zinc-950/85 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        {/* Markenzeichen */}
        <div className="flex items-center gap-2.5 pr-1">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-500/30 bg-emerald-500/12 shadow-[0_0_18px_-4px] shadow-emerald-500/50">
            <Anchor className="h-4.5 w-4.5 text-emerald-300" />
          </span>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-zinc-100">PortPilot</span>
              <span className="pp-pill border-zinc-700 text-zinc-400">v2</span>
            </div>
            <button
              onClick={onOpenAbout}
              className="font-mono text-[10px] text-zinc-500 transition hover:text-cyan-300"
              title="Über PortPilot"
            >
              {health?.socket ?? '/var/run/docker.sock'}
            </button>
          </div>
        </div>

        {/* Suche */}
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Container, Image oder Port suchen (z. B. '8000', 'ollama', 'running')…"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/70 py-2 pl-9 pr-8 text-sm text-zinc-100 placeholder-zinc-500 transition focus:border-emerald-500/50 focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 transition hover:text-zinc-200"
              aria-label="Suche zurücksetzen"
            >
              ✕
            </button>
          )}
        </div>

        {/* Statuskacheln und Schalter */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2">
            <Activity className="h-3.5 w-3.5 text-emerald-300" />
            <span className="font-semibold text-emerald-300">{runningCount}</span>
            <span className="text-zinc-500">/ {totalContainers} laufend</span>
          </div>

          {collisionCount > 0 ? (
            <button
              onClick={() => setActiveTab('ports')}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/12 px-3 py-2 font-semibold text-rose-300 transition hover:bg-rose-500/20"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              {collisionCount} Port-{collisionCount === 1 ? 'Konflikt' : 'Konflikte'}
            </button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-zinc-400">
              <Cpu className="h-3.5 w-3.5 text-cyan-300" />
              Keine Konflikte
            </div>
          )}

          {health?.ok ? (
            <div className="hidden items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 font-mono text-[11px] text-emerald-300 lg:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Engine {health.serverVersion} · API {health.apiVersion}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/12 px-3 py-2 font-mono text-[11px] text-rose-300">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              Engine getrennt
            </div>
          )}

          <button
            onClick={() => setIsLiveStreaming(!isLiveStreaming)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 transition ${
              isLiveStreaming
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-zinc-800 bg-zinc-900/70 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Laufende Messwerte an- oder abschalten"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isLiveStreaming ? 'animate-pulse bg-emerald-400' : 'bg-zinc-600'
              }`}
            />
            {isLiveStreaming ? 'Live-Stats an' : 'Pausiert'}
          </button>

          <button
            onClick={onRefresh}
            className="grid h-9 w-9 place-items-center rounded-xl border border-zinc-800 bg-zinc-900/70 text-zinc-300 transition hover:border-cyan-500/40 hover:text-cyan-300"
            title="Alles neu laden"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
