import Docker from 'dockerode';
import type {
  ContainerItem,
  ContainerNetwork,
  ContainerStats,
  ContainerStatus,
  DockerImage,
  DockerNetwork,
  DockerVolume,
  PortMapping,
  VolumeMount,
} from '../src/types';

// Ein einziger Client für den gesamten Prozess.
// Socket-Pfad ist per DOCKER_SOCKET überschreibbar (z.B. rootless Docker).
const socketPath = process.env.DOCKER_SOCKET ?? '/var/run/docker.sock';
const docker = new Docker({ socketPath });

/** Fehler, der eine nicht erreichbare Docker-Engine von echten Bugs unterscheidet. */
export class DockerUnavailableError extends Error {
  constructor(cause: unknown) {
    super(
      `Docker-Engine nicht erreichbar über ${socketPath}. ` +
        `Läuft der Daemon (systemctl start docker) und ist der Benutzer in der Gruppe "docker"?`,
    );
    this.name = 'DockerUnavailableError';
    this.cause = cause;
  }
}

async function callDocker<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ECONNREFUSED' || code === 'EACCES') {
      throw new DockerUnavailableError(err);
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Mapping-Helfer
// ---------------------------------------------------------------------------

/**
 * Übersetzt den Docker-State in den UI-Status.
 * Docker kennt: created | running | paused | restarting | removing | exited | dead
 */
function mapStatus(state: string, exitCode: number | undefined): ContainerStatus {
  switch (state) {
    case 'running':
      return 'running';
    case 'paused':
      return 'paused';
    case 'restarting':
      return 'restarting';
    case 'dead':
      return 'error';
    case 'exited':
      // Ein Exit ungleich 0 ist ein Fehlerzustand, kein normales Beenden.
      return exitCode !== undefined && exitCode !== 0 ? 'error' : 'exited';
    default:
      return 'exited';
  }
}

/**
 * Normalisiert Port-Bindings.
 *
 * Docker meldet für einen Container, der auf allen Interfaces lauscht, zwei
 * Einträge (0.0.0.0 und ::) für dieselbe Bindung. Beide zu behalten würde in
 * der Kollisionserkennung einen Konflikt des Containers mit sich selbst erzeugen.
 * Wildcard-Adressen werden daher auf 0.0.0.0 vereinheitlicht und Duplikate
 * (hostIp + hostPort + protocol) entfernt.
 */
function mapPorts(ports: Docker.Port[] | undefined): PortMapping[] {
  if (!ports) return [];

  const seen = new Set<string>();
  const result: PortMapping[] = [];

  for (const p of ports) {
    // Ohne PublicPort ist der Port nur exposed, aber nicht auf den Host gemappt.
    if (p.PublicPort === undefined) continue;

    const rawIp = p.IP ?? '0.0.0.0';
    const hostIp = rawIp === '::' || rawIp === '' ? '0.0.0.0' : rawIp;
    const protocol = p.Type === 'udp' ? 'udp' : 'tcp';
    const key = `${hostIp}:${p.PublicPort}/${protocol}`;

    if (seen.has(key)) continue;
    seen.add(key);

    result.push({
      hostIp,
      hostPort: p.PublicPort,
      containerPort: p.PrivatePort,
      protocol,
    });
  }

  return result;
}

function mapMounts(mounts: Docker.ContainerInfo['Mounts'] | undefined): VolumeMount[] {
  if (!mounts) return [];
  return mounts.map((m) => ({
    type: m.Type === 'bind' ? 'bind' : 'volume',
    source: m.Name || m.Source || '(anonym)',
    destination: m.Destination,
    mode: m.RW ? 'rw' : 'ro',
  }));
}

function mapNetworks(
  networkSettings: Docker.ContainerInfo['NetworkSettings'] | undefined,
): ContainerNetwork[] {
  const nets = networkSettings?.Networks;
  if (!nets) return [];

  return Object.entries(nets).map(([networkName, cfg]) => ({
    networkName,
    ipAddress: cfg.IPAddress || '—',
    gateway: cfg.Gateway || '—',
    macAddress: cfg.MacAddress || '—',
  }));
}

const EMPTY_HISTORY_LENGTH = 15;

function emptyStats(): ContainerStats {
  return {
    cpuPercent: 0,
    memoryUsageMB: 0,
    memoryLimitMB: 0,
    memoryPercent: 0,
    networkRxKB: 0,
    networkTxKB: 0,
    cpuHistory: Array<number>(EMPTY_HISTORY_LENGTH).fill(0),
    memoryHistory: Array<number>(EMPTY_HISTORY_LENGTH).fill(0),
  };
}

/**
 * Rechnet einen Docker-Stats-Schnappschuss in Prozentwerte um.
 * Formel entspricht dem, was `docker stats` intern macht.
 */
function computeStats(raw: Docker.ContainerStats): ContainerStats {
  const cpuDelta = raw.cpu_stats.cpu_usage.total_usage - raw.precpu_stats.cpu_usage.total_usage;
  const systemDelta = (raw.cpu_stats.system_cpu_usage ?? 0) - (raw.precpu_stats.system_cpu_usage ?? 0);
  // online_cpus fehlt bei älteren Daemons; dann aus der percpu-Liste ableiten.
  const cpuCount = raw.cpu_stats.online_cpus || raw.cpu_stats.cpu_usage.percpu_usage?.length || 1;

  let cpuPercent = 0;
  if (systemDelta > 0 && cpuDelta > 0) {
    cpuPercent = (cpuDelta / systemDelta) * cpuCount * 100;
  }

  // Der Page-Cache zählt nicht als echter Verbrauch — genau wie bei `docker stats`.
  const cache = raw.memory_stats.stats?.inactive_file ?? 0;
  const memUsageBytes = Math.max(0, (raw.memory_stats.usage ?? 0) - cache);
  const memLimitBytes = raw.memory_stats.limit ?? 0;

  const networks = raw.networks ?? {};
  let rxBytes = 0;
  let txBytes = 0;
  for (const iface of Object.values(networks)) {
    rxBytes += iface.rx_bytes ?? 0;
    txBytes += iface.tx_bytes ?? 0;
  }

  const memoryUsageMB = +(memUsageBytes / 1024 / 1024).toFixed(1);
  const memoryLimitMB = +(memLimitBytes / 1024 / 1024).toFixed(0);

  return {
    cpuPercent: +cpuPercent.toFixed(1),
    memoryUsageMB,
    memoryLimitMB,
    memoryPercent: memLimitBytes > 0 ? +((memUsageBytes / memLimitBytes) * 100).toFixed(1) : 0,
    networkRxKB: +(rxBytes / 1024).toFixed(1),
    networkTxKB: +(txBytes / 1024).toFixed(1),
    cpuHistory: Array<number>(EMPTY_HISTORY_LENGTH).fill(0),
    memoryHistory: Array<number>(EMPTY_HISTORY_LENGTH).fill(0),
  };
}

// ---------------------------------------------------------------------------
// Öffentliche Abfragen
// ---------------------------------------------------------------------------

export interface DockerHealth {
  ok: boolean;
  socket: string;
  serverVersion?: string;
  apiVersion?: string;
  containersRunning?: number;
  containersTotal?: number;
  error?: string;
}

export async function getHealth(): Promise<DockerHealth> {
  try {
    const [info, version] = await Promise.all([
      callDocker(() => docker.info()),
      callDocker(() => docker.version()),
    ]);
    return {
      ok: true,
      socket: socketPath,
      serverVersion: version.Version,
      apiVersion: version.ApiVersion,
      containersRunning: info.ContainersRunning,
      containersTotal: info.Containers,
    };
  } catch (err) {
    return {
      ok: false,
      socket: socketPath,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function listContainers(): Promise<ContainerItem[]> {
  const raw = await callDocker(() => docker.listContainers({ all: true }));

  return raw.map((c): ContainerItem => {
    const id = c.Id;
    // Docker liefert Namen mit führendem Slash.
    const name = c.Names?.[0]?.replace(/^\//, '') ?? id.substring(0, 12);
    const labels = c.Labels ?? {};
    const exitCode = extractExitCode(c.Status);

    return {
      id,
      shortId: id.substring(0, 12),
      name,
      image: c.Image,
      status: mapStatus(c.State, exitCode),
      statusText: c.Status,
      created: new Date(c.Created * 1000).toISOString(),
      composeProject: labels['com.docker.compose.project'],
      composeService: labels['com.docker.compose.service'],
      ports: mapPorts(c.Ports),
      // Env steckt nicht in der Listen-Antwort — kommt on demand via inspect.
      env: {},
      mounts: mapMounts(c.Mounts),
      networks: mapNetworks(c.NetworkSettings),
      stats: emptyStats(),
      command: c.Command,
      restartCount: 0,
      exitCode,
    };
  });
}

/** Liest "Exited (1) 3 weeks ago" und gibt den Code zurück. */
function extractExitCode(status: string | undefined): number | undefined {
  const match = status?.match(/Exited \((\d+)\)/);
  return match ? Number.parseInt(match[1], 10) : undefined;
}

/** Vollstaendige Details eines Containers inklusive Env und Restart-Count. */
export async function inspectContainer(id: string): Promise<{
  env: Record<string, string>;
  restartCount: number;
  command: string;
}> {
  const data = await callDocker(() => docker.getContainer(id).inspect());

  const env: Record<string, string> = {};
  for (const entry of data.Config?.Env ?? []) {
    const idx = entry.indexOf('=');
    if (idx > 0) env[entry.substring(0, idx)] = entry.substring(idx + 1);
  }

  const cmd = [data.Path, ...(data.Args ?? [])].filter(Boolean).join(' ');

  return {
    env,
    restartCount: data.RestartCount ?? 0,
    command: cmd || '—',
  };
}

/** Einzelner Stats-Schnappschuss. Nur für laufende Container sinnvoll. */
export async function getContainerStats(id: string): Promise<ContainerStats> {
  const raw = (await callDocker(() =>
    docker.getContainer(id).stats({ stream: false }),
  )) as unknown as Docker.ContainerStats;
  return computeStats(raw);
}

/**
 * Stats aller laufenden Container in einem Rutsch.
 *
 * Ein einzelner stats-Aufruf blockiert rund eine Sekunde, weil die Engine zwei
 * Messpunkte braucht. Parallel im Backend gesammelt kostet der gesamte Tick
 * daher etwa so viel wie ein einzelner Container — und die UI braucht statt
 * eines Requests pro Container nur noch einen.
 */
export async function getAllRunningStats(): Promise<Record<string, ContainerStats>> {
  const running = await callDocker(() => docker.listContainers({ all: false }));

  const entries = await Promise.all(
    running.map(async (c) => {
      try {
        return [c.Id, await getContainerStats(c.Id)] as const;
      } catch {
        // Container kann zwischen list und stats beendet worden sein.
        return null;
      }
    }),
  );

  return Object.fromEntries(entries.filter((e): e is NonNullable<typeof e> => e !== null));
}

export async function listImages(): Promise<DockerImage[]> {
  const [raw, containers] = await Promise.all([
    callDocker(() => docker.listImages({ all: false })),
    callDocker(() => docker.listContainers({ all: true })),
  ]);

  // Wie viele Container verwenden ein Image? Beide Schreibweisen zaehlen,
  // da die Container-Liste mal den Tag und mal die ID nennt.
  const usageByRef = new Map<string, number>();
  for (const c of containers) {
    for (const ref of [c.Image, c.ImageID]) {
      if (ref) usageByRef.set(ref, (usageByRef.get(ref) ?? 0) + 1);
    }
  }

  return raw.map((img): DockerImage => {
    const tags = img.RepoTags ?? [];
    const dangling = tags.length === 0 || tags[0] === '<none>:<none>';
    const firstTag = dangling ? '<none>:<none>' : tags[0];
    const lastColon = firstTag.lastIndexOf(':');
    const repository = lastColon > 0 ? firstTag.substring(0, lastColon) : firstTag;
    const tag = lastColon > 0 ? firstTag.substring(lastColon + 1) : 'latest';

    const containerCount = (usageByRef.get(img.Id) ?? 0) + (dangling ? 0 : (usageByRef.get(firstTag) ?? 0));

    return {
      id: img.Id,
      shortId: img.Id.replace('sha256:', '').substring(0, 12),
      repository,
      tag,
      sizeBytes: img.Size,
      created: new Date(img.Created * 1000).toISOString(),
      inUse: containerCount > 0,
      containerCount,
      dangling,
    };
  });
}

export async function listVolumes(): Promise<DockerVolume[]> {
  const [result, containers] = await Promise.all([
    callDocker(() => docker.listVolumes()),
    callDocker(() => docker.listContainers({ all: true })),
  ]);

  // Zuordnung Volume-Name -> Container-Namen über die Mount-Listen.
  const attached = new Map<string, string[]>();
  for (const c of containers) {
    const cname = c.Names?.[0]?.replace(/^\//, '') ?? c.Id.substring(0, 12);
    for (const m of c.Mounts ?? []) {
      if (m.Type !== 'volume' || !m.Name) continue;
      const list = attached.get(m.Name) ?? [];
      list.push(cname);
      attached.set(m.Name, list);
    }
  }

  return ((result.Volumes ?? []) as VolumeWithCreatedAt[]).map((v): DockerVolume => {
    const attachedContainers = attached.get(v.Name) ?? [];
    return {
      name: v.Name,
      driver: v.Driver,
      scope: v.Scope ?? 'local',
      mountpoint: v.Mountpoint,
      created: v.CreatedAt ?? new Date(0).toISOString(),
      // Größe liefert die Engine nur mit teurem `df`-Aufruf — bewusst 0.
      sizeBytes: v.UsageData?.Size && v.UsageData.Size > 0 ? v.UsageData.Size : 0,
      inUse: attachedContainers.length > 0,
      attachedContainers,
    };
  });
}

const KNOWN_DRIVERS: DockerNetwork['driver'][] = ['bridge', 'host', 'overlay', 'macvlan', 'none'];

// Die Engine liefert CreatedAt (verifiziert gegen API v1.55), @types/dockerode
// führt das Feld aber nicht. Deshalb hier nachgezogen statt blind zu casten.
type VolumeWithCreatedAt = Docker.VolumeInspectInfo & { CreatedAt?: string };

export async function listNetworks(): Promise<DockerNetwork[]> {
  const raw = await callDocker(() => docker.listNetworks());

  // /networks liefert das Containers-Feld nicht mit (verifiziert gegen API v1.55) —
  // die Zuordnung gibt es nur per inspect. Daher pro Netzwerk einmal nachladen.
  const details = await Promise.all(
    raw.map(async (n) => {
      try {
        return await docker.getNetwork(n.Id).inspect();
      } catch {
        // Netzwerk kann zwischen list und inspect verschwinden — dann ohne Container weiter.
        return null;
      }
    }),
  );

  return raw.map((n, idx): DockerNetwork => {
    const ipam = n.IPAM?.Config?.[0];
    const attachedRaw = details[idx]?.Containers ?? {};
    const containers = Object.entries(attachedRaw).map(([containerId, c]) => ({
      containerId,
      containerName: c.Name,
      ipv4: c.IPv4Address || '—',
    }));

    const driver = KNOWN_DRIVERS.includes(n.Driver as DockerNetwork['driver'])
      ? (n.Driver as DockerNetwork['driver'])
      : 'bridge';

    return {
      id: n.Id,
      name: n.Name,
      driver,
      scope: n.Scope === 'swarm' ? 'swarm' : 'local',
      subnet: ipam?.Subnet ?? '—',
      gateway: ipam?.Gateway ?? '—',
      containers,
      internal: n.Internal ?? false,
      inUse: containers.length > 0,
    };
  });
}

export { docker };
