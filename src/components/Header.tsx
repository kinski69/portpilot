import { Activity, Cpu, RefreshCw, Search, Server, ShieldAlert } from 'lucide-react';
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
    <header className="sticky top-0 z-40 select-none border-b border-zinc-800/80 bg-zinc-950">
      {/* Statusleiste: zeigt die tatsächlich verbundene Engine */}
      <div className="flex h-8 items-center justify-between border-b border-zinc-800/50 bg-zinc-900/90 px-3 text-xs text-zinc-400">
        <div className="flex items-center space-x-1.5 font-medium text-zinc-300">
          <Server className="h-3.5 w-3.5 text-emerald-400" />
          <span>PortPilot</span>
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
            read-only
          </span>
        </div>

        <div className="flex items-center space-x-3 text-[11px]">
          <button
            onClick={onOpenAbout}
            className="rounded bg-zinc-800/60 px-2 py-0.5 font-mono text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            {health?.socket ?? '/var/run/docker.sock'}
          </button>

          {health?.ok ? (
            <div className="flex items-center space-x-1.5 rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>
                Engine {health.serverVersion} · API {health.apiVersion}
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 rounded border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 font-mono text-rose-400">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              <span>Engine getrennt</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 px-4 py-2.5">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Container, Image oder Port suchen (z. B. '8000', 'ollama', 'running')…"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-1.5 pl-9 pr-8 text-sm text-zinc-100 placeholder-zinc-500 transition focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
              aria-label="Suche zurücksetzen"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <div className="flex items-center space-x-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-zinc-300">
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-medium text-emerald-400">{runningCount}</span>
            <span className="text-zinc-500">/ {totalContainers} laufend</span>
          </div>

          {collisionCount > 0 ? (
            <button
              onClick={() => setActiveTab('ports')}
              className="flex items-center space-x-1.5 rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-rose-400 transition hover:bg-rose-500/20"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span className="font-semibold">
                {collisionCount} Port-{collisionCount === 1 ? 'Konflikt' : 'Konflikte'}
              </span>
            </button>
          ) : (
            <div className="flex items-center space-x-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-zinc-400">
              <Cpu className="h-3.5 w-3.5 text-blue-400" />
              <span>Keine Konflikte</span>
            </div>
          )}

          <button
            onClick={() => setIsLiveStreaming(!isLiveStreaming)}
            className={`flex items-center space-x-1.5 rounded-md border px-2.5 py-1.5 text-xs transition ${
              isLiveStreaming
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Laufende Messwerte an- oder abschalten"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isLiveStreaming ? 'animate-pulse bg-emerald-400' : 'bg-zinc-600'
              }`}
            />
            <span>{isLiveStreaming ? 'Live-Stats an' : 'Pausiert'}</span>
          </button>

          <button
            onClick={onRefresh}
            className="flex items-center space-x-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-zinc-300 transition hover:text-white"
            title="Alles neu laden"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Neu laden</span>
          </button>
        </div>
      </div>
    </header>
  );
};
