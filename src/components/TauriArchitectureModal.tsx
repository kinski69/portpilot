import React from 'react';
import { Zap, Server, Shield, Activity, Cpu, Layers } from 'lucide-react';

interface TauriArchitectureModalProps {
  onClose: () => void;
}

export const TauriArchitectureModal: React.FC<TauriArchitectureModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-zinc-100 text-base">Tauri vs Electron Architecture Specs</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            ✕
          </button>
        </div>

        {/* Comparison Table */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="bg-zinc-900/90 border-2 border-emerald-500/40 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between font-bold text-emerald-400">
              <span>Tauri + Rust (This App)</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-[10px]">Active</span>
            </div>
            <ul className="space-y-1.5 text-zinc-300">
              <li className="flex items-center justify-between">
                <span className="text-zinc-400">Binary Size:</span>
                <strong className="text-emerald-400 font-mono">~12 MB</strong>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-zinc-400">RAM Overhead:</span>
                <strong className="text-emerald-400 font-mono">~18 MB</strong>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-zinc-400">Docker API:</span>
                <strong className="text-emerald-400 font-mono">Rust bollard Crate</strong>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-zinc-400">Event Stream:</span>
                <strong className="text-emerald-400 font-mono">Push Events (&lt;1ms IPC)</strong>
              </li>
            </ul>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-2">
            <div className="font-bold text-zinc-400">Standard Electron</div>
            <ul className="space-y-1.5 text-zinc-400">
              <li className="flex items-center justify-between">
                <span>Binary Size:</span>
                <strong className="font-mono text-rose-400">~160 MB</strong>
              </li>
              <li className="flex items-center justify-between">
                <span>RAM Overhead:</span>
                <strong className="font-mono text-rose-400">~220 MB</strong>
              </li>
              <li className="flex items-center justify-between">
                <span>Docker API:</span>
                <strong className="font-mono">Node CLI Parsing</strong>
              </li>
              <li className="flex items-center justify-between">
                <span>Polling:</span>
                <strong className="font-mono text-amber-400">High CPU Polling Loop</strong>
              </li>
            </ul>
          </div>
        </div>

        {/* Architecture Layer Diagram */}
        <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-2 text-xs">
          <div className="font-semibold text-zinc-300 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Layer Architecture Flow</span>
          </div>

          <div className="grid grid-cols-1 gap-1.5 text-[11px] font-mono">
            <div className="bg-zinc-950 p-2 rounded border border-zinc-800 text-emerald-300 text-center">
              Vite + React + Tailwind Frontend (Pure Presentation Layer)
            </div>
            <div className="text-center text-zinc-600">↓ Tauri IPC (Commands + Async Push Events)</div>
            <div className="bg-zinc-950 p-2 rounded border border-zinc-800 text-cyan-300 text-center">
              Rust Core (bollard crate • system::events subscriber)
            </div>
            <div className="text-center text-zinc-600">↓ Direct Socket Stream</div>
            <div className="bg-zinc-950 p-2 rounded border border-zinc-800 text-amber-300 text-center">
              Docker Engine Socket (/var/run/docker.sock)
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
