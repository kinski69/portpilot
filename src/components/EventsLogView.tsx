import React from 'react';
import { Activity, Trash2 } from 'lucide-react';
import { DockerSystemEvent } from '../types';

interface EventsLogViewProps {
  events: DockerSystemEvent[];
  onClearEvents: () => void;
}

export const EventsLogView: React.FC<EventsLogViewProps> = ({
  events,
  onClearEvents
}) => {
  return (
    <div className="flex-1 p-5 overflow-y-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span>Engine-Ereignisse</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Live-Stream der Docker-Engine. Ereignisse werden gepusht, nicht abgefragt.
          </p>
        </div>

        <button
          onClick={onClearEvents}
          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs flex items-center space-x-1.5 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Liste leeren</span>
        </button>
      </div>

      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-400 font-mono">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-emerald-400 font-bold">Abonniert: /api/events</span>
          </div>
          <span>Empfangen: {events.length}</span>
        </div>

        <div className="divide-y divide-zinc-800/60 font-mono text-xs">
          {events.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 font-sans">
              Noch keine Ereignisse. Sobald ein Container startet oder stoppt, erscheint es hier.
            </div>
          ) : (
            events.map(ev => (
              <div key={ev.id} className="p-3 hover:bg-zinc-800/30 flex items-start justify-between gap-4 transition">
                <div className="flex items-start space-x-3">
                  <span className="text-zinc-500 text-[11px] shrink-0 pt-0.5">
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </span>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-300 font-bold text-[10px] uppercase">
                        {ev.type}
                      </span>
                      <span className="text-white font-bold">{ev.action}</span>
                      <span className="text-emerald-400 font-bold">{ev.actorName}</span>
                    </div>

                    <div className="text-zinc-400 text-[11px] mt-1">{ev.details}</div>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
