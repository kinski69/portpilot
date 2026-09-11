import React, { useState } from 'react';
import {
  Radio,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Search,
  Filter
} from 'lucide-react';
import { ContainerItem, PortCollision } from '../types';
import { buildPortUrl } from '../utils/dockerUtils';
import { plural, useLang } from '../i18n';
import { useSortableRows, type SortValue } from '../hooks/useSortableRows';
import { SortableHeader } from './SortableHeader';

type PortColumn = 'hostPort' | 'container' | 'hostIp' | 'containerPort' | 'status';

interface PortOverviewProps {
  containers: ContainerItem[];
  collisions: PortCollision[];
  onSelectContainer: (container: ContainerItem) => void;
}

export const PortOverview: React.FC<PortOverviewProps> = ({
  containers,
  collisions,
  onSelectContainer
}) => {
  const { lang, t } = useLang();
  const [filterQuery, setFilterQuery] = useState('');
  const [onlyConflicts, setOnlyConflicts] = useState(false);

  // Extract all occupied port records
  interface OccupiedPortRecord {
    hostPort: number;
    protocol: 'tcp' | 'udp';
    hostIp: string;
    containerPort: number;
    containerId: string;
    containerName: string;
    composeProject?: string;
    containerStatus: ContainerItem['status'];
    isColliding: boolean;
    collidingContainers: string[];
  }

  const occupiedPorts: OccupiedPortRecord[] = [];
  // Schluessel inklusive Protokoll: tcp/8000 und udp/8000 sind verschiedene Sockets.
  const collidingKeys = new Set(collisions.map(c => `${c.port}/${c.protocol}`));

  containers.forEach(container => {
    container.ports.forEach(p => {
      const isColliding = collidingKeys.has(`${p.hostPort}/${p.protocol}`);
      const collisionMatch = collisions.find(
        c => c.port === p.hostPort && c.protocol === p.protocol
      );
      const collidingContainerNames = collisionMatch
        ? collisionMatch.containers.map(i => i.name)
        : [];

      occupiedPorts.push({
        hostPort: p.hostPort,
        protocol: p.protocol,
        hostIp: p.hostIp,
        containerPort: p.containerPort,
        containerId: container.id,
        containerName: container.name,
        composeProject: container.composeProject,
        containerStatus: container.status,
        isColliding,
        collidingContainers: collidingContainerNames
      });
    });
  });


  // Filter list
  const filteredPorts = occupiedPorts.filter(item => {
    if (onlyConflicts && !item.isColliding) return false;
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      item.hostPort.toString().includes(q) ||
      item.containerPort.toString().includes(q) ||
      item.containerName.toLowerCase().includes(q) ||
      (item.composeProject || '').toLowerCase().includes(q)
    );
  });

  const PORT_ACCESSORS: Record<PortColumn, (item: OccupiedPortRecord) => SortValue> = {
    hostPort: (item) => item.hostPort,
    container: (item) => item.containerName,
    hostIp: (item) => item.hostIp,
    containerPort: (item) => item.containerPort,
    // Konflikte zuerst, wenn aufsteigend sortiert wird.
    status: (item) => (item.isColliding ? 0 : 1),
  };

  const { sorted, sort, toggle } = useSortableRows(filteredPorts, PORT_ACCESSORS, {
    key: 'hostPort',
    direction: 'asc',
  });


  return (
    <div className="flex-1 p-5 overflow-y-auto space-y-6">
      {/* Title & Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Radio className="w-5 h-5 text-emerald-400" />
            <span>{t('ports.title')}</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {t('ports.subtitle')}
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <div className="bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-300">
            {t('ports.occupied')} <strong className="text-white">{occupiedPorts.length}</strong>
          </div>
          <div className={`px-3 py-1.5 rounded-lg border font-semibold ${
            collisions.length > 0
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}>
            {collisions.length > 0
              ? plural(
                  lang,
                  collisions.length,
                  t('ports.conflictsOne', { count: collisions.length }),
                  t('ports.conflictsMany', { count: collisions.length }),
                )
              : t('ports.noConflicts')}
          </div>
        </div>
      </div>

      {/* Collision Alert Banner */}
      {collisions.length > 0 && (
        <div className="bg-rose-950/40 border-2 border-rose-500/40 rounded-2xl p-4 space-y-3">
          <div className="flex items-center space-x-2 text-rose-300 font-bold text-sm">
            <ShieldAlert className="w-5 h-5 text-rose-400 animate-bounce" />
            <span>{t('ports.found')}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {collisions.map((c, idx) => (
              <div key={idx} className="bg-zinc-950/80 p-3 rounded-xl border border-rose-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-rose-400 font-bold text-sm flex items-center space-x-1.5">
                    <span>Port {c.port}/{c.protocol}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold text-[10px]">
                    {t('ports.conflictTag')}
                  </span>
                </div>

                <p className="text-zinc-300 text-[11px] leading-snug">
                  {c.description}
                </p>

                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-2">
                  <span className="text-zinc-500 text-[10px] shrink-0">{t('ports.involved')}</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {c.containers.map(item => (
                      <span
                        key={item.id}
                        className="px-2 py-1 bg-rose-500/15 text-rose-300 rounded font-mono text-[10px]"
                        title={`${item.hostIp} • ${item.status}`}
                      >
                        {item.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="flex items-center justify-between gap-3 bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder={t('ports.searchPh')}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <button
          onClick={() => setOnlyConflicts(!onlyConflicts)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
            onlyConflicts
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>{t('ports.onlyConflicts', { count: collisions.length })}</span>
        </button>
      </div>

      {/* Common Ports Visual Spectrum */}
      <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-2">
        <div className="text-xs font-semibold text-zinc-400 flex items-center justify-between">
          <span>{t('ports.commonTitle')}</span>
          <span className="text-[10px] text-zinc-500">{t('ports.commonLegend')}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-1">
          {[80, 443, 3000, 5432, 6379, 8080, 11434].map((port) => {
            const matches = occupiedPorts.filter(p => p.hostPort === port);
            const isConflict = matches.length > 1;
            const isBound = matches.length === 1;

            return (
              <div
                key={port}
                className={`p-2 rounded-lg border text-center transition ${
                  isConflict
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse'
                    : isBound
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-zinc-950 border-zinc-800/80 text-zinc-600'
                }`}
              >
                <div className="font-mono font-bold text-xs">{port}</div>
                <div className="text-[9px] mt-0.5 truncate">
                  {isConflict ? t('ports.commonConflict') : isBound ? matches[0].containerName : t('ports.commonFree')}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Port Table */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950 text-zinc-500 font-semibold border-b border-zinc-800">
              <tr>
                {(
                  [
                    ['hostPort', t('ports.thHostPort')],
                    ['container', t('ports.thContainer')],
                    ['hostIp', t('ports.thBoundTo')],
                    ['containerPort', t('ports.thContainerPort')],
                    ['status', t('ports.thStatus')],
                  ] as [PortColumn, string][]
                ).map(([key, label]) => (
                  <SortableHeader
                    key={key}
                    columnKey={key}
                    label={label}
                    sort={sort}
                    onToggle={toggle}
                    className="py-2.5 px-4"
                  />
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-zinc-500">
                    {t('ports.emptyFilter')}
                  </td>
                </tr>
              ) : (
                sorted.map((item, idx) => {
                  const containerObj = containers.find(c => c.id === item.containerId);

                  return (
                    <tr
                      key={`${item.containerId}-${item.hostPort}-${idx}`}
                      className={`transition ${
                        item.isColliding ? 'bg-rose-950/20 hover:bg-rose-950/40' : 'hover:bg-zinc-800/40'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-sm text-zinc-100">
                        {(() => {
                          const url = buildPortUrl(item.hostIp, item.hostPort, item.protocol);
                          const reachable = url && item.containerStatus === 'running';
                          const color = item.isColliding ? 'text-rose-400' : 'text-emerald-400';

                          // Nur laufende TCP-Dienste verlinken — ein gestoppter
                          // Container lauscht nicht, der Link liefe ins Leere.
                          return reachable ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={t('cont.openInTab', { url })}
                              className={`${color} underline decoration-dotted underline-offset-4 hover:decoration-solid`}
                            >
                              :{item.hostPort}
                            </a>
                          ) : (
                            <span className={color}>:{item.hostPort}</span>
                          );
                        })()}
                        <span className="text-zinc-500 text-xs font-normal ml-1">/{item.protocol}</span>
                      </td>

                      <td className="py-3 px-4">
                        <button
                          onClick={() => containerObj && onSelectContainer(containerObj)}
                          className="font-semibold text-zinc-200 hover:text-emerald-400 transition"
                        >
                          {item.containerName}
                        </button>
                        {item.composeProject && (
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            {t('cont.projectLabel')} {item.composeProject}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                        {item.hostIp}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                        {item.containerPort}/{item.protocol}
                      </td>

                      <td className="py-3 px-4">
                        {item.isColliding ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-semibold text-[10px] flex items-center space-x-1 w-fit animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{t('ports.conflictTag')}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] flex items-center space-x-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{t('ports.okTag')}</span>
                          </span>
                        )}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
