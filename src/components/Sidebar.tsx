import React from 'react';
import {
  Box,
  Network,
  HardDrive,
  Layers,
  Radio,
  Activity,
  Info,
  Server,
  LayoutDashboard,
  ShieldCheck,
} from 'lucide-react';
import { ActiveTab } from '../types';
import { plural, useLang } from '../i18n';

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
  onOpenAbout: () => void;
}

type NavItem = {
  id: ActiveTab;
  label: string;
  hint: string;
  icon: typeof Box;
  badge: string | null;
  badgeClass: string;
};

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
  onOpenAbout,
}) => {
  const { lang, t } = useLang();

  const neutralBadge = 'text-zinc-400 border-zinc-800 bg-zinc-900';
  const goodBadge = 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
  const warnBadge = 'text-amber-300 border-amber-500/30 bg-amber-500/10';
  const badBadge = 'text-rose-300 border-rose-500/40 bg-rose-500/15 animate-pulse';

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: t('nav.dashboard'),
      hint: t('nav.dashboardHint'),
      icon: LayoutDashboard,
      badge: null,
      badgeClass: neutralBadge,
    },
    {
      id: 'containers',
      label: t('nav.containers'),
      hint: t('nav.containersHint'),
      icon: Box,
      badge: `${runningCount}/${containerCount}`,
      badgeClass: goodBadge,
    },
    {
      id: 'ports',
      label: t('nav.ports'),
      hint: t('nav.portsHint'),
      icon: Radio,
      badge:
        collisionCount > 0
          ? plural(
              lang,
              collisionCount,
              t('nav.conflictOne', { count: collisionCount }),
              t('nav.conflictMany', { count: collisionCount }),
            )
          : t('nav.portsFree'),
      badgeClass: collisionCount > 0 ? badBadge : neutralBadge,
    },
    {
      id: 'images',
      label: t('nav.images'),
      hint: t('nav.imagesHint'),
      icon: Layers,
      badge:
        danglingImageCount > 0
          ? t('nav.unusedBadge', { count: danglingImageCount })
          : `${imageCount}`,
      badgeClass: danglingImageCount > 0 ? warnBadge : neutralBadge,
    },
    {
      id: 'volumes',
      label: t('nav.volumes'),
      hint: t('nav.volumesHint'),
      icon: HardDrive,
      badge:
        danglingVolumeCount > 0
          ? t('nav.unusedBadge', { count: danglingVolumeCount })
          : `${volumeCount}`,
      badgeClass: danglingVolumeCount > 0 ? warnBadge : neutralBadge,
    },
    {
      id: 'networks',
      label: t('nav.networks'),
      hint: t('nav.networksHint'),
      icon: Network,
      badge: `${networkCount}`,
      badgeClass: neutralBadge,
    },
    {
      id: 'events',
      label: t('nav.events'),
      hint: t('nav.eventsHint'),
      icon: Activity,
      badge: t('nav.liveBadge'),
      badgeClass: 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10',
    },
  ];

  return (
    <aside className="flex w-64 flex-none select-none flex-col justify-between gap-3 border-r border-zinc-800/60 bg-zinc-950/60 p-3">
      <div className="space-y-2 overflow-y-auto">
        <p className="pp-eyebrow px-1 pb-1 pt-2">{t('nav.title')}</p>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              data-active={isActive}
              className="pp-nav-box"
            >
              <span className="pp-nav-icon">
                <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-500' : 'text-zinc-400'}`} />
              </span>

              <span className="min-w-0 flex-1">
                <span
                  className={`pp-nav-label block truncate text-[13px] font-semibold ${
                    isActive ? 'text-zinc-100' : 'text-zinc-300'
                  }`}
                >
                  {item.label}
                </span>
                <span className="block truncate text-[10.5px] text-zinc-500">{item.hint}</span>
              </span>

              {item.badge && (
                <span className={`pp-pill flex-none border ${item.badgeClass}`}>{item.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Fusszeile: Verbindungsart und Info */}
      <div className="pp-card space-y-2.5 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
            <Server className="h-3.5 w-3.5 text-emerald-300" />
            <span>{t('nav.socketTitle')}</span>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_2px] shadow-emerald-500/40" />
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1.5">
          <ShieldCheck className="h-3.5 w-3.5 flex-none text-cyan-300" />
          <p className="text-[10.5px] leading-snug text-zinc-400">
            {t('nav.socketNotePre')} <code className="text-zinc-300">docker.sock</code>
          </p>
        </div>

        <button
          onClick={onOpenAbout}
          className="flex w-full items-center gap-1.5 border-t border-zinc-800 pt-2 text-[11px] font-medium text-emerald-300 transition hover:text-emerald-200"
        >
          <Info className="h-3 w-3" />
          <span>{t('nav.about')}</span>
        </button>
      </div>
    </aside>
  );
};
