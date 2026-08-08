import React, { useState } from 'react';
import { Plus, Box, Layers, Radio, Key } from 'lucide-react';
import { DockerImage } from '../types';

interface CreateContainerModalProps {
  images: DockerImage[];
  onClose: () => void;
  onCreate: (config: {
    name: string;
    image: string;
    composeProject?: string;
    hostPort?: number;
    containerPort?: number;
    envVars: Record<string, string>;
  }) => void;
}

export const CreateContainerModal: React.FC<CreateContainerModalProps> = ({
  images,
  onClose,
  onCreate
}) => {
  const [name, setName] = useState('');
  const [image, setImage] = useState(images[0]?.repository ? `${images[0].repository}:${images[0].tag}` : 'nginx:alpine');
  const [composeProject, setComposeProject] = useState('dev-workspace');
  const [hostPort, setHostPort] = useState<number | ''>(8080);
  const [containerPort, setContainerPort] = useState<number | ''>(80);
  const [envKey, setEnvKey] = useState('');
  const [envVal, setEnvVal] = useState('');
  const [envVars, setEnvVars] = useState<Record<string, string>>({
    PORT: '80',
    ENV: 'development'
  });

  const handleAddEnv = () => {
    if (!envKey.trim()) return;
    setEnvVars(prev => ({ ...prev, [envKey.trim()]: envVal.trim() }));
    setEnvKey('');
    setEnvVal('');
  };

  const handleRemoveEnv = (key: string) => {
    setEnvVars(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !image.trim()) return;

    onCreate({
      name: name.trim(),
      image: image.trim(),
      composeProject: composeProject.trim() || undefined,
      hostPort: typeof hostPort === 'number' ? hostPort : undefined,
      containerPort: typeof containerPort === 'number' ? containerPort : undefined,
      envVars
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="font-bold text-zinc-100 text-base flex items-center space-x-2">
            <Plus className="w-5 h-5 text-emerald-400 stroke-[2.5]" />
            <span>Run New Docker Container</span>
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Container Name */}
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">
              Container Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. my-api-service"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {/* Docker Image Selection */}
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">
              Image Tag <span className="text-rose-400">*</span>
            </label>
            <div className="space-y-1.5">
              <select
                value={image}
                onChange={(e) => setImage(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              >
                {images.map(i => {
                  const tag = `${i.repository}:${i.tag}`;
                  return <option key={i.id} value={tag}>{tag} ({i.shortId})</option>;
                })}
                <option value="custom">-- Custom Image Tag --</option>
              </select>

              {image === 'custom' && (
                <input
                  type="text"
                  placeholder="Enter image e.g. nginx:alpine or redis:7"
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              )}
            </div>
          </div>

          {/* Compose Project Group */}
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">
              Compose Project Group
            </label>
            <input
              type="text"
              value={composeProject}
              onChange={(e) => setComposeProject(e.target.value)}
              placeholder="e.g. e-commerce-stack"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Port Mapping */}
          <div className="grid grid-cols-2 gap-3 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">
                Host Port
              </label>
              <input
                type="number"
                value={hostPort}
                onChange={(e) => setHostPort(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                placeholder="e.g. 8080"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 mb-1">
                Container Port
              </label>
              <input
                type="number"
                value={containerPort}
                onChange={(e) => setContainerPort(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                placeholder="e.g. 80"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-cyan-400 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Environment Variables */}
          <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 space-y-2">
            <label className="block font-semibold text-zinc-300">
              Environment Variables
            </label>

            <div className="flex gap-2">
              <input
                type="text"
                value={envKey}
                onChange={(e) => setEnvKey(e.target.value)}
                placeholder="KEY"
                className="w-1/2 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-white font-mono uppercase"
              />
              <input
                type="text"
                value={envVal}
                onChange={(e) => setEnvVal(e.target.value)}
                placeholder="VALUE"
                className="w-1/2 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-white font-mono"
              />
              <button
                type="button"
                onClick={handleAddEnv}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-bold rounded-lg"
              >
                +
              </button>
            </div>

            <div className="space-y-1 pt-1 font-mono text-[11px]">
              {Object.entries(envVars).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between bg-zinc-950 px-2 py-1 rounded">
                  <span>
                    <strong className="text-emerald-400">{k}</strong>={v}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveEnv(k)}
                    className="text-zinc-500 hover:text-rose-400 ml-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Submit buttons */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-xs font-bold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition shadow-sm"
            >
              Start Container
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
