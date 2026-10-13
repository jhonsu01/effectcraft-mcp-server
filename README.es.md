<p align="center"><img src="icon.png" width="120" alt="Icono de EffectCraft Bridge"></p>

<h1 align="center">EffectCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <b>Español</b> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Deja que Claude haga gráficos animados y efectos visuales con el <b>EffectCraft</b> instalado en tu ordenador — <b>Windows, macOS y Linux</b>:<br>
  títulos animados, efectos sobre vídeos, plantillas animadas y renders a MP4, ProRes, WebM, GIF, secuencias de imágenes y Lottie.
</p>

---

## Por qué

[EffectCraft](https://github.com/storytold/effectcraft) es un compositor de gráficos animados de código abierto, al nivel de After Effects, escrito en Rust, con una CLI sin interfaz (`effectcraft-cli`), 665 comandos, 306 efectos, un modelo de scripts al estilo de After Effects y un modo MCP. Este servidor [Model Context Protocol](https://modelcontextprotocol.io) convierte ese motor en **herramientas de archivo a archivo** para Claude, para pedir cosas como:

> *"Haz una intro de 5 segundos en 1080×1080: fondo morado, mi logo apareciendo con rebote y 'REBAJAS DE VERANO' escrito letra a letra con brillo."*
> *"Pon un rótulo con 'Ana Pérez — Directora' sobre `entrevista.mp4`."*
> *"Aplica un etalonaje cinematográfico y un ligero desenfoque a todos los clips de `D:\Clips`, acelera al 150 % y exporta MP4."*
> *"Renderiza la composición 'Final' de `promo.ecproj` en ProRes 4444 con alfa y como GIF."*
> *"Exporta esta animación como Lottie para mi web."*

Hermano de [lightcraft-mcp-server](https://github.com/jhonsu01/lightcraft-mcp-server), [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) y [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Plataformas

| Sistema | Paquete de EffectCraft a instalar | Dónde lo encuentra el servidor (sin configurar) | Estado |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI o zip portátil | `C:\Program Files\EffectCraft`, `%LOCALAPPDATA%\Programs\EffectCraft`, `PATH` | ✅ Verificado (Windows 11) |
| **Linux** (x86_64, aarch64) | `.deb`, `.rpm` o `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/effectcraft/bin`, `~/.local/bin`, `PATH` | ✅ Verificado (Debian 12, sin interfaz) |
| **macOS** 11+ (Apple silicon e Intel) | `.dmg` (la app) **más** `effectcraft-cli-<versión>-macos-universal.zip` | `/Applications/EffectCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Soportado, aún sin probar en un Mac |

Descargas: [versiones de EffectCraft](https://github.com/storytold/effectcraft/releases) (hay también un tar.gz para FreeBSD; apunta `EFFECTCRAFT_DIR` a él). En cualquier otro sitio: define `EFFECTCRAFT_DIR` (carpeta, raíz del `.tar.gz` o `EffectCraft.app`) o `EFFECTCRAFT_CLI`.

- **macOS:** el DMG solo trae la app. Descomprime el zip aparte de `effectcraft-cli` y mueve `effectcraft-cli` a `/usr/local/bin` (o apunta `EFFECTCRAFT_CLI` a él). La primera ejecución comprueba en línea la notarización de Apple.
- **Linux:** el AppImage y el Flatpak solo traen la app, sin `effectcraft-cli`; usa el deb, el rpm o el tar.gz. Si la app es un AppImage, define `EFFECTCRAFT_APP` para que `open_in_effectcraft` pueda abrirla. En un servidor sin GPU, la configuración verificada usó `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## Cómo funciona

| Parte | Qué es |
| --- | --- |
| **Motor de EffectCraft** (`effectcraft-cli mcp`) | El propio motor de EffectCraft: compositor, texto, formas, fotogramas clave, expresiones, efectos, plantillas, cola de render y exportadores. Se inicia de cero y **sin interfaz** en cada tarea con un proyecto en memoria, así que nunca toca la app ni un proyecto abierto. |
| **Servidor MCP** (Node.js) | 11 herramientas de alto nivel. Construye composiciones a partir de una lista de capas sencilla, importa tus medios por referencia (solo se leen), renderiza donde pediste y comprueba cada salida antes: EffectCraft por sí solo reemplazaría archivos existentes sin avisar. |
| **App en vivo** (opcional) | `open_in_effectcraft control=true` abre la app con su canal de control solo local (puerto 9877) y `run_effectcraft_commands` / `run_effectcraft_script live=true` la controlan. El canal no tiene contraseña: cierra la app al terminar. |

## Herramientas

| Herramienta | Qué hace |
| --- | --- |
| `create_motion_graphic` | Una composición de cualquier tamaño, velocidad y duración a partir de capas listadas de arriba abajo — texto (cualquier fuente, contorno, alineación), formas (rectángulo, redondeado, elipse, estrella, polígono), sólidos, imágenes / vídeos / audio (cubrir o encajar, velocidad), nulos, capas de ajuste — con posición, escala, rotación, opacidad, modo de fusión y tiempos; entradas y salidas (fundido, deslizar izquierda / derecha / arriba / abajo, rebote, zoom, desenfoque, máquina de escribir, giro); fotogramas clave; expresiones; efectos con parámetros animados |
| `apply_effects` | Un vídeo o imagen (o una carpeta) en una composición de su propio tamaño: efectos con fotogramas clave opcionales, recorte, velocidad y capas encima (títulos, subtítulos, logos) |
| `use_template` | Las plantillas incluidas Lower Third, Title Card, Logo Reveal, Kinetic Type, Social Square, Vertical Story, Slideshow y 3D Text Orbit, o cualquier `.ectemplate`: cambia sus controles por nombre, pon un vídeo detrás, añade capas, cambia la duración |
| `render_project` | Cualquier composición de un `.ecproj` con rango de tiempo, resolución, velocidad, calidad, bitrate y alfa; el proyecto nunca se modifica |
| `get_project_info` | Composiciones, capas, metraje (con archivos que faltan) y controles de Gráficos esenciales |
| `render_frame` | Fotogramas de un proyecto o un vídeo en los tiempos indicados, que Claude ve y opcionalmente se guardan |
| `list_effectcraft_catalog` | 306 efectos con los ids de sus parámetros, plantillas y sus controles, fuentes, 665 comandos, formatos |
| `run_effectcraft_script` | JavaScript al estilo de After Effects (`app.project`, `addComp`, `layers.addText`, `setValueAtTime`, expresiones...) — la mayoría de scripts `.jsx` funcionan tal cual — y luego render / guardado |
| `run_effectcraft_commands` | Cualquier comando del motor más `set_property`, `add_keyframe`, `add_effect`, `get_layer`... en una sesión (referencias `$steps[N].campo`), sin interfaz o en vivo, y luego render / guardado |
| `open_in_effectcraft` | Abre proyectos o medios en la app EffectCraft (opcionalmente con el canal de control) |
| `get_effectcraft_status` | Plataforma, instalación, versión, comandos, efectos, app / puerto de control |

| | |
| --- | --- |
| **Importa** | MP4, MOV, MKV, WebM, AVI, MXF, GIF, PNG, JPEG, TIFF, WebP, EXR, PSD, SVG, WAV, MP3, AAC, FLAC, `.ecproj`, `.ectemplate`, Lottie, glTF / GLB / OBJ |
| **Renderiza** | MP4 (H.264), HEVC, AV1, ProRes (proxy … 4444 XQ, con alfa), WebM (VP9, alfa), GIF, secuencias PNG / JPEG / TIFF / EXR, WAV, AIFF, Lottie (.json), `.ecproj` |

Las posiciones son **píxeles desde la esquina superior izquierda de la composición**; los tiempos, **segundos**. Las secuencias de imágenes van a su propia carpeta `<nombre>_frames`.

## Ejemplo

```json
{
  "name": "rebajas",
  "width": 1080,
  "height": 1080,
  "duration": 5,
  "background": "#2e1065",
  "layers": [
    { "type": "text", "text": "REBAJAS DE VERANO", "size": 100, "color": "#ffffff", "y": 760,
      "animate_in": { "type": "typewriter", "duration": 1.2 }, "effects": [ { "effect": "Glow" } ] },
    { "type": "media", "path": "C:\\Marca\\logo.png", "fit": "none", "scale": 60, "y": 420,
      "animate_in": { "type": "pop", "duration": 0.6 }, "animate_out": { "type": "fade", "duration": 0.5 } },
    { "type": "shape", "shape": "ellipse", "width": 900, "height": 900, "color": "#7c3aed", "opacity": 40,
      "expressions": [ { "property": "scale", "expression": "[100 + 5*Math.sin(time*3), 100 + 5*Math.sin(time*3)]" } ] }
  ],
  "formats": ["mp4", "gif", "ecproj"],
  "output_dir": "C:\\Videos"
}
```

## Requisitos

- **EffectCraft** con `effectcraft-cli` (probado con **0.7.0**); ver [Plataformas](#plataformas)
- Node.js ≥ 20 (incluido en Claude Desktop para instalaciones `.mcpb`)

## Instalación

### Claude Desktop (recomendado, todas las plataformas)

1. Descarga `effectcraft-mcp-server.mcpb` de la [última versión](https://github.com/jhonsu01/effectcraft-mcp-server/releases/latest).
2. Haz doble clic (o arrástralo a Claude Desktop → *Configuración → Extensiones*) y pulsa **Instalar**.
3. Opcional: si EffectCraft no está en una ubicación estándar, indica su carpeta o la ruta de `effectcraft-cli` en la configuración de la extensión.

### Codex (OpenAI)

**Recomendado — el marketplace (recibe actualizaciones):** *Complementos → Añadir → Añadir marketplace*, origen `jhonsu01/craft-marketplace`, referencia `main`, y luego instala **EffectCraft Bridge** desde **Craft Bridges** ([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). Las versiones nuevas llegan al actualizar el marketplace. O sube el zip (Codex lo guarda en tu cuenta y rechaza un zip más nuevo con el mismo nombre):

1. Descarga `effectcraft-mcp-server-<versión>-codex.zip` de la [última versión](https://github.com/jhonsu01/effectcraft-mcp-server/releases/latest).
2. En Codex: *Complementos → Añadir → Nuevo complemento*, elige el zip y pulsa **Añadir complemento**.
3. Codex arranca el servidor con `node`, así que Node.js ≥ 20 debe estar en el `PATH`. Si EffectCraft no está en una ubicación estándar, define `EFFECTCRAFT_DIR` o `EFFECTCRAFT_CLI` como variables de entorno del sistema (Codex no tiene formulario de configuración para complementos locales).

### DeepSeek Harness

1. *Plugins → Add plugin*, escribe `github:jhonsu01/craft-marketplace#path:/plugins/effectcraft-mcp-server` y pulsa **Install** y luego **Enable now**.
2. Harness arranca el servidor con su propio cliente MCP y `node` (Node.js ≥ 20 en el `PATH`); las herramientas aparecen como `mcp__effectcraft__<herramienta>` y los archivos de salida como tarjetas que se abren en Harness.
3. Harness aún no actualiza los plugins por sí solo: para actualizar, desinstala el plugin y vuelve a instalarlo con la misma dirección.

### Claude Code / otros clientes MCP

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

## Configuración

| Variable | Significado |
| --- | --- |
| `EFFECTCRAFT_DIR` | Carpeta de EffectCraft, uno de sus ejecutables, la raíz de un `.tar.gz` (con `bin/`) o `EffectCraft.app`. Por defecto: detección automática |
| `EFFECTCRAFT_CLI` | Ruta de `effectcraft-cli` / `effectcraft-cli.exe` (tiene prioridad sobre `EFFECTCRAFT_DIR`) |
| `EFFECTCRAFT_APP` | Ruta de la app de escritorio cuando está en otro sitio (p. ej. un AppImage en Linux) |
| `EFFECTCRAFT_CONTROL_PORT` | Puerto de control de la app de escritorio (por defecto 9877) |
| `EFFECTCRAFT_MCP_TIMEOUT` | Máximo de segundos por llamada al motor (por defecto 3600) |

## Seguridad

- Los archivos **nunca se sobrescriben** salvo con `overwrite: true`: en una carpeta se usa un nombre libre (`_2`) y un `output_path` existente da error. Los medios y proyectos `.ecproj` solo se leen; un proyecto solo se guarda como copia nueva (formato `ecproj`).
- Todas las rutas deben ser absolutas. El motor funciona sin interfaz con un proyecto en memoria y nunca toca la app de EffectCraft salvo con `live: true`.
- Todo se ejecuta en local, sin acceso a la red. Cada tarea usa un motor privado en una carpeta temporal que se borra al final.

## Desarrollo

```bash
npm run build       # TypeScript + bundle de un solo archivo (dist/bundle.cjs)
npm test            # pruebas unitarias (lógica de rutas de Windows, macOS y Linux)
npm run test:e2e    # 23 pruebas de extremo a extremo por MCP stdio real (imagen sintética; vídeos renderizados por EffectCraft)
npm run pack:mcpb   # effectcraft-mcp-server.mcpb
npm run pack:codex  # zip de complemento para Codex
```

Prueba de Linux en Docker (descomprime antes `effectcraft-<versión>-linux-x86_64.tar.gz`):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/ruta/a/effectcraft-0.7.0-linux-x86_64:/opt/effectcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## Licencia

Apache-2.0. EffectCraft es © de sus autores (Storytold), MIT o Apache-2.0.
Este proyecto no está afiliado ni respaldado por EffectCraft ni por Storytold. After Effects es una marca de Adobe.
