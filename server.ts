import express from 'express';
import path from 'node:path';
import { createApiRouter } from './server/routes';

// Standardport 7070: bewusst abseits der ueblichen Dev-Ports (3000/5173/8080),
// die auf Entwickler-Hosts fast immer belegt sind.
const PORT = Number.parseInt(process.env.PORT ?? '7070', 10);
// Nur lokal erreichbar — dieses Tool hat Lesezugriff auf den Docker-Socket
// und gehoert nicht ins LAN.
const HOST = process.env.HOST ?? '127.0.0.1';

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json());

  app.use('/api', createApiRouter());

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Vite laeuft als Middleware, damit Frontend und API denselben Port teilen.
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`PortPilot laeuft auf http://${HOST}:${PORT}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `Port ${PORT} ist bereits belegt. Anderen Port waehlen: PORT=7171 npm run dev`,
      );
      process.exit(1);
    }
    throw err;
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch((err) => {
  console.error('Start fehlgeschlagen:', err);
  process.exit(1);
});
