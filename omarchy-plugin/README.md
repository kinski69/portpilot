# PortPilot for the bar (`mbo.portpilot`)

Read-only Docker/Podman port monitor as native Omarchy bar widget — a port of
[kinski69/portpilot](https://github.com/kinski69/portpilot) (React + Node) to
QML + one helper script. No server, no build step, no new daemon.

The bar (top, `right` section) shows `running/total` plus a conflict badge.
The panel lists containers with published host ports and warns on **real**
conflicts: same port, overlapping bind address, same protocol — same rules as
upstream. Read-only like upstream: controlling stays with
`docker` / `podman` / compose (see also `io.github.dicemans.docker-vms` for
start/stop from the bar).

## Install

```bash
omarchy plugin validate ~/.config/omarchy/plugins/mbo.portpilot
omarchy bar put mbo.portpilot --after omarchy.system-update
# reload shell afterwards (logout/login or restart omarchy-shell)
```

Remove:

```bash
omarchy plugin disable mbo.portpilot
rm -rf ~/.config/omarchy/plugins/mbo.portpilot
```

## Usage

- Left click: open/close. `Enter`/`O` on a row opens its first running TCP
  port in the browser, `C` copies `docker start <name>`, `R` refreshes.
- Footer `PortPilot :7070` opens the full Web-UI if the original app runs:
  `~/Work/portpilot/bin/portpilot` → <http://127.0.0.1:7070>.
- Engine: `docker` preferred, `podman` fallback, override with
  `PORTPILOT_ENGINE=podman`.

## Test the helper without the bar

```bash
~/.config/omarchy/plugins/mbo.portpilot/bin/portpilot-ctl engine
~/.config/omarchy/plugins/mbo.portpilot/bin/portpilot-ctl list
```

## Upstream fixes applied here

Found while reviewing `kinski69/portpilot` v1.1.1 (`npm run build` ✅,
`tsc --noEmit` ✅):

1. `server/docker.ts` ignores rootless + Podman sockets (`$XDG_RUNTIME_DIR/docker.sock`,
   `$XDG_RUNTIME_DIR/podman/podman.sock`) — only `bin/portpilot` knew them.
   The widget uses the CLI instead, so both engines work out of the box.
2. `server/routes.ts` zero-length log frame advances the demux offset by 16
   instead of 8 bytes (`offset = end; if (length === 0) offset += 8`), skipping
   the next frame header.
3. `buildStartCommand()` interpolates `composeWorkingDir` unquoted — breaks on
   paths with spaces.
4. Pause only stops stats polling; SSE events still trigger full `loadAll()`.
5. `mapStatus()` folds `created`/`removing` into `exited`; `listImages()` only
   counts the first tag for `inUse`.
