import type { ContainerItem, PortCollision, PortMapping } from '../types';

/** Wildcard-Bindungen belegen den Port auf allen Interfaces. */
const WILDCARD_IPS = new Set(['0.0.0.0', '::', '']);

function isWildcard(hostIp: string): boolean {
  return WILDCARD_IPS.has(hostIp);
}

/**
 * Zwei Bindungen kollidieren nur, wenn sie sich dieselbe Adresse teilen.
 * 127.0.0.1:8000 und 192.168.1.5:8000 können problemlos nebeneinander
 * existieren — eine Wildcard-Bindung kollidiert dagegen mit jeder anderen
 * Bindung auf demselben Port.
 */
function addressesOverlap(a: string, b: string): boolean {
  if (isWildcard(a) || isWildcard(b)) return true;
  return a === b;
}

/**
 * Findet echte Host-Port-Konflikte zwischen Containern.
 *
 * Bewusst nicht als Konflikt gewertet:
 * - derselbe Container mehrfach (Docker meldet IPv4 und IPv6 getrennt)
 * - gleicher Port auf unterschiedlichen, nicht überlappenden Host-Adressen
 * - gleicher Port bei unterschiedlichem Protokoll (tcp/udp sind getrennte Namensräume)
 */
export function detectPortCollisions(containers: ContainerItem[]): PortCollision[] {
  // Pro Port und Protokoll alle Bindungen sammeln.
  const bindings = new Map<string, { container: ContainerItem; port: PortMapping }[]>();

  for (const container of containers) {
    for (const port of container.ports) {
      const key = `${port.hostPort}/${port.protocol}`;
      const list = bindings.get(key) ?? [];
      list.push({ container, port });
      bindings.set(key, list);
    }
  }

  const collisions: PortCollision[] = [];

  for (const [key, entries] of bindings) {
    // Ein einzelner Container kann nicht mit sich selbst kollidieren.
    const distinctContainers = new Set(entries.map((e) => e.container.id));
    if (distinctContainers.size < 2) continue;

    // Nur Bindungen behalten, die sich tatsächlich eine Adresse teilen.
    const conflicting = entries.filter((entry) =>
      entries.some(
        (other) =>
          other.container.id !== entry.container.id &&
          addressesOverlap(entry.port.hostIp, other.port.hostIp),
      ),
    );

    if (new Set(conflicting.map((e) => e.container.id)).size < 2) continue;

    const [portStr, protocol] = key.split('/');
    const port = Number.parseInt(portStr, 10);

    // Pro Container nur ein Eintrag, auch wenn er mehrfach gebunden hat.
    const seen = new Set<string>();
    const involved = conflicting.filter((e) => {
      if (seen.has(e.container.id)) return false;
      seen.add(e.container.id);
      return true;
    });

    const names = involved.map((e) => e.container.composeProject ?? e.container.name).join(', ');

    collisions.push({
      port,
      protocol: protocol === 'udp' ? 'udp' : 'tcp',
      containers: involved.map((e) => ({
        id: e.container.id,
        name: e.container.name,
        composeProject: e.container.composeProject,
        hostIp: e.port.hostIp,
        status: e.container.status,
      })),
      // Laufende Container streiten sich real um den Socket; bei gestoppten ist
      // es nur eine Warnung für den nächsten Start.
      severity: involved.every((e) => e.container.status === 'running') ? 'critical' : 'warning',
      description: `Host-Port ${port}/${protocol} wird von mehreren Containern belegt (${names}).`,
    });
  }

  return collisions.sort((a, b) => a.port - b.port);
}

// Ports, hinter denen ueblicherweise TLS liegt. http:// wuerde dort scheitern.
const HTTPS_PORTS = new Set([443, 8443, 9443]);

/**
 * Adresse, unter der ein veroeffentlichter Port im Browser erreichbar ist.
 * Gibt null zurueck, wenn ein Aufruf keinen Sinn ergibt.
 */
export function buildPortUrl(
  hostIp: string,
  hostPort: number,
  protocol: 'tcp' | 'udp',
): string | null {
  // UDP spricht kein HTTP.
  if (protocol !== 'tcp') return null;

  // 0.0.0.0 und :: heissen "auf allen Interfaces lauschen" und sind keine
  // Zieladressen — der Dienst ist ueber die Loopback-Adresse erreichbar.
  const wildcard = hostIp === '0.0.0.0' || hostIp === '::' || hostIp === '';
  const rawHost = wildcard ? '127.0.0.1' : hostIp;

  // Nackte IPv6-Adressen muessen in einer URL in eckigen Klammern stehen.
  const host = !wildcard && rawHost.includes(':') ? `[${rawHost}]` : rawHost;

  return `${HTTPS_PORTS.has(hostPort) ? 'https' : 'http'}://${host}:${hostPort}`;
}

/**
 * Befehl, mit dem sich ein gestoppter Container zum Laufen bringen laesst.
 *
 * `docker start <name>` funktioniert für JEDEN gestoppten Container, auch
 * ohne Compose-Projekt — Docker haelt Ports, Mounts und Netzwerke am
 * Container-Objekt selbst, nicht am urspruenglichen Start-Kommando. Bei
 * Compose-Containern ist `docker compose start` trotzdem vorzuziehen: es
 * respektiert Abhaengigkeiten und Healthchecks des Projekts. Ohne bekannten
 * Ordner (composeWorkingDir) laesst sich `cd` davor nicht sinnvoll angeben.
 */
export function buildStartCommand(container: ContainerItem): string {
  if (container.composeWorkingDir && container.composeService) {
    return `cd ${container.composeWorkingDir} && docker compose start ${container.composeService}`;
  }
  return `docker start ${container.name}`;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  // Index begrenzen, damit sehr große Werte nicht ins Leere greifen.
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${Number.parseFloat((bytes / k ** i).toFixed(Math.max(0, decimals)))} ${sizes[i]}`;
}

export function formatUptime(createdIso: string): string {
  const created = new Date(createdIso).getTime();
  if (Number.isNaN(created)) return 'unbekannt';

  const diffSec = Math.floor((Date.now() - created) / 1000);
  if (diffSec < 0) return 'gerade eben';
  if (diffSec < 60) return `vor ${diffSec} s`;
  if (diffSec < 3600) return `vor ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `vor ${Math.floor(diffSec / 3600)} h`;
  return `vor ${Math.floor(diffSec / 86400)} d`;
}

export function getStatusColorClass(status: ContainerItem['status']): {
  badgeBg: string;
  badgeText: string;
  dotBg: string;
} {
  switch (status) {
    case 'running':
      return {
        badgeBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
        badgeText: 'Running',
        dotBg: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
      };
    case 'exited':
      return {
        badgeBg: 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400',
        badgeText: 'Exited',
        dotBg: 'bg-zinc-500',
      };
    case 'error':
      return {
        badgeBg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
        badgeText: 'Error',
        dotBg: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]',
      };
    case 'paused':
      return {
        badgeBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
        badgeText: 'Paused',
        dotBg: 'bg-amber-500',
      };
    case 'restarting':
      return {
        badgeBg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
        badgeText: 'Restarting',
        dotBg: 'bg-cyan-500 animate-pulse',
      };
  }
}
