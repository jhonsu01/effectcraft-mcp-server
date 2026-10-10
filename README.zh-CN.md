<p align="center"><img src="icon.png" width="120" alt="EffectCraft Bridge 图标"></p>

<h1 align="center">EffectCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <b>简体中文</b> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  让 Claude 使用你电脑上安装的 <b>EffectCraft</b> 制作动态图形和视觉特效 —— 支持 <b>Windows、macOS 和 Linux</b>：<br>
  动画标题、视频特效、动态模板，并渲染为 MP4、ProRes、WebM、GIF、图像序列和 Lottie。
</p>

---

## 为什么

[EffectCraft](https://github.com/storytold/effectcraft) 是一款用 Rust 编写、对标 After Effects 的开源动态图形合成软件，自带无界面的命令行工具（`effectcraft-cli`）、665 条命令、306 种特效、After Effects 风格的脚本对象模型和 MCP 模式。这个 [Model Context Protocol](https://modelcontextprotocol.io) 服务器把该引擎变成 Claude 可调用的 **"文件进、文件出" 工具**，例如你可以说：

> *"做一个 5 秒、1080×1080 的片头：紫色背景，我的标志弹出，『夏季大促』逐字打出并带发光。"*
> *"在 `采访.mp4` 上加一个『Ana Pérez — 导演』的字幕条。"*
> *"给 `D:\Clips` 里的所有片段加上电影感调色和轻微模糊，加速到 150%，导出 MP4。"*
> *"把 `promo.ecproj` 里的『Final』合成渲染为带 Alpha 的 ProRes 4444 和 GIF。"*
> *"把这个动画导出为 Lottie 放到我的网站上。"*

同系列项目：[lightcraft-mcp-server](https://github.com/jhonsu01/lightcraft-mcp-server)、[photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server)、[vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server)、[filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server)、[pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) 和 [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server)。

## 平台

| 系统 | 需要安装的 EffectCraft 包 | 服务器会自动查找的位置（无需配置） | 状态 |
| --- | --- | --- | --- |
| **Windows** 10/11（x64、x86、arm64） | MSI 或便携版 zip | `C:\Program Files\EffectCraft`、`%LOCALAPPDATA%\Programs\EffectCraft`、`PATH` | ✅ 已验证（Windows 11） |
| **Linux**（x86_64、aarch64） | `.deb`、`.rpm` 或 `.tar.gz` | `/usr/bin`、`/usr/local/bin`、`/opt/effectcraft/bin`、`~/.local/bin`、`PATH` | ✅ 已验证（Debian 12，无界面） |
| **macOS** 11+（Apple 芯片和 Intel） | `.dmg`（应用）**以及** `effectcraft-cli-<版本>-macos-universal.zip` | `/Applications/EffectCraft.app`、`/usr/local/bin`、`/opt/homebrew/bin`、`~/.local/bin`、`~/bin`、`PATH` | 🟡 已支持，尚未在 Mac 上实测 |

下载：[EffectCraft 发布页](https://github.com/storytold/effectcraft/releases)（另有 FreeBSD 的 tar.gz，用 `EFFECTCRAFT_DIR` 指向它即可）。若安装在其他位置，请设置 `EFFECTCRAFT_DIR`（文件夹、`.tar.gz` 解压根目录或 `EffectCraft.app`）或 `EFFECTCRAFT_CLI`。

- **macOS：** DMG 里只有应用本身。请解压单独提供的 `effectcraft-cli` zip，把 `effectcraft-cli` 移到 `/usr/local/bin`（或用 `EFFECTCRAFT_CLI` 指向它）。首次运行会在线检查 Apple 公证。
- **Linux：** AppImage 和 Flatpak 只包含应用，不含 `effectcraft-cli`，请使用 deb、rpm 或 tar.gz。若应用是 AppImage，请设置 `EFFECTCRAFT_APP`，以便 `open_in_effectcraft` 能启动它。在没有 GPU 的服务器上，经过验证的环境安装了 `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`。

## 工作原理

| 组成 | 说明 |
| --- | --- |
| **EffectCraft 引擎**（`effectcraft-cli mcp`） | EffectCraft 自己的引擎：合成、文字、形状、关键帧、表达式、特效、模板、渲染队列和导出。每个任务都 **以无界面方式**、使用内存中的项目重新启动，因此绝不会触碰应用或打开着的项目。 |
| **MCP 服务器**（Node.js） | 11 个高层工具。根据简单的图层列表搭建合成，以引用方式导入你的素材（只读取），渲染到你指定的位置，并事先检查每个输出：EffectCraft 本身会在不提示的情况下替换已有文件。 |
| **实时应用**（可选） | `open_in_effectcraft control=true` 以仅限本机的控制通道（端口 9877）启动应用，`run_effectcraft_commands` / `run_effectcraft_script live=true` 用它操作应用。该通道没有密码：用完请关闭应用。 |

## 工具

| 工具 | 功能 |
| --- | --- |
| `create_motion_graphic` | 由从上到下列出的图层搭建任意尺寸、帧率和时长的合成 —— 文字（任意字体、描边、对齐）、形状（矩形、圆角矩形、椭圆、星形、多边形）、纯色层、图片 / 视频 / 音频（填充或适合、速度）、空对象、调整图层 —— 可设置位置、缩放、旋转、不透明度、混合模式和时间；入场与出场动画（淡入淡出、从左 / 右 / 上 / 下滑入、弹出、缩放、模糊、打字机、旋转）；关键帧；表达式；参数可动画的特效 |
| `apply_effects` | 把视频或图片（或整个文件夹）放进与其同尺寸的合成：特效（可加关键帧）、裁剪、变速，并在上方添加图层（标题、字幕、标志） |
| `use_template` | 内置的 Lower Third、Title Card、Logo Reveal、Kinetic Type、Social Square、Vertical Story、Slideshow 和 3D Text Orbit，或任意 `.ectemplate`：按名称设置控件、在后面放视频、添加图层、修改时长 |
| `render_project` | 渲染 `.ecproj` 中任意合成，可设时间范围、分辨率、帧率、质量、码率和 Alpha；项目文件绝不会被修改 |
| `get_project_info` | 合成、图层、素材（含缺失文件）和基本图形控件 |
| `render_frame` | 在指定时间渲染项目或视频的帧，供 Claude 查看，可选保存 |
| `list_effectcraft_catalog` | 306 种特效及参数 id、模板及其控件、字体、665 条命令、格式 |
| `run_effectcraft_script` | After Effects 风格的 JavaScript（`app.project`、`addComp`、`layers.addText`、`setValueAtTime`、表达式…）—— 大多数 `.jsx` 脚本可直接运行 —— 然后渲染 / 保存 |
| `run_effectcraft_commands` | 在一个会话中运行任意引擎命令以及 `set_property`、`add_keyframe`、`add_effect`、`get_layer`…（支持 `$steps[N].字段` 引用），无界面或实时，然后渲染 / 保存 |
| `open_in_effectcraft` | 在 EffectCraft 应用中打开项目或素材（可选开启控制通道） |
| `get_effectcraft_status` | 平台、安装、版本、命令数、特效数、应用 / 控制端口 |

| | |
| --- | --- |
| **导入** | MP4、MOV、MKV、WebM、AVI、MXF、GIF、PNG、JPEG、TIFF、WebP、EXR、PSD、SVG、WAV、MP3、AAC、FLAC、`.ecproj`、`.ectemplate`、Lottie、glTF / GLB / OBJ |
| **渲染** | MP4（H.264）、HEVC、AV1、ProRes（proxy … 4444 XQ，带 Alpha）、WebM（VP9，Alpha）、GIF、PNG / JPEG / TIFF / EXR 序列、WAV、AIFF、Lottie（.json）、`.ecproj` |

位置是 **从合成左上角起算的像素**；时间单位是 **秒**。图像序列会放进单独的 `<名称>_frames` 文件夹。

## 示例

```json
{
  "name": "sale",
  "width": 1080,
  "height": 1080,
  "duration": 5,
  "background": "#2e1065",
  "layers": [
    { "type": "text", "text": "夏季大促", "size": 140, "color": "#ffffff", "y": 760,
      "animate_in": { "type": "typewriter", "duration": 1.2 }, "effects": [ { "effect": "Glow" } ] },
    { "type": "media", "path": "C:\\品牌\\logo.png", "fit": "none", "scale": 60, "y": 420,
      "animate_in": { "type": "pop", "duration": 0.6 }, "animate_out": { "type": "fade", "duration": 0.5 } },
    { "type": "shape", "shape": "ellipse", "width": 900, "height": 900, "color": "#7c3aed", "opacity": 40,
      "expressions": [ { "property": "scale", "expression": "[100 + 5*Math.sin(time*3), 100 + 5*Math.sin(time*3)]" } ] }
  ],
  "formats": ["mp4", "gif", "ecproj"],
  "output_dir": "C:\\视频"
}
```

## 要求

- 带有 `effectcraft-cli` 的 **EffectCraft**（已在 **0.7.0** 上测试），见 [平台](#平台)
- Node.js ≥ 20（通过 `.mcpb` 安装时 Claude Desktop 已自带）

## 安装

### Claude Desktop（推荐，所有平台）

1. 从 [最新发布](https://github.com/jhonsu01/effectcraft-mcp-server/releases/latest) 下载 `effectcraft-mcp-server.mcpb`。
2. 双击它（或拖到 Claude Desktop → *设置 → 扩展*），然后点击 **安装**。
3. 可选：如果 EffectCraft 不在标准位置，请在扩展设置中填写它的文件夹或 `effectcraft-cli` 的路径。

### Claude Code / 其他 MCP 客户端

```bash
git clone https://github.com/jhonsu01/effectcraft-mcp-server.git
cd effectcraft-mcp-server
npm install
npm run build
```

Windows：

```bash
claude mcp add effectcraft -- node "%CD%\dist\bundle.cjs"
```

macOS / Linux：

```bash
claude mcp add effectcraft -- node "$PWD/dist/bundle.cjs"
```

## 配置

| 变量 | 含义 |
| --- | --- |
| `EFFECTCRAFT_DIR` | EffectCraft 安装文件夹、其中某个可执行文件、`.tar.gz` 解压根目录（含 `bin/`）或 `EffectCraft.app`。默认：自动检测 |
| `EFFECTCRAFT_CLI` | `effectcraft-cli` / `effectcraft-cli.exe` 的路径（优先于 `EFFECTCRAFT_DIR`） |
| `EFFECTCRAFT_APP` | 桌面应用在其他位置时的路径（例如 Linux 的 AppImage） |
| `EFFECTCRAFT_CONTROL_PORT` | 桌面应用的控制端口（默认 9877） |
| `EFFECTCRAFT_MCP_TIMEOUT` | 每次引擎调用的最长秒数（默认 3600） |

## 安全

- 除非设置 `overwrite: true`，否则**绝不覆盖**文件：在文件夹中会使用空闲的名称（`_2`），已存在的 `output_path` 会报错。素材和 `.ecproj` 项目只会被读取；项目只会另存为新副本（格式 `ecproj`）。
- 所有路径必须是绝对路径。引擎以无界面方式、使用内存中的项目运行，除非 `live: true`，否则绝不触碰 EffectCraft 应用。
- 一切都在本地运行，不访问网络。每个任务使用独立引擎和临时文件夹，结束后自动删除。

## 开发

```bash
npm run build       # TypeScript + 单文件打包（dist/bundle.cjs）
npm test            # 单元测试（Windows、macOS、Linux 路径逻辑）
npm run test:e2e    # 通过真实 MCP stdio 的 20 项端到端检查（合成图片；视频由 EffectCraft 渲染）
npm run pack:mcpb   # effectcraft-mcp-server.mcpb
```

在 Docker 中测试 Linux（先解压 `effectcraft-<版本>-linux-x86_64.tar.gz`）：

```bash
docker run --rm -v "$PWD:/work:ro" -v "/path/to/effectcraft-0.7.0-linux-x86_64:/opt/effectcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## 许可证

Apache-2.0。EffectCraft 版权归其作者（Storytold）所有，采用 MIT 或 Apache-2.0 许可。
本项目与 EffectCraft 和 Storytold 无关，也未获得其认可。After Effects 是 Adobe 的商标。
