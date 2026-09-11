import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, HardDrive, Search } from 'lucide-react';
import type { DockerVolume } from '../types';
import { formatBytes, formatUptime } from '../utils/dockerUtils';
import { useLang } from '../i18n';
import { useSortableRows, type SortValue } from '../hooks/useSortableRows';
import { SortableHeader } from './SortableHeader';

interface VolumesViewProps {
  volumes: DockerVolume[];
}

type VolumeColumn = 'name' | 'driver' | 'size' | 'attached' | 'status' | 'created';

const VOLUME_ACCESSORS: Record<VolumeColumn, (vol: DockerVolume) => SortValue> = {
  name: (vol) => vol.name,
  driver: (vol) => `${vol.driver} (${vol.scope})`,
  // Ohne ermittelte Groesse als leer behandeln, damit die Striche hinten landen.
  size: (vol) => (vol.sizeBytes > 0 ? vol.sizeBytes : null),
  attached: (vol) => vol.attachedContainers.length,
  status: (vol) => (vol.inUse ? 1 : 0),
  created: (vol) => new Date(vol.created).getTime(),
};

export const VolumesView = ({ volumes }: VolumesViewProps) => {
  const { lang, t } = useLang();
  const [searchQuery, setSearchQuery] = useState('');

  const unusedCount = useMemo(() => volumes.filter((v) => !v.inUse).length, [volumes]);

  const filteredVolumes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return volumes;
    return volumes.filter(
      (v) => v.name.toLowerCase().includes(q) || v.mountpoint.toLowerCase().includes(q),
    );
  }, [volumes, searchQuery]);

  const { sorted, sort, toggle } = useSortableRows(filteredVolumes, VOLUME_ACCESSORS, {
    key: 'name',
    direction: 'asc',
  });

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-5">
      <div>
        <h2 className="flex items-center space-x-2 text-xl font-bold text-white">
          <HardDrive className="h-5 w-5 text-cyan-400" />
          <span>Volumes</span>
        </h2>
        <p className="mt-1 text-xs text-zinc-400">
          {t('volumes.descPre')}{' '}
          <code className="text-emerald-400">docker volume prune</code> {t('volumes.descPost')}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('volumes.searchPh')}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-1.5 pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="text-xs text-zinc-400">
          {t('nav.volumes')}: <strong className="text-white">{volumes.length}</strong> •{' '}
          {t('volumes.unused')}:{' '}
          <strong className="text-amber-400">{unusedCount}</strong>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/90 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="border-b border-zinc-800 bg-zinc-950 font-semibold text-zinc-500">
              <tr>
                {(
                  [
                    ['name', t('volumes.thName')],
                    ['driver', t('volumes.thDriver')],
                    ['size', t('volumes.thSize')],
                    ['attached', t('volumes.thAttached')],
                    ['status', t('volumes.thStatus')],
                    ['created', t('volumes.thCreated')],
                  ] as [VolumeColumn, string][]
                ).map(([key, label]) => (
                  <SortableHeader
                    key={key}
                    columnKey={key}
                    label={label}
                    sort={sort}
                    onToggle={toggle}
                    className="px-4 py-2.5"
                  />
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-zinc-500">
                    {t('volumes.emptyFilter')}
                  </td>
                </tr>
              ) : (
                sorted.map((vol) => (
                  <tr key={vol.name} className="transition hover:bg-zinc-800/40">
                    <td className="px-4 py-3 font-sans font-semibold text-zinc-100">
                      <div className="flex items-center space-x-2">
                        <HardDrive className="h-4 w-4 shrink-0 text-cyan-400" />
                        <div className="min-w-0">
                          <div className="max-w-xs truncate" title={vol.name}>
                            {vol.name}
                          </div>
                          <div
                            className="max-w-xs truncate font-mono text-[10px] text-zinc-500"
                            title={vol.mountpoint}
                          >
                            {vol.mountpoint}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-sans text-xs text-zinc-400">
                      {vol.driver} ({vol.scope})
                    </td>

                    <td className="px-4 py-3 font-bold text-zinc-200">
                      {/* Die Engine liefert Volume-Größen nur über einen teuren
                          df-Aufruf — ohne Wert wird hier nichts vorgetäuscht. */}
                      {vol.sizeBytes > 0 ? (
                        formatBytes(vol.sizeBytes)
                      ) : (
                        <span className="font-normal text-zinc-600" title={t('volumes.notDetermined')}>
                          —
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 font-sans">
                      {vol.attachedContainers.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {vol.attachedContainers.map((cName) => (
                            <span
                              key={cName}
                              className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300"
                            >
                              {cName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] italic text-zinc-500">{t('volumes.noneAttached')}</span>
                      )}
                    </td>

                    <td className="px-4 py-3 font-sans">
                      {vol.inUse ? (
                        <span className="flex w-fit items-center space-x-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{t('volumes.inUse')}</span>
                        </span>
                      ) : (
                        <span className="flex w-fit items-center space-x-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          <span>{t('volumes.unused')}</span>
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 font-sans text-[11px] text-zinc-400">
                      {formatUptime(vol.created, lang)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
