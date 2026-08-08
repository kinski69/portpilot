/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ActiveTab,
  ContainerItem,
  DockerImage,
  DockerVolume,
  DockerNetwork,
  DockerSystemEvent
} from './types';
import {
  INITIAL_CONTAINERS,
  INITIAL_IMAGES,
  INITIAL_VOLUMES,
  INITIAL_NETWORKS
} from './data/mockDocker';
import { detectPortCollisions } from './utils/dockerUtils';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ContainersList } from './components/ContainersList';
import { PortOverview } from './components/PortOverview';
import { ContainerDetailModal } from './components/ContainerDetailModal';
import { ImagesView } from './components/ImagesView';
import { VolumesView } from './components/VolumesView';
import { NetworksView } from './components/NetworksView';
import { EventsLogView } from './components/EventsLogView';
import { CreateContainerModal } from './components/CreateContainerModal';
import { TauriArchitectureModal } from './components/TauriArchitectureModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('containers');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);

  // Core Data Collections
  const [containers, setContainers] = useState<ContainerItem[]>(INITIAL_CONTAINERS);
  const [images, setImages] = useState<DockerImage[]>(INITIAL_IMAGES);
  const [volumes, setVolumes] = useState<DockerVolume[]>(INITIAL_VOLUMES);
  const [networks, setNetworks] = useState<DockerNetwork[]>(INITIAL_NETWORKS);
  const [events, setEvents] = useState<DockerSystemEvent[]>([
    {
      id: 'ev-1',
      timestamp: new Date().toISOString(),
      type: 'container',
      action: 'start',
      actorName: 'postgres-prod-db',
      details: 'Container started with image postgres:16-alpine'
    },
    {
      id: 'ev-2',
      timestamp: new Date(Date.now() - 120000).toISOString(),
      type: 'container',
      action: 'die',
      actorName: 'payment-sync-worker',
      details: 'Container exited with code 1'
    }
  ]);

  // Selected container modal
  const [selectedContainer, setSelectedContainer] = useState<ContainerItem | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<'logs' | 'stats' | 'env' | 'mounts' | 'networks' | 'exec'>('logs');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showArchModal, setShowArchModal] = useState(false);

  // Detect port collisions live
  const collisions = detectPortCollisions(containers.filter(c => c.status === 'running' || c.status === 'restarting'));

  // Helper to add system event
  const emitEvent = (type: DockerSystemEvent['type'], action: string, actorName: string, details: string) => {
    const newEv: DockerSystemEvent = {
      id: `ev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      type,
      action,
      actorName,
      details
    };
    setEvents(prev => [newEv, ...prev.slice(0, 99)]);
  };

  // Real-time metrics tick for running containers
  useEffect(() => {
    if (!isLiveStreaming) return;

    const interval = setInterval(() => {
      setContainers(prevContainers =>
        prevContainers.map(c => {
          if (c.status !== 'running') return c;

          // Vary CPU and RAM slightly for dynamic visual sparklines
          const cpuDelta = (Math.random() - 0.48) * 0.8;
          const newCpu = Math.max(0.1, Math.min(99, +(c.stats.cpuPercent + cpuDelta).toFixed(1)));

          const ramDelta = (Math.random() - 0.45) * 1.5;
          const newRam = Math.max(10, +(c.stats.memoryUsageMB + ramDelta).toFixed(1));

          const updatedCpuHistory = [...c.stats.cpuHistory.slice(1), newCpu];
          const updatedRamHistory = [...c.stats.memoryHistory.slice(1), newRam];

          return {
            ...c,
            stats: {
              ...c.stats,
              cpuPercent: newCpu,
              memoryUsageMB: newRam,
              memoryPercent: +((newRam / c.stats.memoryLimitMB) * 100).toFixed(1),
              cpuHistory: updatedCpuHistory,
              memoryHistory: updatedRamHistory
            }
          };
        })
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [isLiveStreaming]);

  // Container Actions
  const handleStartContainer = (id: string) => {
    setContainers(prev =>
      prev.map(c => {
        if (c.id === id) {
          emitEvent('container', 'start', c.name, `Started container ${c.shortId}`);
          return {
            ...c,
            status: 'running',
            statusText: 'Up less than a minute',
            exitCode: undefined
          };
        }
        return c;
      })
    );
  };

  const handleStopContainer = (id: string) => {
    setContainers(prev =>
      prev.map(c => {
        if (c.id === id) {
          emitEvent('container', 'stop', c.name, `Stopped container ${c.shortId}`);
          return {
            ...c,
            status: 'exited',
            statusText: 'Exited (0) just now',
            stats: {
              ...c.stats,
              cpuPercent: 0,
              memoryUsageMB: 0,
              cpuHistory: Array(15).fill(0),
              memoryHistory: Array(15).fill(0)
            }
          };
        }
        return c;
      })
    );
  };

  const handleRestartContainer = (id: string) => {
    setContainers(prev =>
      prev.map(c => {
        if (c.id === id) {
          emitEvent('container', 'restart', c.name, `Restarted container ${c.shortId}`);
          return {
            ...c,
            status: 'restarting',
            statusText: 'Restarting...'
          };
        }
        return c;
      })
    );

    setTimeout(() => {
      setContainers(prev =>
        prev.map(c => {
          if (c.id === id) {
            return {
              ...c,
              status: 'running',
              statusText: 'Up less than a minute'
            };
          }
          return c;
        })
      );
    }, 1500);
  };

  const handleRemoveContainer = (id: string) => {
    const target = containers.find(c => c.id === id);
    if (target) {
      emitEvent('container', 'remove', target.name, `Removed container ${target.shortId}`);
    }
    setContainers(prev => prev.filter(c => c.id !== id));
    if (selectedContainer?.id === id) {
      setSelectedContainer(null);
    }
  };

  // Remap host port
  const handleRemapPort = (containerId: string, oldPort: number, newPort: number) => {
    setContainers(prev =>
      prev.map(c => {
        if (c.id === containerId) {
          const updatedPorts = c.ports.map(p => {
            if (p.hostPort === oldPort) {
              return { ...p, hostPort: newPort };
            }
            return p;
          });

          emitEvent('container', 'port_remap', c.name, `Remapped host port ${oldPort} -> ${newPort}`);
          return { ...c, ports: updatedPorts };
        }
        return c;
      })
    );
  };

  // Image & Volume Prune
  const handlePruneUnusedImages = () => {
    const danglingCount = images.filter(i => !i.inUse || i.dangling).length;
    setImages(prev => prev.filter(i => i.inUse && !i.dangling));
    emitEvent('image', 'prune', 'docker-daemon', `Pruned ${danglingCount} unused/dangling image layers`);
  };

  const handleDeleteImage = (id: string) => {
    const target = images.find(i => i.id === id);
    if (target) {
      emitEvent('image', 'remove', `${target.repository}:${target.tag}`, `Removed image ${target.shortId}`);
    }
    setImages(prev => prev.filter(i => i.id !== id));
  };

  const handlePullImage = (repoTag: string) => {
    const [repo, tag = 'latest'] = repoTag.split(':');
    const newImg: DockerImage = {
      id: `sha256:${Math.random().toString(16).substring(2)}`,
      shortId: Math.random().toString(16).substring(2, 14),
      repository: repo,
      tag,
      sizeBytes: Math.floor(Math.random() * 300000000 + 50000000),
      created: new Date().toISOString(),
      inUse: false,
      containerCount: 0,
      dangling: false
    };

    setImages(prev => [newImg, ...prev]);
    emitEvent('image', 'pull', `${repo}:${tag}`, `Pulled image layers from registry`);
  };

  const handlePruneUnusedVolumes = () => {
    const unusedCount = volumes.filter(v => !v.inUse || v.attachedContainers.length === 0).length;
    setVolumes(prev => prev.filter(v => v.inUse && v.attachedContainers.length > 0));
    emitEvent('volume', 'prune', 'docker-daemon', `Pruned ${unusedCount} unused volumes`);
  };

  const handleDeleteVolume = (name: string) => {
    setVolumes(prev => prev.filter(v => v.name !== name));
    emitEvent('volume', 'remove', name, `Removed volume ${name}`);
  };

  const handleCreateVolume = (name: string) => {
    const newVol: DockerVolume = {
      name,
      driver: 'local',
      scope: 'local',
      mountpoint: `/var/lib/docker/volumes/${name}/_data`,
      created: new Date().toISOString(),
      sizeBytes: 0,
      inUse: false,
      attachedContainers: []
    };
    setVolumes(prev => [newVol, ...prev]);
    emitEvent('volume', 'create', name, `Created volume ${name}`);
  };

  const handleCreateNetwork = (name: string, driver: 'bridge' | 'host') => {
    const newNet: DockerNetwork = {
      id: `net_${Date.now()}`,
      name,
      driver,
      scope: 'local',
      subnet: `172.${Math.floor(Math.random() * 50 + 30)}.0.0/16`,
      gateway: `172.30.0.1`,
      internal: false,
      inUse: false,
      containers: []
    };
    setNetworks(prev => [...prev, newNet]);
    emitEvent('network', 'create', name, `Created ${driver} network ${name}`);
  };

  const handleDeleteNetwork = (id: string) => {
    const target = networks.find(n => n.id === id);
    if (target) {
      emitEvent('network', 'remove', target.name, `Removed network ${target.name}`);
    }
    setNetworks(prev => prev.filter(n => n.id !== id));
  };

  const handleCreateContainer = (config: {
    name: string;
    image: string;
    composeProject?: string;
    hostPort?: number;
    containerPort?: number;
    envVars: Record<string, string>;
  }) => {
    const newId = Math.random().toString(16).substring(2, 34);
    const shortId = newId.substring(0, 12);

    const newContainer: ContainerItem = {
      id: newId,
      shortId,
      name: config.name,
      image: config.image,
      status: 'running',
      statusText: 'Up less than a minute',
      created: new Date().toISOString(),
      composeProject: config.composeProject,
      command: 'docker-entrypoint.sh start',
      restartCount: 0,
      ports: config.hostPort && config.containerPort ? [
        { hostIp: '0.0.0.0', hostPort: config.hostPort, containerPort: config.containerPort, protocol: 'tcp' }
      ] : [],
      env: config.envVars,
      mounts: [],
      networks: [
        { networkName: 'bridge', ipAddress: '172.17.0.8', gateway: '172.17.0.1', macAddress: '02:42:ac:11:00:08' }
      ],
      stats: {
        cpuPercent: 1.5,
        memoryUsageMB: 48,
        memoryLimitMB: 2048,
        memoryPercent: 2.3,
        networkRxKB: 120,
        networkTxKB: 340,
        cpuHistory: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1.0, 1.2, 1.5],
        memoryHistory: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 40, 45, 48]
      }
    };

    setContainers(prev => [newContainer, ...prev]);
    emitEvent('container', 'create', config.name, `Created & started container ${shortId} from ${config.image}`);
  };

  const runningCount = containers.filter(c => c.status === 'running').length;
  const danglingImageCount = images.filter(i => !i.inUse || i.dangling).length;
  const danglingVolumeCount = volumes.filter(v => !v.inUse || v.attachedContainers.length === 0).length;

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden antialiased">
      {/* Top Header */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        runningCount={runningCount}
        totalContainers={containers.length}
        collisionCount={collisions.length}
        onOpenCreateModal={() => setShowCreateModal(true)}
        onOpenArchModal={() => setShowArchModal(true)}
        isLiveStreaming={isLiveStreaming}
        setIsLiveStreaming={setIsLiveStreaming}
      />

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          containerCount={containers.length}
          runningCount={runningCount}
          collisionCount={collisions.length}
          imageCount={images.length}
          danglingImageCount={danglingImageCount}
          volumeCount={volumes.length}
          danglingVolumeCount={danglingVolumeCount}
          networkCount={networks.length}
          onOpenArchModal={() => setShowArchModal(true)}
        />

        {/* View Switcher Area */}
        <main className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
          {activeTab === 'containers' && (
            <ContainersList
              containers={containers}
              collisions={collisions}
              searchQuery={searchQuery}
              onStartContainer={handleStartContainer}
              onStopContainer={handleStopContainer}
              onRestartContainer={handleRestartContainer}
              onRemoveContainer={handleRemoveContainer}
              onSelectContainer={(c, tab) => {
                setSelectedContainer(c);
                if (tab) setModalInitialTab(tab);
              }}
              onNavigateToPortOverview={() => setActiveTab('ports')}
            />
          )}

          {activeTab === 'ports' && (
            <PortOverview
              containers={containers}
              collisions={collisions}
              onRemapPort={handleRemapPort}
              onStopContainer={handleStopContainer}
              onSelectContainer={(c) => {
                setSelectedContainer(c);
                setModalInitialTab('stats');
              }}
            />
          )}

          {activeTab === 'images' && (
            <ImagesView
              images={images}
              onPruneUnusedImages={handlePruneUnusedImages}
              onDeleteImage={handleDeleteImage}
              onPullImage={handlePullImage}
            />
          )}

          {activeTab === 'volumes' && (
            <VolumesView
              volumes={volumes}
              onPruneUnusedVolumes={handlePruneUnusedVolumes}
              onDeleteVolume={handleDeleteVolume}
              onCreateVolume={handleCreateVolume}
            />
          )}

          {activeTab === 'networks' && (
            <NetworksView
              networks={networks}
              onCreateNetwork={handleCreateNetwork}
              onDeleteNetwork={handleDeleteNetwork}
            />
          )}

          {activeTab === 'events' && (
            <EventsLogView
              events={events}
              onClearEvents={() => setEvents([])}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      {selectedContainer && (
        <ContainerDetailModal
          container={selectedContainer}
          initialTab={modalInitialTab}
          onClose={() => setSelectedContainer(null)}
          onStart={handleStartContainer}
          onStop={handleStopContainer}
          onRestart={handleRestartContainer}
          onRemove={handleRemoveContainer}
        />
      )}

      {showCreateModal && (
        <CreateContainerModal
          images={images}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateContainer}
        />
      )}

      {showArchModal && (
        <TauriArchitectureModal onClose={() => setShowArchModal(false)} />
      )}
    </div>
  );
}
