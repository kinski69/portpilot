import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type Lang = 'de' | 'en';

const STORAGE_KEY = 'portpilot-lang';

/**
 * Zentrale Zweisprachigkeit (DE/EN) ohne externe Pakete.
 * Deutsch ist die Leitsprache: `de` definiert alle Schlüssel, `en` muss
 * denselben Satz erfüllen — ein fehlender EN-Schlüssel ist ein
 * Compile-Fehler, kein leeres Label zur Laufzeit.
 */
const de = {
  'header.searchPlaceholder':
    "Container, Image oder Port suchen (z. B. '8000', 'ollama', 'running')…",
  'header.clearSearch': 'Suche zurücksetzen',
  'header.runningOf': '/ {total} laufend',
  'header.conflictsOne': '{count} Port-Konflikt',
  'header.conflictsMany': '{count} Port-Konflikte',
  'header.noConflicts': 'Keine Konflikte',
  'header.engineOffline': 'Engine getrennt',
  'header.liveOn': 'Live-Stats an',
  'header.liveOff': 'Pausiert',
  'header.liveTitle': 'Laufende Messwerte an- oder abschalten',
  'header.refreshTitle': 'Alles neu laden',
  'header.aboutTitle': 'Über PortPilot',
  'header.langTitle': 'Sprache / Language',

  'app.connecting': 'Verbinde mit der Docker-Engine…',
  'app.connFailed': 'Keine Verbindung zur Docker-Engine',
  'app.retry': 'Erneut versuchen',
  'app.dockerHint': 'sudo systemctl start docker',

  'nav.title': 'Navigation',
  'nav.dashboard': 'Übersicht',
  'nav.dashboardHint': 'Lage auf einen Blick',
  'nav.containers': 'Container',
  'nav.containersHint': 'Dienste und Zustand',
  'nav.ports': 'Ports',
  'nav.portsHint': 'Belegung und Konflikte',
  'nav.images': 'Images',
  'nav.imagesHint': 'Abbilder auf dem Host',
  'nav.volumes': 'Volumes',
  'nav.volumesHint': 'Dauerhafte Daten',
  'nav.networks': 'Netzwerke',
  'nav.networksHint': 'Bridges und Subnetze',
  'nav.events': 'Ereignisse',
  'nav.eventsHint': 'Live-Strom der Engine',
  'nav.portsFree': 'frei',
  'nav.conflictOne': '{count} Konflikt',
  'nav.conflictMany': '{count} Konflikte',
  'nav.unusedBadge': '{count} ungenutzt',
  'nav.liveBadge': 'Live',
  'nav.socketTitle': 'Docker-Socket',
  'nav.socketNotePre': 'Nur lesender Zugriff auf',
  'nav.about': 'Über PortPilot',

  'dash.allGood': 'Alle Dienste laufen sauber',
  'dash.attention': 'Auffälligkeiten auf dem Host',
  'dash.summary':
    '{running} von {total} Containern aktiv · {conflicts} Port-Konflikte · {failed} gestoppt oder fehlerhaft',
  'dash.viewConflicts': 'Konflikte ansehen',
  'dash.statTotal': 'Container gesamt',
  'dash.statRunning': 'Laufend',
  'dash.statFailed': 'Gestoppt / Fehler',
  'dash.statPorts': 'Offene Ports',
  'dash.portsConflictsHint': '{count} Konflikte',
  'dash.portsConflictOne': '{count} Konflikt',
  'dash.portsFreeHint': 'konfliktfrei',
  'dash.networksHint': '{count} Netzwerke',
  'dash.networksOne': '{count} Netzwerk',
  'dash.gaugeLabel': 'Aktive Dienste',
  'dash.gaugeCaption': '{running} von {total} Containern',
  'dash.hostLoad': 'Hostlast',
  'dash.hostLoadSub': 'Summierte CPU-Last der laufenden Container',
  'dash.cpuTotal': 'CPU gesamt',
  'dash.ramUsed': 'RAM belegt',
  'dash.avgCpu': 'Ø CPU je Container',
  'dash.avgRam': 'Ø RAM je Container',
  'dash.eventsStat': 'Ereignisse',
  'dash.allEyebrow': 'Alle',
  'dash.containersHeading': 'Container',
  'dash.viewCards': 'Kachelansicht',
  'dash.viewCompact': 'Kompaktliste',
  'dash.empty': 'Keine Container auf diesem Host gefunden.',
  'dash.cardStatus': 'Status',
  'dash.cardUptime': 'Laufzeit',
  'dash.cardPorts': 'Ports',
  'dash.cardPortsNone': 'keine',
  'dash.cardCpu': 'CPU',
  'dash.cardRam': 'RAM',
  'dash.cardCpuHistory': 'CPU-Verlauf',
  'dash.noMetrics': 'Noch keine Messwerte — Live-Stats einschalten.',

  'cont.filter': 'Filter:',
  'cont.fAll': 'Alle',
  'cont.fRunning': 'Laufend',
  'cont.fExited': 'Beendet',
  'cont.fErrors': 'Fehler',
  'cont.groupByCompose': 'Nach Compose gruppieren',
  'cont.viewCardsTitle': 'Kachelansicht',
  'cont.viewListTitle': 'Listenansicht',
  'cont.bannerOne': 'Port-Konflikt ({count} betroffener Port)',
  'cont.bannerMany': 'Port-Konflikt ({count} betroffene Ports)',
  'cont.bannerBody':
    'Mehrere Container binden denselben Host-Port. In der Port-Ansicht siehst du, welche.',
  'cont.viewAction': 'Ansehen',
  'cont.emptyTitle': 'Keine Container gefunden',
  'cont.emptySearch': 'Kein Container passt zu "{q}".',
  'cont.emptyNone': 'Auf diesem Host existieren keine Container.',
  'cont.standaloneGroup': 'Standalone Containers',
  'cont.projectLabel': 'Project:',
  'cont.servicesCount': '({count} services)',
  'cont.detailsFor': 'Details zu {name}',
  'cont.portsLabel': 'Ports:',
  'cont.noPorts': 'Keine Ports veröffentlicht',
  'cont.conflictOnPort': 'Port-Konflikt auf Host-Port {port}',
  'cont.portMapsTo': 'Host-Port {host} → Container-Port {cont}',
  'cont.openInTab': '{url} in neuem Tab öffnen',
  'cont.logsBtn': 'Logs',
  'cont.detailsBtn': 'Details',
  'cont.thName': 'Name & Image',
  'cont.thStatus': 'Status',
  'cont.thCompose': 'Compose-Projekt',
  'cont.thPorts': 'Ports',
  'cont.thMetrics': 'CPU / RAM',
  'cont.thAction': 'Aktion',
  'cont.standalone': 'eigenständig',
  'cont.showLogs': 'Logs anzeigen',
  'cont.copyBlocked': 'Kopieren blockiert — Befehl von Hand markieren',
  'cont.copyCommand': 'Startbefehl kopieren',

  'ports.title': 'Ports & Konflikte',
  'ports.subtitle':
    'Alle auf den Host veröffentlichten Ports, quer über alle Container und Compose-Projekte.',
  'ports.occupied': 'Belegte Ports:',
  'ports.conflictsOne': '{count} Konflikt',
  'ports.conflictsMany': '{count} Konflikte',
  'ports.noConflicts': 'Keine Konflikte',
  'ports.found': 'Port-Konflikte erkannt',
  'ports.conflictTag': 'KONFLIKT',
  'ports.involved': 'Beteiligt:',
  'ports.searchPh': 'Port, Container oder Projekt suchen…',
  'ports.onlyConflicts': 'Nur Konflikte ({count})',
  'ports.commonTitle': 'Häufig genutzte Ports',
  'ports.commonLegend': 'Grün = frei, Rot = Konflikt, Cyan = belegt',
  'ports.commonConflict': 'Konflikt',
  'ports.commonFree': 'frei',
  'ports.thHostPort': 'Host-Port',
  'ports.thContainer': 'Container',
  'ports.thBoundTo': 'Gebunden an',
  'ports.thContainerPort': 'Container-Port',
  'ports.thStatus': 'Status',
  'ports.emptyFilter': 'Kein Port passt zum Filter.',
  'ports.okTag': 'OK',

  'detail.tabMetrics': 'Messwerte',
  'detail.tabEnv': 'Umgebung',
  'detail.tabMounts': 'Mounts',
  'detail.tabNetworks': 'Netzwerke',
  'detail.close': 'Schließen',
  'detail.logFilterPh': 'Logs filtern…',
  'detail.lines': '{count} Zeilen',
  'detail.autoscrollOn': 'Auto-Scroll an',
  'detail.autoscrollOff': 'Auto-Scroll aus',
  'detail.downloadLogs': 'Logs herunterladen',
  'detail.logsLoading': 'Logs werden geladen…',
  'detail.logsEmpty': 'Dieser Container hat nichts geloggt.',
  'detail.logsNoMatch': 'Kein Treffer.',
  'detail.notRunning': 'Container läuft nicht — es werden keine Messwerte erhoben.',
  'detail.memory': 'Arbeitsspeicher',
  'detail.limit': 'Limit: {limit} MB ({pct} %)',
  'detail.netRx': 'Netzwerk empfangen',
  'detail.netTx': 'Netzwerk gesendet',
  'detail.entrypoint': 'Entrypoint',
  'detail.restarts': 'Bereits {count}× neu gestartet.',
  'detail.envEmpty': 'Keine Umgebungsvariablen gesetzt.',
  'detail.loading': 'Wird geladen…',
  'detail.thKey': 'Schlüssel',
  'detail.thValue': 'Wert',
  'detail.thAction': 'Aktion',
  'detail.copyVar': '{k} kopieren',
  'detail.mountsEmpty': 'Keine Mounts konfiguriert.',
  'detail.thType': 'Typ',
  'detail.thSource': 'Quelle',
  'detail.thDest': 'Ziel im Container',
  'detail.thMode': 'Modus',
  'detail.netsEmpty': 'Keine Netzwerke verbunden.',
  'detail.thNetwork': 'Netzwerk',
  'detail.thIp': 'IP-Adresse',
  'detail.thGateway': 'Gateway',
  'detail.thMac': 'MAC-Adresse',

  'images.descPre': 'Lokal vorhandene Images. Nicht verwendete lassen sich mit',
  'images.descPost': 'entfernen.',
  'images.searchPh': 'Repository oder Tag suchen…',
  'images.thRepo': 'Repository & Tag',
  'images.thId': 'Image-ID',
  'images.thSize': 'Größe',
  'images.thUsage': 'Verwendung',
  'images.thCreated': 'Erstellt',
  'images.emptyFilter': 'Kein Image passt zum Filter.',
  'images.containerOne': '{count} Container',
  'images.containerMany': '{count} Container',
  'images.unused': 'ungenutzt',

  'volumes.descPre': 'Persistente Datenträger. Ungenutzte lassen sich mit',
  'volumes.descPost': 'entfernen.',
  'volumes.searchPh': 'Name oder Mountpoint suchen…',
  'volumes.thName': 'Name',
  'volumes.thDriver': 'Treiber',
  'volumes.thSize': 'Größe',
  'volumes.thAttached': 'Verbundene Container',
  'volumes.thStatus': 'Status',
  'volumes.thCreated': 'Erstellt',
  'volumes.emptyFilter': 'Kein Volume passt zum Filter.',
  'volumes.notDetermined': 'Nicht ermittelt',
  'volumes.noneAttached': 'keine',
  'volumes.inUse': 'in Benutzung',
  'volumes.unused': 'ungenutzt',

  'networks.title': 'Netzwerke',
  'networks.desc': 'Virtuelle Netzwerke und die daran angeschlossenen Container.',
  'networks.searchPh': 'Name, Treiber oder Subnetz suchen…',
  'networks.emptyFilter': 'Kein Netzwerk passt zum Filter.',
  'networks.internalSuffix': ' • internal',
  'networks.containerOne': '{count} Container',
  'networks.containerMany': '{count} Container',
  'networks.subnet': 'Subnetz',
  'networks.gateway': 'Gateway',
  'networks.noContainers': 'Keine Container verbunden',

  'events.title': 'Engine-Ereignisse',
  'events.desc': 'Live-Stream der Docker-Engine. Ereignisse werden gepusht, nicht abgefragt.',
  'events.clear': 'Liste leeren',
  'events.subscribed': 'Abonniert: /api/events',
  'events.received': 'Empfangen: {n}',
  'events.empty':
    'Noch keine Ereignisse. Sobald ein Container startet oder stoppt, erscheint es hier.',

  'about.layerBackendT': 'Backend — Express + dockerode',
  'about.layerBackendB':
    'Spricht direkt mit dem Docker-Socket und übersetzt die Engine-Antworten in das Format der Oberfläche. Läuft nur auf 127.0.0.1.',
  'about.layerLiveT': 'Live-Updates — Server-Sent Events',
  'about.layerLiveB':
    'Die Oberfläche abonniert den Event-Stream der Engine statt zu pollen. Start, Stop und Create erscheinen sofort; Messwerte werden im 3-Sekunden-Takt nachgeladen.',
  'about.layerRoT': 'Nur lesend',
  'about.layerRoB':
    'Es gibt keine Endpunkte, die etwas verändern. Container starten, stoppen oder löschen ist bewusst nicht eingebaut.',
  'about.subtitle': 'Lokales Docker-Dashboard',
  'about.engineTitle': 'Verbundene Engine',
  'about.sockT': 'Socket',
  'about.serverV': 'Server-Version',
  'about.apiV': 'API-Version',
  'about.contT': 'Container',
  'about.contV': '{running} laufend / {total} gesamt',
  'about.notConnected': 'Nicht verbunden.',
  'about.source': 'Quellcode auf GitHub',

  'theme.title': 'Omarchy-Theme',
  'theme.auto': 'Automatisch (folgt Omarchy)',

  'status.running': 'Läuft',
  'status.exited': 'Beendet',
  'status.error': 'Fehler',
  'status.paused': 'Pausiert',
  'status.restarting': 'Neustart',

  'uptime.unknown': 'unbekannt',
  'uptime.justNow': 'gerade eben',
  'uptime.seconds': 'vor {n} s',
  'uptime.minutes': 'vor {n} min',
  'uptime.hours': 'vor {n} h',
  'uptime.days': 'vor {n} d',

  'collision.desc': 'Host-Port {port}/{proto} wird von mehreren Containern belegt ({names}).',

  'api.unreachable': 'PortPilot-Backend nicht erreichbar.',
} as const;

export type I18nKey = keyof typeof de;

const en: Record<I18nKey, string> = {
  'header.searchPlaceholder': "Search containers, images or ports (e.g. '8000', 'ollama', 'running')…",
  'header.clearSearch': 'Clear search',
  'header.runningOf': '/ {total} running',
  'header.conflictsOne': '{count} port conflict',
  'header.conflictsMany': '{count} port conflicts',
  'header.noConflicts': 'No conflicts',
  'header.engineOffline': 'Engine offline',
  'header.liveOn': 'Live stats on',
  'header.liveOff': 'Paused',
  'header.liveTitle': 'Toggle live metrics',
  'header.refreshTitle': 'Reload everything',
  'header.aboutTitle': 'About PortPilot',
  'header.langTitle': 'Sprache / Language',

  'app.connecting': 'Connecting to the Docker engine…',
  'app.connFailed': 'No connection to the Docker engine',
  'app.retry': 'Try again',
  'app.dockerHint': 'sudo systemctl start docker',

  'nav.title': 'Navigation',
  'nav.dashboard': 'Overview',
  'nav.dashboardHint': 'Status at a glance',
  'nav.containers': 'Containers',
  'nav.containersHint': 'Services and state',
  'nav.ports': 'Ports',
  'nav.portsHint': 'Usage and conflicts',
  'nav.images': 'Images',
  'nav.imagesHint': 'Images on this host',
  'nav.volumes': 'Volumes',
  'nav.volumesHint': 'Persistent data',
  'nav.networks': 'Networks',
  'nav.networksHint': 'Bridges and subnets',
  'nav.events': 'Events',
  'nav.eventsHint': 'Live engine stream',
  'nav.portsFree': 'free',
  'nav.conflictOne': '{count} conflict',
  'nav.conflictMany': '{count} conflicts',
  'nav.unusedBadge': '{count} unused',
  'nav.liveBadge': 'Live',
  'nav.socketTitle': 'Docker socket',
  'nav.socketNotePre': 'Read-only access to',
  'nav.about': 'About PortPilot',

  'dash.allGood': 'All services healthy',
  'dash.attention': 'Issues on this host',
  'dash.summary':
    '{running} of {total} containers active · {conflicts} port conflicts · {failed} stopped or failed',
  'dash.viewConflicts': 'View conflicts',
  'dash.statTotal': 'Total containers',
  'dash.statRunning': 'Running',
  'dash.statFailed': 'Stopped / failed',
  'dash.statPorts': 'Open ports',
  'dash.portsConflictsHint': '{count} conflicts',
  'dash.portsConflictOne': '{count} conflict',
  'dash.portsFreeHint': 'conflict-free',
  'dash.networksHint': '{count} networks',
  'dash.networksOne': '{count} network',
  'dash.gaugeLabel': 'Active services',
  'dash.gaugeCaption': '{running} of {total} containers',
  'dash.hostLoad': 'Host load',
  'dash.hostLoadSub': 'Combined CPU load of running containers',
  'dash.cpuTotal': 'Total CPU',
  'dash.ramUsed': 'RAM used',
  'dash.avgCpu': 'Avg CPU per container',
  'dash.avgRam': 'Avg RAM per container',
  'dash.eventsStat': 'Events',
  'dash.allEyebrow': 'All',
  'dash.containersHeading': 'Containers',
  'dash.viewCards': 'Card view',
  'dash.viewCompact': 'Compact list',
  'dash.empty': 'No containers found on this host.',
  'dash.cardStatus': 'State',
  'dash.cardUptime': 'Uptime',
  'dash.cardPorts': 'Ports',
  'dash.cardPortsNone': 'none',
  'dash.cardCpu': 'CPU',
  'dash.cardRam': 'RAM',
  'dash.cardCpuHistory': 'CPU history',
  'dash.noMetrics': 'No metrics yet — enable live stats.',

  'cont.filter': 'Filter:',
  'cont.fAll': 'All',
  'cont.fRunning': 'Running',
  'cont.fExited': 'Exited',
  'cont.fErrors': 'Errors',
  'cont.groupByCompose': 'Group by Compose',
  'cont.viewCardsTitle': 'Card view',
  'cont.viewListTitle': 'List view',
  'cont.bannerOne': 'Port conflict ({count} affected port)',
  'cont.bannerMany': 'Port conflicts ({count} affected ports)',
  'cont.bannerBody':
    'Multiple containers bind the same host port. The ports view shows which ones.',
  'cont.viewAction': 'View',
  'cont.emptyTitle': 'No containers found',
  'cont.emptySearch': 'No container matches "{q}".',
  'cont.emptyNone': 'No containers exist on this host.',
  'cont.standaloneGroup': 'Standalone containers',
  'cont.projectLabel': 'Project:',
  'cont.servicesCount': '({count} services)',
  'cont.detailsFor': 'Details for {name}',
  'cont.portsLabel': 'Ports:',
  'cont.noPorts': 'No published ports',
  'cont.conflictOnPort': 'Port conflict on host port {port}',
  'cont.portMapsTo': 'Host port {host} → container port {cont}',
  'cont.openInTab': 'Open {url} in a new tab',
  'cont.logsBtn': 'Logs',
  'cont.detailsBtn': 'Details',
  'cont.thName': 'Name & image',
  'cont.thStatus': 'State',
  'cont.thCompose': 'Compose project',
  'cont.thPorts': 'Ports',
  'cont.thMetrics': 'CPU / RAM',
  'cont.thAction': 'Action',
  'cont.standalone': 'standalone',
  'cont.showLogs': 'Show logs',
  'cont.copyBlocked': 'Copy blocked — select the command manually',
  'cont.copyCommand': 'Copy start command',

  'ports.title': 'Ports & conflicts',
  'ports.subtitle': 'All host-published ports across containers and Compose projects.',
  'ports.occupied': 'Occupied ports:',
  'ports.conflictsOne': '{count} conflict',
  'ports.conflictsMany': '{count} conflicts',
  'ports.noConflicts': 'No conflicts',
  'ports.found': 'Port conflicts detected',
  'ports.conflictTag': 'CONFLICT',
  'ports.involved': 'Involved:',
  'ports.searchPh': 'Search ports, containers or projects…',
  'ports.onlyConflicts': 'Only conflicts ({count})',
  'ports.commonTitle': 'Commonly used ports',
  'ports.commonLegend': 'Green = free, red = conflict, cyan = occupied',
  'ports.commonConflict': 'Conflict',
  'ports.commonFree': 'free',
  'ports.thHostPort': 'Host port',
  'ports.thContainer': 'Container',
  'ports.thBoundTo': 'Bound to',
  'ports.thContainerPort': 'Container port',
  'ports.thStatus': 'State',
  'ports.emptyFilter': 'No port matches the filter.',
  'ports.okTag': 'OK',

  'detail.tabMetrics': 'Metrics',
  'detail.tabEnv': 'Environment',
  'detail.tabMounts': 'Mounts',
  'detail.tabNetworks': 'Networks',
  'detail.close': 'Close',
  'detail.logFilterPh': 'Filter logs…',
  'detail.lines': '{count} lines',
  'detail.autoscrollOn': 'Auto-scroll on',
  'detail.autoscrollOff': 'Auto-scroll off',
  'detail.downloadLogs': 'Download logs',
  'detail.logsLoading': 'Loading logs…',
  'detail.logsEmpty': 'This container logged nothing.',
  'detail.logsNoMatch': 'No matches.',
  'detail.notRunning': 'Container is not running — no metrics are collected.',
  'detail.memory': 'Memory',
  'detail.limit': 'Limit: {limit} MB ({pct}%)',
  'detail.netRx': 'Network received',
  'detail.netTx': 'Network sent',
  'detail.entrypoint': 'Entrypoint',
  'detail.restarts': 'Restarted {count}× already.',
  'detail.envEmpty': 'No environment variables set.',
  'detail.loading': 'Loading…',
  'detail.thKey': 'Key',
  'detail.thValue': 'Value',
  'detail.thAction': 'Action',
  'detail.copyVar': 'Copy {k}',
  'detail.mountsEmpty': 'No mounts configured.',
  'detail.thType': 'Type',
  'detail.thSource': 'Source',
  'detail.thDest': 'Target in container',
  'detail.thMode': 'Mode',
  'detail.netsEmpty': 'No networks connected.',
  'detail.thNetwork': 'Network',
  'detail.thIp': 'IP address',
  'detail.thGateway': 'Gateway',
  'detail.thMac': 'MAC address',

  'images.descPre': 'Local images. Unused ones can be removed with',
  'images.descPost': '.',
  'images.searchPh': 'Search repositories or tags…',
  'images.thRepo': 'Repository & tag',
  'images.thId': 'Image ID',
  'images.thSize': 'Size',
  'images.thUsage': 'Usage',
  'images.thCreated': 'Created',
  'images.emptyFilter': 'No image matches the filter.',
  'images.containerOne': '{count} container',
  'images.containerMany': '{count} containers',
  'images.unused': 'unused',

  'volumes.descPre': 'Persistent volumes. Unused ones can be removed with',
  'volumes.descPost': '.',
  'volumes.searchPh': 'Search names or mountpoints…',
  'volumes.thName': 'Name',
  'volumes.thDriver': 'Driver',
  'volumes.thSize': 'Size',
  'volumes.thAttached': 'Attached containers',
  'volumes.thStatus': 'State',
  'volumes.thCreated': 'Created',
  'volumes.emptyFilter': 'No volume matches the filter.',
  'volumes.notDetermined': 'Not determined',
  'volumes.noneAttached': 'none',
  'volumes.inUse': 'in use',
  'volumes.unused': 'unused',

  'networks.title': 'Networks',
  'networks.desc': 'Virtual networks and their attached containers.',
  'networks.searchPh': 'Search names, drivers or subnets…',
  'networks.emptyFilter': 'No network matches the filter.',
  'networks.internalSuffix': ' • internal',
  'networks.containerOne': '{count} container',
  'networks.containerMany': '{count} containers',
  'networks.subnet': 'Subnet',
  'networks.gateway': 'Gateway',
  'networks.noContainers': 'No containers connected',

  'events.title': 'Engine events',
  'events.desc': 'Live Docker engine stream. Events are pushed, not polled.',
  'events.clear': 'Clear list',
  'events.subscribed': 'Subscribed: /api/events',
  'events.received': 'Received: {n}',
  'events.empty': 'No events yet. They appear here as soon as a container starts or stops.',

  'about.layerBackendT': 'Backend — Express + dockerode',
  'about.layerBackendB':
    'Talks directly to the Docker socket and translates engine responses for the UI. Listens on 127.0.0.1 only.',
  'about.layerLiveT': 'Live updates — Server-Sent Events',
  'about.layerLiveB':
    'The UI subscribes to the engine event stream instead of polling. Start, stop and create appear instantly; metrics refresh every 3 seconds.',
  'about.layerRoT': 'Read-only',
  'about.layerRoB':
    'There are no endpoints that change anything. Starting, stopping or deleting containers is deliberately not included.',
  'about.subtitle': 'Local Docker dashboard',
  'about.engineTitle': 'Connected engine',
  'about.sockT': 'Socket',
  'about.serverV': 'Server version',
  'about.apiV': 'API version',
  'about.contT': 'Containers',
  'about.contV': '{running} running / {total} total',
  'about.notConnected': 'Not connected.',
  'about.source': 'Source code on GitHub',

  'theme.title': 'Omarchy theme',
  'theme.auto': 'Automatic (follows Omarchy)',

  'status.running': 'Running',
  'status.exited': 'Exited',
  'status.error': 'Error',
  'status.paused': 'Paused',
  'status.restarting': 'Restarting',

  'uptime.unknown': 'unknown',
  'uptime.justNow': 'just now',
  'uptime.seconds': '{n}s ago',
  'uptime.minutes': '{n} min ago',
  'uptime.hours': '{n}h ago',
  'uptime.days': '{n}d ago',

  'collision.desc': 'Host port {port}/{proto} is used by multiple containers ({names}).',

  'api.unreachable': 'PortPilot backend unreachable.',
};

const STRINGS: Record<Lang, Record<I18nKey, string>> = { de, en };

/** Reine Übersetzungsfunktion für Stellen ohne React-Kontext (API-Client, Utils). */
export function translate(lang: Lang, key: I18nKey, vars?: Record<string, string | number>): string {
  let s: string = STRINGS[lang][key] ?? de[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      s = s.replaceAll(`{${name}}`, String(value));
    }
  }
  return s;
}

export function getLang(): Lang {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'de';
  } catch {
    return 'de';
  }
}

/** DE/EN teilen sich einfache Einzahl/Mehrzahl-Regeln (1 vs. Rest). */
export function plural(lang: Lang, n: number, one: string, many: string): string {
  void lang;
  return n === 1 ? one : many;
}

export type Translate = (key: I18nKey, vars?: Record<string, string | number>) => string;

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translate;
}

const LangContext = createContext<LangContextValue>({
  lang: 'de',
  setLang: () => {},
  t: (key) => key,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => getLang());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* Private Mode o.ä. — Sprache gilt dann nur für diese Sitzung. */
    }
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback<Translate>(
    (key, vars) => translate(lang, key, vars),
    [lang],
  );

  const setLang = useCallback((next: Lang) => setLangState(next), []);

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  return useContext(LangContext);
}
