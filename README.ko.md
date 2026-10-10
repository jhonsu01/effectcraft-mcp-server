<p align="center"><img src="icon.png" width="120" alt="EffectCraft Bridge 아이콘"></p>

<h1 align="center">EffectCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <b>한국어</b>
</p>

<p align="center">
  컴퓨터에 설치된 <b>EffectCraft</b>로 Claude가 모션 그래픽과 시각 효과를 만들게 하세요 — <b>Windows, macOS, Linux</b> 지원:<br>
  애니메이션 타이틀, 동영상 효과, 모션 템플릿, MP4·ProRes·WebM·GIF·이미지 시퀀스·Lottie 렌더링.
</p>

---

## 왜 필요한가

[EffectCraft](https://github.com/storytold/effectcraft)는 Rust로 작성된 After Effects급 오픈 소스 모션 그래픽 합성 프로그램으로, 화면 없는 CLI(`effectcraft-cli`), 665개의 명령, 306개의 효과, After Effects 스타일의 스크립트 객체 모델, MCP 모드를 갖추고 있습니다. 이 [Model Context Protocol](https://modelcontextprotocol.io) 서버는 그 엔진을 Claude용 **"파일 입력 → 파일 출력" 도구**로 바꿔 줍니다. 예를 들어 이렇게 요청할 수 있습니다:

> *"1080×1080, 5초짜리 인트로를 만들어 줘. 보라색 배경에 내 로고가 튀어나오고 '여름 세일'이 빛나며 한 글자씩 타이핑되게."*
> *"`인터뷰.mp4` 위에 'Ana Pérez — 감독' 자막 바를 넣어 줘."*
> *"`D:\Clips`의 모든 클립에 영화 같은 색 보정과 약한 흐림을 주고 150 %로 빠르게 해서 MP4로 내보내 줘."*
> *"`promo.ecproj`의 'Final' 컴포지션을 알파가 있는 ProRes 4444와 GIF로 렌더링해 줘."*
> *"이 애니메이션을 웹사이트용 Lottie로 내보내 줘."*

같은 시리즈: [lightcraft-mcp-server](https://github.com/jhonsu01/lightcraft-mcp-server), [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server), [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## 플랫폼

| OS | 설치할 EffectCraft 패키지 | 서버가 자동으로 찾는 위치(설정 불필요) | 상태 |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI 또는 포터블 zip | `C:\Program Files\EffectCraft`, `%LOCALAPPDATA%\Programs\EffectCraft`, `PATH` | ✅ 검증됨 (Windows 11) |
| **Linux** (x86_64, aarch64) | `.deb`, `.rpm` 또는 `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/effectcraft/bin`, `~/.local/bin`, `PATH` | ✅ 검증됨 (Debian 12, 화면 없음) |
| **macOS** 11+ (Apple 실리콘 및 Intel) | `.dmg`(앱) **와** `effectcraft-cli-<버전>-macos-universal.zip` | `/Applications/EffectCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 지원, 아직 Mac에서 테스트하지 않음 |

다운로드: [EffectCraft 릴리스](https://github.com/storytold/effectcraft/releases) (FreeBSD용 tar.gz도 있습니다. `EFFECTCRAFT_DIR`로 지정하세요). 다른 위치에 있다면 `EFFECTCRAFT_DIR`(폴더, `.tar.gz` 루트 또는 `EffectCraft.app`)나 `EFFECTCRAFT_CLI`를 설정하세요.

- **macOS:** DMG에는 앱만 들어 있습니다. 별도로 제공되는 `effectcraft-cli` zip을 풀고 `effectcraft-cli`를 `/usr/local/bin`으로 옮기세요(또는 `EFFECTCRAFT_CLI`로 지정). 처음 실행할 때 Apple 공증을 온라인으로 확인합니다.
- **Linux:** AppImage와 Flatpak에는 앱만 있고 `effectcraft-cli`는 없습니다. deb, rpm 또는 tar.gz를 사용하세요. 앱이 AppImage라면 `open_in_effectcraft`가 실행할 수 있도록 `EFFECTCRAFT_APP`을 설정하세요. GPU가 없는 서버에서 검증된 환경은 `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`를 사용했습니다.

## 작동 방식

| 구성 요소 | 설명 |
| --- | --- |
| **EffectCraft 엔진** (`effectcraft-cli mcp`) | EffectCraft 자체 엔진: 합성, 텍스트, 셰이프, 키프레임, 표현식, 효과, 템플릿, 렌더 대기열, 내보내기. 작업마다 **화면 없이** 메모리상의 프로젝트로 새로 시작하므로 앱이나 열려 있는 프로젝트를 절대 건드리지 않습니다. |
| **MCP 서버** (Node.js) | 11개의 상위 수준 도구. 간단한 레이어 목록으로 컴포지션을 만들고, 미디어를 참조로 가져와(읽기만 함) 요청한 위치에 렌더링하며, 모든 출력을 먼저 확인합니다. EffectCraft 자체는 기존 파일을 알리지 않고 바꿔 버립니다. |
| **라이브 앱** (선택) | `open_in_effectcraft control=true`는 로컬 전용 제어 채널(포트 9877)로 앱을 시작하고, `run_effectcraft_commands` / `run_effectcraft_script live=true`가 이를 조작합니다. 채널에 비밀번호가 없으니 작업이 끝나면 앱을 닫으세요. |

## 도구

| 도구 | 기능 |
| --- | --- |
| `create_motion_graphic` | 위에서 아래로 나열한 레이어로 원하는 크기·프레임 속도·길이의 컴포지션 제작 — 텍스트(모든 글꼴, 획, 정렬), 셰이프(사각형, 둥근 사각형, 타원, 별, 다각형), 단색, 이미지 / 동영상 / 오디오(채우기 또는 맞춤, 속도), 널, 조정 레이어 — 위치, 크기, 회전, 불투명도, 혼합 모드, 타이밍 지정; 등장·퇴장 애니메이션(페이드, 왼쪽 / 오른쪽 / 위 / 아래에서 슬라이드, 팝, 줌, 흐림, 타자기, 회전); 키프레임; 표현식; 매개변수를 애니메이션할 수 있는 효과 |
| `apply_effects` | 동영상이나 이미지(또는 폴더)를 같은 크기의 컴포지션에 배치: 효과(키프레임 가능), 트림, 속도, 그 위의 레이어(타이틀, 자막, 로고) |
| `use_template` | 내장 Lower Third, Title Card, Logo Reveal, Kinetic Type, Social Square, Vertical Story, Slideshow, 3D Text Orbit 또는 모든 `.ectemplate`: 컨트롤을 이름으로 설정, 뒤에 동영상 배치, 레이어 추가, 길이 변경 |
| `render_project` | `.ecproj`의 모든 컴포지션을 시간 범위, 해상도, 프레임 속도, 품질, 비트레이트, 알파를 지정해 렌더링; 프로젝트는 수정되지 않음 |
| `get_project_info` | 컴포지션, 레이어, 푸티지(누락 파일 포함), 에센셜 그래픽 컨트롤 |
| `render_frame` | 지정 시간의 프로젝트나 동영상 프레임을 Claude에게 보여 주고 선택적으로 저장 |
| `list_effectcraft_catalog` | 매개변수 id가 있는 306개 효과, 템플릿과 컨트롤, 글꼴, 665개 명령, 형식 |
| `run_effectcraft_script` | After Effects 스타일의 JavaScript(`app.project`, `addComp`, `layers.addText`, `setValueAtTime`, 표현식…) — 대부분의 `.jsx` 스크립트가 그대로 동작 — 실행 후 렌더링 / 저장 |
| `run_effectcraft_commands` | 모든 엔진 명령과 `set_property`, `add_keyframe`, `add_effect`, `get_layer`…를 한 세션에서 실행(`$steps[N].필드` 참조), 화면 없이 또는 라이브로, 그다음 렌더링 / 저장 |
| `open_in_effectcraft` | EffectCraft 앱에서 프로젝트나 미디어 열기(제어 채널 선택 가능) |
| `get_effectcraft_status` | 플랫폼, 설치, 버전, 명령 수, 효과 수, 앱 / 제어 포트 |

| | |
| --- | --- |
| **가져오기** | MP4, MOV, MKV, WebM, AVI, MXF, GIF, PNG, JPEG, TIFF, WebP, EXR, PSD, SVG, WAV, MP3, AAC, FLAC, `.ecproj`, `.ectemplate`, Lottie, glTF / GLB / OBJ |
| **렌더링** | MP4(H.264), HEVC, AV1, ProRes(proxy … 4444 XQ, 알파 포함), WebM(VP9, 알파), GIF, PNG / JPEG / TIFF / EXR 시퀀스, WAV, AIFF, Lottie(.json), `.ecproj` |

위치는 **컴포지션 왼쪽 위 모서리부터의 픽셀**, 시간은 **초**입니다. 이미지 시퀀스는 전용 `<이름>_frames` 폴더에 저장됩니다.

## 예시

```json
{
  "name": "sale",
  "width": 1080,
  "height": 1080,
  "duration": 5,
  "background": "#2e1065",
  "layers": [
    { "type": "text", "text": "여름 세일", "size": 140, "color": "#ffffff", "y": 760,
      "animate_in": { "type": "typewriter", "duration": 1.2 }, "effects": [ { "effect": "Glow" } ] },
    { "type": "media", "path": "C:\\브랜드\\logo.png", "fit": "none", "scale": 60, "y": 420,
      "animate_in": { "type": "pop", "duration": 0.6 }, "animate_out": { "type": "fade", "duration": 0.5 } },
    { "type": "shape", "shape": "ellipse", "width": 900, "height": 900, "color": "#7c3aed", "opacity": 40,
      "expressions": [ { "property": "scale", "expression": "[100 + 5*Math.sin(time*3), 100 + 5*Math.sin(time*3)]" } ] }
  ],
  "formats": ["mp4", "gif", "ecproj"],
  "output_dir": "C:\\동영상"
}
```

## 요구 사항

- `effectcraft-cli`가 포함된 **EffectCraft**(**0.7.0**에서 테스트), [플랫폼](#플랫폼) 참조
- Node.js ≥ 20(`.mcpb`로 설치할 때는 Claude Desktop에 포함)

## 설치

### Claude Desktop (권장, 모든 플랫폼)

1. [최신 릴리스](https://github.com/jhonsu01/effectcraft-mcp-server/releases/latest)에서 `effectcraft-mcp-server.mcpb`를 내려받습니다.
2. 더블클릭(또는 Claude Desktop → *설정 → 확장 프로그램*으로 끌어다 놓기)한 뒤 **설치**를 클릭합니다.
3. 선택: EffectCraft가 표준 위치에 없다면 확장 프로그램 설정에서 해당 폴더나 `effectcraft-cli` 경로를 입력합니다.

### Codex (OpenAI)

**권장 — 마켓플레이스(업데이트 받음):** *플러그인 → 추가 → 마켓플레이스 추가*에서 소스 `jhonsu01/craft-marketplace`, 참조 `main`을 지정한 뒤 **Craft Bridges**에서 **EffectCraft Bridge**를 설치합니다([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). 마켓플레이스를 새로 고치면 새 버전이 설치됩니다. 또는 zip을 업로드합니다(Codex는 계정에 저장하고 같은 이름의 새 zip은 거부합니다):

1. [최신 릴리스](https://github.com/jhonsu01/effectcraft-mcp-server/releases/latest)에서 `effectcraft-mcp-server-<버전>-codex.zip`을 내려받습니다.
2. Codex에서 *플러그인 → 추가 → 새 플러그인*을 열고 zip을 선택한 뒤 **플러그인 추가**를 누릅니다.
3. Codex는 `node`로 서버를 시작하므로 `PATH`에 Node.js ≥ 20이 있어야 합니다. EffectCraft가 표준 위치에 없다면 `EFFECTCRAFT_DIR` 또는 `EFFECTCRAFT_CLI`를 시스템 환경 변수로 설정하세요(Codex에는 로컬 플러그인용 설정 화면이 없습니다).

### Claude Code / 기타 MCP 클라이언트

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

## 설정

| 변수 | 의미 |
| --- | --- |
| `EFFECTCRAFT_DIR` | EffectCraft 폴더, 그 안의 실행 파일, `.tar.gz` 루트(`bin/` 포함) 또는 `EffectCraft.app`. 기본값: 자동 감지 |
| `EFFECTCRAFT_CLI` | `effectcraft-cli` / `effectcraft-cli.exe` 경로(`EFFECTCRAFT_DIR`보다 우선) |
| `EFFECTCRAFT_APP` | 데스크톱 앱이 다른 곳에 있을 때의 경로(예: Linux의 AppImage) |
| `EFFECTCRAFT_CONTROL_PORT` | 데스크톱 앱의 제어 포트(기본 9877) |
| `EFFECTCRAFT_MCP_TIMEOUT` | 엔진 호출 1회당 최대 초(기본 3600) |

## 안전

- `overwrite: true`가 아니면 파일을 **절대 덮어쓰지 않습니다**: 폴더에서는 빈 이름(`_2`)을 사용하고, 이미 있는 `output_path`는 오류가 됩니다. 미디어와 `.ecproj` 프로젝트는 읽기만 하며, 프로젝트는 새 사본(형식 `ecproj`)으로만 저장됩니다.
- 모든 경로는 절대 경로여야 합니다. 엔진은 화면 없이 메모리상의 프로젝트로 실행되며 `live: true`가 아니면 EffectCraft 앱을 건드리지 않습니다.
- 모든 작업은 네트워크 접근 없이 로컬에서 실행됩니다. 각 작업은 임시 폴더의 전용 엔진을 사용하며, 끝나면 폴더가 삭제됩니다.

## 개발

```bash
npm run build       # TypeScript + 단일 파일 번들(dist/bundle.cjs)
npm test            # 단위 테스트(Windows, macOS, Linux 경로 로직)
npm run test:e2e    # 실제 MCP stdio를 통한 22개 엔드투엔드 검사(합성 이미지, 동영상은 EffectCraft가 렌더링)
npm run pack:mcpb   # effectcraft-mcp-server.mcpb
npm run pack:codex  # Codex 플러그인 zip
```

Docker에서 Linux 테스트(먼저 `effectcraft-<버전>-linux-x86_64.tar.gz` 압축 해제):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/path/to/effectcraft-0.7.0-linux-x86_64:/opt/effectcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## 라이선스

Apache-2.0. EffectCraft의 저작권은 저자(Storytold)에게 있으며 MIT 또는 Apache-2.0으로 배포됩니다.
이 프로젝트는 EffectCraft 및 Storytold와 관련이 없으며 이들의 승인을 받지 않았습니다. After Effects는 Adobe의 상표입니다.
