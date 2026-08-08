import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Layers, Search } from 'lucide-react';
import type { DockerImage } from '../types';
import { formatBytes, formatUptime } from '../utils/dockerUtils';

interface ImagesViewProps {
  images: DockerImage[];
}

export const ImagesView = ({ images }: ImagesViewProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const reclaimableBytes = useMemo(
    () => images.filter((i) => !i.inUse || i.dangling).reduce((sum, img) => sum + img.sizeBytes, 0),
    [images],
  );

  const filteredImages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return images;
    return images.filter(
      (img) =>
        img.repository.toLowerCase().includes(q) ||
        img.tag.toLowerCase().includes(q) ||
        img.shortId.toLowerCase().includes(q),
    );
  }, [images, searchQuery]);

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-5">
      <div>
        <h2 className="flex items-center space-x-2 text-xl font-bold text-white">
          <Layers className="h-5 w-5 text-emerald-400" />
          <span>Images</span>
        </h2>
        <p className="mt-1 text-xs text-zinc-400">
          Lokal vorhandene Images. Nicht verwendete lassen sich mit{' '}
          <code className="text-emerald-400">docker image prune</code> entfernen.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Repository oder Tag suchen…"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-1.5 pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="text-xs text-zinc-400">
          Images: <strong className="text-white">{images.length}</strong> • ungenutzt:{' '}
          <strong className="text-amber-400">{formatBytes(reclaimableBytes)}</strong>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/90 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="border-b border-zinc-800 bg-zinc-950 font-semibold text-zinc-500">
              <tr>
                <th className="px-4 py-2.5">Repository & Tag</th>
                <th className="px-4 py-2.5">Image-ID</th>
                <th className="px-4 py-2.5">Größe</th>
                <th className="px-4 py-2.5">Verwendung</th>
                <th className="px-4 py-2.5">Erstellt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {filteredImages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-zinc-500">
                    Kein Image passt zum Filter.
                  </td>
                </tr>
              ) : (
                filteredImages.map((img) => (
                  <tr key={img.id} className="transition hover:bg-zinc-800/40">
                    <td className="px-4 py-3 font-sans font-semibold text-zinc-100">
                      <div className="flex items-center space-x-2">
                        <Layers className="h-4 w-4 shrink-0 text-emerald-400" />
                        <div>
                          <span>{img.repository}</span>
                          <span className="ml-1 font-mono text-xs text-emerald-400">:{img.tag}</span>
                          {img.dangling && (
                            <span className="ml-2 rounded border border-amber-500/30 bg-amber-500/20 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-amber-300">
                              dangling
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-zinc-400">{img.shortId}</td>

                    <td className="px-4 py-3 font-bold text-zinc-200">{formatBytes(img.sizeBytes)}</td>

                    <td className="px-4 py-3">
                      {img.inUse ? (
                        <span className="flex w-fit items-center space-x-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-sans text-[10px] text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>
                            {img.containerCount} {img.containerCount === 1 ? 'Container' : 'Container'}
                          </span>
                        </span>
                      ) : (
                        <span className="flex w-fit items-center space-x-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-sans text-[10px] text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          <span>ungenutzt</span>
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 font-sans text-[11px] text-zinc-400">
                      {formatUptime(img.created)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
