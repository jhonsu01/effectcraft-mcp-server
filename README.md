<p align="center"><img src="icon.png" width="120" alt="EffectCraft Bridge icon"></p>

<h1 align="center">EffectCraft MCP Server</h1>

<p align="center">
  <b>English</b> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Let Claude make motion graphics and visual effects with the <b>EffectCraft</b> installed on your computer — <b>Windows, macOS and Linux</b>:<br>
  animated titles, effects on videos, motion templates, and renders to MP4, ProRes, WebM, GIF, image sequences and Lottie.
</p>

---

## Why

[EffectCraft](https://github.com/storytold/effectcraft) is an open-source, After Effects-class motion graphics compositor written in Rust, with a headless CLI (`effectcraft-cli`), 665 commands, 306 effects, an After Effects-style scripting model and an MCP mode. This [Model Context Protocol](https://modelcontextprotocol.io) server turns that engine into **file-in / file-out tools** for Claude, so you can ask things like:

> *"Make a 5-second 1080×1080 intro: purple background, my logo popping in, and 'SUMMER SALE' typed out with a glow."*
> *"Add a lower third with 'Ana Pérez — Director' over `interview.mp4`."*
> *"Put a cinematic grade and a light blur on every clip in `D:\Clips`, speed them up to 150 % and export MP4s."*
> *"Render the 'Final' comp of `promo.ecproj` as ProRes 4444 with alpha and as a GIF."*
> *"Export this animation as Lottie for my website."*

Sibling of [lightcraft-mcp-server](https://github.com/jhonsu01/lightcraft-mcp-server), [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) and [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Platforms

| OS | EffectCraft package to install | Where the server finds it (no setup needed) | Status |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI or portable zip | `C:\Program Files\EffectCraft`, `%LOCALAPPDATA%\Programs\EffectCraft`, `PATH` | ✅ Verified (Windows 11) |
| **Linux** (x86_64, aarch64) | `.deb`, `.rpm` or `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/effectcraft/bin`, `~/.local/bin`, `PATH` | ✅ Verified (Debian 12, headless) |
| **macOS** 11+ (Apple silicon and Intel) | `.dmg` (the app) **plus** `effectcraft-cli-<version>-macos-universal.zip` | `/Applications/EffectCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Supported, not yet tested on a Mac |

All downloads: [EffectCraft releases](https://github.com/storytold/effectcraft/releases) (there is also a FreeBSD tar.gz; set `EFFECTCRAFT_DIR` to it). Anywhere else: set `EFFECTCRAFT_DIR` (folder, `.tar.gz` root or `EffectCraft.app`) or `EFFECTCRAFT_CLI`.

- **macOS:** the DMG contains only the app. Unzip the separate `effectcraft-cli` zip and move `effectcraft-cli` to `/usr/local/bin` (or point `EFFECTCRAFT_CLI` at it). The first run checks Apple's notarization online.
- **Linux:** the AppImage and Flatpak contain only the app, not `effectcraft-cli`; use the deb, rpm or tar.gz. For an AppImage app, set `EFFECTCRAFT_APP` so `open_in_effectcraft` can start it. On a server without a GPU, the verified setup used `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## How it works

| Part | What it is |
| --- | --- |
| **EffectCraft engine** (`effectcraft-cli mcp`) | EffectCraft's own engine: compositor, text, shapes, keyframes, expressions, effects, templates, render queue and exporters. Started fresh and **headless** for each job with an in-memory project, so it never touches the EffectCraft app or an open project. |
| **MCP server** (Node.js) | 11 high-level tools. Builds comps from a simple layer list, imports your media by reference (it is only read), renders where you asked and checks every output first: EffectCraft itself would replace existing files silently. |
| **Live app** (optional) | `open_in_effectcraft control=true` starts the app with its loopback-only control channel (port 9877) and `run_effectcraft_commands` / `run_effectcraft_script live=true` drive it. The channel has no password: close the app when you are done. |

## Tools

| Tool | What it does |
| --- | --- |
| `create_motion_graphic` | A comp of any size, frame rate and length from layers listed top to bottom — text (any font, stroke, alignment), shapes (rectangle, rounded, ellipse, star, polygon), solids, images / videos / audio (cover or contain, speed), nulls, adjustment layers — with position, scale, rotation, opacity, blend mode and timing; entrances and exits (fade, slide left / right / up / down, pop, zoom, blur, typewriter, spin); keyframes; expressions; effects with animated parameters |
| `apply_effects` | A video or image (or a folder of them) in a comp of its own size: effects with optional keyframes, trim, speed, and layers on top (titles, captions, logos) |
| `use_template` | The built-in Lower Third, Title Card, Logo Reveal, Kinetic Type, Social Square, Vertical Story, Slideshow and 3D Text Orbit, or any `.ectemplate`: set its controls by name, put footage behind it, add layers, change the length |
| `render_project` | Any comp of an `.ecproj` with a time range, resolution, frame rate, quality, bitrate and alpha; the project is never modified |
| `get_project_info` | Comps, layers, footage (with missing files) and Essential Graphics controls |
| `render_frame` | Frames of a project or a video at the given times, shown to Claude and optionally saved |
| `list_effectcraft_catalog` | 306 effects with parameter ids, templates and their controls, fonts, 665 commands, formats |
| `run_effectcraft_script` | After Effects-style JavaScript (`app.project`, `addComp`, `layers.addText`, `setValueAtTime`, expressions...) — most `.jsx` scripts run as they are — then render / save |
| `run_effectcraft_commands` | Any engine commands plus `set_property`, `add_keyframe`, `add_effect`, `get_layer`... in one session (`$steps[N].field` references), headless or live, then render / save |
| `open_in_effectcraft` | Open projects or media in the EffectCraft app (optionally with the control channel) |
| `get_effectcraft_status` | Platform, installation, version, commands, effects, app / control port |

| | |
| --- | --- |
| **Imports** | MP4, MOV, MKV, WebM, AVI, MXF, GIF, PNG, JPEG, TIFF, WebP, EXR, PSD, SVG, WAV, MP3, AAC, FLAC, `.ecproj`, `.ectemplate`, Lottie, glTF / GLB / OBJ |
| **Renders** | MP4 (H.264), HEVC, AV1, ProRes (proxy … 4444 XQ, with alpha), WebM (VP9, alpha), GIF, PNG / JPEG / TIFF / EXR sequences, WAV, AIFF, Lottie (.json), `.ecproj` |

Positions are **pixels from the top-left corner of the comp**; times are **seconds**. Image sequences go to their own `<name>_frames` folder.

## Example

```json
{
  "name": "summer-sale",
  "width": 1080,
  "height": 1080,
  "duration": 5,
  "background": "#2e1065",
  "layers": [
    { "type": "text", "text": "SUMMER SALE", "size": 120, "color": "#ffffff", "y": 760,
      "animate_in": { "type": "typewriter", "duration": 1.2 }, "effects": [ { "effect": "Glow" } ] },
    { "type": "media", "path": "C:\\Brand\\logo.png", "fit": "none", "scale": 60, "y": 420,
      "animate_in": { "type": "pop", "duration": 0.6 }, "animate_out": { "type": "fade", "duration": 0.5 } },
    { "type": "shape", "shape": "ellipse", "width": 900, "height": 900, "color": "#7c3aed", "opacity": 40,
      "expressions": [ { "property": "scale", "expression": "[100 + 5*Math.sin(time*3), 100 + 5*Math.sin(time*3)]" } ] }
  ],
  "formats": ["mp4", "gif", "ecproj"],
  "output_dir": "C:\\Videos"
}
```

## Requirements

- **EffectCraft** with `effectcraft-cli` (tested with **0.7.0**); see [Platforms](#platforms)
- Node.js ≥ 20 (bundled with Claude Desktop for `.mcpb` installs)

## Installation

### Claude Desktop (recommended, all platforms)

1. Download `effectcraft-mcp-server.mcpb` from the [latest release](https://github.com/jhonsu01/effectcraft-mcp-server/releases/latest).
2. Double-click it (or drag it into Claude Desktop → *Settings → Extensions*) and click **Install**.
3. Optional: if EffectCraft is not in a standard location, fill in its folder or the `effectcraft-cli` path in the extension settings.

### Codex (OpenAI)

**Recommended — the marketplace (gets updates):** *Plugins → Add → Add marketplace*, source `jhonsu01/craft-marketplace`, reference `main`, then install **EffectCraft Bridge** from **Craft Bridges** ([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). New versions arrive by refreshing the marketplace. Or upload the zip (Codex then keeps it in your account and refuses a newer zip with the same name):

1. Download `effectcraft-mcp-server-<version>-codex.zip` from the [latest release](https://github.com/jhonsu01/effectcraft-mcp-server/releases/latest).
2. In Codex: *Plugins → Add → New plugin*, choose the zip and click **Add plugin**.
3. Codex starts the server with `node`, so Node.js ≥ 20 must be on `PATH`. If EffectCraft is not in a standard location, set `EFFECTCRAFT_DIR` or `EFFECTCRAFT_CLI` as system environment variables (Codex has no settings form for local plugins).

### Claude Code / other MCP clients

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

## Configuration

| Variable | Meaning |
| --- | --- |
| `EFFECTCRAFT_DIR` | EffectCraft folder, one of its executables, a `.tar.gz` root (with `bin/`) or `EffectCraft.app`. Default: auto-detect |
| `EFFECTCRAFT_CLI` | Path of `effectcraft-cli` / `effectcraft-cli.exe` (wins over `EFFECTCRAFT_DIR`) |
| `EFFECTCRAFT_APP` | Path of the desktop app when it lives elsewhere (e.g. a Linux AppImage) |
| `EFFECTCRAFT_CONTROL_PORT` | Control port of the desktop app (default 9877) |
| `EFFECTCRAFT_MCP_TIMEOUT` | Maximum seconds per engine call (default 3600) |

## Safety

- Files are **never overwritten** unless `overwrite: true`: a free name (`_2`) is used in folders and an existing `output_path` is an error. Inputs and `.ecproj` projects are only read; a project is saved only as a new copy (format `ecproj`).
- All paths must be absolute. The engine runs headless with an in-memory project and never touches the EffectCraft app unless `live: true`.
- Everything runs locally with no network access. Each job uses a private engine in a temporary folder that is deleted at the end.

## Development

```bash
npm run build       # TypeScript + single-file bundle (dist/bundle.cjs)
npm test            # unit tests (Windows, macOS and Linux path logic)
npm run test:e2e    # 23 end-to-end checks over real MCP stdio (synthetic image; videos rendered by EffectCraft)
npm run pack:mcpb   # effectcraft-mcp-server.mcpb
npm run pack:codex  # Codex plugin zip
```

Linux test in Docker (unpack `effectcraft-<version>-linux-x86_64.tar.gz` first):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/path/to/effectcraft-0.7.0-linux-x86_64:/opt/effectcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## License

Apache-2.0. EffectCraft is © its authors (Storytold), MIT or Apache-2.0.
This project is not affiliated with or endorsed by EffectCraft or Storytold. After Effects is a trademark of Adobe.
