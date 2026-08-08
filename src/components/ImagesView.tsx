import React, { useState } from 'react';
import {
  Layers,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  Search,
  Plus,
  RefreshCw
} from 'lucide-react';
import { DockerImage } from '../types';
import { formatBytes, formatUptime } from '../utils/dockerUtils';

interface ImagesViewProps {
  images: DockerImage[];
  onPruneUnusedImages: () => void;
  onDeleteImage: (id: string) => void;
  onPullImage: (repoTag: string) => void;
}

export const ImagesView: React.FC<ImagesViewProps> = ({
  images,
  onPruneUnusedImages,
  onDeleteImage,
  onPullImage
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showPullModal, setShowPullModal] = useState(false);
  const [pullInput, setPullInput] = useState('');
  const [isPulling, setIsPulling] = useState(false);

  // Calculate dangling / unused reclaimable space
  const danglingImages = images.filter(i => !i.inUse || i.dangling);
  const reclaimableBytes = danglingImages.reduce((sum, img) => sum + img.sizeBytes, 0);

  const filteredImages = images.filter(img => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      img.repository.toLowerCase().includes(q) ||
      img.tag.toLowerCase().includes(q) ||
      img.shortId.toLowerCase().includes(q)
    );
  });

  const handlePullSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pullInput.trim()) return;

    setIsPulling(true);
    setTimeout(() => {
      onPullImage(pullInput.trim());
      setIsPulling(false);
      setPullInput('');
      setShowPullModal(false);
    }, 1200);
  };

  return (
    <div className="flex-1 p-5 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <span>Docker Image Repository</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Local cache of cached layers and images available for container creation.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {reclaimableBytes > 0 && (
            <button
              onClick={onPruneUnusedImages}
              className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-semibold text-xs flex items-center space-x-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Prune Unused ({formatBytes(reclaimableBytes)} reclaimable)</span>
            </button>
          )}

          <button
            onClick={() => setShowPullModal(true)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs flex items-center space-x-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Pull Image</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search repository or tag (e.g. 'postgres', 'latest')..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="text-xs text-zinc-400">
          Total Images: <strong className="text-white">{images.length}</strong> • Reclaimable: <strong className="text-amber-400">{formatBytes(reclaimableBytes)}</strong>
        </div>
      </div>

      {/* Images Table */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950 text-zinc-500 font-semibold border-b border-zinc-800">
              <tr>
                <th className="py-2.5 px-4">Repository & Tag</th>
                <th className="py-2.5 px-4">Image ID</th>
                <th className="py-2.5 px-4">Virtual Size</th>
                <th className="py-2.5 px-4">In Use</th>
                <th className="py-2.5 px-4">Created</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {filteredImages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-zinc-500">
                    No images match current filter.
                  </td>
                </tr>
              ) : (
                filteredImages.map(img => (
                  <tr key={img.id} className="hover:bg-zinc-800/40 transition">
                    <td className="py-3 px-4 font-sans font-semibold text-zinc-100">
                      <div className="flex items-center space-x-2">
                        <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <span>{img.repository}</span>
                          <span className="text-emerald-400 font-mono text-xs ml-1">:{img.tag}</span>
                          {img.dangling && (
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-sans text-[10px] font-semibold border border-amber-500/30">
                              Dangling
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-zinc-400">{img.shortId}</td>

                    <td className="py-3 px-4 font-bold text-zinc-200">
                      {formatBytes(img.sizeBytes)}
                    </td>

                    <td className="py-3 px-4">
                      {img.inUse ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-sans text-[10px] flex items-center space-x-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>In Use ({img.containerCount})</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-sans text-[10px] flex items-center space-x-1 w-fit">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Unused (Pruneable)</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-zinc-400 font-sans text-[11px]">
                      {formatUptime(img.created)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onDeleteImage(img.id)}
                        disabled={img.inUse}
                        className={`p-1.5 rounded transition ${
                          img.inUse
                            ? 'text-zinc-600 cursor-not-allowed'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-rose-400'
                        }`}
                        title={img.inUse ? 'Cannot remove image in use by running container' : 'Remove Image'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pull Image Modal */}
      {showPullModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-zinc-100 text-base flex items-center space-x-2">
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Pull Docker Image</span>
              </h3>
              <button
                onClick={() => setShowPullModal(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Enter official Docker Hub repository and tag (e.g. <code className="text-emerald-400">nginx:latest</code>, <code className="text-emerald-400">mysql:8.0</code>, <code className="text-emerald-400">rabbitmq:3-management</code>).
            </p>

            <form onSubmit={handlePullSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Image Tag
                </label>
                <input
                  type="text"
                  value={pullInput}
                  onChange={(e) => setPullInput(e.target.value)}
                  placeholder="e.g. redis:alpine"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowPullModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPulling}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition flex items-center space-x-1.5"
                >
                  {isPulling && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isPulling ? 'Pulling Layers...' : 'Start Pull'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
