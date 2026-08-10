/**
 * Text in die Zwischenablage legen — mit Rueckfallebene.
 *
 * `navigator.clipboard` gibt es nur in sicheren Kontexten (https oder
 * localhost). Wird PortPilot ueber die LAN-Adresse geoeffnet, fehlt die API
 * komplett; ausserdem lehnt sie ab, wenn das Dokument gerade keinen Fokus hat.
 * Beides fiel bisher lautlos aus, weil die Zusage nicht ausgewertet wurde.
 *
 * @returns true, wenn der Text tatsaechlich uebernommen wurde.
 */
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Weiter mit der Rueckfallebene.
    }
  }

  return copyViaTextarea(text);
}

/** Aeltere Methode ueber ein unsichtbares Textfeld — funktioniert auch ueber http. */
function copyViaTextarea(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  // Ausserhalb des Sichtbereichs parken, damit die Seite nicht springt.
  area.style.position = 'fixed';
  area.style.top = '-1000px';
  area.style.opacity = '0';
  document.body.appendChild(area);

  try {
    area.select();
    area.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(area);
  }
}
