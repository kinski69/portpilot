# PortPilot

Lokales Docker-Dashboard für Linux. Zeigt laufende Container, belegte Host-Ports,
Images, Volumes, Netzwerke und Engine-Ereignisse in Echtzeit — mit dem Schwerpunkt,
Port-Konflikte zu finden, bevor sie einen Start scheitern lassen.

**Nur lesend.** PortPilot startet, stoppt oder löscht nichts. Es gibt keine
Endpunkte, die etwas verändern.

---

## Voraussetzungen

| | |
|---|---|
| Node.js | 20 oder neuer (inklusive `npm`) |
| Docker | laufender Daemon, systemweit oder rootless |
| Berechtigung | Lesezugriff auf den Docker-Socket |

Die Docker-CLI wird **nicht** benötigt — PortPilot spricht direkt mit dem Socket.
Ebenso wenig `curl`, `ss` oder `lsof`; alle Prüfungen laufen über Node.

Gruppenzugehörigkeit prüfen:

```bash
id -nG | tr ' ' '\n' | grep -x docker || echo "nicht in der Gruppe docker"
```

Falls nicht enthalten:

```bash
sudo usermod -aG docker "$USER"
```

Danach neu anmelden.

## Installation auf einer neuen Maschine

```bash
git clone https://github.com/kinski69/portpilot.git ~/portpilot
~/portpilot/bin/portpilot
```

Beim ersten Start installiert das Skript die Abhängigkeiten und baut die
Anwendung. Es zeigt die Container **der Maschine, auf der es läuft** — für
mehrere Rechner wird PortPilot auf jedem einzeln installiert.

In das Anwendungsmenü eintragen:

```bash
~/portpilot/bin/install-desktop-entry
```

Aktualisieren:

```bash
cd ~/portpilot && git pull && ./bin/portpilot
```

Der Rebuild erfolgt automatisch, sobald eine Quelldatei neuer ist als das
gebaute Bundle.

## Starten

```bash
./bin/portpilot
```

Das Skript installiert fehlende Abhängigkeiten, baut bei Bedarf neu, startet den
Server auf <http://127.0.0.1:7070> und öffnet den Browser. Läuft bereits eine
Instanz, wird nur das Fenster geöffnet.

Anderer Port:

```bash
PORTPILOT_PORT=7171 ./bin/portpilot
```

### Rootless Docker

Der Socket wird in dieser Reihenfolge gesucht: `DOCKER_SOCKET`, dann
`DOCKER_HOST` im Format `unix://…`, dann `$XDG_RUNTIME_DIR/docker.sock`
(rootless), zuletzt `/var/run/docker.sock`. In der Regel ist nichts zu
konfigurieren; andernfalls:

```bash
DOCKER_SOCKET="$XDG_RUNTIME_DIR/docker.sock" ./bin/portpilot
```

## In das Anwendungsmenü eintragen

```bash
./bin/install-desktop-entry
```

Legt `~/.local/share/applications/portpilot.desktop` an — kein `sudo` nötig.
Entfernen mit `rm ~/.local/share/applications/portpilot.desktop`.

## Entwicklung

```bash
npm install
npm run dev
```

| Befehl | Zweck |
|---|---|
| `npm run dev` | Vite als Middleware im Express-Server, Hot Reload |
| `npm run build` | Frontend nach `dist/`, Server als `dist/server.cjs` |
| `npm start` | Produktionsmodus aus `dist/` |
| `npm run lint` | `tsc --noEmit`, strikt |

## Aufbau

```
Browser (React + Tailwind)
   │  fetch /api/…        Server-Sent Events /api/events
   ▼
Express (server.ts, server/routes.ts)
   │
   ▼
dockerode  ──►  /var/run/docker.sock  ──►  Docker Engine API
```

- `server/docker.ts` übersetzt die Engine-Antworten in die Typen aus `src/types.ts`.
  Die Oberfläche kennt die Docker-API nicht direkt.
- `src/hooks/useDockerData.ts` lädt die Ressourcen, abonniert den Event-Stream und
  pollt Messwerte im 3-Sekunden-Takt.
- Ereignisse werden gepusht, nicht abgefragt. Ein `docker run` erscheint sofort.

### Umgebungsvariablen

| Variable | Vorgabe | Zweck |
|---|---|---|
| `PORT` | `7070` | Port des Servers |
| `HOST` | `127.0.0.1` | Bind-Adresse. Bewusst lokal — der Prozess liest den Docker-Socket |
| `DOCKER_SOCKET` | automatisch | abweichender Socket, überschreibt die Suche |
| `DOCKER_HOST` | — | wird ausgewertet, sofern `unix://…` |
| `PORTPILOT_PORT` | `7070` | nur für `bin/portpilot` |

## Port-Konflikte

Ein Konflikt wird gemeldet, wenn **zwei verschiedene** Container denselben
Host-Port auf einer überlappenden Adresse binden. Bewusst *nicht* als Konflikt gewertet:

- derselbe Container mehrfach — Docker meldet IPv4 und IPv6 als getrennte Einträge
- gleicher Port auf nicht überlappenden Adressen, etwa `127.0.0.1:8000` und `192.168.1.5:8000`
- gleicher Port bei unterschiedlichem Protokoll — `tcp` und `udp` sind getrennte Namensräume

Eine Wildcard-Bindung (`0.0.0.0`) kollidiert dagegen mit jeder anderen Bindung auf
demselben Port.

## Grenzen

- **Volume-Größen** werden nicht angezeigt. Die Engine liefert sie nur über einen
  teuren `df`-Aufruf; statt eines erfundenen Werts steht dort `—`.
- **Logs** werden alle 5 Sekunden nachgeladen, nicht als Dauerstream.
- **Keine Schreibaktionen.** Container steuern weiterhin über `docker` oder `docker compose`.

## Lizenz

Apache-2.0
