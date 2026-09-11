// Pure helpers for the PortPilot bar widget: parsing the helper's TSV and
// detecting real host-port conflicts. Ported from kinski69/portpilot
// src/utils/dockerUtils.ts — kept free of QML types so the panel stays thin.
//
// Helper TSV (0x1F separated, one line per container):
//   name \x1f image \x1f state \x1f status \x1f project \x1f ports \x1f id
// ports is the raw `docker ps` Ports column, e.g.
//   "0.0.0.0:8080->80/tcp, :::8080->80/tcp" or "127.0.0.1:11434->11434/tcp".

var FIELDS = 7

var MAX_INPUT = 262144
var MAX_ROWS = 200
var MAX_FIELD = 512
var MAX_DIAG = 400

var GLYPH = {
  docker: "󰡨",
  // Bar glyph: anchor (PortPilot harbor theme, like upstream's Anchor logo).
  // Deliberately NOT the whale: docker-vms next to us shows "N 󰡨" and two
  // identical buttons would be unreadable.
  anchor: "",
  alert: "󰀦",
  ok: "󰄬",
  open: "󰖟",
  copy: "󰆏",
  refresh: "󰑓"
}

function clip(value) {
  return String(value === undefined || value === null ? "" : value).slice(0, MAX_FIELD)
}

function clipDiag(value) {
  return String(value === undefined || value === null ? "" : value).trim().slice(0, MAX_DIAG)
}

function parsePorts(raw) {
  var out = []
  var text = clip(raw)
  if (text === "") return out
  var seen = {}
  var tokens = text.split(",")
  for (var i = 0; i < tokens.length; i++) {
    var tok = tokens[i].trim()
    if (tok === "") continue
    // [hostIp:]hostPort->containerPort/proto — exposed-only ("80/tcp") has
    // no "->" and is not a host binding, so it is skipped.
    var m = tok.match(/^(?:(.*):)?(\d+)->(\d+)\/(tcp|udp)$/)
    if (!m) continue
    var hostIp = m[1] === undefined || m[1] === "" ? "0.0.0.0" : m[1]
    // Docker reports a wildcard v6 bind (":::8080->80/tcp") next to the v4
    // one; unify so one container never conflicts with itself.
    if (hostIp === "::") hostIp = "0.0.0.0"
    var hostPort = parseInt(m[2], 10)
    var containerPort = parseInt(m[3], 10)
    var protocol = m[4] === "udp" ? "udp" : "tcp"
    if (!hostPort || !containerPort) continue
    var key = hostIp + ":" + hostPort + "/" + protocol
    if (seen[key]) continue
    seen[key] = true
    out.push({ hostIp: hostIp, hostPort: hostPort, containerPort: containerPort, protocol: protocol })
  }
  return out
}

function parseList(raw) {
  var rows = []
  var lines = String(raw || "").slice(0, MAX_INPUT).split("\n")
  for (var i = 0; i < lines.length && rows.length < MAX_ROWS; i++) {
    if (!lines[i]) continue
    var f = lines[i].split("")
    if (f.length < FIELDS) continue
    var state = clip(f[2]) || "unknown"
    var ports = parsePorts(f[5])
    rows.push({
      name: clip(f[0]),
      image: clip(f[1]),
      state: state,
      status: clip(f[3]),
      project: clip(f[4]),
      ports: ports,
      id: clip(f[6]),
      running: state === "running"
    })
  }
  return rows
}

// --- conflict detection (upstream logic, unchanged in spirit) ---------------

var WILDCARDS = { "0.0.0.0": true, "::": true, "": true }

function isWildcard(ip) {
  return !!WILDCARDS[ip]
}

function addressesOverlap(a, b) {
  if (isWildcard(a) || isWildcard(b)) return true
  return a === b
}

// Only running/restarting containers can fight over a socket right now.
// Stopped ones are listed but never reported as a live conflict.
function detectCollisions(rows) {
  var active = []
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].state === "running" || rows[i].state === "restarting") active.push(rows[i])
  }
  var bindings = {}
  for (var c = 0; c < active.length; c++) {
    var row = active[c]
    for (var p = 0; p < row.ports.length; p++) {
      var port = row.ports[p]
      var key = port.hostPort + "/" + port.protocol
      if (!bindings[key]) bindings[key] = []
      bindings[key].push({ row: row, port: port })
    }
  }
  var out = []
  for (var key in bindings) {
    var entries = bindings[key]
    var distinct = {}
    for (var e = 0; e < entries.length; e++) distinct[entries[e].row.id || entries[e].row.name] = true
    if (Object.keys(distinct).length < 2) continue
    var conflicting = []
    for (var a = 0; a < entries.length; a++) {
      for (var b = 0; b < entries.length; b++) {
        if (a === b) continue
        if ((entries[a].row.id || entries[a].row.name) === (entries[b].row.id || entries[b].row.name)) continue
        if (addressesOverlap(entries[a].port.hostIp, entries[b].port.hostIp)) {
          conflicting.push(entries[a])
          break
        }
      }
    }
    var seenRows = {}
    var involved = []
    for (var k = 0; k < conflicting.length; k++) {
      var id = conflicting[k].row.id || conflicting[k].row.name
      if (seenRows[id]) continue
      seenRows[id] = true
      involved.push(conflicting[k])
    }
    if (involved.length < 2) continue
    var parts = key.split("/")
    var names = []
    for (var n = 0; n < involved.length; n++) {
      names.push(involved[n].row.project || involved[n].row.name)
    }
    out.push({
      port: parseInt(parts[0], 10),
      protocol: parts[1] === "udp" ? "udp" : "tcp",
      names: involved.map(function (v) { return v.row.name }),
      detail: involved.map(function (v) { return { name: v.row.name, hostIp: v.port.hostIp } }),
      description: "Host-Port " + key + " wird von mehreren Containern belegt (" + names.join(", ") + ")."
    })
  }
  out.sort(function (x, y) { return x.port - y.port })
  return out
}

function runningCount(rows) {
  var n = 0
  for (var i = 0; i < rows.length; i++) if (rows[i].running) n++
  return n
}

function summary(rows, collisions) {
  var r = runningCount(rows)
  if (rows.length === 0) return "No containers"
  var s = r + "/" + rows.length + " running"
  if (collisions.length > 0) s += " · " + collisions.length + " port conflict" + (collisions.length === 1 ? "" : "s")
  return s
}

function statusText(row) {
  return row.status || row.state
}

function needsAttention(row) {
  return row.state === "restarting" || row.state === "dead" || row.state === "removing"
}

function buildPortUrl(hostIp, hostPort, protocol) {
  if (protocol !== "tcp") return ""
  var HTTPS = { 443: true, 8443: true, 9443: true }
  var wildcard = hostIp === "0.0.0.0" || hostIp === "::" || hostIp === ""
  var host = wildcard ? "127.0.0.1" : hostIp
  if (!wildcard && host.indexOf(":") !== -1) host = "[" + host + "]"
  return (HTTPS[hostPort] ? "https" : "http") + "://" + host + ":" + hostPort
}

function buildStartCommand(row) {
  return "docker start " + row.name
}

function errorText(code) {
  var c = clipDiag(code)
  if (c === "engine-missing") return "Neither docker nor podman found"
  if (c === "daemon-unreachable") return "Engine unreachable — is the daemon running?"
  if (c === "engine-permission") return "No access to the engine socket — user in docker group?"
  if (c === "list-truncated") return "List truncated at 200 containers"
  if (c === "") return ""
  return c
}
