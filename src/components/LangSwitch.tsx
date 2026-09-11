import { useLang } from '../i18n';

/**
 * DE/EN-Umschalter mit Flaggen. Persistiert in localStorage (portpilot-lang)
 * und schaltet die gesamte Oberfläche ohne Neuladen um.
 */
export const LangSwitch = () => {
  const { lang, setLang, t } = useLang();

  const btn = (active: boolean) =>
    `grid h-9 w-9 place-items-center rounded-xl text-base leading-none transition ${
      active
        ? 'bg-zinc-800 text-zinc-100 shadow-inner'
        : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-200'
    }`;

  return (
    <div
      className="flex items-center gap-0.5 rounded-xl border border-zinc-800 bg-zinc-900/70 p-0.5"
      role="group"
      aria-label={t('header.langTitle')}
      title={t('header.langTitle')}
    >
      <button
        onClick={() => setLang('de')}
        aria-pressed={lang === 'de'}
        title="Deutsch"
        className={btn(lang === 'de')}
      >
        <span role="img" aria-label="Deutsch">
          🇩🇪
        </span>
      </button>
      <button
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
        title="English"
        className={btn(lang === 'en')}
      >
        <span role="img" aria-label="English">
          🇬🇧
        </span>
      </button>
    </div>
  );
};
