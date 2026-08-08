import React, { useState } from 'react';
import {
  HardDrive,
  Trash2,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Search,
  Box
} from 'lucide-react';
import { DockerVolume } from '../types';
import { formatBytes, formatUptime } from '../utils/dockerUtils';

interface VolumesViewProps {
  volumes: DockerVolume[];
  onPruneUnusedVolumes: () => void;
  onDeleteVolume: (name: string) => void;
  onCreateVolume: (name: string) => void;
}

export const VolumesView: React.FC<VolumesViewProps> = ({
  volumes,
  onPruneUnusedVolumes,
  onDeleteVolume,
  onCreateVolume
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newVolumeName, setNewVolumeName] = useState('');

  const unusedVolumes = volumes.filter(v => !v.inUse || v.attachedContainers.length === 0);
  const reclaimableBytes = unusedVolumes.reduce((sum, vol) => sum + vol.sizeBytes, 0);

  const filteredVolumes = volumes.filter(v => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      v.driver.toLowerCase().includes(q) ||
      v.mountpoint.toLowerCase().includes(q)
    );
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVolumeName.trim()) return;

    onCreateVolume(newVolumeName.trim());
    setNewVolumeName('');
    setShowCreateModal(false);
  };

  return (
    <div className="flex-1 p-5 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <HardDrive className="w-5 h-5 text-emerald-400" />
            <span>Docker Named Volumes</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Persistent storage volumes managed independently of container lifecycles.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {reclaimableBytes > 0 && (
            <button
              onClick={onPruneUnusedVolumes}
              className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-semibold text-xs flex items-center space-x-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Prune Unused ({formatBytes(reclaimableBytes)} reclaimable)</span>
            </button>
          )}

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs flex items-center space-x-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Create Volume</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search volume name or mountpoint..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="text-xs text-zinc-400">
          Total Volumes: <strong className="text-white">{volumes.length}</strong> • Reclaimable: <strong className="text-amber-400">{formatBytes(reclaimableBytes)}</strong>
        </div>
      </div>

      {/* Volumes Table */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950 text-zinc-500 font-semibold border-b border-zinc-800">
              <tr>
                <th className="py-2.5 px-4">Volume Name</th>
                <th className="py-2.5 px-4">Driver & Scope</th>
                <th className="py-2.5 px-4">Size on Disk</th>
                <th className="py-2.5 px-4">Attached Containers</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {filteredVolumes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-zinc-500">
                    No volumes match current filter.
                  </td>
                </tr>
              ) : (
                filteredVolumes.map(vol => (
                  <tr key={vol.name} className="hover:bg-zinc-800/40 transition">
                    <td className="py-3 px-4 font-sans font-semibold text-zinc-100">
                      <div className="flex items-center space-x-2">
                        <HardDrive className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div>
                          <span>{vol.name}</span>
                          <div className="text-[10px] text-zinc-500 font-mono truncate max-w-xs">
                            {vol.mountpoint}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-zinc-400 font-sans text-xs">
                      {vol.driver} ({vol.scope})
                    </td>

                    <td className="py-3 px-4 font-bold text-zinc-200">
                      {formatBytes(vol.sizeBytes)}
                    </td>

                    <td className="py-3 px-4 font-sans">
                      {vol.attachedContainers.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {vol.attachedContainers.map((cName, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-300 text-[10px] font-mono border border-zinc-700">
                              {cName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-zinc-500 italic text-[11px]">None</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-sans">
                      {vol.inUse && vol.attachedContainers.length > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] flex items-center space-x-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>In Use</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] flex items-center space-x-1 w-fit">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Unused (Pruneable)</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onDeleteVolume(vol.name)}
                        disabled={vol.inUse}
                        className={`p-1.5 rounded transition ${
                          vol.inUse
                            ? 'text-zinc-600 cursor-not-allowed'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-rose-400'
                        }`}
                        title={vol.inUse ? 'Cannot delete volume attached to container' : 'Delete Volume'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Volume Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-zinc-100 text-base flex items-center space-x-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span>Create Named Volume</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Volume Name
                </label>
                <input
                  type="text"
                  value={newVolumeName}
                  onChange={(e) => setNewVolumeName(e.target.value)}
                  placeholder="e.g. postgres_data_custom"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition"
                >
                  Create Volume
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
