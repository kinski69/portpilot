import React from 'react';
import {
  Search,
  Plus,
  Zap,
  Terminal,
  Activity,
  ShieldAlert,
  Server,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { ActiveTab } from '../types';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  runningCount: number;
  totalContainers: number;
  collisionCount: number;
  onOpenCreateModal: () => void;
  onOpenArchModal: () => void;
  isLiveStreaming: boolean;
  setIsLiveStreaming: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  activeTab,
  setActiveTab,
  runningCount,
  totalContainers,
  collisionCount,
  onOpenCreateModal,
  onOpenArchModal,
  isLiveStreaming,
  setIsLiveStreaming
}) => {
  return (
    <header className="bg-zinc-950 border-b border-zinc-800/80 sticky top-0 z-40 select-none">
      {/* Simulated Tauri Desktop Title Bar */}
      <div className="h-8 bg-zinc-900/90 px-3 flex items-center justify-between border-b border-zinc-800/50 text-xs text-zinc-400">
        <div className="flex items-center space-x-2">
          {/* Mac / Desktop Window Controls */}
          <div className="flex items-center space-x-1.5 mr-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-600/40 inline-block hover:opacity-80 transition cursor-pointer" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-600/40 inline-block hover:opacity-80 transition cursor-pointer" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-600/40 inline-block hover:opacity-80 transition cursor-pointer" />
          </div>

          <div className="flex items-center space-x-1.5 text-zinc-300 font-medium">
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span>Docker Deck</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
              Tauri v2.1 • Rust core
            </span>
          </div>
        </div>

        {/* Engine status indicator */}
        <div className="flex items-center space-x-3 text-[11px]">
          <button
            onClick={onOpenArchModal}
            className="flex items-center space-x-1 px-2 py-0.5 rounded bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 hover:text-white transition"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>bolard: /var/run/docker.sock</span>
          </button>

          <div className="flex items-center space-x-1.5 bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-0.5" />
            <span>IPC Stream &lt;1ms</span>
          </div>
        </div>
      </div>

      {/* Main Header Action Toolbar */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Search bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search containers, images, ports (e.g. '5432', 'postgres', 'running')..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-8 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
            >
              ✕
            </button>
          )}
        </div>

        {/* Quick System Badges */}
        <div className="flex items-center space-x-2 text-xs">
          <div className="flex items-center space-x-1.5 bg-zinc-900 px-2.5 py-1.5 rounded-md border border-zinc-800 text-zinc-300">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium text-emerald-400">{runningCount}</span>
            <span className="text-zinc-500">/ {totalContainers} Running</span>
          </div>

          {collisionCount > 0 ? (
            <button
              onClick={() => setActiveTab('ports')}
              className="flex items-center space-x-1.5 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1.5 rounded-md border border-rose-500/30 text-rose-400 transition animate-pulse"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span className="font-semibold">{collisionCount} Port Collisions!</span>
            </button>
          ) : (
            <div className="flex items-center space-x-1.5 bg-zinc-900 px-2.5 py-1.5 rounded-md border border-zinc-800 text-zinc-400">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              <span>0 Conflicts</span>
            </div>
          )}

          <button
            onClick={() => setIsLiveStreaming(!isLiveStreaming)}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md border text-xs transition ${
              isLiveStreaming
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Toggle live metrics streaming"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLiveStreaming ? 'animate-spin' : ''}`} />
            <span>{isLiveStreaming ? 'Live Stats ON' : 'Paused'}</span>
          </button>

          {/* Run Container Button */}
          <button
            onClick={onOpenCreateModal}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold px-3 py-1.5 rounded-md text-xs shadow-sm shadow-emerald-900/20 transition"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Run Container</span>
          </button>
        </div>
      </div>
    </header>
  );
};
