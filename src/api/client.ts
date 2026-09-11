import type {
  ContainerItem,
  ContainerStats,
  DockerImage,
  DockerNetwork,
  DockerSystemEvent,
  DockerVolume,
} from '../types';
import { getLang, translate } from '../i18n';

/** Fehler mit HTTP-Kontext, damit die UI 503 (Docker aus) von 500 unterscheiden kann. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(translate(getLang(), 'api.unreachable'), 0, 'NETWORK');
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    throw new ApiError(body.error ?? `HTTP ${res.status}`, res.status, body.code);
  }

  return res.json() as Promise<T>;
}

export interface AppInfo {
  version: string;
  author: string;
  license: string;
  repositoryUrl: string;
}

export interface HealthInfo {
  ok: boolean;
  socket: string;
  serverVersion?: string;
  apiVersion?: string;
  containersRunning?: number;
  containersTotal?: number;
  readOnly: boolean;
  uptimeSeconds: number;
  error?: string;
  app: AppInfo;
}

export interface ContainerDetail {
  env: Record<string, string>;
  restartCount: number;
  command: string;
}

export interface LogLine {
  stream: 'stdout' | 'stderr';
  message: string;
}

export const api = {
  health: (signal?: AbortSignal) => get<HealthInfo>('/health', signal),
  containers: (signal?: AbortSignal) => get<ContainerItem[]>('/containers', signal),
  images: (signal?: AbortSignal) => get<DockerImage[]>('/images', signal),
  volumes: (signal?: AbortSignal) => get<DockerVolume[]>('/volumes', signal),
  networks: (signal?: AbortSignal) => get<DockerNetwork[]>('/networks', signal),
  stats: (signal?: AbortSignal) => get<Record<string, ContainerStats>>('/stats', signal),
  containerDetail: (id: string, signal?: AbortSignal) =>
    get<ContainerDetail>(`/containers/${id}`, signal),
  logs: (id: string, tail = 200, signal?: AbortSignal) =>
    get<{ lines: LogLine[] }>(`/containers/${id}/logs?tail=${tail}`, signal),
};

/**
 * Abonniert den Docker-Event-Stream.
 * Der Browser verbindet bei Abbruch selbsttätig neu (retry im SSE-Payload).
 * Rückgabe schließt die Verbindung.
 */
export function subscribeToEvents(onEvent: (event: DockerSystemEvent) => void): () => void {
  const source = new EventSource('/api/events');

  source.onmessage = (msg) => {
    try {
      onEvent(JSON.parse(msg.data) as DockerSystemEvent);
    } catch {
      // Unlesbare Zeile ignorieren statt den Stream abzureißen.
    }
  };

  return () => source.close();
}
