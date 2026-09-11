import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  Copy,
  Cpu,
  Download,
  HardDrive,
  Key,
  Loader2,
  Network,
  Search,
  Terminal,
  X,
} from 'lucide-react';
import { api, type ContainerDetail, type LogLine } from '../api/client';
import type { ContainerItem, ContainerNetwork, VolumeMount } from '../types';
import { formatBytes, getStatusColorClass } from '../utils/dockerUtils';
import { copyText } from '../utils/clipboard';
import { useLang } from '../i18n';
import { useSortableRows, type SortValue } from '../hooks/useSortableRows';
import { SortableHeader } from './SortableHeader';

type DetailTab = 'logs' | 'stats' | 'env' | 'mounts' | 'networks';

interface ContainerDetailModalProps {
  container: ContainerItem;
  initialTab?: DetailTab;
  onClose: () => void;
}

function useDetailTabs(): { id: DetailTab; label: string; icon: typeof Terminal }[] {
  const { t } = useLang();
  return [
    { id: 'logs', label: 'Logs', icon: Terminal },
    { id: 'stats', label: t('detail.tabMetrics'), icon: Activity },
    { id: 'env', label: t('detail.tabEnv'), icon: Key },
    { id: 'mounts', label: t('detail.tabMounts'), icon: HardDrive },
    { id: 'networks', label: t('detail.tabNetworks'), icon: Network },
  ];
}

type EnvColumn = 'key' | 'value';
type MountColumn = 'type' | 'source' | 'destination' | 'mode';
type NetworkColumn = 'name' | 'ip' | 'gateway' | 'mac';

const ENV_ACCESSORS: Record<EnvColumn, (e: [string, string]) => SortValue> = {
  key: ([k]) => k,
  value: ([, v]) => v,
};

const MOUNT_ACCESSORS: Record<MountColumn, (m: VolumeMount) => SortValue> = {
  type: (m) => m.type,
  source: (m) => m.source,
  destination: (m) => m.destination,
  mode: (m) => m.mode,
};

const NETWORK_ACCESSORS: Record<NetworkColumn, (n: ContainerNetwork) => SortValue> = {
  name: (n) => n.networkName,
  ip: (n) => n.ipAddress,
  gateway: (n) => n.gateway,
  mac: (n) => n.macAddress,
};

/** Docker stellt jeder Zeile einen RFC3339-Zeitstempel voran. */
function splitTimestamp(message: string): { time: string | null; text: string } {
  const match = message.match(/^(\d{4}-\d{2}-\d{2}T\S+?)\s(.*)$/s);
  if (!match) return { time: null, text: message };
  const parsed = new Date(match[1]);
  return {
    time: Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleTimeString(),
    text: match[2],
  };
}

export const ContainerDetailModal = ({
  container,
  initialTab = 'logs',
  onClose,
}: ContainerDetailModalProps) => {
  const { lang, t } = useLang();
  const TABS = useDetailTabs();
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [detail, setDetail] = useState<ContainerDetail | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const logEndRef = useRef<HTMLDivElement>(null);
  const containerId = container.id;

  // Escape schließt das Fenster.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Env und Entrypoint stehen nicht in der Container-Liste — hier nachladen.
  useEffect(() => {
    const controller = new AbortController();
    api
      .containerDetail(containerId, controller.signal)
      .then(setDetail)
      .catch(() => {
        /* Detailfehler nicht eskalieren, die Grunddaten stehen bereits. */
      });
    return () => controller.abort();
  }, [containerId]);

  const loadLogs = useCallback(
    (signal?: AbortSignal) => {
      setLogsLoading(true);
      setLogsError(null);
      api
        .logs(containerId, 300, signal)
        .then((res) => setLogs(res.lines))
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setLogsError(err instanceof Error ? err.message : String(err));
        })
        .finally(() => setLogsLoading(false));
    },
    [containerId],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadLogs(controller.signal);
    return () => controller.abort();
  }, [loadLogs]);

  // Logs laufender Container regelmäßig nachziehen.
  useEffect(() => {
    if (container.status !== 'running' || activeTab !== 'logs') return;
    const timer = setInterval(() => loadLogs(), 5000);
    return () => clearInterval(timer);
  }, [container.status, activeTab, loadLogs]);

  const filteredLogs = useMemo(() => {
    const query = logFilter.trim().toLowerCase();
    if (!query) return logs;
    return logs.filter((l) => l.message.toLowerCase().includes(query));
  }, [logs, logFilter]);

  useEffect(() => {
    if (autoScroll && activeTab === 'logs') {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, autoScroll, activeTab]);

  const handleCopy = async (text: string, key: string) => {
    const ok = await copyText(text);
    if (!ok) return;
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleDownloadLog = () => {
    const content = logs.map((l) => `[${l.stream}] ${l.message}`).join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${container.name}-logs.txt`;
    a.click();
    // Ohne revoke bleibt der Blob bis zum Neuladen der Seite im Speicher.
    URL.revokeObjectURL(url);
  };

  const { badgeBg, badgeText, dotBg } = getStatusColorClass(container.status, lang);

  const envEntries = useMemo(() => Object.entries(detail?.env ?? {}), [detail]);
  const envSort = useSortableRows(envEntries, ENV_ACCESSORS, { key: 'key', direction: 'asc' });
  const mountSort = useSortableRows(container.mounts, MOUNT_ACCESSORS, {
    key: 'destination',
    direction: 'asc',
  });
  const networkSort = useSortableRows(container.networks, NETWORK_ACCESSORS, {
    key: 'name',
    direction: 'asc',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="pp-modal flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-900 p-4">
          <div className="flex min-w-0 items-center space-x-3">
            <span className={`h-3 w-3 shrink-0 rounded-full ${dotBg}`} />
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="truncate text-base font-bold text-white">{container.name}</h3>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${badgeBg}`}>
                  {badgeText}
                </span>
              </div>
              <p className="truncate font-mono text-xs text-zinc-400">
                {container.image} • <span className="text-zinc-500">{container.shortId}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg bg-zinc-800 p-1.5 text-zinc-400 transition hover:bg-zinc-700 hover:text-white"
            aria-label={t('detail.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex select-none items-center space-x-1 overflow-x-auto border-b border-zinc-800/80 bg-zinc-900/60 px-4 text-xs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 font-medium transition ${
                  isActive
                    ? 'border-emerald-400 font-semibold text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'logs' && (
            <div className="flex h-full flex-col space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-2.5">
                <div className="relative max-w-sm flex-1">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                    placeholder={t('detail.logFilterPh')}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-1 pl-8 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-zinc-500">{t('detail.lines', { count: filteredLogs.length })}</span>
                  <button
                    onClick={() => setAutoScroll(!autoScroll)}
                    className={`rounded-md border px-2.5 py-1 transition ${
                      autoScroll
                        ? 'border-emerald-500/30 bg-emerald-500/10 font-medium text-emerald-400'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                    }`}
                  >
                    {autoScroll ? t('detail.autoscrollOn') : t('detail.autoscrollOff')}
                  </button>
                  <button
                    onClick={handleDownloadLog}
                    className="rounded-md bg-zinc-800 p-1.5 text-emerald-400 transition hover:bg-zinc-700"
                    title={t('detail.downloadLogs')}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 select-text space-y-1 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300">
                {logsLoading && logs.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-zinc-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('detail.logsLoading')}
                  </div>
                ) : logsError ? (
                  <div className="py-10 text-center text-rose-400">{logsError}</div>
                ) : filteredLogs.length === 0 ? (
                  <div className="py-10 text-center italic text-zinc-500">
                    {logs.length === 0 ? t('detail.logsEmpty') : t('detail.logsNoMatch')}
                  </div>
                ) : (
                  filteredLogs.map((log, idx) => {
                    const { time, text } = splitTimestamp(log.message);
                    return (
                      // Logzeilen haben keine stabile ID; der Index ist hier
                      // zulässig, weil die Liste immer komplett ersetzt wird.
                      <div
                        key={idx}
                        className="flex items-start space-x-2 rounded px-1 py-0.5 hover:bg-zinc-900/50"
                      >
                        {time && (
                          <span className="shrink-0 select-none pt-0.5 text-[10px] text-zinc-600">
                            {time}
                          </span>
                        )}
                        <span
                          className={`shrink-0 rounded px-1 text-[10px] font-bold uppercase ${
                            log.stream === 'stderr'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {log.stream}
                        </span>
                        <span
                          className={`break-all leading-relaxed ${
                            log.stream === 'stderr' ? 'text-rose-300' : 'text-zinc-200'
                          }`}
                        >
                          {text}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={logEndRef} />
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              {container.status !== 'running' && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-400">
                  {t('detail.notRunning')}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-center space-x-1.5 text-xs text-zinc-400">
                    <Cpu className="h-4 w-4 text-emerald-400" />
                    <span>CPU</span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-white">
                    {container.stats.cpuPercent.toFixed(1)}%
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.min(container.stats.cpuPercent, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-center space-x-1.5 text-xs text-zinc-400">
                    <HardDrive className="h-4 w-4 text-cyan-400" />
                    <span>{t('detail.memory')}</span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-white">
                    {container.stats.memoryUsageMB.toFixed(0)} MB
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    {t('detail.limit', {
                      limit: container.stats.memoryLimitMB,
                      pct: container.stats.memoryPercent.toFixed(1),
                    })}
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-center space-x-1.5 text-xs text-zinc-400">
                    <ArrowDownCircle className="h-4 w-4 text-purple-400" />
                    <span>{t('detail.netRx')}</span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-white">
                    {formatBytes(container.stats.networkRxKB * 1024)}
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-center space-x-1.5 text-xs text-zinc-400">
                    <ArrowUpCircle className="h-4 w-4 text-amber-400" />
                    <span>{t('detail.netTx')}</span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-white">
                    {formatBytes(container.stats.networkTxKB * 1024)}
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="text-xs font-semibold text-zinc-400">{t('detail.entrypoint')}</div>
                <code className="block rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-emerald-400">
                  {detail?.command ?? container.command}
                </code>
                {detail && detail.restartCount > 0 && (
                  <p className="text-[11px] text-amber-400">
                    {t('detail.restarts', { count: detail.restartCount })}
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'env' && (
            <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
              {envEntries.length === 0 ? (
                <div className="py-10 text-center text-sm text-zinc-500">
                  {detail ? t('detail.envEmpty') : t('detail.loading')}
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-800 bg-zinc-950 font-semibold text-zinc-500">
                    <tr>
                      <SortableHeader columnKey="key" label={t('detail.thKey')} sort={envSort.sort} onToggle={envSort.toggle} className="px-4 py-2.5" />
                      <SortableHeader columnKey="value" label={t('detail.thValue')} sort={envSort.sort} onToggle={envSort.toggle} className="px-4 py-2.5" />
                      <th className="px-4 py-2.5 text-right">{t('detail.thAction')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {envSort.sorted.map(([k, v]) => (
                      <tr key={k} className="hover:bg-zinc-800/40">
                        <td className="px-4 py-2.5 font-bold text-emerald-400">{k}</td>
                        <td className="break-all px-4 py-2.5 text-zinc-300">{v}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => void handleCopy(`${k}=${v}`, k)}
                            className="rounded bg-zinc-800 p-1 text-zinc-300 transition hover:bg-zinc-700"
                            aria-label={t('detail.copyVar', { k })}
                          >
                            {copiedKey === k ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'mounts' && (
            <div className="space-y-4">
              {container.mounts.length === 0 ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 py-10 text-center text-zinc-500">
                  {t('detail.mountsEmpty')}
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-zinc-800 bg-zinc-950 font-semibold text-zinc-500">
                      <tr>
                        {(
                          [
                            ['type', t('detail.thType')],
                            ['source', t('detail.thSource')],
                            ['destination', t('detail.thDest')],
                            ['mode', t('detail.thMode')],
                          ] as [MountColumn, string][]
                        ).map(([key, label]) => (
                          <SortableHeader key={key} columnKey={key} label={label} sort={mountSort.sort} onToggle={mountSort.toggle} className="px-4 py-2.5" />
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono">
                      {mountSort.sorted.map((m) => (
                        <tr key={`${m.source}:${m.destination}`} className="hover:bg-zinc-800/40">
                          <td className="px-4 py-2.5">
                            <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-cyan-400">
                              {m.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="break-all px-4 py-2.5 text-zinc-200">{m.source}</td>
                          <td className="break-all px-4 py-2.5 text-emerald-400">{m.destination}</td>
                          <td className="px-4 py-2.5 font-bold text-zinc-400">{m.mode}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'networks' && (
            <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
              {container.networks.length === 0 ? (
                <div className="py-10 text-center text-zinc-500">{t('detail.netsEmpty')}</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-800 bg-zinc-950 font-semibold text-zinc-500">
                    <tr>
                      {(
                        [
                          ['name', t('detail.thNetwork')],
                          ['ip', t('detail.thIp')],
                          ['gateway', t('detail.thGateway')],
                          ['mac', t('detail.thMac')],
                        ] as [NetworkColumn, string][]
                      ).map(([key, label]) => (
                        <SortableHeader key={key} columnKey={key} label={label} sort={networkSort.sort} onToggle={networkSort.toggle} className="px-4 py-2.5" />
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {networkSort.sorted.map((n) => (
                      <tr key={n.networkName} className="hover:bg-zinc-800/40">
                        <td className="px-4 py-2.5 font-bold text-emerald-400">{n.networkName}</td>
                        <td className="px-4 py-2.5 text-zinc-200">{n.ipAddress}</td>
                        <td className="px-4 py-2.5 text-zinc-400">{n.gateway}</td>
                        <td className="px-4 py-2.5 text-zinc-500">{n.macAddress}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
