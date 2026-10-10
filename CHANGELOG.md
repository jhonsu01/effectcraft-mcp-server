# Changelog

## [1.0.3] - 2026-10-10
### Fixed
- Output names keep their dots: `name: "intro-1.0.1"` now writes `intro-1.0.1.mp4` (before: `intro-1.0.mp4`, the `.1`
  was taken for an extension). A real output extension in the name (`intro.mp4`) is still dropped. Also for comp and
  template names used as file names.
- Claude Desktop settings: the EffectCraft folder hint shows `C:\Program Files\EffectCraft` (the backslashes were
  missing).
### Verified
- Windows 11 and Debian 12 (Docker): 22/22 end-to-end checks each (new: dots in the output name); the `.mcpb` and the
  Codex plugin tested unpacked.

## [1.0.2] - 2026-10-10
### Added
- Codex (OpenAI) plugin: each release also ships `effectcraft-mcp-server-<version>-codex.zip` with
  `.codex-plugin/plugin.json` and `.mcp.json` (a local stdio server, `node ./dist/bundle.cjs`), built by
  `npm run pack:codex` from the same bundle and manifest as the `.mcpb`. The plugin is also listed in the
  [Craft Bridges](https://github.com/jhonsu01/craft-marketplace) Codex marketplace, which delivers updates.
- No changes to the tools.

## [1.0.1] - 2026-10-10
### Fixed
- `slide_up`, `slide_down`, `slide_left` and `slide_right` now name the direction of motion, for entrances and exits
  alike: `slide_up` rises in from below the frame and, as an exit, leaves through the top. In 1.0.0 the entrances came
  from the named side, so `slide_up` came down from the top.
### Verified
- Windows 11 and Debian 12 (Docker): 21/21 end-to-end checks each (new: positions of a slide_up entrance and a
  slide_right exit).

## [1.0.0] - 2026-10-09
### Added
- MCP server on EffectCraft's own engine (`effectcraft-cli mcp`): one private, headless engine per job with an in-memory
  project. Media and .ecproj projects are only read; projects are saved only as new copies.
- 11 tools: `create_motion_graphic`, `apply_effects`, `use_template`, `render_project`, `get_project_info`, `render_frame`,
  `list_effectcraft_catalog`, `run_effectcraft_script`, `run_effectcraft_commands`, `open_in_effectcraft`,
  `get_effectcraft_status`.
- A simple layer list (top to bottom): text, shapes, solids, images / videos / audio (cover / contain, speed), nulls and
  adjustment layers, with transform, blend mode and timing; ready-made entrances and exits (fade, slide left / right /
  up / down, pop, zoom, blur, typewriter via a text animator, spin); keyframes; After Effects-style expressions; effects
  with animated parameters.
- Effects, trims and speed changes on videos and images, one file or a folder, with layers on top.
- Motion templates (8 built in, or any .ectemplate) filled in by control name, with footage behind them.
- Renders: MP4 (H.264), HEVC, AV1, ProRes (alpha), WebM, GIF, PNG / JPEG / TIFF / EXR sequences in their own folder,
  WAV, AIFF, Lottie and .ecproj; time range, resolution, frame rate, quality, bitrate.
- Never overwrites (EffectCraft's own render queue replaces files silently): a free `_2` name in folders, an error for
  an existing `output_path` unless `overwrite: true`.
- Live app: `open_in_effectcraft control=true` starts EffectCraft with its control channel (port 9877) and waits until it
  listens; `run_effectcraft_commands` / `run_effectcraft_script live=true` drive it.
- Windows, macOS and Linux install detection (MSI, portable zip, DMG + CLI zip, deb, rpm, tar.gz, AppImage via
  `EFFECTCRAFT_APP`, PATH). README in 9 languages.
### Verified
- Windows 11 and Debian 12 (Docker, headless): 20/20 end-to-end checks each.
- Live mode on Windows 11: a comp, a text layer and Glow created in the app, then rendered.
