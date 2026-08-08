import {
  ContainerItem,
  DockerImage,
  DockerVolume,
  DockerNetwork,
  DockerSystemEvent,
  ContainerLogEntry
} from '../types';

export const INITIAL_CONTAINERS: ContainerItem[] = [
  {
    id: 'c8f1920a41d9e23b49081a2f1110001a',
    shortId: 'c8f1920a41d9',
    name: 'postgres-prod-db',
    image: 'postgres:16-alpine',
    status: 'running',
    statusText: 'Up 4 hours (healthy)',
    created: '2026-08-08T00:15:00Z',
    composeProject: 'e-commerce-stack',
    composeService: 'database',
    command: 'docker-entrypoint.sh postgres -c max_connections=200',
    restartCount: 0,
    ports: [
      { hostIp: '0.0.0.0', hostPort: 5432, containerPort: 5432, protocol: 'tcp' }
    ],
    env: {
      POSTGRES_DB: 'shop_production',
      POSTGRES_USER: 'shopadmin',
      POSTGRES_PASSWORD: '••••••••••••',
      PGDATA: '/var/lib/postgresql/data/pgdata',
      MAX_CONNECTIONS: '200'
    },
    mounts: [
      { type: 'volume', source: 'pgdata_shop_prod', destination: '/var/lib/postgresql/data', mode: 'rw' }
    ],
    networks: [
      { networkName: 'e-commerce-net', ipAddress: '172.20.0.2', gateway: '172.20.0.1', macAddress: '02:42:ac:14:00:02' }
    ],
    stats: {
      cpuPercent: 2.4,
      memoryUsageMB: 184.5,
      memoryLimitMB: 4096,
      memoryPercent: 4.5,
      networkRxKB: 1420,
      networkTxKB: 2890,
      cpuHistory: [1.2, 1.8, 2.1, 2.0, 2.4, 3.1, 2.8, 2.2, 1.9, 2.4, 2.6, 2.3, 2.4, 2.1, 2.4],
      memoryHistory: [180, 181, 182, 182, 183, 184, 184, 184.5, 184.5, 184.5, 184.5, 184.5, 184.5, 184.5, 184.5]
    }
  },
  {
    id: 'a9b2831c52e0f34c50192b3a2220002b',
    shortId: 'a9b2831c52e0',
    name: 'postgres-dev-legacy',
    image: 'postgres:14-alpine',
    status: 'running',
    statusText: 'Up 1 hour',
    created: '2026-08-08T03:30:00Z',
    composeProject: 'legacy-analytics',
    composeService: 'postgres-old',
    command: 'docker-entrypoint.sh postgres',
    restartCount: 0,
    ports: [
      { hostIp: '0.0.0.0', hostPort: 5432, containerPort: 5432, protocol: 'tcp' } // CONFLICT!
    ],
    env: {
      POSTGRES_DB: 'analytics_dev',
      POSTGRES_USER: 'devuser',
      POSTGRES_PASSWORD: '••••••••••••'
    },
    mounts: [
      { type: 'bind', source: '/home/dev/data/postgres_legacy', destination: '/var/lib/postgresql/data', mode: 'rw' }
    ],
    networks: [
      { networkName: 'bridge', ipAddress: '172.17.0.4', gateway: '172.17.0.1', macAddress: '02:42:ac:11:00:04' }
    ],
    stats: {
      cpuPercent: 0.8,
      memoryUsageMB: 112.0,
      memoryLimitMB: 4096,
      memoryPercent: 2.7,
      networkRxKB: 320,
      networkTxKB: 410,
      cpuHistory: [0.5, 0.6, 0.7, 0.8, 0.8, 0.9, 0.8, 0.7, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8],
      memoryHistory: [110, 111, 112, 112, 112, 112, 112, 112, 112, 112, 112, 112, 112, 112, 112]
    }
  },
  {
    id: 'f3e4561a78b9c01d23456e7f3330003c',
    shortId: 'f3e4561a78b9',
    name: 'redis-cache-store',
    image: 'redis:7.2-alpine',
    status: 'running',
    statusText: 'Up 5 hours',
    created: '2026-08-07T22:10:00Z',
    composeProject: 'e-commerce-stack',
    composeService: 'redis',
    command: 'redis-server --save 60 1 --loglevel notice',
    restartCount: 0,
    ports: [
      { hostIp: '127.0.0.1', hostPort: 6379, containerPort: 6379, protocol: 'tcp' }
    ],
    env: {
      ALLOW_EMPTY_PASSWORD: 'yes'
    },
    mounts: [
      { type: 'volume', source: 'redis_cache_data', destination: '/data', mode: 'rw' }
    ],
    networks: [
      { networkName: 'e-commerce-net', ipAddress: '172.20.0.3', gateway: '172.20.0.1', macAddress: '02:42:ac:14:00:03' }
    ],
    stats: {
      cpuPercent: 0.3,
      memoryUsageMB: 34.2,
      memoryLimitMB: 2048,
      memoryPercent: 1.6,
      networkRxKB: 8900,
      networkTxKB: 12400,
      cpuHistory: [0.2, 0.3, 0.4, 0.3, 0.2, 0.5, 0.3, 0.3, 0.3, 0.3, 0.4, 0.3, 0.3, 0.2, 0.3],
      memoryHistory: [32, 33, 33, 34, 34, 34.2, 34.2, 34.2, 34.2, 34.2, 34.2, 34.2, 34.2, 34.2, 34.2]
    }
  },
  {
    id: 'd1e2f3a4b5c6d7e8f9a0b1c24440004d',
    shortId: 'd1e2f3a4b5c6',
    name: 'web-frontend-app',
    image: 'node:20-alpine',
    status: 'running',
    statusText: 'Up 3 hours',
    created: '2026-08-08T01:00:00Z',
    composeProject: 'e-commerce-stack',
    composeService: 'frontend',
    command: 'npm run start -- --host 0.0.0.0',
    restartCount: 0,
    ports: [
      { hostIp: '0.0.0.0', hostPort: 3000, containerPort: 3000, protocol: 'tcp' }
    ],
    env: {
      NODE_ENV: 'production',
      PORT: '3000',
      API_URL: 'http://api-gateway:8080/api/v1'
    },
    mounts: [
      { type: 'bind', source: '/var/www/shop-frontend', destination: '/app', mode: 'ro' }
    ],
    networks: [
      { networkName: 'e-commerce-net', ipAddress: '172.20.0.4', gateway: '172.20.0.1', macAddress: '02:42:ac:14:00:04' }
    ],
    stats: {
      cpuPercent: 4.1,
      memoryUsageMB: 215.8,
      memoryLimitMB: 2048,
      memoryPercent: 10.5,
      networkRxKB: 45000,
      networkTxKB: 68000,
      cpuHistory: [3.5, 4.0, 5.2, 4.1, 3.9, 4.8, 4.1, 4.0, 3.8, 4.5, 4.1, 4.2, 4.0, 4.1, 4.1],
      memoryHistory: [210, 212, 214, 215, 215, 215.8, 215.8, 215.8, 215.8, 215.8, 215.8, 215.8, 215.8, 215.8, 215.8]
    }
  },
  {
    id: 'e2f3a4b5c6d7e8f9a0b1c2d35550005e',
    shortId: 'e2f3a4b5c6d7',
    name: 'grafana-metrics',
    image: 'grafana/grafana:10.2.0',
    status: 'running',
    statusText: 'Up 2 hours',
    created: '2026-08-08T02:00:00Z',
    composeProject: 'monitoring-suite',
    composeService: 'grafana',
    command: '/run.sh',
    restartCount: 0,
    ports: [
      { hostIp: '0.0.0.0', hostPort: 3000, containerPort: 3000, protocol: 'tcp' } // CONFLICT!
    ],
    env: {
      GF_SECURITY_ADMIN_PASSWORD: '••••••••••••',
      GF_USERS_ALLOW_SIGN_UP: 'false'
    },
    mounts: [
      { type: 'volume', source: 'grafana_storage', destination: '/var/lib/grafana', mode: 'rw' }
    ],
    networks: [
      { networkName: 'monitoring-net', ipAddress: '172.25.0.2', gateway: '172.25.0.1', macAddress: '02:42:ac:19:00:02' }
    ],
    stats: {
      cpuPercent: 1.1,
      memoryUsageMB: 148.2,
      memoryLimitMB: 2048,
      memoryPercent: 7.2,
      networkRxKB: 1820,
      networkTxKB: 2450,
      cpuHistory: [1.0, 1.2, 1.1, 1.3, 1.1, 1.0, 1.1, 1.2, 1.1, 1.1, 1.1, 1.2, 1.1, 1.1, 1.1],
      memoryHistory: [145, 146, 147, 148, 148, 148.2, 148.2, 148.2, 148.2, 148.2, 148.2, 148.2, 148.2, 148.2, 148.2]
    }
  },
  {
    id: 'b7c8d9e0f1a2b3c4d5e6f7a86660006f',
    shortId: 'b7c8d9e0f1a2',
    name: 'ollama-ai-service',
    image: 'ollama/ollama:latest',
    status: 'running',
    statusText: 'Up 6 hours',
    created: '2026-08-07T21:00:00Z',
    composeProject: 'ai-services',
    composeService: 'ollama',
    command: 'ollama serve',
    restartCount: 0,
    ports: [
      { hostIp: '127.0.0.1', hostPort: 11434, containerPort: 11434, protocol: 'tcp' }
    ],
    env: {
      OLLAMA_MODELS: '/root/.ollama/models',
      OLLAMA_KEEP_ALIVE: '24h',
      OLLAMA_NUM_PARALLEL: '4'
    },
    mounts: [
      { type: 'volume', source: 'ollama_models_vol', destination: '/root/.ollama', mode: 'rw' }
    ],
    networks: [
      { networkName: 'bridge', ipAddress: '172.17.0.5', gateway: '172.17.0.1', macAddress: '02:42:ac:11:00:05' }
    ],
    stats: {
      cpuPercent: 12.8,
      memoryUsageMB: 1890.0,
      memoryLimitMB: 16384,
      memoryPercent: 11.5,
      networkRxKB: 142000,
      networkTxKB: 389000,
      cpuHistory: [8.5, 12.1, 15.4, 18.2, 14.1, 11.2, 12.8, 13.5, 12.0, 11.8, 12.8, 13.0, 12.5, 12.8, 12.8],
      memoryHistory: [1800, 1820, 1850, 1880, 1890, 1890, 1890, 1890, 1890, 1890, 1890, 1890, 1890, 1890, 1890]
    }
  },
  {
    id: 'f8e7d6c5b4a3f2e1d0c9b8a7770007a',
    shortId: 'f8e7d6c5b4a3',
    name: 'traefik-proxy',
    image: 'traefik:v3.0',
    status: 'running',
    statusText: 'Up 12 hours',
    created: '2026-08-07T15:00:00Z',
    composeProject: 'infra',
    composeService: 'reverse-proxy',
    command: 'traefik --api.insecure=true --providers.docker=true',
    restartCount: 0,
    ports: [
      { hostIp: '0.0.0.0', hostPort: 80, containerPort: 80, protocol: 'tcp' },
      { hostIp: '0.0.0.0', hostPort: 443, containerPort: 443, protocol: 'tcp' },
      { hostIp: '0.0.0.0', hostPort: 8080, containerPort: 8080, protocol: 'tcp' }
    ],
    env: {
      TRAEFIK_GLOBAL_SENDANONYMOUSUSAGE: 'false'
    },
    mounts: [
      { type: 'bind', source: '/var/run/docker.sock', destination: '/var/run/docker.sock', mode: 'ro' }
    ],
    networks: [
      { networkName: 'e-commerce-net', ipAddress: '172.20.0.5', gateway: '172.20.0.1', macAddress: '02:42:ac:14:00:05' },
      { networkName: 'monitoring-net', ipAddress: '172.25.0.3', gateway: '172.25.0.1', macAddress: '02:42:ac:19:00:03' }
    ],
    stats: {
      cpuPercent: 1.8,
      memoryUsageMB: 62.4,
      memoryLimitMB: 1024,
      memoryPercent: 6.1,
      networkRxKB: 98000,
      networkTxKB: 142000,
      cpuHistory: [1.5, 1.8, 2.0, 1.7, 1.8, 1.9, 1.8, 1.8, 1.7, 1.8, 1.8, 1.8, 1.8, 1.8, 1.8],
      memoryHistory: [60, 61, 62, 62.4, 62.4, 62.4, 62.4, 62.4, 62.4, 62.4, 62.4, 62.4, 62.4, 62.4, 62.4]
    }
  },
  {
    id: 'c1d2e3f4a5b6c7d8e9f0a1b28880008b',
    shortId: 'c1d2e3f4a5b6',
    name: 'payment-sync-worker',
    image: 'python:3.11-slim',
    status: 'error',
    statusText: 'Exited (1) 4 minutes ago',
    created: '2026-08-08T02:45:00Z',
    composeProject: 'e-commerce-stack',
    composeService: 'worker',
    command: 'python -m worker.tasks --queue=payments',
    restartCount: 5,
    exitCode: 1,
    ports: [],
    env: {
      STRIPE_SECRET_KEY: '••••••••••••',
      RABBITMQ_URL: 'amqp://guest:guest@rabbitmq:5672/'
    },
    mounts: [],
    networks: [
      { networkName: 'e-commerce-net', ipAddress: '172.20.0.6', gateway: '172.20.0.1', macAddress: '02:42:ac:14:00:06' }
    ],
    stats: {
      cpuPercent: 0,
      memoryUsageMB: 0,
      memoryLimitMB: 1024,
      memoryPercent: 0,
      networkRxKB: 0,
      networkTxKB: 0,
      cpuHistory: Array(15).fill(0),
      memoryHistory: Array(15).fill(0)
    }
  },
  {
    id: 'a0b1c2d3e4f5a6b7c8d9e0f19990009c',
    shortId: 'a0b1c2d3e4f5',
    name: 'meilisearch-db',
    image: 'getmeili/meilisearch:v1.6',
    status: 'exited',
    statusText: 'Exited (0) 2 hours ago',
    created: '2026-08-07T18:00:00Z',
    composeProject: 'e-commerce-stack',
    composeService: 'search',
    command: 'meilisearch --env=production',
    restartCount: 0,
    exitCode: 0,
    ports: [
      { hostIp: '127.0.0.1', hostPort: 7700, containerPort: 7700, protocol: 'tcp' }
    ],
    env: {
      MEILI_ENV: 'production',
      MEILI_MASTER_KEY: '••••••••••••'
    },
    mounts: [
      { type: 'volume', source: 'meili_data', destination: '/meili_data', mode: 'rw' }
    ],
    networks: [
      { networkName: 'e-commerce-net', ipAddress: '172.20.0.7', gateway: '172.20.0.1', macAddress: '02:42:ac:14:00:07' }
    ],
    stats: {
      cpuPercent: 0,
      memoryUsageMB: 0,
      memoryLimitMB: 2048,
      memoryPercent: 0,
      networkRxKB: 0,
      networkTxKB: 0,
      cpuHistory: Array(15).fill(0),
      memoryHistory: Array(15).fill(0)
    }
  }
];

export const INITIAL_IMAGES: DockerImage[] = [
  {
    id: 'sha256:d82348a12903f8a91203',
    shortId: 'd82348a12903',
    repository: 'postgres',
    tag: '16-alpine',
    sizeBytes: 242000000, // 242 MB
    created: '2026-07-28T10:00:00Z',
    inUse: true,
    containerCount: 1,
    dangling: false
  },
  {
    id: 'sha256:f1209384102938401923',
    shortId: 'f12093841029',
    repository: 'postgres',
    tag: '14-alpine',
    sizeBytes: 218000000,
    created: '2026-06-15T08:00:00Z',
    inUse: true,
    containerCount: 1,
    dangling: false
  },
  {
    id: 'sha256:a9182301928301928301',
    shortId: 'a91823019283',
    repository: 'redis',
    tag: '7.2-alpine',
    sizeBytes: 38500000, // 38.5 MB
    created: '2026-08-01T14:30:00Z',
    inUse: true,
    containerCount: 1,
    dangling: false
  },
  {
    id: 'sha256:e9018230918230918230',
    shortId: 'e90182309182',
    repository: 'node',
    tag: '20-alpine',
    sizeBytes: 178000000,
    created: '2026-08-02T11:20:00Z',
    inUse: true,
    containerCount: 1,
    dangling: false
  },
  {
    id: 'sha256:b1293801928301928301',
    shortId: 'b12938019283',
    repository: 'grafana/grafana',
    tag: '10.2.0',
    sizeBytes: 412000000,
    created: '2026-07-10T16:00:00Z',
    inUse: true,
    containerCount: 1,
    dangling: false
  },
  {
    id: 'sha256:c0918230918230918230',
    shortId: 'c09182309182',
    repository: 'ollama/ollama',
    tag: 'latest',
    sizeBytes: 2100000000, // 2.1 GB
    created: '2026-08-05T19:00:00Z',
    inUse: true,
    containerCount: 1,
    dangling: false
  },
  {
    id: 'sha256:d9182309182309182301',
    shortId: 'd91823091823',
    repository: 'traefik',
    tag: 'v3.0',
    sizeBytes: 115000000,
    created: '2026-07-20T09:00:00Z',
    inUse: true,
    containerCount: 1,
    dangling: false
  },
  {
    id: 'sha256:e1029381029381029381',
    shortId: 'e10293810293',
    repository: 'python',
    tag: '3.11-slim',
    sizeBytes: 145000000,
    created: '2026-07-18T12:00:00Z',
    inUse: true,
    containerCount: 1,
    dangling: false
  },
  {
    id: 'sha256:f1029381029381029382',
    shortId: 'f10293810293',
    repository: 'getmeili/meilisearch',
    tag: 'v1.6',
    sizeBytes: 165000000,
    created: '2026-06-25T15:00:00Z',
    inUse: false,
    containerCount: 0,
    dangling: false
  },
  {
    id: 'sha256:01029381029381029383',
    shortId: '010293810293',
    repository: '<none>',
    tag: '<none>',
    sizeBytes: 890000000, // 890 MB dangling
    created: '2026-05-12T08:00:00Z',
    inUse: false,
    containerCount: 0,
    dangling: true
  },
  {
    id: 'sha256:11029381029381029384',
    shortId: '110293810293',
    repository: 'ubuntu',
    tag: '22.04',
    sizeBytes: 77800000, // 77.8 MB unused
    created: '2026-04-01T10:00:00Z',
    inUse: false,
    containerCount: 0,
    dangling: false
  }
];

export const INITIAL_VOLUMES: DockerVolume[] = [
  {
    name: 'pgdata_shop_prod',
    driver: 'local',
    scope: 'local',
    mountpoint: '/var/lib/docker/volumes/pgdata_shop_prod/_data',
    created: '2026-08-08T00:15:00Z',
    sizeBytes: 1420000000, // 1.42 GB
    inUse: true,
    attachedContainers: ['postgres-prod-db']
  },
  {
    name: 'redis_cache_data',
    driver: 'local',
    scope: 'local',
    mountpoint: '/var/lib/docker/volumes/redis_cache_data/_data',
    created: '2026-08-07T22:10:00Z',
    sizeBytes: 84000000, // 84 MB
    inUse: true,
    attachedContainers: ['redis-cache-store']
  },
  {
    name: 'ollama_models_vol',
    driver: 'local',
    scope: 'local',
    mountpoint: '/var/lib/docker/volumes/ollama_models_vol/_data',
    created: '2026-08-07T21:00:00Z',
    sizeBytes: 4850000000, // 4.85 GB
    inUse: true,
    attachedContainers: ['ollama-ai-service']
  },
  {
    name: 'grafana_storage',
    driver: 'local',
    scope: 'local',
    mountpoint: '/var/lib/docker/volumes/grafana_storage/_data',
    created: '2026-08-08T02:00:00Z',
    sizeBytes: 12000000, // 12 MB
    inUse: true,
    attachedContainers: ['grafana-metrics']
  },
  {
    name: 'meili_data',
    driver: 'local',
    scope: 'local',
    mountpoint: '/var/lib/docker/volumes/meili_data/_data',
    created: '2026-08-07T18:00:00Z',
    sizeBytes: 310000000, // 310 MB
    inUse: false,
    attachedContainers: []
  },
  {
    name: 'dangling_db_backup_old',
    driver: 'local',
    scope: 'local',
    mountpoint: '/var/lib/docker/volumes/dangling_db_backup_old/_data',
    created: '2026-05-10T14:00:00Z',
    sizeBytes: 1890000000, // 1.89 GB reclaimable!
    inUse: false,
    attachedContainers: []
  }
];

export const INITIAL_NETWORKS: DockerNetwork[] = [
  {
    id: 'net_bridge_01',
    name: 'bridge',
    driver: 'bridge',
    scope: 'local',
    subnet: '172.17.0.0/16',
    gateway: '172.17.0.1',
    internal: false,
    inUse: true,
    containers: [
      { containerId: 'a9b2831c52e0', containerName: 'postgres-dev-legacy', ipv4: '172.17.0.4' },
      { containerId: 'b7c8d9e0f1a2', containerName: 'ollama-ai-service', ipv4: '172.17.0.5' }
    ]
  },
  {
    id: 'net_ecommerce_02',
    name: 'e-commerce-net',
    driver: 'bridge',
    scope: 'local',
    subnet: '172.20.0.0/16',
    gateway: '172.20.0.1',
    internal: false,
    inUse: true,
    containers: [
      { containerId: 'c8f1920a41d9', containerName: 'postgres-prod-db', ipv4: '172.20.0.2' },
      { containerId: 'f3e4561a78b9', containerName: 'redis-cache-store', ipv4: '172.20.0.3' },
      { containerId: 'd1e2f3a4b5c6', containerName: 'web-frontend-app', ipv4: '172.20.0.4' },
      { containerId: 'f8e7d6c5b4a3', containerName: 'traefik-proxy', ipv4: '172.20.0.5' },
      { containerId: 'c1d2e3f4a5b6', containerName: 'payment-sync-worker', ipv4: '172.20.0.6' },
      { containerId: 'a0b1c2d3e4f5', containerName: 'meilisearch-db', ipv4: '172.20.0.7' }
    ]
  },
  {
    id: 'net_monitoring_03',
    name: 'monitoring-net',
    driver: 'bridge',
    scope: 'local',
    subnet: '172.25.0.0/16',
    gateway: '172.25.0.1',
    internal: false,
    inUse: true,
    containers: [
      { containerId: 'e2f3a4b5c6d7', containerName: 'grafana-metrics', ipv4: '172.25.0.2' },
      { containerId: 'f8e7d6c5b4a3', containerName: 'traefik-proxy', ipv4: '172.25.0.3' }
    ]
  },
  {
    id: 'net_unused_04',
    name: 'old_testing_network',
    driver: 'bridge',
    scope: 'local',
    subnet: '172.29.0.0/16',
    gateway: '172.29.0.1',
    internal: true,
    inUse: false,
    containers: []
  }
];

export const GENERATE_INITIAL_LOGS = (containerName: string): ContainerLogEntry[] => {
  const now = new Date();
  const timeStr = (offsetSec: number) => new Date(now.getTime() - offsetSec * 1000).toISOString();

  if (containerName.includes('postgres')) {
    return [
      { id: '1', timestamp: timeStr(300), stream: 'stdout', level: 'info', message: 'PostgreSQL Database directory appears to contain a database; Skipping initialization' },
      { id: '2', timestamp: timeStr(298), stream: 'stdout', level: 'info', message: '2026-08-08 00:15:01.120 UTC [1] LOG: starting PostgreSQL 16.2 on x86_64-pc-linux-musl' },
      { id: '3', timestamp: timeStr(295), stream: 'stdout', level: 'info', message: '2026-08-08 00:15:01.121 UTC [1] LOG: listening on IPv4 address "0.0.0.0", port 5432' },
      { id: '4', timestamp: timeStr(290), stream: 'stdout', level: 'info', message: '2026-08-08 00:15:01.125 UTC [1] LOG: database system is ready to accept connections' },
      { id: '5', timestamp: timeStr(120), stream: 'stdout', level: 'info', message: '2026-08-08 03:10:45.882 UTC [42] LOG: statement: SELECT count(*) FROM orders WHERE status = \'PAID\'' },
      { id: '6', timestamp: timeStr(45), stream: 'stdout', level: 'info', message: '2026-08-08 03:12:01.004 UTC [88] LOG: checkpoint starting: time' },
      { id: '7', timestamp: timeStr(10), stream: 'stdout', level: 'info', message: '2026-08-08 03:12:35.410 UTC [88] LOG: checkpoint complete: wrote 142 buffers (1.2%); 0 WAL file(s) added' }
    ];
  }

  if (containerName.includes('payment')) {
    return [
      { id: '1', timestamp: timeStr(300), stream: 'stdout', level: 'info', message: 'Starting payment-sync-worker daemon v2.4.1...' },
      { id: '2', timestamp: timeStr(295), stream: 'stdout', level: 'info', message: 'Connecting to RabbitMQ broker amqp://guest:guest@rabbitmq:5672/' },
      { id: '3', timestamp: timeStr(290), stream: 'stderr', level: 'error', message: 'ERROR: pika.exceptions.AMQPConnectionError: Could not connect to host rabbitmq:5672' },
      { id: '4', timestamp: timeStr(280), stream: 'stderr', level: 'warn', message: 'Retrying connection in 5.0 seconds (attempt 1/5)...' },
      { id: '5', timestamp: timeStr(275), stream: 'stderr', level: 'error', message: 'ERROR: pika.exceptions.AMQPConnectionError: Could not connect to host rabbitmq:5672' },
      { id: '6', timestamp: timeStr(240), stream: 'stderr', level: 'error', message: 'CRITICAL: Max retry attempts reached. Worker crashing.' },
      { id: '7', timestamp: timeStr(240), stream: 'stderr', level: 'error', message: 'Traceback (most recent call last):\n  File "worker/tasks.py", line 42, in <module>\n    main()\nConnectionError: Failed to reach queue broker.' }
    ];
  }

  if (containerName.includes('node') || containerName.includes('web')) {
    return [
      { id: '1', timestamp: timeStr(300), stream: 'stdout', level: 'info', message: '> shop-frontend@1.0.0 start' },
      { id: '2', timestamp: timeStr(298), stream: 'stdout', level: 'info', message: '> node server.js --host 0.0.0.0 --port 3000' },
      { id: '3', timestamp: timeStr(290), stream: 'stdout', level: 'info', message: '[Server] Ready on http://0.0.0.0:3000' },
      { id: '4', timestamp: timeStr(150), stream: 'stdout', level: 'info', message: 'GET /api/health 200 1.2ms' },
      { id: '5', timestamp: timeStr(80), stream: 'stdout', level: 'info', message: 'GET /checkout/success?session_id=cs_test_123 200 14.5ms' },
      { id: '6', timestamp: timeStr(12), stream: 'stdout', level: 'info', message: 'POST /api/cart/add 200 8.2ms - 1420 bytes' }
    ];
  }

  return [
    { id: '1', timestamp: timeStr(300), stream: 'stdout', level: 'info', message: `[${containerName}] Container initialized successfully` },
    { id: '2', timestamp: timeStr(280), stream: 'stdout', level: 'info', message: `[${containerName}] Server listening on assigned interfaces` },
    { id: '3', timestamp: timeStr(100), stream: 'stdout', level: 'info', message: `[${containerName}] Health probe OK (200 OK)` }
  ];
};
