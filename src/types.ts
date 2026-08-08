export type ContainerStatus = 'running' | 'exited' | 'error' | 'paused' | 'restarting';

export interface PortMapping {
  hostIp: string;
  hostPort: number;
  containerPort: number;
  protocol: 'tcp' | 'udp';
}

export interface VolumeMount {
  type: 'bind' | 'volume';
  source: string;
  destination: string;
  mode: 'ro' | 'rw';
}

export interface ContainerNetwork {
  networkName: string;
  ipAddress: string;
  gateway: string;
  macAddress: string;
}

export interface ContainerStats {
  cpuPercent: number; // 0 - 100%
  memoryUsageMB: number;
  memoryLimitMB: number;
  memoryPercent: number;
  networkRxKB: number;
  networkTxKB: number;
  cpuHistory: number[]; // last 15 ticks
  memoryHistory: number[];
}

export interface ContainerLogEntry {
  id: string;
  timestamp: string;
  stream: 'stdout' | 'stderr';
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

export interface ContainerItem {
  id: string;
  shortId: string;
  name: string;
  image: string;
  status: ContainerStatus;
  statusText: string;
  created: string;
  composeProject?: string;
  composeService?: string;
  ports: PortMapping[];
  env: Record<string, string>;
  mounts: VolumeMount[];
  networks: ContainerNetwork[];
  stats: ContainerStats;
  command: string;
  restartCount: number;
  exitCode?: number;
}

export interface DockerImage {
  id: string;
  shortId: string;
  repository: string;
  tag: string;
  sizeBytes: number;
  created: string;
  inUse: boolean;
  containerCount: number;
  dangling: boolean;
}

export interface DockerVolume {
  name: string;
  driver: string;
  scope: string;
  mountpoint: string;
  created: string;
  sizeBytes: number;
  inUse: boolean;
  attachedContainers: string[]; // container names
}

export interface DockerNetwork {
  id: string;
  name: string;
  driver: 'bridge' | 'host' | 'overlay' | 'macvlan' | 'none';
  scope: 'local' | 'swarm';
  subnet: string;
  gateway: string;
  containers: { containerId: string; containerName: string; ipv4: string }[];
  internal: boolean;
  inUse: boolean;
}

export interface PortCollision {
  port: number;
  protocol: 'tcp' | 'udp';
  containers: {
    id: string;
    name: string;
    composeProject?: string;
    hostIp: string;
    status: ContainerStatus;
  }[];
  severity: 'critical' | 'warning';
  description: string;
}

export interface DockerSystemEvent {
  id: string;
  timestamp: string;
  type: 'container' | 'image' | 'volume' | 'network';
  action: string; // e.g. 'start', 'die', 'create', 'prune'
  actorName: string;
  details: string;
}

export type ActiveTab = 'containers' | 'ports' | 'images' | 'volumes' | 'networks' | 'events';
