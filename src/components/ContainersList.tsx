import React, { useRef, useState } from 'react';
import {
  Square,
  Terminal,
  Info,
  Layers,
  LayoutGrid,
  List as ListIcon,
  AlertTriangle,
  Cpu,
  HardDrive,
  FolderOpen,
  Copy,
  Check
} from 'lucide-react';
import { ContainerItem, PortCollision } from '../types';
import { getStatusColorClass, buildPortUrl, buildStartCommand } from '../utils/dockerUtils';
import { copyText } from '../utils/clipboard';
import { plural, useLang } from '../i18n';
import {
  sortRows,
  useSortState,
  type SortState,
  type SortValue,
} from '../hooks/useSortableRows';
import { SortableHeader } from './SortableHeader';

type ContainerColumn = 'name' | 'status' | 'compose' | 'ports' | 'metrics';

const CONTAINER_ACCESSORS: Record<ContainerColumn, (c: ContainerItem) => SortValue> = {
  name: (c) => c.name,
  status: (c) => c.status,
  compose: (c) => c.composeProject ?? null,
  // Nach dem niedrigsten veroeffentlichten Port sortieren.
  ports: (c) => (c.ports.length ? Math.min(...c.ports.map((p) => p.hostPort)) : null),
  metrics: (c) => (c.status === 'running' ? c.stats.cpuPercent : null),
};

interface ContainersListProps {
  containers: ContainerItem[];
  collisions: PortCollision[];
  searchQuery: string;
  onSelectContainer: (container: ContainerItem, initialTab?: 'logs' | 'stats' | 'env' | 'mounts' | 'networks') => void;
  onNavigateToPortOverview: () => void;
}

export const ContainersList: React.FC<ContainersListProps> = ({
  containers,
  collisions,
  searchQuery,
  onSelectContainer,
  onNavigateToPortOverview
}) => {
  const { lang, t } = useLang();
  const [groupByCompose, setGroupByCompose] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'exited' | 'error'>('all');

  // Set of ports involved in collision
  const collidingPortsSet = new Set(collisions.map(c => c.port));

  // Bei Compose-Gruppierung entstehen mehrere Tabellen. Der Sortierzustand
  // liegt deshalb hier, damit ein Klick alle Gruppen gleich sortiert.
  const { sort, toggle } = useSortState<ContainerColumn>({ key: 'name', direction: 'asc' });

  // Filter containers
  const filteredContainers = containers.filter(c => {
    // Status filter
    if (statusFilter === 'running' && c.status !== 'running') return false;
    if (statusFilter === 'exited' && c.status !== 'exited') return false;
    if (statusFilter === 'error' && c.status !== 'error') return false;

    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = c.name.toLowerCase().includes(q);
    const imageMatch = c.image.toLowerCase().includes(q);
    const projectMatch = (c.composeProject || '').toLowerCase().includes(q);
    const portMatch = c.ports.some(p => p.hostPort.toString().includes(q) || p.containerPort.toString().includes(q));
    const statusMatch = c.status.toLowerCase().includes(q);

    return nameMatch || imageMatch || projectMatch || portMatch || statusMatch;
  });

  // Group by compose project if enabled
  const groupedProjects: Record<string, ContainerItem[]> = {};
  if (groupByCompose) {
    filteredContainers.forEach(c => {
      const proj = c.composeProject || t('cont.standaloneGroup');
      if (!groupedProjects[proj]) {
        groupedProjects[proj] = [];
      }
      groupedProjects[proj].push(c);
    });
  }

  // Draw mini SVG sparkline for CPU or RAM
  const renderSparkline = (data: number[], color: string) => {
    if (!data || data.length === 0) return null;
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const width = 60;
    const height = 18;

    const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  return (
    <div className="flex-1 p-5 overflow-y-auto space-y-5">
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
        {/* Status Filter Badges */}
        <div className="flex items-center space-x-1.5 text-xs">
          <span className="text-zinc-500 font-medium mr-1.5">{t('cont.filter')}</span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-md transition font-medium ${
              statusFilter === 'all'
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            {t('cont.fAll')} ({containers.length})
          </button>

          <button
            onClick={() => setStatusFilter('running')}
            className={`px-2.5 py-1 rounded-md transition font-medium ${
              statusFilter === 'running'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-zinc-400 hover:text-emerald-300 hover:bg-zinc-800/50'
            }`}
          >
            {t('cont.fRunning')} ({containers.filter(c => c.status === 'running').length})
          </button>

          <button
            onClick={() => setStatusFilter('exited')}
            className={`px-2.5 py-1 rounded-md transition font-medium ${
              statusFilter === 'exited'
                ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            {t('cont.fExited')} ({containers.filter(c => c.status === 'exited').length})
          </button>

          <button
            onClick={() => setStatusFilter('error')}
            className={`px-2.5 py-1 rounded-md transition font-medium ${
              statusFilter === 'error'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : 'text-zinc-400 hover:text-rose-300 hover:bg-zinc-800/50'
            }`}
          >
            {t('cont.fErrors')} ({containers.filter(c => c.status === 'error').length})
          </button>
        </div>

        {/* View Toggles & Grouping */}
        <div className="flex items-center space-x-3 text-xs">
          <button
            onClick={() => setGroupByCompose(!groupByCompose)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md border transition ${
              groupByCompose
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-medium'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t('cont.groupByCompose')}</span>
          </button>

          <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition ${
                viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title={t('cont.viewCardsTitle')}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition ${
                viewMode === 'table' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title={t('cont.viewListTitle')}
            >
              <ListIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Port Conflict Alert Banner */}
      {collisions.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3.5 flex items-start justify-between gap-3 text-xs text-rose-200">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-rose-300 text-sm">
                {plural(
                  lang,
                  collisions.length,
                  t('cont.bannerOne', { count: collisions.length }),
                  t('cont.bannerMany', { count: collisions.length }),
                )}
              </div>
              <p className="text-rose-300/80 mt-0.5">
                {t('cont.bannerBody')}
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToPortOverview}
            className="shrink-0 bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg font-medium transition"
          >
            {t('cont.viewAction')}
          </button>
        </div>
      )}

      {/* Container Cards / List Rendering */}
      {filteredContainers.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/30 rounded-2xl border border-zinc-800/60 p-8 space-y-3">
          <Square className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-zinc-300 font-semibold text-base">{t('cont.emptyTitle')}</h3>
          <p className="text-zinc-500 text-xs max-w-sm mx-auto">
            {searchQuery
              ? t('cont.emptySearch', { q: searchQuery })
              : t('cont.emptyNone')}
          </p>
        </div>
      ) : groupByCompose ? (
        // Grouped by Compose Project
        Object.entries(groupedProjects).map(([projectName, groupItems]) => (
          <div key={projectName} className="space-y-3">
            <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-400 border-b border-zinc-800/80 pb-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('cont.projectLabel')} <strong className="text-zinc-200">{projectName}</strong></span>
              <span className="text-zinc-600">{t('cont.servicesCount', { count: groupItems.length })}</span>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupItems.map(c => (
                  <ContainerCard
                    key={c.id}
                    container={c}
                    collidingPorts={collidingPortsSet}
                    onSelect={(tab) => onSelectContainer(c, tab)}
                    renderSparkline={renderSparkline}
                  />
                ))}
              </div>
            ) : (
              <ContainerTableView
                containers={groupItems}
                collidingPorts={collidingPortsSet}
                onSelect={onSelectContainer}
                sort={sort}
                onToggleSort={toggle}
              />
            )}
          </div>
        ))
      ) : (
        // Flat List
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContainers.map(c => (
              <ContainerCard
                key={c.id}
                container={c}
                collidingPorts={collidingPortsSet}
                onSelect={(tab) => onSelectContainer(c, tab)}
                renderSparkline={renderSparkline}
              />
            ))}
          </div>
        ) : (
          <ContainerTableView
            containers={filteredContainers}
            collidingPorts={collidingPortsSet}
            onSelect={onSelectContainer}
            sort={sort}
            onToggleSort={toggle}
          />
        )
      )}
    </div>
  );
};

/**
 * Ordner und Startbefehl fuer einen gestoppten Container, mit Kopier-Button.
 * `docker start <name>` funktioniert immer; bei Compose-Projekten wird die
 * Compose-Variante samt cd in den Projektordner vorgezogen (siehe
 * buildStartCommand).
 */
const StartHint: React.FC<{ container: ContainerItem }> = ({ container }) => {
  const { t } = useLang();
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'failed'>('idle');
  const command = buildStartCommand(container);

  const commandRef = useRef<HTMLSpanElement>(null);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyText(command);
    setCopyState(ok ? 'ok' : 'failed');

    // Blockiert der Browser die Zwischenablage, wenigstens den Befehl
    // markieren — dann reicht Strg+C.
    if (!ok && commandRef.current) {
      const range = document.createRange();
      range.selectNodeContents(commandRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    setTimeout(() => setCopyState('idle'), ok ? 1500 : 2500);
  };

  return (
    <div className="space-y-1 rounded-lg border border-zinc-800/60 bg-zinc-950/60 p-2 text-[11px]">
      {container.composeWorkingDir && (
        <div
          className="truncate font-mono text-zinc-500"
          title={container.composeWorkingDir}
        >
          <FolderOpen className="mr-1 inline h-3 w-3 -mt-0.5 text-zinc-600" />
          {container.composeWorkingDir}
        </div>
      )}
      <button
        onClick={handleCopy}
        title={
          copyState === 'failed'
            ? t('cont.copyBlocked')
            : t('cont.copyCommand')
        }
        className="flex w-full items-center justify-between gap-2 rounded bg-zinc-900 px-2 py-1 font-mono text-zinc-300 transition hover:bg-zinc-800 hover:text-emerald-300"
      >
        <span ref={commandRef} className="truncate select-text">
          {command}
        </span>
        {copyState === 'ok' ? (
          <Check className="h-3 w-3 shrink-0 text-emerald-400" />
        ) : copyState === 'failed' ? (
          <AlertTriangle className="h-3 w-3 shrink-0 text-rose-400" />
        ) : (
          <Copy className="h-3 w-3 shrink-0 text-zinc-500" />
        )}
      </button>
    </div>
  );
};

// Subcomponent: Container Card
interface ContainerCardProps {
  container: ContainerItem;
  collidingPorts: Set<number>;
  onSelect: (tab?: 'logs' | 'stats' | 'env' | 'mounts' | 'networks') => void;
  renderSparkline: (data: number[], color: string) => React.ReactNode;
}

const ContainerCard: React.FC<ContainerCardProps> = ({
  container,
  collidingPorts,
  onSelect,
  renderSparkline
}) => {
  const { lang, t } = useLang();
  const { badgeBg, badgeText, dotBg } = getStatusColorClass(container.status, lang);

  // Klick auf die Kachel oeffnet das Detailfenster. Markiert der Benutzer
  // gerade Text (z.B. einen Port zum Kopieren), gilt das nicht als Klick.
  const handleCardActivate = () => {
    if (window.getSelection()?.toString()) return;
    onSelect();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t('cont.detailsFor', { name: container.name })}
      onClick={handleCardActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className="bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700/80 rounded-xl p-4 flex flex-col justify-between space-y-3 transition group shadow-sm shadow-zinc-950 cursor-pointer focus:outline-none focus-visible:border-emerald-500/60 focus-visible:ring-1 focus-visible:ring-emerald-500/40"
    >
      {/* Top Header Row */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotBg}`} />
              <h4 className="font-semibold text-zinc-100 text-sm truncate group-hover:text-emerald-400 transition">
                {container.name}
              </h4>
            </div>

            <p className="text-[11px] font-mono text-zinc-400 truncate mt-0.5 pl-4">
              {container.image}
            </p>
          </div>

          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${badgeBg}`}>
            {badgeText}
          </span>
        </div>

        {/* Compose project pill */}
        {container.composeProject && (
          <div className="mt-2 pl-4 flex items-center space-x-1.5 text-[10px] text-zinc-400">
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
              {container.composeProject}
            </span>
            {container.composeService && (
              <span className="text-zinc-500">/ {container.composeService}</span>
            )}
          </div>
        )}
      </div>

      {/* Port Mappings */}
      <div className="space-y-1 text-[11px]">
        <div className="text-zinc-500 font-medium text-[10px] uppercase tracking-wider">{t('cont.portsLabel')}</div>
        {container.ports.length === 0 ? (
          <span className="text-zinc-500 italic">{t('cont.noPorts')}</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {container.ports.map((p, idx) => {
              const isColliding = collidingPorts.has(p.hostPort);
              const url = buildPortUrl(p.hostIp, p.hostPort, p.protocol);
              const reachable = url && container.status === 'running';

              const style = `px-1.5 py-0.5 rounded font-mono text-[10px] flex items-center space-x-1 border ${
                isColliding
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 font-bold'
                  : 'bg-zinc-800/80 border-zinc-700/60 text-emerald-300'
              }`;
              const inhalt = (
                <>
                  {isColliding && <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />}
                  <span>
                    {p.hostPort}:{p.containerPort}
                  </span>
                </>
              );

              // Nur laufende TCP-Dienste verlinken. stopPropagation, damit der
              // Klick nicht zusaetzlich das Detailfenster oeffnet.
              return reachable ? (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title={t('cont.openInTab', { url })}
                  className={`${style} hover:border-emerald-500/60 hover:bg-zinc-700/80 transition`}
                >
                  {inhalt}
                </a>
              ) : (
                <span
                  key={idx}
                  className={style}
                  title={
                    isColliding
                      ? t('cont.conflictOnPort', { port: p.hostPort })
                      : t('cont.portMapsTo', { host: p.hostPort, cont: p.containerPort })
                  }
                >
                  {inhalt}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Realtime Metrics Mini Graphs */}
      {container.status === 'running' && (
        <div className="grid grid-cols-2 gap-2 bg-zinc-950/60 p-2 rounded-lg border border-zinc-800/50 text-[11px]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] text-zinc-400 flex items-center space-x-1">
                <Cpu className="w-3 h-3 text-emerald-400" />
                <span>CPU</span>
              </div>
              <div className="font-mono font-semibold text-zinc-200">
                {container.stats.cpuPercent.toFixed(1)}%
              </div>
            </div>
            {renderSparkline(container.stats.cpuHistory, '#10b981')}
          </div>

          <div className="flex items-center justify-between border-l border-zinc-800/60 pl-2">
            <div>
              <div className="text-[10px] text-zinc-400 flex items-center space-x-1">
                <HardDrive className="w-3 h-3 text-cyan-400" />
                <span>RAM</span>
              </div>
              <div className="font-mono font-semibold text-zinc-200">
                {container.stats.memoryUsageMB.toFixed(0)} MB
              </div>
            </div>
            {renderSparkline(container.stats.memoryHistory, '#06b6d4')}
          </div>
        </div>
      )}

      {/* Start-Hilfe fuer gestoppte Container: Ordner + kopierbarer Befehl */}
      {container.status !== 'running' && container.status !== 'restarting' && (
        <StartHint container={container} />
      )}

      {/* Footer Action Buttons */}
      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
        <span className="font-mono text-[10px] text-zinc-600">{container.shortId}</span>

        {/* stopPropagation: sonst wuerde zusaetzlich der Kachel-Klick feuern
            und den gezielt gewaehlten Tab wieder ueberschreiben. */}
        <div className="flex items-center space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect('logs');
            }}
            className="flex items-center space-x-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition text-[11px]"
          >
            <Terminal className="w-3 h-3 text-cyan-400" />
            <span>{t('cont.logsBtn')}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect('stats');
            }}
            className="flex items-center space-x-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition text-[11px]"
          >
            <Info className="w-3 h-3 text-emerald-400" />
            <span>{t('cont.detailsBtn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Subcomponent: Container Table View
interface ContainerTableViewProps {
  containers: ContainerItem[];
  collidingPorts: Set<number>;
  onSelect: (container: ContainerItem, tab?: 'logs' | 'stats' | 'env' | 'mounts' | 'networks') => void;
  sort: SortState<ContainerColumn>;
  onToggleSort: (key: ContainerColumn) => void;
}

const ContainerTableView: React.FC<ContainerTableViewProps> = ({
  containers,
  collidingPorts,
  onSelect,
  sort,
  onToggleSort
}) => {
  const { lang, t } = useLang();
  const sorted = sortRows(containers, CONTAINER_ACCESSORS, sort);

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="bg-zinc-950 text-zinc-500 font-semibold border-b border-zinc-800">
            <tr>
              {(
                [
                  ['name', t('cont.thName')],
                  ['status', t('cont.thStatus')],
                  ['compose', t('cont.thCompose')],
                  ['ports', t('cont.thPorts')],
                  ['metrics', t('cont.thMetrics')],
                ] as [ContainerColumn, string][]
              ).map(([key, label]) => (
                <SortableHeader
                  key={key}
                  columnKey={key}
                  label={label}
                  sort={sort}
                  onToggle={onToggleSort}
                  className="py-2.5 px-3"
                />
              ))}
              <th className="py-2.5 px-3 text-right">{t('cont.thAction')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {sorted.map(c => {
              const { badgeBg, badgeText, dotBg } = getStatusColorClass(c.status, lang);
              return (
                <tr key={c.id} className="hover:bg-zinc-800/40 transition">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${dotBg}`} />
                      <div>
                        <button
                          onClick={() => onSelect(c)}
                          className="font-semibold text-zinc-100 hover:text-emerald-400 transition"
                        >
                          {c.name}
                        </button>
                        <div className="text-[10px] font-mono text-zinc-500">{c.image}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${badgeBg}`}>
                      {badgeText}
                    </span>
                  </td>

                  <td className="py-2.5 px-3">
                    {c.composeProject ? (
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        {c.composeProject}
                      </span>
                    ) : (
                      <span className="text-zinc-500 italic">{t('cont.standalone')}</span>
                    )}
                  </td>

                  <td className="py-2.5 px-3">
                    <div className="flex flex-wrap gap-1">
                      {c.ports.map((p, idx) => {
                        const isColliding = collidingPorts.has(p.hostPort);
                        const url = buildPortUrl(p.hostIp, p.hostPort, p.protocol);
                        const style = `px-1.5 py-0.5 rounded font-mono text-[10px] border ${
                          isColliding
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-bold'
                            : 'bg-zinc-800 border-zinc-700 text-emerald-300'
                        }`;
                        const text = `${p.hostPort}:${p.containerPort}`;

                        return url && c.status === 'running' ? (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={t('cont.openInTab', { url })}
                            className={`${style} hover:border-emerald-500/60 transition`}
                          >
                            {text}
                          </a>
                        ) : (
                          <span key={idx} className={style}>
                            {text}
                          </span>
                        );
                      })}
                    </div>
                  </td>

                  <td className="py-2.5 px-3 font-mono text-[11px]">
                    {c.status === 'running' ? (
                      <div>
                        <span className="text-emerald-400">{c.stats.cpuPercent.toFixed(1)}% CPU</span>
                        <span className="text-zinc-500 mx-1">•</span>
                        <span className="text-cyan-400">{c.stats.memoryUsageMB.toFixed(0)} MB</span>
                      </div>
                    ) : (
                      <span className="text-zinc-500">-</span>
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        onClick={() => onSelect(c, 'logs')}
                        className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-400 transition"
                        title={t('cont.showLogs')}
                      >
                        <Terminal className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
