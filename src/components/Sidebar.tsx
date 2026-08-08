import React from 'react';
import {
  Box,
  Network,
  HardDrive,
  Layers,
  Radio,
  Activity,
  AlertTriangle,
  Info,
  Server
} from 'lucide-react';
import { ActiveTab } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  containerCount: number;
  runningCount: number;
  collisionCount: number;
  imageCount: number;
  danglingImageCount: number;
  volumeCount: number;
  danglingVolumeCount: number;
  networkCount: number;
  onOpenArchModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  containerCount,
  runningCount,
  collisionCount,
  imageCount,
  danglingImageCount,
  volumeCount,
  danglingVolumeCount,
  networkCount,
  onOpenArchModal
}) => {
  const navItems = [
    {
      id: 'containers' as ActiveTab,
      label: 'Containers',
      icon: Box,
      badge: `${runningCount}/${containerCount}`,
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    },
    {
      id: 'ports' as ActiveTab,
      label: 'Port Overview',
      icon: Radio,
      badge: collisionCount > 0 ? `${collisionCount} Conflict${collisionCount > 1 ? 's' : ''}` : null,
      badgeColor: collisionCount > 0 ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse font-bold' : ''
    },
    {
      id: 'images' as ActiveTab,
      label: 'Images',
      icon: Layers,
      badge: danglingImageCount > 0 ? `${danglingImageCount} Pruneable` : `${imageCount}`,
      badgeColor: danglingImageCount > 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-zinc-800 text-zinc-400'
    },
    {
      id: 'volumes' as ActiveTab,
      label: 'Volumes',
      icon: HardDrive,
      badge: danglingVolumeCount > 0 ? `${danglingVolumeCount} Unused` : `${volumeCount}`,
      badgeColor: danglingVolumeCount > 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-zinc-800 text-zinc-400'
    },
    {
      id: 'networks' as ActiveTab,
      label: 'Networks',
      icon: Network,
      badge: `${networkCount}`,
      badgeColor: 'bg-zinc-800 text-zinc-400'
    },
    {
      id: 'events' as ActiveTab,
      label: 'System Events',
      icon: Activity,
      badge: 'Live',
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
    }
  ];

  return (
    <aside className="w-56 bg-zinc-950/90 border-r border-zinc-800/80 flex flex-col justify-between select-none">
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
          Docker Deck Workspace
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                isActive
                  ? 'bg-zinc-800/90 text-white shadow-sm shadow-zinc-950 border border-zinc-700/60'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tauri Architecture Info Footer Card */}
      <div className="p-3 border-t border-zinc-800/60">
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-lg p-2.5 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-300 font-medium">
            <div className="flex items-center space-x-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tauri Engine</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Rust <code className="text-zinc-300">bollard</code> crate connected directly to <code className="text-zinc-300">docker.sock</code>.
          </p>

          <button
            onClick={onOpenArchModal}
            className="w-full text-left text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 font-medium transition pt-1 border-t border-zinc-800"
          >
            <Info className="w-3 h-3" />
            <span>Architecture & IPC Specs</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
