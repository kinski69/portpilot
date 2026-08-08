import { ContainerItem, PortCollision } from '../types';

/**
 * Scans all running or created containers to detect host port conflicts.
 * E.g., when two containers map to the same hostPort (e.g. 5432 or 3000).
 */
export function detectPortCollisions(containers: ContainerItem[]): PortCollision[] {
  const portMap: Record<string, ContainerItem[]> = {};

  containers.forEach((container) => {
    container.ports.forEach((p) => {
      // Keyed by port and protocol
      const key = `${p.hostPort}/${p.protocol}`;
      if (!portMap[key]) {
        portMap[key] = [];
      }
      portMap[key].push(container);
    });
  });

  const collisions: PortCollision[] = [];

  Object.entries(portMap).forEach(([key, items]) => {
    if (items.length > 1) {
      const [portStr, protoStr] = key.split('/');
      const port = parseInt(portStr, 10);
      const protocol = protoStr as 'tcp' | 'udp';

      const projectNames = items.map(i => i.composeProject || i.name).join(', ');

      collisions.push({
        port,
        protocol,
        containers: items.map(i => {
          const matchPort = i.ports.find(p => p.hostPort === port);
          return {
            id: i.id,
            name: i.name,
            composeProject: i.composeProject,
            hostIp: matchPort?.hostIp || '0.0.0.0',
            status: i.status,
          };
        }),
        severity: 'critical',
        description: `Host port ${port}/${protocol} is bound by multiple containers (${projectNames}). Traffic will collide or bind fail!`
      });
    }
  });

  return collisions.sort((a, b) => a.port - b.port);
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatUptime(createdIso: string): string {
  const created = new Date(createdIso);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - created.getTime()) / 1000);

  if (diffSec < 60) return `${diffSec} seconds ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
  return `${Math.floor(diffSec / 86400)} days ago`;
}

export function getStatusColorClass(status: ContainerItem['status']): {
  badgeBg: string;
  badgeText: string;
  dotBg: string;
} {
  switch (status) {
    case 'running':
      return { badgeBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', badgeText: 'Running', dotBg: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' };
    case 'exited':
      return { badgeBg: 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400', badgeText: 'Exited', dotBg: 'bg-zinc-500' };
    case 'error':
      return { badgeBg: 'bg-rose-500/10 border-rose-500/20 text-rose-400', badgeText: 'Error', dotBg: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' };
    case 'paused':
      return { badgeBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400', badgeText: 'Paused', dotBg: 'bg-amber-500' };
    case 'restarting':
      return { badgeBg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400', badgeText: 'Restarting', dotBg: 'bg-cyan-500 animate-pulse' };
  }
}
