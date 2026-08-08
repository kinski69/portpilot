import { Eye, Github, Radio, Server, X } from 'lucide-react';
import type { HealthInfo } from '../api/client';

interface AboutModalProps {
  health: HealthInfo | null;
  onClose: () => void;
}

const LAYERS = [
  {
    icon: Server,
    title: 'Backend — Express + dockerode',
    body: 'Spricht direkt mit dem Docker-Socket und übersetzt die Engine-Antworten in das Format der Oberfläche. Läuft nur auf 127.0.0.1.',
  },
  {
    icon: Radio,
    title: 'Live-Updates — Server-Sent Events',
    body: 'Die Oberfläche abonniert den Event-Stream der Engine statt zu pollen. Start, Stop und Create erscheinen sofort; Messwerte werden im 3-Sekunden-Takt nachgeladen.',
  },
  {
    icon: Eye,
    title: 'Nur lesend',
    body: 'Es gibt keine Endpunkte, die etwas verändern. Container starten, stoppen oder löschen ist bewusst nicht eingebaut.',
  },
];

export const AboutModal = ({ health, onClose }: AboutModalProps) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 p-4">
          <div>
            <h3 className="text-base font-bold text-white">
              PortPilot
              {health?.app && (
                <span className="ml-2 font-mono text-xs font-normal text-zinc-500">
                  v{health.app.version}
                </span>
              )}
            </h3>
            <p className="text-xs text-zinc-400">Lokales Docker-Dashboard</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-zinc-800 p-1.5 text-zinc-400 transition hover:bg-zinc-700 hover:text-white"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          {LAYERS.map((layer) => {
            const Icon = layer.icon;
            return (
              <div
                key={layer.title}
                className="flex gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-white">{layer.title}</h4>
                  <p className="text-xs leading-relaxed text-zinc-400">{layer.body}</p>
                </div>
              </div>
            );
          })}

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <h4 className="mb-3 text-sm font-semibold text-white">Verbundene Engine</h4>
            {health?.ok ? (
              <dl className="grid grid-cols-2 gap-y-2 font-mono text-xs">
                <dt className="text-zinc-500">Socket</dt>
                <dd className="text-zinc-200">{health.socket}</dd>
                <dt className="text-zinc-500">Server-Version</dt>
                <dd className="text-zinc-200">{health.serverVersion}</dd>
                <dt className="text-zinc-500">API-Version</dt>
                <dd className="text-zinc-200">{health.apiVersion}</dd>
                <dt className="text-zinc-500">Container</dt>
                <dd className="text-zinc-200">
                  {health.containersRunning} laufend / {health.containersTotal} gesamt
                </dd>
              </dl>
            ) : (
              <p className="text-xs text-rose-400">{health?.error ?? 'Nicht verbunden.'}</p>
            )}
          </div>

          {health?.app && (
            <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-xs text-zinc-500">
              <span>
                © {new Date().getFullYear()} {health.app.author} · {health.app.license}
              </span>
              <a
                href={health.app.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-zinc-400 transition hover:text-emerald-400"
              >
                <Github className="h-3.5 w-3.5" />
                <span>Quellcode auf GitHub</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
