<p align="center"><img src="icon.png" width="120" alt="EffectCraft-Bridge-Symbol"></p>

<h1 align="center">EffectCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <b>Deutsch</b> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Lassen Sie Claude Motion Graphics und visuelle Effekte mit dem auf Ihrem Computer installierten <b>EffectCraft</b> erstellen — <b>Windows, macOS und Linux</b>:<br>
  animierte Titel, Effekte auf Videos, Bewegungsvorlagen und Renderings als MP4, ProRes, WebM, GIF, Bildsequenzen und Lottie.
</p>

---

## Warum

[EffectCraft](https://github.com/storytold/effectcraft) ist ein quelloffener Motion-Graphics-Compositor auf After-Effects-Niveau, geschrieben in Rust, mit einer CLI ohne Oberfläche (`effectcraft-cli`), 665 Befehlen, 306 Effekten, einem Skriptmodell im After-Effects-Stil und einem MCP-Modus. Dieser [Model Context Protocol](https://modelcontextprotocol.io)-Server macht daraus **Datei-zu-Datei-Werkzeuge** für Claude, sodass Sie zum Beispiel sagen können:

> *„Mach ein 5-Sekunden-Intro in 1080×1080: lila Hintergrund, mein Logo springt herein und ‚SOMMER-SALE‘ wird Buchstabe für Buchstabe mit Leuchten getippt.“*
> *„Setze eine Bauchbinde ‚Ana Pérez — Regisseurin‘ über `interview.mp4`.“*
> *„Gib allen Clips in `D:\Clips` einen Kino-Look und leichte Unschärfe, beschleunige sie auf 150 % und exportiere MP4s.“*
> *„Rendere die Komposition ‚Final‘ aus `promo.ecproj` als ProRes 4444 mit Alpha und als GIF.“*
> *„Exportiere diese Animation als Lottie für meine Website.“*

Schwesterprojekt von [lightcraft-mcp-server](https://github.com/jhonsu01/lightcraft-mcp-server), [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) und [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Plattformen

| System | Zu installierendes EffectCraft-Paket | Wo der Server es findet (ohne Einrichtung) | Status |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI oder portables Zip | `C:\Program Files\EffectCraft`, `%LOCALAPPDATA%\Programs\EffectCraft`, `PATH` | ✅ Geprüft (Windows 11) |
| **Linux** (x86_64, aarch64) | `.deb`, `.rpm` oder `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/effectcraft/bin`, `~/.local/bin`, `PATH` | ✅ Geprüft (Debian 12, ohne Oberfläche) |
| **macOS** 11+ (Apple Silicon und Intel) | `.dmg` (die App) **plus** `effectcraft-cli-<Version>-macos-universal.zip` | `/Applications/EffectCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Unterstützt, noch nicht auf einem Mac getestet |

Downloads: [EffectCraft-Releases](https://github.com/storytold/effectcraft/releases) (es gibt auch ein tar.gz für FreeBSD; `EFFECTCRAFT_DIR` darauf zeigen lassen). An anderen Orten: `EFFECTCRAFT_DIR` (Ordner, Wurzel des `.tar.gz` oder `EffectCraft.app`) oder `EFFECTCRAFT_CLI` setzen.

- **macOS:** Das DMG enthält nur die App. Entpacken Sie das separate `effectcraft-cli`-Zip und verschieben Sie `effectcraft-cli` nach `/usr/local/bin` (oder setzen Sie `EFFECTCRAFT_CLI`). Beim ersten Start wird Apples Beglaubigung online geprüft.
- **Linux:** AppImage und Flatpak enthalten nur die App, nicht `effectcraft-cli`; nutzen Sie deb, rpm oder tar.gz. Ist die App ein AppImage, setzen Sie `EFFECTCRAFT_APP`, damit `open_in_effectcraft` sie starten kann. Auf einem Server ohne GPU nutzte die geprüfte Umgebung `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## Funktionsweise

| Teil | Was es ist |
| --- | --- |
| **EffectCraft-Engine** (`effectcraft-cli mcp`) | EffectCrafts eigene Engine: Compositor, Text, Formen, Keyframes, Expressions, Effekte, Vorlagen, Renderliste und Exporter. Für jede Aufgabe neu und **ohne Oberfläche** mit einem Projekt im Arbeitsspeicher gestartet, berührt sie nie die App oder ein geöffnetes Projekt. |
| **MCP-Server** (Node.js) | 11 Werkzeuge auf hoher Ebene. Baut Kompositionen aus einer einfachen Ebenenliste, importiert Ihre Medien per Verweis (sie werden nur gelesen), rendert an das gewünschte Ziel und prüft vorher jede Ausgabe: EffectCraft selbst würde vorhandene Dateien ohne Rückfrage ersetzen. |
| **Live-App** (optional) | `open_in_effectcraft control=true` startet die App mit ihrem nur lokalen Steuerkanal (Port 9877) und `run_effectcraft_commands` / `run_effectcraft_script live=true` steuern sie. Der Kanal hat kein Passwort: Schließen Sie die App, wenn Sie fertig sind. |

## Werkzeuge

| Werkzeug | Funktion |
| --- | --- |
| `create_motion_graphic` | Eine Komposition beliebiger Größe, Bildrate und Länge aus Ebenen von oben nach unten — Text (jede Schrift, Kontur, Ausrichtung), Formen (Rechteck, abgerundet, Ellipse, Stern, Polygon), Farbflächen, Bilder / Videos / Audio (füllen oder einpassen, Geschwindigkeit), Null-Objekte, Einstellungsebenen — mit Position, Skalierung, Drehung, Deckkraft, Füllmethode und Timing; Ein- und Ausblendungen (Blende, Einschieben links / rechts / oben / unten, Pop, Zoom, Unschärfe, Schreibmaschine, Drehung); Keyframes; Expressions; Effekte mit animierten Parametern |
| `apply_effects` | Ein Video oder Bild (oder ein Ordner) in einer Komposition seiner Größe: Effekte mit optionalen Keyframes, Schnitt, Geschwindigkeit und Ebenen darüber (Titel, Untertitel, Logos) |
| `use_template` | Die mitgelieferten Vorlagen Lower Third, Title Card, Logo Reveal, Kinetic Type, Social Square, Vertical Story, Slideshow und 3D Text Orbit oder jede `.ectemplate`: Steuerelemente per Namen setzen, Video dahinter legen, Ebenen hinzufügen, Länge ändern |
| `render_project` | Jede Komposition einer `.ecproj` mit Zeitbereich, Auflösung, Bildrate, Qualität, Bitrate und Alpha; das Projekt wird nie verändert |
| `get_project_info` | Kompositionen, Ebenen, Footage (mit fehlenden Dateien) und Steuerelemente der Essential Graphics |
| `render_frame` | Einzelbilder eines Projekts oder Videos zu den angegebenen Zeiten, die Claude sieht und optional gespeichert |
| `list_effectcraft_catalog` | 306 Effekte mit Parameter-IDs, Vorlagen mit ihren Steuerelementen, Schriften, 665 Befehle, Formate |
| `run_effectcraft_script` | JavaScript im After-Effects-Stil (`app.project`, `addComp`, `layers.addText`, `setValueAtTime`, Expressions...) — die meisten `.jsx`-Skripte laufen unverändert — danach rendern / speichern |
| `run_effectcraft_commands` | Beliebige Engine-Befehle plus `set_property`, `add_keyframe`, `add_effect`, `get_layer`... in einer Sitzung (Verweise `$steps[N].feld`), ohne Oberfläche oder live, danach rendern / speichern |
| `open_in_effectcraft` | Öffnet Projekte oder Medien in der EffectCraft-App (optional mit Steuerkanal) |
| `get_effectcraft_status` | Plattform, Installation, Version, Befehle, Effekte, App / Steuerport |

| | |
| --- | --- |
| **Importiert** | MP4, MOV, MKV, WebM, AVI, MXF, GIF, PNG, JPEG, TIFF, WebP, EXR, PSD, SVG, WAV, MP3, AAC, FLAC, `.ecproj`, `.ectemplate`, Lottie, glTF / GLB / OBJ |
| **Rendert** | MP4 (H.264), HEVC, AV1, ProRes (Proxy … 4444 XQ, mit Alpha), WebM (VP9, Alpha), GIF, PNG- / JPEG- / TIFF- / EXR-Sequenzen, WAV, AIFF, Lottie (.json), `.ecproj` |

Positionen sind **Pixel ab der linken oberen Ecke der Komposition**; Zeiten sind **Sekunden**. Bildsequenzen landen in einem eigenen Ordner `<Name>_frames`.

## Beispiel

```json
{
  "name": "sommer-sale",
  "width": 1080,
  "height": 1080,
  "duration": 5,
  "background": "#2e1065",
  "layers": [
    { "type": "text", "text": "SOMMER-SALE", "size": 120, "color": "#ffffff", "y": 760,
      "animate_in": { "type": "typewriter", "duration": 1.2 }, "effects": [ { "effect": "Glow" } ] },
    { "type": "media", "path": "C:\\Marke\\logo.png", "fit": "none", "scale": 60, "y": 420,
      "animate_in": { "type": "pop", "duration": 0.6 }, "animate_out": { "type": "fade", "duration": 0.5 } },
    { "type": "shape", "shape": "ellipse", "width": 900, "height": 900, "color": "#7c3aed", "opacity": 40,
      "expressions": [ { "property": "scale", "expression": "[100 + 5*Math.sin(time*3), 100 + 5*Math.sin(time*3)]" } ] }
  ],
  "formats": ["mp4", "gif", "ecproj"],
  "output_dir": "C:\\Videos"
}
```

## Voraussetzungen

- **EffectCraft** mit `effectcraft-cli` (getestet mit **0.7.0**); siehe [Plattformen](#plattformen)
- Node.js ≥ 20 (bei `.mcpb`-Installationen in Claude Desktop enthalten)

## Installation

### Claude Desktop (empfohlen, alle Plattformen)

1. Laden Sie `effectcraft-mcp-server.mcpb` aus dem [neuesten Release](https://github.com/jhonsu01/effectcraft-mcp-server/releases/latest) herunter.
2. Doppelklicken (oder in Claude Desktop → *Einstellungen → Erweiterungen* ziehen) und auf **Installieren** klicken.
3. Optional: Liegt EffectCraft nicht am Standardort, tragen Sie seinen Ordner oder den Pfad von `effectcraft-cli` in den Einstellungen der Erweiterung ein.

### Claude Code / andere MCP-Clients

```bash
git clone https://github.com/jhonsu01/effectcraft-mcp-server.git
cd effectcraft-mcp-server
npm install
npm run build
```

Windows:

```bash
claude mcp add effectcraft -- node "%CD%\dist\bundle.cjs"
```

macOS / Linux:

```bash
claude mcp add effectcraft -- node "$PWD/dist/bundle.cjs"
```

## Konfiguration

| Variable | Bedeutung |
| --- | --- |
| `EFFECTCRAFT_DIR` | EffectCraft-Ordner, eine seiner Programmdateien, die Wurzel eines `.tar.gz` (mit `bin/`) oder `EffectCraft.app`. Standard: automatische Erkennung |
| `EFFECTCRAFT_CLI` | Pfad zu `effectcraft-cli` / `effectcraft-cli.exe` (hat Vorrang vor `EFFECTCRAFT_DIR`) |
| `EFFECTCRAFT_APP` | Pfad der Desktop-App, wenn sie woanders liegt (z. B. ein AppImage unter Linux) |
| `EFFECTCRAFT_CONTROL_PORT` | Steuerport der Desktop-App (Standard 9877) |
| `EFFECTCRAFT_MCP_TIMEOUT` | Maximale Sekunden pro Engine-Aufruf (Standard 3600) |

## Sicherheit

- Dateien werden **nie überschrieben**, außer mit `overwrite: true`: In Ordnern wird ein freier Name (`_2`) verwendet, ein vorhandener `output_path` ist ein Fehler. Medien und `.ecproj`-Projekte werden nur gelesen; ein Projekt wird nur als neue Kopie gespeichert (Format `ecproj`).
- Alle Pfade müssen absolut sein. Die Engine läuft ohne Oberfläche mit einem Projekt im Arbeitsspeicher und berührt die EffectCraft-App nie, außer mit `live: true`.
- Alles läuft lokal ohne Netzwerkzugriff. Jede Aufgabe nutzt eine private Engine in einem temporären Ordner, der danach gelöscht wird.

## Entwicklung

```bash
npm run build       # TypeScript + Bundle in einer Datei (dist/bundle.cjs)
npm test            # Unit-Tests (Pfadlogik für Windows, macOS und Linux)
npm run test:e2e    # 21 End-to-End-Prüfungen über echtes MCP-stdio (synthetisches Bild; Videos von EffectCraft gerendert)
npm run pack:mcpb   # effectcraft-mcp-server.mcpb
```

Linux-Test in Docker (zuerst `effectcraft-<Version>-linux-x86_64.tar.gz` entpacken):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/pfad/zu/effectcraft-0.7.0-linux-x86_64:/opt/effectcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## Lizenz

Apache-2.0. EffectCraft ist © seiner Autoren (Storytold), MIT oder Apache-2.0.
Dieses Projekt ist nicht mit EffectCraft oder Storytold verbunden und wird von ihnen nicht unterstützt. After Effects ist eine Marke von Adobe.
