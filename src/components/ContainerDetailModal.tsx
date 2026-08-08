import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Activity,
  Key,
  HardDrive,
  Network,
  Play,
  Square,
  RotateCw,
  Trash2,
  Copy,
  Check,
  Download,
  Search,
  Zap,
  Cpu,
  ArrowDownCircle,
  ArrowUpCircle,
  Code
} from 'lucide-react';
import { ContainerItem, ContainerLogEntry } from '../types';
import { GENERATE_INITIAL_LOGS } from '../data/mockDocker';
import { getStatusColorClass, formatBytes } from '../utils/dockerUtils';

interface ContainerDetailModalProps {
  container: ContainerItem | null;
  initialTab?: 'logs' | 'stats' | 'env' | 'mounts' | 'networks' | 'exec';
  onClose: () => void;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onRestart: (id: string) => void;
  onRemove: (id: string) => void;
}

export const ContainerDetailModal: React.FC<ContainerDetailModalProps> = ({
  container,
  initialTab = 'logs',
  onClose,
  onStart,
  onStop,
  onRestart,
  onRemove
}) => {
  if (!container) return null;

  const [activeTab, setActiveTab] = useState<'logs' | 'stats' | 'env' | 'mounts' | 'networks' | 'exec'>(initialTab);
  const [logs, setLogs] = useState<ContainerLogEntry[]>([]);
  const [logFilter, setLogFilter] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [execCommand, setExecCommand] = useState('');
  const [execHistory, setExecHistory] = useState<{ cmd: string; output: string }[]>([
    { cmd: 'uname -a', output: 'Linux container-host 6.6.137-cloud-native x86_64 GNU/Linux' },
    { cmd: 'cat /etc/os-release', output: `PRETTY_NAME="${container.image}"\nNAME="Alpine Linux"\nVERSION_ID="3.19.1"` }
  ]);

  const logEndRef = useRef<HTMLDivElement>(null);

  // Load logs on open
  useEffect(() => {
    if (container) {
      setLogs(GENERATE_INITIAL_LOGS(container.name));
    }
  }, [container]);

  // Live log simulation when container is running
  useEffect(() => {
    if (!container || container.status !== 'running') return;

    const interval = setInterval(() => {
      const msgs = [
        `[HTTP] GET /api/v1/health 200 OK (${(Math.random() * 12 + 1).toFixed(1)}ms)`,
        `[Metrics] Background worker heart-beat tick OK`,
        `[DB] Query executed: SELECT * FROM session_tokens LIMIT 1`,
        `[Worker] Processing queue message payload id=${Math.floor(Math.random() * 900000 + 100000)}`
      ];

      const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];
      const newEntry: ContainerLogEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        stream: 'stdout',
        level: 'info',
        message: randomMsg
      };

      setLogs(prev => [...prev.slice(-300), newEntry]);
    }, 3500);

    return () => clearInterval(interval);
  }, [container]);

  // Auto scroll logs
  useEffect(() => {
    if (autoScroll && activeTab === 'logs') {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll, activeTab]);

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // Download log file
  const handleDownloadLog = () => {
    const content = logs.map(l => `[${l.timestamp}] [${l.stream.toUpperCase()}] ${l.message}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${container.name}-logs.txt`;
    a.click();
  };

  // Exec simulation
  const handleRunExec = (e: React.FormEvent) => {
    e.preventDefault();
    if (!execCommand.trim()) return;

    const cmd = execCommand.trim();
    let out = '';

    if (cmd.startsWith('ls')) {
      out = 'bin  dev  etc  home  lib  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var';
    } else if (cmd.startsWith('ps')) {
      out = 'PID   USER     TIME  COMMAND\n    1 root      0:04 ' + container.command;
    } else if (cmd.startsWith('env')) {
      out = Object.entries(container.env).map(([k, v]) => `${k}=${v}`).join('\n');
    } else if (cmd.startsWith('ping')) {
      out = 'PING 127.0.0.1 (127.0.0.1): 56 data bytes\n64 bytes from 127.0.0.1: seq=0 ttl=64 time=0.042 ms';
    } else {
      out = `Executing: ${cmd}\nCommand completed with status 0.`;
    }

    setExecHistory(prev => [...prev, { cmd, output: out }]);
    setExecCommand('');
  };

  const { badgeBg, badgeText, dotBg } = getStatusColorClass(container.status);

  // Filter logs
  const filteredLogs = logs.filter(l => {
    if (!logFilter.trim()) return true;
    return (
      l.message.toLowerCase().includes(logFilter.toLowerCase()) ||
      l.level.toLowerCase().includes(logFilter.toLowerCase())
    );
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Bar */}
        <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3 min-w-0">
            <span className={`w-3 h-3 rounded-full shrink-0 ${dotBg}`} />
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-white text-base truncate">{container.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${badgeBg}`}>
                  {badgeText}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono truncate">
                {container.image} • <span className="text-zinc-500">ID: {container.shortId}</span>
              </p>
            </div>
          </div>

          {/* Controls & Close */}
          <div className="flex items-center space-x-2">
            {container.status === 'running' ? (
              <button
                onClick={() => onStop(container.id)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-rose-400 text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                onClick={() => onStart(container.id)}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold flex items-center space-x-1.5 transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start</span>
              </button>
            )}

            <button
              onClick={() => onRestart(container.id)}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
              title="Restart"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition ml-2"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-4 bg-zinc-900/60 border-b border-zinc-800/80 flex items-center space-x-1 text-xs select-none overflow-x-auto">
          {[
            { id: 'logs', label: 'Live Logs', icon: Terminal },
            { id: 'stats', label: 'Metrics & Stats', icon: Activity },
            { id: 'env', label: 'Environment Variables', icon: Key },
            { id: 'mounts', label: 'Mounts & Volumes', icon: HardDrive },
            { id: 'networks', label: 'Networks', icon: Network },
            { id: 'exec', label: 'Terminal Shell', icon: Code }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-1.5 py-2.5 px-3 border-b-2 font-medium transition whitespace-nowrap ${
                  isActive
                    ? 'border-emerald-400 text-emerald-400 font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: LIVE LOGS */}
          {activeTab === 'logs' && (
            <div className="h-full flex flex-col space-y-3">
              {/* Log Toolbar */}
              <div className="flex items-center justify-between gap-3 bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                    placeholder="Filter logs by keyword..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <button
                    onClick={() => setAutoScroll(!autoScroll)}
                    className={`px-2.5 py-1 rounded-md border transition ${
                      autoScroll
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-medium'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    Auto-Scroll {autoScroll ? 'ON' : 'OFF'}
                  </button>

                  <button
                    onClick={() => setLogs([])}
                    className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                  >
                    Clear Logs
                  </button>

                  <button
                    onClick={handleDownloadLog}
                    className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-emerald-400 transition"
                    title="Download Logs"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Terminal Screen */}
              <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-4 font-mono text-xs overflow-y-auto space-y-1 text-zinc-300 select-text">
                {filteredLogs.length === 0 ? (
                  <div className="text-zinc-500 italic py-10 text-center">
                    No log lines matching current filter.
                  </div>
                ) : (
                  filteredLogs.map(log => (
                    <div key={log.id} className="flex items-start space-x-2 hover:bg-zinc-900/50 rounded px-1 py-0.5">
                      <span className="text-zinc-600 shrink-0 text-[10px] select-none pt-0.5">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`shrink-0 font-bold text-[10px] uppercase px-1 rounded ${
                        log.stream === 'stderr' || log.level === 'error'
                          ? 'bg-rose-500/20 text-rose-400'
                          : log.level === 'warn'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {log.stream}
                      </span>
                      <span className={`break-all leading-relaxed ${
                        log.stream === 'stderr' ? 'text-rose-300' : 'text-zinc-200'
                      }`}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
                <div ref={logEndRef} />
              </div>
            </div>
          )}

          {/* TAB 2: METRICS & STATS */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              {/* CPU & RAM Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-2">
                  <div className="text-xs text-zinc-400 flex items-center space-x-1.5">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    <span>CPU Usage</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">
                    {container.stats.cpuPercent.toFixed(1)}%
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-500"
                      style={{ width: `${Math.min(container.stats.cpuPercent * 2, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-2">
                  <div className="text-xs text-zinc-400 flex items-center space-x-1.5">
                    <HardDrive className="w-4 h-4 text-cyan-400" />
                    <span>Memory (RAM)</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">
                    {container.stats.memoryUsageMB.toFixed(0)} MB
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    Limit: {container.stats.memoryLimitMB} MB ({container.stats.memoryPercent.toFixed(1)}%)
                  </div>
                </div>

                <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-2">
                  <div className="text-xs text-zinc-400 flex items-center space-x-1.5">
                    <ArrowDownCircle className="w-4 h-4 text-purple-400" />
                    <span>Network RX</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">
                    {formatBytes(container.stats.networkRxKB * 1024)}
                  </div>
                </div>

                <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-2">
                  <div className="text-xs text-zinc-400 flex items-center space-x-1.5">
                    <ArrowUpCircle className="w-4 h-4 text-amber-400" />
                    <span>Network TX</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">
                    {formatBytes(container.stats.networkTxKB * 1024)}
                  </div>
                </div>
              </div>

              {/* Command info */}
              <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-2">
                <div className="text-xs font-semibold text-zinc-400">Entrypoint Command:</div>
                <code className="block bg-zinc-950 p-3 rounded-lg text-xs font-mono text-emerald-400 border border-zinc-800">
                  {container.command}
                </code>
              </div>
            </div>
          )}

          {/* TAB 3: ENVIRONMENT VARIABLES */}
          {activeTab === 'env' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950 text-zinc-500 font-semibold border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-4">Key</th>
                    <th className="py-2.5 px-4">Value</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {Object.entries(container.env).map(([k, v]) => (
                    <tr key={k} className="hover:bg-zinc-800/40">
                      <td className="py-2.5 px-4 text-emerald-400 font-bold">{k}</td>
                      <td className="py-2.5 px-4 text-zinc-300 break-all">{v}</td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => handleCopy(`${k}=${v}`, k)}
                          className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                        >
                          {copiedKey === k ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: MOUNTS & VOLUMES */}
          {activeTab === 'mounts' && (
            <div className="space-y-4">
              {container.mounts.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 bg-zinc-900 rounded-xl border border-zinc-800">
                  No volume mounts configured for this container.
                </div>
              ) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-950 text-zinc-500 font-semibold border-b border-zinc-800">
                      <tr>
                        <th className="py-2.5 px-4">Type</th>
                        <th className="py-2.5 px-4">Source (Host / Volume)</th>
                        <th className="py-2.5 px-4">Destination (Container)</th>
                        <th className="py-2.5 px-4">Mode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono">
                      {container.mounts.map((m, idx) => (
                        <tr key={idx} className="hover:bg-zinc-800/40">
                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-cyan-400 text-[10px] font-bold">
                              {m.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-zinc-200">{m.source}</td>
                          <td className="py-2.5 px-4 text-emerald-400">{m.destination}</td>
                          <td className="py-2.5 px-4 text-zinc-400 font-bold">{m.mode}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: NETWORKS */}
          {activeTab === 'networks' && (
            <div className="space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-500 font-semibold border-b border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-4">Network Name</th>
                      <th className="py-2.5 px-4">IP Address</th>
                      <th className="py-2.5 px-4">Gateway</th>
                      <th className="py-2.5 px-4">MAC Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {container.networks.map((n, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/40">
                        <td className="py-2.5 px-4 font-bold text-emerald-400">{n.networkName}</td>
                        <td className="py-2.5 px-4 text-zinc-200">{n.ipAddress}</td>
                        <td className="py-2.5 px-4 text-zinc-400">{n.gateway}</td>
                        <td className="py-2.5 px-4 text-zinc-500">{n.macAddress}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: TERMINAL EXEC */}
          {activeTab === 'exec' && (
            <div className="h-full flex flex-col space-y-3 font-mono text-xs">
              <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 text-zinc-400 flex items-center justify-between">
                <span>Interactive Sh Session: <code className="text-emerald-400">docker exec -it {container.shortId} sh</code></span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                  Connected
                </span>
              </div>

              <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-4 overflow-y-auto space-y-3 text-zinc-200">
                {execHistory.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="text-emerald-400 font-bold flex items-center space-x-1.5">
                      <span>root@{container.name}:/#</span>
                      <span className="text-white">{item.cmd}</span>
                    </div>
                    <pre className="text-zinc-300 text-[11px] bg-zinc-900/50 p-2 rounded whitespace-pre-wrap">
                      {item.output}
                    </pre>
                  </div>
                ))}
              </div>

              <form onSubmit={handleRunExec} className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">#</span>
                <input
                  type="text"
                  value={execCommand}
                  onChange={(e) => setExecCommand(e.target.value)}
                  placeholder="Type shell command (e.g. 'ls', 'ps aux', 'env', 'ping')..."
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold rounded-lg text-xs transition"
                >
                  Run
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
