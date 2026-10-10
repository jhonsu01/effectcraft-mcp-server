<p align="center"><img src="icon.png" width="120" alt="EffectCraft Bridge アイコン"></p>

<h1 align="center">EffectCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <b>日本語</b> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  お使いのコンピューターにインストールされた <b>EffectCraft</b> で、Claude にモーショングラフィックスと VFX を作らせましょう — <b>Windows、macOS、Linux</b> 対応：<br>
  アニメーションタイトル、動画へのエフェクト、モーションテンプレート、MP4・ProRes・WebM・GIF・連番画像・Lottie へのレンダリング。
</p>

---

## 概要

[EffectCraft](https://github.com/storytold/effectcraft) は Rust で書かれた After Effects クラスのオープンソース・モーショングラフィックス合成ソフトで、画面を持たない CLI（`effectcraft-cli`）、665 のコマンド、306 のエフェクト、After Effects 風のスクリプトオブジェクトモデル、MCP モードを備えています。この [Model Context Protocol](https://modelcontextprotocol.io) サーバーはそのエンジンを Claude 用の **「ファイルを入れてファイルを出す」ツール** に変えます。たとえば次のように頼めます：

> *「1080×1080 で 5 秒のイントロを作って。紫の背景、ロゴがポップで登場、『サマーセール』がグロー付きで一文字ずつタイプされる感じで。」*
> *「`インタビュー.mp4` に『Ana Pérez — ディレクター』のテロップを入れて。」*
> *「`D:\Clips` のクリップすべてにシネマ風カラーと軽いぼかしをかけ、150 % に速めて MP4 で書き出して。」*
> *「`promo.ecproj` の『Final』コンポをアルファ付き ProRes 4444 と GIF でレンダリングして。」*
> *「このアニメーションを Web 用に Lottie で書き出して。」*

関連プロジェクト：[lightcraft-mcp-server](https://github.com/jhonsu01/lightcraft-mcp-server)、[photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server)、[vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server)、[filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server)、[pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server)、[audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server)。

## プラットフォーム

| OS | インストールする EffectCraft パッケージ | サーバーが自動で探す場所（設定不要） | 状態 |
| --- | --- | --- | --- |
| **Windows** 10/11（x64、x86、arm64） | MSI またはポータブル zip | `C:\Program Files\EffectCraft`、`%LOCALAPPDATA%\Programs\EffectCraft`、`PATH` | ✅ 検証済み（Windows 11） |
| **Linux**（x86_64、aarch64） | `.deb`、`.rpm` または `.tar.gz` | `/usr/bin`、`/usr/local/bin`、`/opt/effectcraft/bin`、`~/.local/bin`、`PATH` | ✅ 検証済み（Debian 12、画面なし） |
| **macOS** 11+（Apple シリコンと Intel） | `.dmg`（アプリ）**と** `effectcraft-cli-<バージョン>-macos-universal.zip` | `/Applications/EffectCraft.app`、`/usr/local/bin`、`/opt/homebrew/bin`、`~/.local/bin`、`~/bin`、`PATH` | 🟡 対応済み、Mac では未検証 |

ダウンロード：[EffectCraft のリリース](https://github.com/storytold/effectcraft/releases)（FreeBSD 用の tar.gz もあります。`EFFECTCRAFT_DIR` で指定してください）。それ以外の場所にある場合は `EFFECTCRAFT_DIR`（フォルダー、`.tar.gz` のルート、`EffectCraft.app`）または `EFFECTCRAFT_CLI` を設定します。

- **macOS：** DMG にはアプリだけが入っています。別配布の `effectcraft-cli` zip を展開し、`effectcraft-cli` を `/usr/local/bin` に移動してください（または `EFFECTCRAFT_CLI` で指定）。初回実行時に Apple の公証がオンラインで確認されます。
- **Linux：** AppImage と Flatpak にはアプリだけが入っており、`effectcraft-cli` は含まれません。deb、rpm、tar.gz を使ってください。アプリが AppImage の場合は、`open_in_effectcraft` が起動できるよう `EFFECTCRAFT_APP` を設定します。GPU のないサーバーでの検証環境では `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig` を使用しました。

## しくみ

| 構成要素 | 内容 |
| --- | --- |
| **EffectCraft エンジン**（`effectcraft-cli mcp`） | EffectCraft 自身のエンジン：合成、テキスト、シェイプ、キーフレーム、エクスプレッション、エフェクト、テンプレート、レンダーキュー、書き出し。ジョブごとに **画面なし**・メモリ上のプロジェクトで新しく起動するため、アプリや開いているプロジェクトに触れることはありません。 |
| **MCP サーバー**（Node.js） | 11 個の高レベルツール。シンプルなレイヤーリストからコンポを組み立て、素材を参照として読み込み（読み取るだけ）、指定の場所にレンダリングし、出力先を事前に確認します。EffectCraft 単体では既存ファイルを黙って置き換えてしまいます。 |
| **ライブアプリ**（任意） | `open_in_effectcraft control=true` はローカル専用のコントロールチャネル（ポート 9877）付きでアプリを起動し、`run_effectcraft_commands` / `run_effectcraft_script live=true` がそれを操作します。チャネルにはパスワードがないので、作業が終わったらアプリを閉じてください。 |

## ツール

| ツール | 機能 |
| --- | --- |
| `create_motion_graphic` | 上から順に並べたレイヤーから、任意のサイズ・フレームレート・長さのコンポを作成 — テキスト（任意のフォント、線、揃え）、シェイプ（長方形、角丸、楕円、星、多角形）、平面、画像 / 動画 / 音声（カバーまたはフィット、速度）、ヌル、調整レイヤー — 位置、スケール、回転、不透明度、描画モード、タイミングを指定。登場・退場アニメーション（フェード、左 / 右 / 上 / 下からスライド、ポップ、ズーム、ぼかし、タイプライター、スピン）、キーフレーム、エクスプレッション、パラメーターをアニメートできるエフェクト |
| `apply_effects` | 動画や画像（またはフォルダー）をその大きさのコンポに配置：エフェクト（キーフレームも可）、トリミング、速度変更、上に重ねるレイヤー（タイトル、字幕、ロゴ） |
| `use_template` | 内蔵の Lower Third、Title Card、Logo Reveal、Kinetic Type、Social Square、Vertical Story、Slideshow、3D Text Orbit、または任意の `.ectemplate`：コントロールを名前で設定、背景に動画を配置、レイヤー追加、長さの変更 |
| `render_project` | `.ecproj` の任意のコンポを、時間範囲、解像度、フレームレート、画質、ビットレート、アルファを指定してレンダリング。プロジェクトは変更されません |
| `get_project_info` | コンポ、レイヤー、フッテージ（リンク切れを含む）、エッセンシャルグラフィックスのコントロール |
| `render_frame` | 指定時刻のプロジェクトや動画のフレームを Claude に表示（保存も可） |
| `list_effectcraft_catalog` | パラメーター id 付きの 306 エフェクト、テンプレートとそのコントロール、フォント、665 コマンド、形式 |
| `run_effectcraft_script` | After Effects 風の JavaScript（`app.project`、`addComp`、`layers.addText`、`setValueAtTime`、エクスプレッション…）— ほとんどの `.jsx` スクリプトはそのまま動きます — の後、レンダリング / 保存 |
| `run_effectcraft_commands` | 任意のエンジンコマンドと `set_property`、`add_keyframe`、`add_effect`、`get_layer`… を 1 つのセッションで実行（`$steps[N].フィールド` 参照可）、画面なしまたはライブで、その後レンダリング / 保存 |
| `open_in_effectcraft` | EffectCraft アプリでプロジェクトや素材を開く（コントロールチャネル付きも可） |
| `get_effectcraft_status` | プラットフォーム、インストール、バージョン、コマンド数、エフェクト数、アプリ / コントロールポート |

| | |
| --- | --- |
| **読み込み** | MP4、MOV、MKV、WebM、AVI、MXF、GIF、PNG、JPEG、TIFF、WebP、EXR、PSD、SVG、WAV、MP3、AAC、FLAC、`.ecproj`、`.ectemplate`、Lottie、glTF / GLB / OBJ |
| **レンダリング** | MP4（H.264）、HEVC、AV1、ProRes（proxy … 4444 XQ、アルファ付き）、WebM（VP9、アルファ）、GIF、PNG / JPEG / TIFF / EXR 連番、WAV、AIFF、Lottie（.json）、`.ecproj` |

位置は **コンポ左上隅からのピクセル**、時間は **秒** です。連番画像は専用の `<名前>_frames` フォルダーに書き出されます。

## 例

```json
{
  "name": "sale",
  "width": 1080,
  "height": 1080,
  "duration": 5,
  "background": "#2e1065",
  "layers": [
    { "type": "text", "text": "サマーセール", "size": 120, "color": "#ffffff", "y": 760,
      "animate_in": { "type": "typewriter", "duration": 1.2 }, "effects": [ { "effect": "Glow" } ] },
    { "type": "media", "path": "C:\\ブランド\\logo.png", "fit": "none", "scale": 60, "y": 420,
      "animate_in": { "type": "pop", "duration": 0.6 }, "animate_out": { "type": "fade", "duration": 0.5 } },
    { "type": "shape", "shape": "ellipse", "width": 900, "height": 900, "color": "#7c3aed", "opacity": 40,
      "expressions": [ { "property": "scale", "expression": "[100 + 5*Math.sin(time*3), 100 + 5*Math.sin(time*3)]" } ] }
  ],
  "formats": ["mp4", "gif", "ecproj"],
  "output_dir": "C:\\動画"
}
```

## 必要なもの

- `effectcraft-cli` 付きの **EffectCraft**（**0.7.0** で検証）。[プラットフォーム](#プラットフォーム) を参照
- Node.js ≥ 20（`.mcpb` でインストールする場合は Claude Desktop に同梱）

## インストール

### Claude Desktop（推奨、全プラットフォーム）

1. [最新リリース](https://github.com/jhonsu01/effectcraft-mcp-server/releases/latest) から `effectcraft-mcp-server.mcpb` をダウンロードします。
2. ダブルクリック（または Claude Desktop → *設定 → 拡張機能* にドラッグ）して **インストール** をクリックします。
3. 任意：EffectCraft が標準の場所にない場合は、拡張機能の設定でそのフォルダーまたは `effectcraft-cli` のパスを入力します。

### Codex（OpenAI）

**推奨 — マーケットプレイス（更新を受け取れます）：** *プラグイン → 追加 → マーケットプレイスを追加* で、ソースに `jhonsu01/craft-marketplace`、参照に `main` を指定し、**Craft Bridges** から **EffectCraft Bridge** をインストールします（[craft-marketplace](https://github.com/jhonsu01/craft-marketplace)）。新しいバージョンはマーケットプレイスの更新で届きます。または zip をアップロードします（Codex はアカウントに保存し、同じ名前の新しい zip を拒否します）：

1. [最新リリース](https://github.com/jhonsu01/effectcraft-mcp-server/releases/latest)から `effectcraft-mcp-server-<バージョン>-codex.zip` をダウンロードします。
2. Codex で *プラグイン → 追加 → 新しいプラグイン* を開き、zip を選んで **プラグインを追加** をクリックします。
3. Codex はサーバーを `node` で起動するため、`PATH` に Node.js ≥ 20 が必要です。EffectCraft が標準の場所にない場合は、`EFFECTCRAFT_DIR` または `EFFECTCRAFT_CLI` をシステムの環境変数として設定してください（Codex にはローカルプラグイン用の設定画面がありません）。

### Claude Code / その他の MCP クライアント

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

## 設定

| 変数 | 意味 |
| --- | --- |
| `EFFECTCRAFT_DIR` | EffectCraft のフォルダー、その実行ファイルのいずれか、`.tar.gz` のルート（`bin/` を含む）または `EffectCraft.app`。既定：自動検出 |
| `EFFECTCRAFT_CLI` | `effectcraft-cli` / `effectcraft-cli.exe` のパス（`EFFECTCRAFT_DIR` より優先） |
| `EFFECTCRAFT_APP` | デスクトップアプリが別の場所にある場合のパス（例：Linux の AppImage） |
| `EFFECTCRAFT_CONTROL_PORT` | デスクトップアプリのコントロールポート（既定 9877） |
| `EFFECTCRAFT_MCP_TIMEOUT` | エンジン呼び出し 1 回あたりの最大秒数（既定 3600） |

## 安全性

- `overwrite: true` を指定しない限り、ファイルは **決して上書きされません**：フォルダー内では空いている名前（`_2`）を使い、既存の `output_path` はエラーになります。素材と `.ecproj` プロジェクトは読み取るだけで、プロジェクトは新しいコピー（形式 `ecproj`）としてのみ保存されます。
- パスはすべて絶対パスで指定します。エンジンは画面なし・メモリ上のプロジェクトで動作し、`live: true` でない限り EffectCraft アプリに触れません。
- すべてローカルで実行され、ネットワークにはアクセスしません。各ジョブは一時フォルダー内の専用エンジンを使い、終了時にフォルダーは削除されます。

## 開発

```bash
npm run build       # TypeScript + 単一ファイルのバンドル（dist/bundle.cjs）
npm test            # ユニットテスト（Windows、macOS、Linux のパス処理）
npm run test:e2e    # 実際の MCP stdio による 21 項目のエンドツーエンド検証（合成画像。動画は EffectCraft がレンダリング）
npm run pack:mcpb   # effectcraft-mcp-server.mcpb
npm run pack:codex  # Codex 用プラグイン zip
```

Docker での Linux テスト（先に `effectcraft-<バージョン>-linux-x86_64.tar.gz` を展開）：

```bash
docker run --rm -v "$PWD:/work:ro" -v "/path/to/effectcraft-0.7.0-linux-x86_64:/opt/effectcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## ライセンス

Apache-2.0。EffectCraft の著作権はその作者（Storytold）に帰属し、MIT または Apache-2.0 でライセンスされています。
本プロジェクトは EffectCraft および Storytold とは無関係であり、承認も受けていません。After Effects は Adobe の商標です。
