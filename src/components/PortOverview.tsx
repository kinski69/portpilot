import React, { useState } from 'react';
import {
  Radio,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  ShieldAlert,
  ArrowRight,
  Search,
  Filter,
  Play,
  Square,
  Zap,
  Info
} from 'lucide-react';
import { ContainerItem, PortCollision } from '../types';

interface PortOverviewProps {
  containers: ContainerItem[];
  collisions: PortCollision[];
  onRemapPort: (containerId: string, oldPort: number, newPort: number) => void;
  onStopContainer: (containerId: string) => void;
  onSelectContainer: (container: ContainerItem) => void;
}

export const PortOverview: React.FC<PortOverviewProps> = ({
  containers,
  collisions,
  onRemapPort,
  onStopContainer,
  onSelectContainer
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [onlyConflicts, setOnlyConflicts] = useState(false);
  const [remappingTarget, setRemappingTarget] = useState<{
    containerId: string;
    containerName: string;
    oldPort: number;
    newPort: number;
  } | null>(null);

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
  const collidingPortsSet = new Set(collisions.map(c => c.port));

  containers.forEach(container => {
    container.ports.forEach(p => {
      const isColliding = collidingPortsSet.has(p.hostPort);
      const collisionMatch = collisions.find(c => c.port === p.hostPort);
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

  // Sort by hostPort ascending
  occupiedPorts.sort((a, b) => a.hostPort - b.hostPort);

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

  // Quick helper to execute port remap
  const handleExecuteRemap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remappingTarget) return;
    if (remappingTarget.newPort <= 0 || remappingTarget.newPort > 65535) return;

    onRemapPort(remappingTarget.containerId, remappingTarget.oldPort, remappingTarget.newPort);
    setRemappingTarget(null);
  };

  return (
    <div className="flex-1 p-5 overflow-y-auto space-y-6">
      {/* Title & Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Radio className="w-5 h-5 text-emerald-400" />
            <span>Port Occupancy & Collision Detector</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time mapping of all exposed host sockets across Docker containers and Compose projects.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <div className="bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-300">
            Total Occupied Ports: <strong className="text-white">{occupiedPorts.length}</strong>
          </div>
          <div className={`px-3 py-1.5 rounded-lg border font-semibold ${
            collisions.length > 0
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}>
            {collisions.length > 0 ? `${collisions.length} Collision Alert!` : '0 Port Conflicts'}
          </div>
        </div>
      </div>

      {/* Collision Alert Banner */}
      {collisions.length > 0 && (
        <div className="bg-rose-950/40 border-2 border-rose-500/40 rounded-2xl p-4 space-y-3">
          <div className="flex items-center space-x-2 text-rose-300 font-bold text-sm">
            <ShieldAlert className="w-5 h-5 text-rose-400 animate-bounce" />
            <span>CRITICAL PORT BINDING COLLISIONS DETECTED</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {collisions.map((c, idx) => (
              <div key={idx} className="bg-zinc-950/80 p-3 rounded-xl border border-rose-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-rose-400 font-bold text-sm flex items-center space-x-1.5">
                    <span>Host Port: {c.port}/{c.protocol}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold text-[10px]">
                    COLLISION
                  </span>
                </div>

                <p className="text-zinc-300 text-[11px] leading-snug">
                  {c.description}
                </p>

                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                  <span className="text-zinc-500 text-[10px]">Conflicting containers:</span>
                  <div className="flex space-x-1">
                    {c.containers.map(item => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setRemappingTarget({
                            containerId: item.id,
                            containerName: item.name,
                            oldPort: c.port,
                            newPort: c.port + 1
                          });
                        }}
                        className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded font-medium text-[10px] transition"
                      >
                        Fix {item.name}
                      </button>
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
            placeholder="Search port number, container or project..."
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
          <span>Only Show Conflicts ({collisions.length})</span>
        </button>
      </div>

      {/* Common Ports Visual Spectrum */}
      <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-2">
        <div className="text-xs font-semibold text-zinc-400 flex items-center justify-between">
          <span>Common Web & DB Port Spectrum (80, 443, 3000, 5432, 6379, 8080, 11434)</span>
          <span className="text-[10px] text-zinc-500">Legend: Green = Clear, Red = Conflict, Cyan = Bound</span>
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
                  {isConflict ? 'CONFLICT!' : isBound ? matches[0].containerName : 'Free'}
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
                <th className="py-2.5 px-4">Host Port & Protocol</th>
                <th className="py-2.5 px-4">Container & Compose Service</th>
                <th className="py-2.5 px-4">Host IP Binding</th>
                <th className="py-2.5 px-4">Internal Port</th>
                <th className="py-2.5 px-4">Collision Status</th>
                <th className="py-2.5 px-4 text-right">Fix / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredPorts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-zinc-500">
                    No ports matching current search filter.
                  </td>
                </tr>
              ) : (
                filteredPorts.map((item, idx) => {
                  const containerObj = containers.find(c => c.id === item.containerId);

                  return (
                    <tr
                      key={`${item.containerId}-${item.hostPort}-${idx}`}
                      className={`transition ${
                        item.isColliding ? 'bg-rose-950/20 hover:bg-rose-950/40' : 'hover:bg-zinc-800/40'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-sm text-zinc-100">
                        <span className={item.isColliding ? 'text-rose-400' : 'text-emerald-400'}>
                          :{item.hostPort}
                        </span>
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
                            Project: {item.composeProject}
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
                            <span>COLLISION DETECTED</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] flex items-center space-x-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>BOUND OK</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setRemappingTarget({
                              containerId: item.containerId,
                              containerName: item.containerName,
                              oldPort: item.hostPort,
                              newPort: item.hostPort + 1
                            })}
                            className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-emerald-300 font-medium text-xs flex items-center space-x-1 transition"
                          >
                            <Edit3 className="w-3 h-3 text-emerald-400" />
                            <span>Remap</span>
                          </button>

                          <button
                            onClick={() => onStopContainer(item.containerId)}
                            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-rose-400 transition"
                            title="Stop container to free port"
                          >
                            <Square className="w-3 h-3 fill-current" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Remap Port Modal */}
      {remappingTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-zinc-100 text-base flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                <span>Remap Host Port Binding</span>
              </h3>
              <button
                onClick={() => setRemappingTarget(null)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Target container: <strong className="text-zinc-200">{remappingTarget.containerName}</strong>
            </p>

            <form onSubmit={handleExecuteRemap} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Current Host Port
                </label>
                <input
                  type="text"
                  disabled
                  value={remappingTarget.oldPort}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  New Host Port
                </label>
                <input
                  type="number"
                  min="1"
                  max="65535"
                  value={remappingTarget.newPort}
                  onChange={(e) => setRemappingTarget({
                    ...remappingTarget,
                    newPort: parseInt(e.target.value, 10) || 0
                  })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setRemappingTarget(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition"
                >
                  Apply New Port
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
