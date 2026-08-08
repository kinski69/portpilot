import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DockerSystemEvent } from '../src/types';
import {
  DockerUnavailableError,
  docker,
  getAllRunningStats,
  getContainerStats,
  getHealth,
  inspectContainer,
  listContainers,
  listImages,
  listNetworks,
  listVolumes,
} from './docker';

/**
 * Kapselt Fehler einheitlich: Ist die Engine nicht erreichbar, kommt 503 mit
 * klarer Meldung, damit die UI einen Fehlerzustand statt leerer Listen zeigt.
 */
function handle<T>(fn: (req: Request) => Promise<T>) {
  return async (req: Request, res: Response) => {
    try {
      res.json(await fn(req));
    } catch (err) {
      if (err instanceof DockerUnavailableError) {
        res.status(503).json({ error: err.message, code: 'DOCKER_UNAVAILABLE' });
        return;
      }
      // Dockerode reicht den HTTP-Status der Engine durch — 404 nicht als
      // Serverfehler ausgeben, sonst sieht die UI jeden Tippfehler als Absturz.
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404) {
        res.status(404).json({ error: 'Nicht gefunden', code: 'NOT_FOUND' });
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      console.error('[portpilot] Fehler bei', req.path, '-', message);
      res.status(500).json({ error: message, code: 'INTERNAL' });
    }
  };
}

export function createApiRouter(): Router {
  const router = Router();

  router.get(
    '/health',
    handle(async () => {
      const health = await getHealth();
      return { ...health, readOnly: true, uptimeSeconds: Math.round(process.uptime()) };
    }),
  );

  router.get('/containers', handle(() => listContainers()));

  router.get(
    '/containers/:id',
    handle((req) => inspectContainer(req.params.id)),
  );

  // Muss vor /containers/:id/stats stehen, sonst greift die Parameter-Route.
  router.get('/stats', handle(() => getAllRunningStats()));

  router.get(
    '/containers/:id/stats',
    handle((req) => getContainerStats(req.params.id)),
  );

  router.get(
    '/containers/:id/logs',
    handle(async (req) => {
      const tail = Number.parseInt(String(req.query.tail ?? '200'), 10);
      const buffer = await docker.getContainer(req.params.id).logs({
        stdout: true,
        stderr: true,
        tail: Number.isFinite(tail) ? tail : 200,
        timestamps: true,
      });
      return { lines: demuxLogs(buffer as unknown as Buffer) };
    }),
  );

  router.get('/images', handle(() => listImages()));
  router.get('/volumes', handle(() => listVolumes()));
  router.get('/networks', handle(() => listNetworks()));

  router.get('/events', streamEvents);

  return router;
}

// Terminal-Steuerzeichen nach ECMA-48. Viele Images faerben ihre Ausgabe ein
// (Startbanner, Log-Level); im Browser waeren das nur Zeichensalat.
// Reihenfolge beachten: OSC endet erst bei BEL oder ST und wuerde von der
// CSI-Regel sonst zerschnitten.
const OSC_SEQUENCE = /\u001B\][\s\S]*?(?:\u0007|\u001B\\)/g;
// ESC [ · Parameterbytes 0x30-0x3F · Zwischenbytes 0x20-0x2F · Endbyte 0x40-0x7E
const CSI_SEQUENCE = /\u001B\[[0-?]*[ -\/]*[@-~]/g;
// Einzelne Escapes wie ESC ( B (Zeichensatzwahl) oder ESC = (Tastaturmodus)
const SINGLE_ESCAPE = /\u001B[ -\/]*[0-~]/g;

/** Docker stellt jeder Zeile einen RFC3339-Zeitstempel voran. */
const TIMESTAMP_PREFIX = /^\d{4}-\d{2}-\d{2}T\S+\s*/;

/**
 * Entfernt Steuerzeichen aus einer Logzeile.
 * Gibt null zurueck, wenn danach nichts als der Zeitstempel uebrig bleibt —
 * reine Farbwechsel-Zeilen tragen keine Information.
 */
function cleanLogLine(raw: string): string | null {
  const text = raw
    .replace(OSC_SEQUENCE, '')
    .replace(CSI_SEQUENCE, '')
    .replace(SINGLE_ESCAPE, '')
    // BEL und Wagenruecklauf (Fortschrittsbalken ueberschreiben damit Zeilen)
    .replace(/[\u0007\r]/g, '')
    .trimEnd();

  return text.replace(TIMESTAMP_PREFIX, '').trim() ? text : null;
}

/**
 * Docker multiplext stdout/stderr in einem Stream: 8-Byte-Header pro Frame,
 * Byte 0 ist der Stream-Typ, Bytes 4-7 die Länge als Big-Endian-uint32.
 * Bei Containern ohne TTY muss dieser Rahmen entfernt werden.
 */
function demuxLogs(buffer: Buffer): { stream: 'stdout' | 'stderr'; message: string }[] {
  const lines: { stream: 'stdout' | 'stderr'; message: string }[] = [];

  // Ohne Header-Rahmen (TTY-Container) ist Byte 0 druckbarer Text.
  const isMultiplexed = buffer.length >= 8 && (buffer[0] === 0 || buffer[0] === 1 || buffer[0] === 2);

  if (!isMultiplexed) {
    for (const line of buffer.toString('utf8').split('\n')) {
      const message = cleanLogLine(line);
      if (message) lines.push({ stream: 'stdout', message });
    }
    return lines;
  }

  let offset = 0;
  while (offset + 8 <= buffer.length) {
    const streamType = buffer[offset];
    const length = buffer.readUInt32BE(offset + 4);
    const start = offset + 8;
    const end = Math.min(start + length, buffer.length);
    const chunk = buffer.toString('utf8', start, end);

    for (const line of chunk.split('\n')) {
      const message = cleanLogLine(line);
      if (message) {
        lines.push({ stream: streamType === 2 ? 'stderr' : 'stdout', message });
      }
    }
    offset = end;
    // Länge 0 würde sonst zur Endlosschleife fuehren.
    if (length === 0) offset += 8;
  }

  return lines;
}

/**
 * Docker-Events als Server-Sent-Events weiterreichen.
 * Ersetzt Polling: die UI bekommt Start/Stop/Create sofort gemeldet.
 */
function streamEvents(req: Request, res: Response): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 3000\n\n');

  // Verbindung offen halten, auch wenn Docker gerade nichts meldet.
  const keepAlive = setInterval(() => res.write(': ping\n\n'), 25_000);
  let dockerStream: NodeJS.ReadableStream | undefined;
  let closed = false;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    clearInterval(keepAlive);
    (dockerStream as { destroy?: () => void } | undefined)?.destroy?.();
  };

  req.on('close', cleanup);

  docker.getEvents({}, (err, stream) => {
    if (closed) {
      (stream as { destroy?: () => void } | undefined)?.destroy?.();
      return;
    }
    if (err || !stream) {
      res.write(
        `event: error\ndata: ${JSON.stringify({
          message: err instanceof Error ? err.message : 'Event-Stream nicht verfügbar',
        })}\n\n`,
      );
      return;
    }

    dockerStream = stream;
    let partial = '';

    stream.on('data', (chunk: Buffer) => {
      // Ein Chunk kann mehrere oder halbe JSON-Zeilen enthalten.
      partial += chunk.toString('utf8');
      const parts = partial.split('\n');
      partial = parts.pop() ?? '';

      for (const line of parts) {
        if (!line.trim()) continue;
        try {
          const event = toSystemEvent(JSON.parse(line));
          if (event) res.write(`data: ${JSON.stringify(event)}\n\n`);
        } catch {
          // Unvollständige oder unbekannte Zeile überspringen.
        }
      }
    });

    stream.on('error', cleanup);
    stream.on('end', cleanup);
  });
}

interface RawDockerEvent {
  Type?: string;
  Action?: string;
  id?: string;
  time?: number;
  timeNano?: number;
  Actor?: { ID?: string; Attributes?: Record<string, string> };
}

const RELEVANT_TYPES = new Set(['container', 'image', 'volume', 'network']);

function toSystemEvent(raw: RawDockerEvent): DockerSystemEvent | null {
  if (!raw.Type || !RELEVANT_TYPES.has(raw.Type)) return null;

  const attrs = raw.Actor?.Attributes ?? {};
  const actorName = attrs.name ?? attrs.image ?? raw.Actor?.ID?.substring(0, 12) ?? 'unbekannt';
  const action = raw.Action ?? 'unknown';

  // exec_start:/bin/sh -> exec_start, sonst wird die Aktionsspalte unlesbar.
  const shortAction = action.split(':')[0];

  const timestamp = raw.timeNano
    ? new Date(raw.timeNano / 1_000_000).toISOString()
    : new Date((raw.time ?? Date.now() / 1000) * 1000).toISOString();

  return {
    id: `${raw.Actor?.ID ?? raw.id ?? 'ev'}-${raw.timeNano ?? Date.now()}-${shortAction}`,
    timestamp,
    type: raw.Type as DockerSystemEvent['type'],
    action: shortAction,
    actorName,
    details: attrs.image ? `${shortAction} • image ${attrs.image}` : shortAction,
  };
}
