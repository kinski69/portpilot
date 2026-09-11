import { Eye, Github, Palette, Radio, Server, X } from 'lucide-react';
import type { HealthInfo } from '../api/client';
import { useLang } from '../i18n';
import { useTheme } from '../theme';

interface AboutModalProps {
  health: HealthInfo | null;
  onClose: () => void;
}

export const AboutModal = ({ health, onClose }: AboutModalProps) => {
  const { t } = useLang();
  const { choice, setChoice, themes, activeName } = useTheme();

  const LAYERS = [
    {
      icon: Server,
      title: t('about.layerBackendT'),
      body: t('about.layerBackendB'),
    },
    {
      icon: Radio,
      title: t('about.layerLiveT'),
      body: t('about.layerLiveB'),
    },
    {
      icon: Eye,
      title: t('about.layerRoT'),
      body: t('about.layerRoB'),
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="pp-modal flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-zinc-950 shadow-2xl"
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
            <p className="text-xs text-zinc-400">{t('about.subtitle')}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-zinc-800 p-1.5 text-zinc-400 transition hover:bg-zinc-700 hover:text-white"
            aria-label={t('detail.close')}
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
            <h4 className="mb-3 text-sm font-semibold text-white">{t('about.engineTitle')}</h4>
            {health?.ok ? (
              <dl className="grid grid-cols-2 gap-y-2 font-mono text-xs">
                <dt className="text-zinc-500">{t('about.sockT')}</dt>
                <dd className="text-zinc-200">{health.socket}</dd>
                <dt className="text-zinc-500">{t('about.serverV')}</dt>
                <dd className="text-zinc-200">{health.serverVersion}</dd>
                <dt className="text-zinc-500">{t('about.apiV')}</dt>
                <dd className="text-zinc-200">{health.apiVersion}</dd>
                <dt className="text-zinc-500">{t('about.contT')}</dt>
                <dd className="text-zinc-200">
                  {t('about.contV', {
                    running: health.containersRunning ?? 0,
                    total: health.containersTotal ?? 0,
                  })}
                </dd>
              </dl>
            ) : (
              <p className="text-xs text-rose-400">{health?.error ?? t('about.notConnected')}</p>
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
                <span>{t('about.source')}</span>
              </a>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <Palette className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <div className="min-w-0 flex-1 space-y-1">
              <h4 className="text-sm font-semibold text-white">{t('theme.title')}</h4>
              <p className="font-mono text-[11px] text-zinc-500">
                {activeName || '—'}
              </p>
            </div>
            <select
              value={choice}
              onChange={(e) => setChoice(e.target.value)}
              className="max-w-44 truncate rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 font-mono text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
              aria-label={t('theme.title')}
            >
              <option value="auto">{t('theme.auto')}</option>
              {themes.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
