import { useMemo, useState } from 'react';
import { Network, Search } from 'lucide-react';
import type { DockerNetwork } from '../types';
import { plural, useLang } from '../i18n';

interface NetworksViewProps {
  networks: DockerNetwork[];
}

export const NetworksView = ({ networks }: NetworksViewProps) => {
  const { lang, t } = useLang();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNetworks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return networks;
    return networks.filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        n.driver.toLowerCase().includes(q) ||
        n.subnet.toLowerCase().includes(q),
    );
  }, [networks, searchQuery]);

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-5">
      <div>
          <h2 className="flex items-center space-x-2 text-xl font-bold text-white">
            <Network className="h-5 w-5 text-emerald-400" />
            <span>{t('networks.title')}</span>
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            {t('networks.desc')}
          </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('networks.searchPh')}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-1.5 pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="text-xs text-zinc-400">
          {t('nav.networks')}: <strong className="text-white">{networks.length}</strong> •{' '}
          {t('volumes.inUse')}:{' '}
          <strong className="text-emerald-400">{networks.filter((n) => n.inUse).length}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filteredNetworks.length === 0 ? (
          <div className="col-span-full rounded-xl border border-zinc-800 bg-zinc-900 py-10 text-center text-zinc-500">
            {t('networks.emptyFilter')}
          </div>
        ) : (
          filteredNetworks.map((net) => (
            <div
              key={net.id}
              className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center space-x-2">
                  <Network className="h-4 w-4 shrink-0 text-emerald-400" />
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-bold text-zinc-100">{net.name}</h4>
                    <span className="font-mono text-[10px] text-zinc-500">
                      {net.driver} ({net.scope})
                      {net.internal && t('networks.internalSuffix')}
                    </span>
                  </div>
                </div>

                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${
                    net.inUse
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {plural(
                    lang,
                    net.containers.length,
                    t('networks.containerOne', { count: net.containers.length }),
                    t('networks.containerMany', { count: net.containers.length }),
                  )}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-800/60 bg-zinc-950/60 p-2.5 font-mono text-xs">
                <div>
                  <span className="block text-[10px] text-zinc-500">{t('networks.subnet')}</span>
                  <span className="font-bold text-zinc-200">{net.subnet}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-zinc-500">{t('networks.gateway')}</span>
                  <span className="font-bold text-emerald-400">{net.gateway}</span>
                </div>
              </div>

              <div className="space-y-1">
                {net.containers.length === 0 ? (
                  <div className="text-[11px] italic text-zinc-500">{t('networks.noContainers')}</div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {net.containers.map((c) => (
                      <span
                        key={c.containerId}
                        className="flex items-center space-x-1 rounded border border-zinc-700/80 bg-zinc-800 px-2 py-0.5 font-mono text-[11px] text-zinc-200"
                      >
                        <span>{c.containerName}</span>
                        <span className="text-[10px] text-emerald-400">({c.ipv4})</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
