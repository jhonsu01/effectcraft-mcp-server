<p align="center"><img src="icon.png" width="120" alt="Значок EffectCraft Bridge"></p>

<h1 align="center">EffectCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <b>Русский</b> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Позвольте Claude создавать моушн-графику и визуальные эффекты в <b>EffectCraft</b>, установленном на вашем компьютере, — <b>Windows, macOS и Linux</b>:<br>
  анимированные титры, эффекты на видео, шаблоны и рендер в MP4, ProRes, WebM, GIF, последовательности изображений и Lottie.
</p>

---

## Зачем

[EffectCraft](https://github.com/storytold/effectcraft) — композитор моушн-графики с открытым исходным кодом уровня After Effects, написанный на Rust, с консольным инструментом без интерфейса (`effectcraft-cli`), 665 командами, 306 эффектами, моделью скриптов в стиле After Effects и режимом MCP. Этот сервер [Model Context Protocol](https://modelcontextprotocol.io) превращает движок в **инструменты «файл → файл»** для Claude, и можно просить, например:

> *«Сделай 5-секундное интро 1080×1080: фиолетовый фон, мой логотип выпрыгивает, а „ЛЕТНЯЯ РАСПРОДАЖА“ печатается по буквам со свечением».*
> *«Добавь плашку „Ана Перес — режиссёр“ поверх `интервью.mp4`».*
> *«Сделай кинематографичную цветокоррекцию и лёгкое размытие всем клипам в `D:\Clips`, ускорь до 150 % и экспортируй MP4».*
> *«Отрендери композицию „Final“ из `promo.ecproj` в ProRes 4444 с альфой и в GIF».*
> *«Экспортируй эту анимацию в Lottie для сайта».*

Родственные проекты: [lightcraft-mcp-server](https://github.com/jhonsu01/lightcraft-mcp-server), [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) и [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Платформы

| Система | Какой пакет EffectCraft установить | Где сервер его находит (без настройки) | Статус |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI или портативный zip | `C:\Program Files\EffectCraft`, `%LOCALAPPDATA%\Programs\EffectCraft`, `PATH` | ✅ Проверено (Windows 11) |
| **Linux** (x86_64, aarch64) | `.deb`, `.rpm` или `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/effectcraft/bin`, `~/.local/bin`, `PATH` | ✅ Проверено (Debian 12, без графики) |
| **macOS** 11+ (Apple silicon и Intel) | `.dmg` (приложение) **и** `effectcraft-cli-<версия>-macos-universal.zip` | `/Applications/EffectCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Поддерживается, на Mac ещё не проверено |

Загрузки: [релизы EffectCraft](https://github.com/storytold/effectcraft/releases) (есть и tar.gz для FreeBSD — укажите его в `EFFECTCRAFT_DIR`). Если установлено в другом месте, задайте `EFFECTCRAFT_DIR` (папка, корень `.tar.gz` или `EffectCraft.app`) или `EFFECTCRAFT_CLI`.

- **macOS:** в DMG только приложение. Распакуйте отдельный zip с `effectcraft-cli` и переместите `effectcraft-cli` в `/usr/local/bin` (или укажите путь в `EFFECTCRAFT_CLI`). При первом запуске нотаризация Apple проверяется онлайн.
- **Linux:** AppImage и Flatpak содержат только приложение, без `effectcraft-cli`; используйте deb, rpm или tar.gz. Если приложение — AppImage, задайте `EFFECTCRAFT_APP`, чтобы `open_in_effectcraft` мог его запустить. На сервере без GPU в проверенной конфигурации использовались `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## Как это работает

| Часть | Что это |
| --- | --- |
| **Движок EffectCraft** (`effectcraft-cli mcp`) | Собственный движок EffectCraft: композитинг, текст, фигуры, ключевые кадры, выражения, эффекты, шаблоны, очередь рендера и экспорт. Для каждой задачи запускается заново, **без интерфейса** и с проектом в памяти, поэтому никогда не трогает приложение и открытый проект. |
| **MCP-сервер** (Node.js) | 11 высокоуровневых инструментов. Собирает композиции из простого списка слоёв, импортирует ваши медиафайлы по ссылке (они только читаются), рендерит туда, куда вы просили, и заранее проверяет каждый выходной файл: сам EffectCraft молча заменил бы существующие файлы. |
| **Живое приложение** (необязательно) | `open_in_effectcraft control=true` запускает приложение с локальным каналом управления (порт 9877), а `run_effectcraft_commands` / `run_effectcraft_script live=true` управляют им. У канала нет пароля: закройте приложение, когда закончите. |

## Инструменты

| Инструмент | Что делает |
| --- | --- |
| `create_motion_graphic` | Композиция любого размера, частоты кадров и длины из слоёв сверху вниз — текст (любой шрифт, обводка, выравнивание), фигуры (прямоугольник, скруглённый, эллипс, звезда, многоугольник), сплошные заливки, изображения / видео / аудио (заполнить или вписать, скорость), нули, корректирующие слои — с позицией, масштабом, поворотом, непрозрачностью, режимом наложения и таймингом; появления и исчезновения (затухание, въезд слева / справа / сверху / снизу, прыжок, зум, размытие, печатная машинка, вращение); ключевые кадры; выражения; эффекты с анимированными параметрами |
| `apply_effects` | Видео или изображение (или папка) в композиции своего размера: эффекты с ключевыми кадрами, обрезка, скорость и слои поверх (титры, субтитры, логотипы) |
| `use_template` | Встроенные шаблоны Lower Third, Title Card, Logo Reveal, Kinetic Type, Social Square, Vertical Story, Slideshow и 3D Text Orbit или любой `.ectemplate`: элементы управления по имени, видео позади, дополнительные слои, другая длина |
| `render_project` | Любая композиция `.ecproj` с диапазоном времени, разрешением, частотой кадров, качеством, битрейтом и альфой; проект никогда не изменяется |
| `get_project_info` | Композиции, слои, футаж (с отсутствующими файлами) и элементы Essential Graphics |
| `render_frame` | Кадры проекта или видео в заданные моменты, которые видит Claude, при желании с сохранением |
| `list_effectcraft_catalog` | 306 эффектов с id параметров, шаблоны и их элементы управления, шрифты, 665 команд, форматы |
| `run_effectcraft_script` | JavaScript в стиле After Effects (`app.project`, `addComp`, `layers.addText`, `setValueAtTime`, выражения...) — большинство скриптов `.jsx` работают как есть — затем рендер / сохранение |
| `run_effectcraft_commands` | Любые команды движка плюс `set_property`, `add_keyframe`, `add_effect`, `get_layer`... в одной сессии (ссылки `$steps[N].поле`), без интерфейса или вживую, затем рендер / сохранение |
| `open_in_effectcraft` | Открывает проекты или медиа в приложении EffectCraft (по желанию с каналом управления) |
| `get_effectcraft_status` | Платформа, установка, версия, команды, эффекты, приложение / порт управления |

| | |
| --- | --- |
| **Импорт** | MP4, MOV, MKV, WebM, AVI, MXF, GIF, PNG, JPEG, TIFF, WebP, EXR, PSD, SVG, WAV, MP3, AAC, FLAC, `.ecproj`, `.ectemplate`, Lottie, glTF / GLB / OBJ |
| **Рендер** | MP4 (H.264), HEVC, AV1, ProRes (proxy … 4444 XQ, с альфой), WebM (VP9, альфа), GIF, последовательности PNG / JPEG / TIFF / EXR, WAV, AIFF, Lottie (.json), `.ecproj` |

Позиции — **пиксели от левого верхнего угла композиции**; время — **секунды**. Последовательности изображений сохраняются в отдельную папку `<имя>_frames`.

## Пример

```json
{
  "name": "sale",
  "width": 1080,
  "height": 1080,
  "duration": 5,
  "background": "#2e1065",
  "layers": [
    { "type": "text", "text": "ЛЕТНЯЯ РАСПРОДАЖА", "size": 90, "color": "#ffffff", "y": 760,
      "animate_in": { "type": "typewriter", "duration": 1.2 }, "effects": [ { "effect": "Glow" } ] },
    { "type": "media", "path": "C:\\Бренд\\logo.png", "fit": "none", "scale": 60, "y": 420,
      "animate_in": { "type": "pop", "duration": 0.6 }, "animate_out": { "type": "fade", "duration": 0.5 } },
    { "type": "shape", "shape": "ellipse", "width": 900, "height": 900, "color": "#7c3aed", "opacity": 40,
      "expressions": [ { "property": "scale", "expression": "[100 + 5*Math.sin(time*3), 100 + 5*Math.sin(time*3)]" } ] }
  ],
  "formats": ["mp4", "gif", "ecproj"],
  "output_dir": "C:\\Видео"
}
```

## Требования

- **EffectCraft** с `effectcraft-cli` (проверено на **0.7.0**); см. [Платформы](#платформы)
- Node.js ≥ 20 (входит в Claude Desktop при установке `.mcpb`)

## Установка

### Claude Desktop (рекомендуется, все платформы)

1. Скачайте `effectcraft-mcp-server.mcpb` из [последнего релиза](https://github.com/jhonsu01/effectcraft-mcp-server/releases/latest).
2. Дважды щёлкните по нему (или перетащите в Claude Desktop → *Настройки → Расширения*) и нажмите **Установить**.
3. Необязательно: если EffectCraft установлен не в стандартное место, укажите его папку или путь к `effectcraft-cli` в настройках расширения.

### Codex (OpenAI)

**Рекомендуется — маркетплейс (получает обновления):** *Плагины → Добавить → Добавить маркетплейс*, источник `jhonsu01/craft-marketplace`, ссылка `main`, затем установите **EffectCraft Bridge** из **Craft Bridges** ([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). Новые версии приходят при обновлении маркетплейса. Или загрузите zip (Codex сохранит его в вашей учётной записи и отклонит более новый zip с тем же именем):

1. Скачайте `effectcraft-mcp-server-<версия>-codex.zip` из [последнего релиза](https://github.com/jhonsu01/effectcraft-mcp-server/releases/latest).
2. В Codex: *Плагины → Добавить → Новый плагин*, выберите zip и нажмите **Добавить плагин**.
3. Codex запускает сервер через `node`, поэтому Node.js ≥ 20 должен быть в `PATH`. Если EffectCraft установлен не в стандартное место, задайте `EFFECTCRAFT_DIR` или `EFFECTCRAFT_CLI` как системные переменные окружения (у Codex нет формы настроек для локальных плагинов).

### Claude Code / другие MCP-клиенты

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

## Настройка

| Переменная | Значение |
| --- | --- |
| `EFFECTCRAFT_DIR` | Папка EffectCraft, один из его исполняемых файлов, корень `.tar.gz` (с `bin/`) или `EffectCraft.app`. По умолчанию: автоопределение |
| `EFFECTCRAFT_CLI` | Путь к `effectcraft-cli` / `effectcraft-cli.exe` (важнее, чем `EFFECTCRAFT_DIR`) |
| `EFFECTCRAFT_APP` | Путь к настольному приложению, если оно в другом месте (например, AppImage в Linux) |
| `EFFECTCRAFT_CONTROL_PORT` | Порт управления настольным приложением (по умолчанию 9877) |
| `EFFECTCRAFT_MCP_TIMEOUT` | Максимум секунд на один вызов движка (по умолчанию 3600) |

## Безопасность

- Файлы **никогда не перезаписываются** без `overwrite: true`: в папке выбирается свободное имя (`_2`), существующий `output_path` — ошибка. Медиа и проекты `.ecproj` только читаются; проект сохраняется только как новая копия (формат `ecproj`).
- Все пути должны быть абсолютными. Движок работает без интерфейса с проектом в памяти и не трогает приложение EffectCraft, кроме случая `live: true`.
- Всё работает локально, без доступа к сети. Каждая задача использует отдельный движок во временной папке, которая затем удаляется.

## Разработка

```bash
npm run build       # TypeScript + бандл в один файл (dist/bundle.cjs)
npm test            # модульные тесты (логика путей Windows, macOS и Linux)
npm run test:e2e    # 23 сквозные проверки через реальный MCP stdio (синтетическое изображение; видео рендерит EffectCraft)
npm run pack:mcpb   # effectcraft-mcp-server.mcpb
npm run pack:codex  # zip-плагин для Codex
```

Проверка Linux в Docker (сначала распакуйте `effectcraft-<версия>-linux-x86_64.tar.gz`):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/путь/к/effectcraft-0.7.0-linux-x86_64:/opt/effectcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## Лицензия

Apache-2.0. EffectCraft © его авторы (Storytold), MIT или Apache-2.0.
Проект не связан с EffectCraft и Storytold и не одобрен ими. After Effects — товарный знак Adobe.
