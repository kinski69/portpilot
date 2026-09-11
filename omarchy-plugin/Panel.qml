import QtQuick
import QtQuick.Controls
import Quickshell
import Quickshell.Io
import qs.Commons
import qs.Ui
import "Model.js" as Model

// PortPilot for the bar: read-only Docker/Podman port monitor.
// Port of kinski69/portpilot (React + Node) to a native Omarchy widget:
// no server, no build step — one helper script + QML.
//
// Bar shows running count + conflict state. Panel lists containers with
// their published host ports and warns on real conflicts (same port,
// overlapping bind address, same protocol). Read-only: controlling stays
// with docker/podman/compose, like upstream.
Panel {
  id: root
  moduleName: "mbo.portpilot"
  ipcTarget: "mbo.portpilot"
  manageIpc: false

  // --- settings ------------------------------------------------------------
  readonly property int refreshIntervalSec: Math.max(2, Number(setting("refreshIntervalSec", 5)))
  readonly property bool showCount: setting("showCount", true) === true

  // --- state ---------------------------------------------------------------
  property var rows: []
  property string listError: ""
  property string actionError: ""
  property int selectedIndex: 0
  property bool cursorActive: false

  readonly property var collisions: Model.detectCollisions(root.rows)
  readonly property int runningCount: Model.runningCount(root.rows)
  readonly property bool barUrgent: root.listError !== "" || root.collisions.length > 0
  readonly property bool countInBar: root.showCount && root.runningCount > 0

  readonly property string stateMessage: {
    if (root.listError !== "") return Model.errorText(root.listError)
    if (root.rows.length === 0) return "No containers"
    return ""
  }

  readonly property string helperPath: {
    var url = String(Qt.resolvedUrl("bin/portpilot-ctl"))
    return url.indexOf("file://") === 0 ? url.substring(7) : url
  }

  readonly property color hoverFill: bar ? Style.hoverFillFor(bar.foreground, Color.accent) : "transparent"
  readonly property color selectedFill: bar ? Style.selectedFillFor(bar.foreground, Color.accent) : "transparent"
  // Gap between count and glyph in the bar: a single space renders almost
  // invisibly at bar font size, so the number and the icon looked glued.
  readonly property string barGap: "  "
  readonly property real openPanelIndicatorWidth: root.countInBar && !button.vertical ? button.glyphPaintedWidth : 0

  // --- behaviour -----------------------------------------------------------
  function refresh() {
    if (!listProc.running) listProc.running = true
  }

  function applyList(raw) {
    rows = Model.parseList(raw)
    listError = ""
    selectedIndex = Math.max(0, Math.min(selectedIndex, rows.length - 1))
  }

  function applyListError(text) {
    // Empty stderr means success (helper is silent on success): clear any
    // previous error instead of reporting one. Non-empty is a real diagnostic.
    var code = Model.clipDiag(text)
    listError = code
  }

  function rowAt(index) {
    return index >= 0 && index < rows.length ? rows[index] : null
  }

  function moveCursor(dy) {
    if (!cursorActive) { cursorActive = true; return }
    selectedIndex = Math.max(0, Math.min(rows.length - 1, selectedIndex + dy))
  }

  function activateCursor() {
    if (!cursorActive) { cursorActive = true; return }
    openRowPort(rowAt(selectedIndex))
  }

  // Left click / Enter: open the first usable TCP port of the row.
  function openRowPort(row) {
    if (!row || !row.ports) return
    for (var i = 0; i < row.ports.length; i++) {
      var url = Model.buildPortUrl(row.ports[i].hostIp, row.ports[i].hostPort, row.ports[i].protocol)
      if (url !== "" && row.running) {
        Quickshell.execDetached(["xdg-open", url])
        return
      }
    }
  }

  function copyText(value) {
    var text = String(value || "")
    if (text === "") return
    Quickshell.execDetached(["bash", "-c", "printf %s " + Util.shellQuote(text) + " | wl-copy"])
  }

  // App dir of the full Web-UI (~/Work/portpilot/bin/portpilot by default,
  // overridable via the portpilotAppDir setting).
  readonly property string appDir: {
    var d = String(setting("portpilotAppDir", ""))
    return d !== "" ? d : (Quickshell.env("HOME") + "/Work/portpilot")
  }

  // Launch the full Web-UI: bin/portpilot is idempotent (builds if needed,
  // starts the :7070 server, opens the browser — or just opens the browser
  // if an instance already runs). Falls back to plain xdg-open when the
  // checkout is not where expected.
  function openPortPilotWeb() {
    var script = root.appDir + "/bin/portpilot"
    webProc.command = ["bash", "-c", "s=" + Util.shellQuote(script) + "; if [ -x \"$s\" ]; then exec \"$s\" >/dev/null 2>&1; else exec xdg-open http://127.0.0.1:7070 >/dev/null 2>&1; fi"]
    webProc.running = true
  }

  IpcHandler {
    target: "mbo.portpilot"
    function open(): void { root.open() }
    function close(): void { root.close() }
    function toggle(): void { root.toggle() }
    function refresh(): void { root.refresh() }
  }

  // --- processes -----------------------------------------------------------
  Process {
    id: listProc
    command: [root.helperPath, "list"]
    stdout: StdioCollector { waitForEnd: true; onStreamFinished: root.applyList(text) }
    stderr: StdioCollector { waitForEnd: true; onStreamFinished: root.applyListError(text) }
  }

  // Runs bin/portpilot (blocking server); output is the server log, discarded.
  Process {
    id: webProc
  }

  Timer {
    interval: (root.opened ? root.refreshIntervalSec : Math.max(root.refreshIntervalSec, 30)) * 1000
    running: true
    repeat: true
    triggeredOnStart: true
    onTriggered: root.refresh()
  }

  Timer {
    interval: 8000
    running: root.actionError !== ""
    repeat: false
    onTriggered: root.actionError = ""
  }

  onOpenedChanged: {
    if (!opened) return
    refresh()
    cursorActive = false
    selectedIndex = 0
  }

  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight

  BarIconButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    text: root.listError !== ""
      ? Model.GLYPH.alert
      : (root.collisions.length > 0
        ? root.collisions.length + root.barGap + Model.GLYPH.alert
        : (root.countInBar && !vertical
          ? root.runningCount + root.barGap + Model.GLYPH.anchor
          : Model.GLYPH.anchor))
    slotSize: Style.bar.iconSlot * ((root.collisions.length > 0 || (root.countInBar && root.runningCount > 0)) && !vertical && root.listError === "" ? 2 : 1)
    active: root.runningCount > 0 || root.barUrgent
    tooltipText: root.listError !== ""
      ? Model.errorText(root.listError)
      : Model.summary(root.rows, root.collisions)
    onPressed: function (mouseButton) { root.toggle() }
  }

  KeyboardPanel {
    id: panel
    anchorItem: button
    owner: root
    bar: root.bar
    open: root.opened
    focusTarget: keyCatcher
    contentWidth: panel.fittedContentWidth(Style.space(430))
    contentHeight: panel.fittedContentHeight(column.implicitHeight)

    PanelKeyCatcher {
      id: keyCatcher
      anchors.fill: parent
      onMoveRequested: function (dx, dy) { if (dy !== 0) root.moveCursor(dy) }
      onActivateRequested: root.activateCursor()
      onCloseRequested: root.close()
      onTextKey: function (key) {
        if (key === "r") { root.refresh(); return }
        var row = root.rowAt(root.selectedIndex)
        if (!row || !root.cursorActive) return
        if (key === "o") root.openRowPort(row)
        else if (key === "c") root.copyText(Model.buildStartCommand(row))
      }
      onTabRequested: function (direction) { root.switchPanel(direction) }

      Column {
        id: column
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.top: parent.top
        spacing: Style.space(12)

        // Hero
        Item {
          width: parent.width
          implicitHeight: Math.max(heroIcon.implicitHeight, heroLabels.implicitHeight, heroCount.implicitHeight)

          Text {
            id: heroIcon
            text: Model.GLYPH.docker
            color: root.collisions.length > 0 ? root.bar.urgent : root.bar.foreground
            font.family: root.bar.fontFamily
            font.pixelSize: Style.font.display
            anchors.left: parent.left
            anchors.verticalCenter: parent.verticalCenter
          }

          Column {
            id: heroLabels
            anchors.left: heroIcon.right
            anchors.leftMargin: Style.space(14)
            anchors.right: heroCount.left
            anchors.rightMargin: Style.space(10)
            anchors.verticalCenter: parent.verticalCenter
            spacing: Style.space(2)

            Text {
              text: "PortPilot"
              color: root.bar.foreground
              font.family: root.bar.fontFamily
              font.pixelSize: Style.font.title
              font.bold: true
              elide: Text.ElideRight
              width: parent.width
            }

            Text {
              text: (root.listError !== "" ? Model.errorText(root.listError) : Model.summary(root.rows, root.collisions)).toUpperCase()
              color: root.barUrgent ? root.bar.urgent : Qt.darker(root.bar.foreground, 1.4)
              font.family: root.bar.fontFamily
              font.pixelSize: Style.font.caption
              font.bold: true
              font.letterSpacing: 1.2
              elide: Text.ElideRight
              width: parent.width
            }
          }

          Text {
            id: heroCount
            text: root.runningCount + "/" + root.rows.length
            color: root.bar.foreground
            font.family: root.bar.fontFamily
            font.pixelSize: Style.font.displayLarge
            font.bold: true
            anchors.right: parent.right
            anchors.verticalCenter: parent.verticalCenter
          }
        }

        PanelSeparator { foreground: root.bar.foreground }

        // Conflict banner (read-only warning, like upstream)
        Column {
          width: parent.width
          visible: root.collisions.length > 0
          spacing: Style.space(6)

          Text {
            text: "PORT-KONFLIKTE (" + root.collisions.length + ")"
            color: root.bar.urgent
            font.family: root.bar.fontFamily
            font.pixelSize: Style.font.caption
            font.bold: true
            font.letterSpacing: 1.2
          }

          Repeater {
            model: root.collisions
            delegate: BorderSurface {
              required property var modelData
              width: parent.width
              radius: Style.cornerRadius
              color: "transparent"
              borderSpec: Border.flat(root.bar.urgent, Style.normalBorderWidth)
              padding: Style.space(10)

              Column {
                width: parent.width
                spacing: Style.space(4)
                Text {
                  width: parent.width
                  text: "Port " + modelData.port + "/" + modelData.protocol
                  color: root.bar.urgent
                  font.family: root.bar.fontFamily
                  font.pixelSize: Style.font.body
                  font.bold: true
                  font.letterSpacing: 0.4
                }
                Text {
                  width: parent.width
                  text: modelData.description
                  color: root.bar.foreground
                  font.family: root.bar.fontFamily
                  font.pixelSize: Style.font.caption
                  wrapMode: Text.WordWrap
                }
              }
            }
          }
        }

        PanelSectionHeader {
          text: "CONTAINERS"
          foreground: root.bar.foreground
          fontFamily: root.bar.fontFamily
        }

        Text {
          visible: root.stateMessage !== "" && root.listError === ""
          width: parent.width
          text: root.stateMessage
          color: Qt.darker(root.bar.foreground, 1.5)
          font.family: root.bar.fontFamily
          font.pixelSize: Style.font.body
        }

        BorderSurface {
          visible: root.listError !== ""
          width: Math.min(parent.width, Style.space(260))
          height: Style.space(38)
          anchors.horizontalCenter: parent.horizontalCenter
          radius: Style.cornerRadius
          color: "transparent"
          borderSpec: Border.flat(Color.accent, Style.normalBorderWidth)

          Row {
            anchors.centerIn: parent
            spacing: Style.space(8)
            Text {
              text: Model.GLYPH.refresh
              color: Color.accent
              font.family: root.bar.fontFamily
              font.pixelSize: Style.font.heading
              anchors.verticalCenter: parent.verticalCenter
            }
            Text {
              text: "Retry"
              color: root.bar.foreground
              font.family: root.bar.fontFamily
              font.pixelSize: Style.font.body
              anchors.verticalCenter: parent.verticalCenter
            }
          }

          MouseArea {
            anchors.fill: parent
            hoverEnabled: true
            cursorShape: Qt.PointingHandCursor
            onClicked: root.refresh()
          }
        }

        ListView {
          id: listView
          width: parent.width
          visible: root.rows.length > 0
          height: visible ? Math.min(contentHeight, Style.space(340)) : 0
          spacing: Style.space(6)
          clip: true
          boundsBehavior: Flickable.StopAtBounds
          interactive: contentHeight > height
          ScrollBar.vertical: ScrollBar { policy: ScrollBar.AsNeeded }
          model: root.rows
          currentIndex: root.selectedIndex

          delegate: CursorSurface {
            required property var modelData
            required property int index

            readonly property bool rowSelected: root.cursorActive && root.selectedIndex === index
            readonly property bool inConflict: {
              var n = modelData.name
              for (var i = 0; i < root.collisions.length; i++) {
                if (root.collisions[i].names.indexOf(n) !== -1) return true
              }
              return false
            }

            hasCursor: rowSelected
            current: modelData.running && !inConflict
            foreground: root.bar.foreground
            fill: root.hoverFill
            currentFill: root.selectedFill
            width: ListView.view.width
            implicitHeight: rowContent.implicitHeight + Style.spacing.rowPaddingX

            PanelToolTip {
              visible: rowMouse.containsMouse
              text: modelData.name + "\n" + modelData.image + "\n" + Model.statusText(modelData)
              fontFamily: root.bar.fontFamily
            }

            MouseArea {
              id: rowMouse
              anchors.fill: parent
              hoverEnabled: true
              cursorShape: Qt.PointingHandCursor
              onContainsMouseChanged: if (containsMouse) { root.cursorActive = true; root.selectedIndex = index }
              onClicked: root.openRowPort(modelData)
            }

            Item {
              id: rowContent
              anchors.left: parent.left
              anchors.right: parent.right
              anchors.verticalCenter: parent.verticalCenter
              anchors.leftMargin: Style.space(10)
              anchors.rightMargin: Style.space(10)
              implicitHeight: Math.max(rowDot.implicitHeight, rowInfo.implicitHeight)

              Rectangle {
                id: rowDot
                width: Style.space(8)
                height: Style.space(8)
                radius: width / 2
                anchors.left: parent.left
                anchors.verticalCenter: parent.verticalCenter
                color: !modelData.running
                  ? Qt.darker(root.bar.foreground, 1.8)
                  : (inConflict ? root.bar.urgent : Color.accent)
              }

              Column {
                id: rowInfo
                spacing: Style.space(1)
                anchors.left: rowDot.right
                anchors.leftMargin: Style.space(10)
                anchors.right: parent.right
                anchors.verticalCenter: parent.verticalCenter

                Text {
                  text: modelData.name
                  color: inConflict ? root.bar.urgent : root.bar.foreground
                  font.family: root.bar.fontFamily
                  font.pixelSize: Style.font.body
                  font.bold: true
                  elide: Text.ElideRight
                  width: parent.width
                }

                Text {
                  text: Model.statusText(modelData) + (modelData.project !== "" ? " · " + modelData.project : "")
                  color: Qt.darker(root.bar.foreground, 1.5)
                  font.family: root.bar.fontFamily
                  font.pixelSize: Style.font.caption
                  elide: Text.ElideRight
                  width: parent.width
                }

                Text {
                  visible: modelData.ports.length > 0
                  text: {
                    var parts = []
                    for (var i = 0; i < modelData.ports.length; i++) {
                      var p = modelData.ports[i]
                      // ASCII-Separator statt "→": der Pfeil fehlt in manchen
                      // Bar-Fonts und die Ports klebten dann aneinander.
                      parts.push(p.hostIp + ":" + p.hostPort + " -> " + p.containerPort + "/" + p.protocol)
                    }
                    return parts.join("   ")
                  }
                  color: inConflict ? root.bar.urgent : Qt.darker(root.bar.foreground, 1.3)
                  font.family: root.bar.fontFamily
                  font.pixelSize: Style.font.caption
                  elide: Text.ElideRight
                  width: parent.width
                }
              }
            }
          }
        }

        PanelSeparator { foreground: root.bar.foreground }

        // Footer: read-only actions only
        Row {
          width: parent.width
          spacing: Style.space(8)

          BorderSurface {
            width: (parent.width - Style.space(8)) / 2
            height: Style.space(34)
            radius: Style.cornerRadius
            color: footerRefresh.containsMouse ? Util.alpha(Color.accent, 0.12) : "transparent"
            borderSpec: Border.flat(Util.alpha(root.bar.foreground, 0.38), Style.normalBorderWidth)
            Text {
              anchors.centerIn: parent
              text: "Refresh  ·  R"
              color: root.bar.foreground
              font.family: root.bar.fontFamily
              font.pixelSize: Style.font.caption
            }
            MouseArea {
              id: footerRefresh
              anchors.fill: parent
              hoverEnabled: true
              cursorShape: Qt.PointingHandCursor
              onClicked: root.refresh()
            }
          }

          BorderSurface {
            width: (parent.width - Style.space(8)) / 2
            height: Style.space(34)
            radius: Style.cornerRadius
            color: footerWeb.containsMouse ? Util.alpha(Color.accent, 0.12) : "transparent"
            borderSpec: Border.flat(Util.alpha(root.bar.foreground, 0.38), Style.normalBorderWidth)
            Text {
              anchors.centerIn: parent
              text: "PortPilot :7070"
              color: root.bar.foreground
              font.family: root.bar.fontFamily
              font.pixelSize: Style.font.caption
            }
            MouseArea {
              id: footerWeb
              anchors.fill: parent
              hoverEnabled: true
              cursorShape: Qt.PointingHandCursor
              onClicked: root.openPortPilotWeb()
            }
            PanelToolTip {
              visible: footerWeb.containsMouse
              text: "Full Web-UI starten/öffnen (bin/portpilot, http://127.0.0.1:7070)"
              fontFamily: root.bar.fontFamily
            }
          }
        }

        Text {
          width: parent.width
          text: "Read-only · Enter/O öffnet Port · C kopiert docker start · R lädt neu"
          color: Qt.darker(root.bar.foreground, 1.8)
          font.family: root.bar.fontFamily
          font.pixelSize: Style.font.caption
          elide: Text.ElideRight
        }
      }
    }
  }
}
