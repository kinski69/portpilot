import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, api, subscribeToEvents, type HealthInfo } from '../api/client';
import type {
  ContainerItem,
  ContainerStats,
  DockerImage,
  DockerNetwork,
  DockerSystemEvent,
  DockerVolume,
} from '../types';

/** Anzahl der Messpunkte in den Sparklines. */
const HISTORY_LENGTH = 15;
/** Abstand zwischen zwei Stats-Abfragen. Die Engine braucht selbst ~1s pro Messung. */
const STATS_INTERVAL_MS = 3000;
/** Events kommen in Schueben (ein docker run loest ein Dutzend aus) — Neuladen buendeln. */
const REFRESH_DEBOUNCE_MS = 400;
/** Ringpuffer für die Ereignisliste. */
const MAX_EVENTS = 200;

interface StatsHistory {
  cpu: number[];
  memory: number[];
}

export interface DockerData {
  containers: ContainerItem[];
  images: DockerImage[];
  volumes: DockerVolume[];
  networks: DockerNetwork[];
  events: DockerSystemEvent[];
  health: HealthInfo | null;
  loading: boolean;
  error: string | null;
  isLiveStreaming: boolean;
  setIsLiveStreaming: (on: boolean) => void;
  refresh: () => void;
  clearEvents: () => void;
}

export function useDockerData(): DockerData {
  const [containers, setContainers] = useState<ContainerItem[]>([]);
  const [images, setImages] = useState<DockerImage[]>([]);
  const [volumes, setVolumes] = useState<DockerVolume[]>([]);
  const [networks, setNetworks] = useState<DockerNetwork[]>([]);
  const [events, setEvents] = useState<DockerSystemEvent[]>([]);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [stats, setStats] = useState<Record<string, ContainerStats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);

  // Verlauf überlebt Neuladen der Container-Liste, deshalb im Ref statt im State.
  const historyRef = useRef<Record<string, StatsHistory>>({});
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadAll = useCallback(async (signal?: AbortSignal) => {
    try {
      const [containerList, imageList, volumeList, networkList, healthInfo] = await Promise.all([
        api.containers(signal),
        api.images(signal),
        api.volumes(signal),
        api.networks(signal),
        api.health(signal),
      ]);

      setContainers(containerList);
      setImages(imageList);
      setVolumes(volumeList);
      setNetworks(networkList);
      setHealth(healthInfo);
      setError(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(
        err instanceof ApiError
          ? err.message
          : `Unerwarteter Fehler: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Erstes Laden
  useEffect(() => {
    const controller = new AbortController();
    void loadAll(controller.signal);
    return () => controller.abort();
  }, [loadAll]);

  const refresh = useCallback(() => {
    void loadAll();
  }, [loadAll]);

  /** Mehrere Events kurz hintereinander loesen nur ein Neuladen aus. */
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      void loadAll();
    }, REFRESH_DEBOUNCE_MS);
  }, [loadAll]);

  // Live-Events der Engine
  useEffect(() => {
    const unsubscribe = subscribeToEvents((event) => {
      setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));

      // exec-Events entstehen durch Healthchecks im Sekundentakt und aendern
      // nichts an der Ressourcenlage — sonst laedt die UI dauernd neu.
      if (!event.action.startsWith('exec_')) {
        scheduleRefresh();
      }
    });

    return () => {
      unsubscribe();
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [scheduleRefresh]);

  // Stats-Polling
  useEffect(() => {
    if (!isLiveStreaming) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const snapshot = await api.stats();
        if (cancelled) return;

        // Verlauf fortschreiben, damit die Sparklines echte Historie zeigen.
        const history = historyRef.current;
        for (const [id, s] of Object.entries(snapshot)) {
          const prev = history[id] ?? {
            cpu: Array<number>(HISTORY_LENGTH).fill(0),
            memory: Array<number>(HISTORY_LENGTH).fill(0),
          };
          history[id] = {
            cpu: [...prev.cpu.slice(1), s.cpuPercent],
            memory: [...prev.memory.slice(1), s.memoryUsageMB],
          };
        }
        // Verlauf beendeter Container nicht endlos mitschleppen.
        for (const id of Object.keys(history)) {
          if (!(id in snapshot)) delete history[id];
        }

        setStats(snapshot);
      } catch {
        // Einzelner Fehlschlag ist unkritisch; der nächste Tick versucht es erneut.
      } finally {
        // Erst nach Abschluss neu planen, damit sich langsame Abfragen nicht stapeln.
        if (!cancelled) timer = setTimeout(() => void tick(), STATS_INTERVAL_MS);
      }
    };

    void tick();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isLiveStreaming]);

  // Stammdaten und Messwerte erst hier zusammenfuehren — die Container-Liste
  // wird deutlich seltener neu geladen als die Stats.
  const containersWithStats = useMemo(
    () =>
      containers.map((c): ContainerItem => {
        const live = stats[c.id];
        if (!live) return c;
        const history = historyRef.current[c.id];
        return {
          ...c,
          stats: {
            ...live,
            cpuHistory: history?.cpu ?? live.cpuHistory,
            memoryHistory: history?.memory ?? live.memoryHistory,
          },
        };
      }),
    [containers, stats],
  );

  const clearEvents = useCallback(() => setEvents([]), []);

  return {
    containers: containersWithStats,
    images,
    volumes,
    networks,
    events,
    health,
    loading,
    error,
    isLiveStreaming,
    setIsLiveStreaming,
    refresh,
    clearEvents,
  };
}
