import React, { useState } from 'react';
import {
  Network,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  Box,
  Layers
} from 'lucide-react';
import { DockerNetwork } from '../types';

interface NetworksViewProps {
  networks: DockerNetwork[];
  onCreateNetwork: (name: string, driver: 'bridge' | 'host') => void;
  onDeleteNetwork: (id: string) => void;
}

export const NetworksView: React.FC<NetworksViewProps> = ({
  networks,
  onCreateNetwork,
  onDeleteNetwork
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [driverInput, setDriverInput] = useState<'bridge' | 'host'>('bridge');

  const filteredNetworks = networks.filter(net => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      net.name.toLowerCase().includes(q) ||
      net.driver.toLowerCase().includes(q) ||
      net.subnet.toLowerCase().includes(q)
    );
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    onCreateNetwork(nameInput.trim(), driverInput);
    setNameInput('');
    setShowCreateModal(false);
  };

  return (
    <div className="flex-1 p-5 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Network className="w-5 h-5 text-emerald-400" />
            <span>Docker Virtual Networks</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Isolated bridge and overlay networks enabling inter-container service communication.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs flex items-center space-x-1.5 transition"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Create Network</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search network name, driver or subnet..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="text-xs text-zinc-400">
          Total Networks: <strong className="text-white">{networks.length}</strong>
        </div>
      </div>

      {/* Networks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNetworks.map(net => (
          <div key={net.id} className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 space-y-3 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <Network className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-zinc-100 text-sm">{net.name}</h4>
                  <span className="text-[10px] text-zinc-500 font-mono">Driver: {net.driver} ({net.scope})</span>
                </div>
              </div>

              {net.name !== 'bridge' && net.name !== 'host' && (
                <button
                  onClick={() => onDeleteNetwork(net.id)}
                  disabled={net.containers.length > 0}
                  className={`p-1.5 rounded transition ${
                    net.containers.length > 0
                      ? 'text-zinc-600 cursor-not-allowed'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-rose-400'
                  }`}
                  title={net.containers.length > 0 ? 'Cannot delete network with active containers' : 'Delete Network'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/60 font-mono text-xs">
              <div>
                <span className="text-zinc-500 text-[10px] block">Subnet</span>
                <span className="text-zinc-200 font-bold">{net.subnet}</span>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] block">Gateway</span>
                <span className="text-emerald-400 font-bold">{net.gateway}</span>
              </div>
            </div>

            {/* Connected Containers */}
            <div className="space-y-1">
              <span className="text-zinc-500 font-medium text-[10px] uppercase tracking-wider">
                Connected Containers ({net.containers.length}):
              </span>
              {net.containers.length === 0 ? (
                <div className="text-zinc-500 italic text-[11px]">No endpoints attached</div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {net.containers.map((c, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-[11px] font-mono flex items-center space-x-1"
                    >
                      <span>{c.containerName}</span>
                      <span className="text-emerald-400 text-[10px]">({c.ipv4})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Network Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-zinc-100 text-base flex items-center space-x-2">
                <Network className="w-4 h-4 text-emerald-400" />
                <span>Create Docker Network</span>
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
                  Network Name
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. custom_app_net"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Driver
                </label>
                <select
                  value={driverInput}
                  onChange={(e) => setDriverInput(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="bridge">bridge (Isolated Bridge)</option>
                  <option value="host">host (Direct Host Binding)</option>
                </select>
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
                  Create Network
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
