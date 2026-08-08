import { useMemo, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import type { ActiveTab, ContainerItem } from './types';
import { useDockerData } from './hooks/useDockerData';
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
import { AboutModal } from './components/AboutModal';

export type DetailTab = 'logs' | 'stats' | 'env' | 'mounts' | 'networks';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('containers');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAbout, setShowAbout] = useState(false);

  // Nur die ID halten, nicht das Objekt: sonst zeigt das Detailfenster
  // dauerhaft den Schnappschuss vom Zeitpunkt des Klicks.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('logs');

  const {
    containers,
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
  } = useDockerData();

  // Gestoppte Container belegen keinen Socket — nur aktive können streiten.
  const collisions = useMemo(
    () =>
      detectPortCollisions(
        containers.filter((c) => c.status === 'running' || c.status === 'restarting'),
      ),
    [containers],
  );

  const selectedContainer = useMemo(
    () => containers.find((c) => c.id === selectedId) ?? null,
    [containers, selectedId],
  );

  const counts = useMemo(
    () => ({
      running: containers.filter((c) => c.status === 'running').length,
      danglingImages: images.filter((i) => !i.inUse || i.dangling).length,
      unusedVolumes: volumes.filter((v) => !v.inUse).length,
    }),
    [containers, images, volumes],
  );

  const handleSelectContainer = (container: ContainerItem, tab?: DetailTab) => {
    setSelectedId(container.id);
    if (tab) setDetailTab(tab);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <p className="text-sm">Verbinde mit der Docker-Engine…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 p-6 text-zinc-200">
        <div className="max-w-lg space-y-4 rounded-2xl border border-rose-500/30 bg-rose-950/20 p-6">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="h-5 w-5" />
            <h1 className="text-lg font-bold">Keine Verbindung zur Docker-Engine</h1>
          </div>
          <p className="text-sm text-zinc-300">{error}</p>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-400">
            sudo systemctl start docker
          </div>
          <button
            onClick={refresh}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-500"
          >
            <RefreshCw className="h-4 w-4" />
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-zinc-950 font-sans text-zinc-100 antialiased">
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        setActiveTab={setActiveTab}
        runningCount={counts.running}
        totalContainers={containers.length}
        collisionCount={collisions.length}
        onOpenAbout={() => setShowAbout(true)}
        onRefresh={refresh}
        isLiveStreaming={isLiveStreaming}
        setIsLiveStreaming={setIsLiveStreaming}
        health={health}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          containerCount={containers.length}
          runningCount={counts.running}
          collisionCount={collisions.length}
          imageCount={images.length}
          danglingImageCount={counts.danglingImages}
          volumeCount={volumes.length}
          danglingVolumeCount={counts.unusedVolumes}
          networkCount={networks.length}
          onOpenAbout={() => setShowAbout(true)}
        />

        <main className="flex flex-1 flex-col overflow-hidden bg-zinc-950">
          {activeTab === 'containers' && (
            <ContainersList
              containers={containers}
              collisions={collisions}
              searchQuery={searchQuery}
              onSelectContainer={handleSelectContainer}
              onNavigateToPortOverview={() => setActiveTab('ports')}
            />
          )}

          {activeTab === 'ports' && (
            <PortOverview
              containers={containers}
              collisions={collisions}
              onSelectContainer={(c) => handleSelectContainer(c, 'stats')}
            />
          )}

          {activeTab === 'images' && <ImagesView images={images} />}
          {activeTab === 'volumes' && <VolumesView volumes={volumes} />}
          {activeTab === 'networks' && <NetworksView networks={networks} />}
          {activeTab === 'events' && <EventsLogView events={events} onClearEvents={clearEvents} />}
        </main>
      </div>

      {selectedContainer && (
        <ContainerDetailModal
          container={selectedContainer}
          initialTab={detailTab}
          onClose={() => setSelectedId(null)}
        />
      )}

      {showAbout && <AboutModal health={health} onClose={() => setShowAbout(false)} />}
    </div>
  );
}
