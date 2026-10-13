<p align="center"><img src="icon.png" width="120" alt="Icône d'EffectCraft Bridge"></p>

<h1 align="center">EffectCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <b>Français</b> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Laissez Claude créer des animations graphiques et des effets visuels avec l'<b>EffectCraft</b> installé sur votre ordinateur — <b>Windows, macOS et Linux</b> :<br>
  titres animés, effets sur des vidéos, modèles animés, et rendus en MP4, ProRes, WebM, GIF, séquences d'images et Lottie.
</p>

---

## Pourquoi

[EffectCraft](https://github.com/storytold/effectcraft) est un compositeur d'animation graphique open source de niveau After Effects, écrit en Rust, avec une CLI sans interface (`effectcraft-cli`), 665 commandes, 306 effets, un modèle de scripts façon After Effects et un mode MCP. Ce serveur [Model Context Protocol](https://modelcontextprotocol.io) transforme ce moteur en **outils fichier → fichier** pour Claude, pour demander par exemple :

> *« Fais une intro de 5 secondes en 1080×1080 : fond violet, mon logo qui apparaît en rebondissant et « SOLDES D'ÉTÉ » tapé lettre par lettre avec une lueur. »*
> *« Ajoute un synthé « Ana Pérez — Directrice » sur `interview.mp4`. »*
> *« Applique un étalonnage cinéma et un léger flou à tous les clips de `D:\Clips`, accélère-les à 150 % et exporte des MP4. »*
> *« Rends la composition « Final » de `promo.ecproj` en ProRes 4444 avec alpha et en GIF. »*
> *« Exporte cette animation en Lottie pour mon site. »*

Projet frère de [lightcraft-mcp-server](https://github.com/jhonsu01/lightcraft-mcp-server), [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) et [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Plateformes

| Système | Paquet EffectCraft à installer | Où le serveur le trouve (sans réglage) | État |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI ou zip portable | `C:\Program Files\EffectCraft`, `%LOCALAPPDATA%\Programs\EffectCraft`, `PATH` | ✅ Vérifié (Windows 11) |
| **Linux** (x86_64, aarch64) | `.deb`, `.rpm` ou `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/effectcraft/bin`, `~/.local/bin`, `PATH` | ✅ Vérifié (Debian 12, sans interface) |
| **macOS** 11+ (Apple silicon et Intel) | `.dmg` (l'app) **plus** `effectcraft-cli-<version>-macos-universal.zip` | `/Applications/EffectCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Pris en charge, pas encore testé sur Mac |

Téléchargements : [versions d'EffectCraft](https://github.com/storytold/effectcraft/releases) (il existe aussi un tar.gz pour FreeBSD ; pointez `EFFECTCRAFT_DIR` dessus). Ailleurs : définissez `EFFECTCRAFT_DIR` (dossier, racine du `.tar.gz` ou `EffectCraft.app`) ou `EFFECTCRAFT_CLI`.

- **macOS :** le DMG ne contient que l'app. Décompressez le zip séparé de `effectcraft-cli` et déplacez `effectcraft-cli` dans `/usr/local/bin` (ou pointez `EFFECTCRAFT_CLI` dessus). Le premier lancement vérifie en ligne la notarisation d'Apple.
- **Linux :** l'AppImage et le Flatpak ne contiennent que l'app, sans `effectcraft-cli` ; utilisez le deb, le rpm ou le tar.gz. Si l'app est un AppImage, définissez `EFFECTCRAFT_APP` pour que `open_in_effectcraft` puisse la lancer. Sur un serveur sans GPU, la configuration vérifiée utilisait `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## Fonctionnement

| Élément | Description |
| --- | --- |
| **Moteur EffectCraft** (`effectcraft-cli mcp`) | Le moteur d'EffectCraft lui-même : compositeur, texte, formes, images clés, expressions, effets, modèles, file d'attente de rendu et exportateurs. Relancé à neuf et **sans interface** pour chaque tâche avec un projet en mémoire, il ne touche donc jamais à l'app ni à un projet ouvert. |
| **Serveur MCP** (Node.js) | 11 outils de haut niveau. Il construit des compositions à partir d'une simple liste de calques, importe vos médias par référence (ils sont seulement lus), effectue le rendu là où vous l'avez demandé et vérifie chaque sortie avant : EffectCraft seul remplacerait les fichiers existants sans prévenir. |
| **App en direct** (facultatif) | `open_in_effectcraft control=true` lance l'app avec son canal de contrôle uniquement local (port 9877) et `run_effectcraft_commands` / `run_effectcraft_script live=true` la pilotent. Le canal n'a pas de mot de passe : fermez l'app une fois terminé. |

## Outils

| Outil | Rôle |
| --- | --- |
| `create_motion_graphic` | Une composition de toute taille, cadence et durée à partir de calques listés de haut en bas — texte (toute police, contour, alignement), formes (rectangle, arrondi, ellipse, étoile, polygone), solides, images / vidéos / audio (couvrir ou ajuster, vitesse), objets nuls, calques d'effets — avec position, échelle, rotation, opacité, mode de fusion et timing ; entrées et sorties (fondu, glissement gauche / droite / haut / bas, rebond, zoom, flou, machine à écrire, rotation) ; images clés ; expressions ; effets aux paramètres animés |
| `apply_effects` | Une vidéo ou une image (ou un dossier) dans une composition à sa taille : effets avec images clés facultatives, découpe, vitesse, et calques par-dessus (titres, sous-titres, logos) |
| `use_template` | Les modèles intégrés Lower Third, Title Card, Logo Reveal, Kinetic Type, Social Square, Vertical Story, Slideshow et 3D Text Orbit, ou tout `.ectemplate` : réglez ses contrôles par nom, placez une vidéo derrière, ajoutez des calques, changez la durée |
| `render_project` | Toute composition d'un `.ecproj` avec plage temporelle, résolution, cadence, qualité, débit et alpha ; le projet n'est jamais modifié |
| `get_project_info` | Compositions, calques, métrage (avec fichiers manquants) et contrôles d'Animations graphiques essentielles |
| `render_frame` | Images d'un projet ou d'une vidéo aux instants donnés, visibles par Claude et éventuellement enregistrées |
| `list_effectcraft_catalog` | 306 effets avec les ids de leurs paramètres, modèles et leurs contrôles, polices, 665 commandes, formats |
| `run_effectcraft_script` | JavaScript façon After Effects (`app.project`, `addComp`, `layers.addText`, `setValueAtTime`, expressions...) — la plupart des scripts `.jsx` fonctionnent tels quels — puis rendu / enregistrement |
| `run_effectcraft_commands` | Toutes commandes du moteur plus `set_property`, `add_keyframe`, `add_effect`, `get_layer`... dans une session (références `$steps[N].champ`), sans interface ou en direct, puis rendu / enregistrement |
| `open_in_effectcraft` | Ouvre des projets ou des médias dans l'app EffectCraft (éventuellement avec le canal de contrôle) |
| `get_effectcraft_status` | Plateforme, installation, version, commandes, effets, app / port de contrôle |

| | |
| --- | --- |
| **Importe** | MP4, MOV, MKV, WebM, AVI, MXF, GIF, PNG, JPEG, TIFF, WebP, EXR, PSD, SVG, WAV, MP3, AAC, FLAC, `.ecproj`, `.ectemplate`, Lottie, glTF / GLB / OBJ |
| **Rend** | MP4 (H.264), HEVC, AV1, ProRes (proxy … 4444 XQ, avec alpha), WebM (VP9, alpha), GIF, séquences PNG / JPEG / TIFF / EXR, WAV, AIFF, Lottie (.json), `.ecproj` |

Les positions sont des **pixels depuis le coin supérieur gauche de la composition** ; les temps, des **secondes**. Les séquences d'images vont dans leur propre dossier `<nom>_frames`.

## Exemple

```json
{
  "name": "soldes",
  "width": 1080,
  "height": 1080,
  "duration": 5,
  "background": "#2e1065",
  "layers": [
    { "type": "text", "text": "SOLDES D'ÉTÉ", "size": 110, "color": "#ffffff", "y": 760,
      "animate_in": { "type": "typewriter", "duration": 1.2 }, "effects": [ { "effect": "Glow" } ] },
    { "type": "media", "path": "C:\\Marque\\logo.png", "fit": "none", "scale": 60, "y": 420,
      "animate_in": { "type": "pop", "duration": 0.6 }, "animate_out": { "type": "fade", "duration": 0.5 } },
    { "type": "shape", "shape": "ellipse", "width": 900, "height": 900, "color": "#7c3aed", "opacity": 40,
      "expressions": [ { "property": "scale", "expression": "[100 + 5*Math.sin(time*3), 100 + 5*Math.sin(time*3)]" } ] }
  ],
  "formats": ["mp4", "gif", "ecproj"],
  "output_dir": "C:\\Videos"
}
```

## Prérequis

- **EffectCraft** avec `effectcraft-cli` (testé avec **0.7.0**) ; voir [Plateformes](#plateformes)
- Node.js ≥ 20 (fourni avec Claude Desktop pour les installations `.mcpb`)

## Installation

### Claude Desktop (recommandé, toutes plateformes)

1. Téléchargez `effectcraft-mcp-server.mcpb` depuis la [dernière version](https://github.com/jhonsu01/effectcraft-mcp-server/releases/latest).
2. Double-cliquez dessus (ou glissez-le dans Claude Desktop → *Paramètres → Extensions*) puis cliquez sur **Installer**.
3. Facultatif : si EffectCraft n'est pas à un emplacement standard, indiquez son dossier ou le chemin de `effectcraft-cli` dans les paramètres de l'extension.

### Codex (OpenAI)

**Recommandé — le marketplace (reçoit les mises à jour) :** *Plugins → Ajouter → Ajouter un marketplace*, source `jhonsu01/craft-marketplace`, référence `main`, puis installez **EffectCraft Bridge** depuis **Craft Bridges** ([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). Les nouvelles versions arrivent en actualisant le marketplace. Ou envoyez le zip (Codex le garde dans votre compte et refuse un zip plus récent portant le même nom) :

1. Téléchargez `effectcraft-mcp-server-<version>-codex.zip` depuis la [dernière version](https://github.com/jhonsu01/effectcraft-mcp-server/releases/latest).
2. Dans Codex : *Plugins → Ajouter → Nouveau plugin*, choisissez le zip et cliquez sur **Ajouter le plugin**.
3. Codex lance le serveur avec `node` : Node.js ≥ 20 doit donc être dans le `PATH`. Si EffectCraft n'est pas à un emplacement standard, définissez `EFFECTCRAFT_DIR` ou `EFFECTCRAFT_CLI` comme variables d'environnement système (Codex n'a pas de formulaire de paramètres pour les plugins locaux).

### DeepSeek Harness

1. *Plugins → Add plugin*, saisissez `github:jhonsu01/craft-marketplace#path:/plugins/effectcraft-mcp-server` puis cliquez sur **Install**, puis sur **Enable now**.
2. Harness lance le serveur avec son propre client MCP et `node` (Node.js ≥ 20 dans le `PATH`) ; les outils apparaissent sous la forme `mcp__effectcraft__<outil>` et les fichiers produits comme des cartes qui s'ouvrent dans Harness.
3. Harness ne met pas encore les plugins à jour tout seul : pour mettre à jour, désinstallez le plugin puis réinstallez-le avec la même adresse.

### Claude Code / autres clients MCP

```bash
git clone https://github.com/jhonsu01/effectcraft-mcp-server.git
cd effectcraft-mcp-server
npm install
npm run build
```

Windows :

```bash
claude mcp add effectcraft -- node "%CD%\dist\bundle.cjs"
```

macOS / Linux :

```bash
claude mcp add effectcraft -- node "$PWD/dist/bundle.cjs"
```

## Configuration

| Variable | Signification |
| --- | --- |
| `EFFECTCRAFT_DIR` | Dossier d'EffectCraft, un de ses exécutables, la racine d'un `.tar.gz` (avec `bin/`) ou `EffectCraft.app`. Par défaut : détection automatique |
| `EFFECTCRAFT_CLI` | Chemin de `effectcraft-cli` / `effectcraft-cli.exe` (prioritaire sur `EFFECTCRAFT_DIR`) |
| `EFFECTCRAFT_APP` | Chemin de l'app de bureau lorsqu'elle est ailleurs (p. ex. un AppImage sous Linux) |
| `EFFECTCRAFT_CONTROL_PORT` | Port de contrôle de l'app de bureau (9877 par défaut) |
| `EFFECTCRAFT_MCP_TIMEOUT` | Durée maximale en secondes par appel au moteur (3600 par défaut) |

## Sécurité

- Les fichiers ne sont **jamais écrasés** sans `overwrite: true` : dans un dossier, un nom libre (`_2`) est choisi et un `output_path` existant provoque une erreur. Les médias et projets `.ecproj` sont seulement lus ; un projet n'est enregistré que sous forme de nouvelle copie (format `ecproj`).
- Tous les chemins doivent être absolus. Le moteur tourne sans interface avec un projet en mémoire et ne touche jamais à l'app EffectCraft, sauf avec `live: true`.
- Tout s'exécute en local, sans accès réseau. Chaque tâche utilise un moteur privé dans un dossier temporaire supprimé à la fin.

## Développement

```bash
npm run build       # TypeScript + bundle en un seul fichier (dist/bundle.cjs)
npm test            # tests unitaires (logique des chemins Windows, macOS et Linux)
npm run test:e2e    # 23 tests de bout en bout via un vrai MCP stdio (image synthétique ; vidéos rendues par EffectCraft)
npm run pack:mcpb   # effectcraft-mcp-server.mcpb
npm run pack:codex  # zip de plugin pour Codex
```

Test Linux dans Docker (décompressez d'abord `effectcraft-<version>-linux-x86_64.tar.gz`) :

```bash
docker run --rm -v "$PWD:/work:ro" -v "/chemin/vers/effectcraft-0.7.0-linux-x86_64:/opt/effectcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## Licence

Apache-2.0. EffectCraft est © ses auteurs (Storytold), MIT ou Apache-2.0.
Ce projet n'est ni affilié à EffectCraft ou Storytold, ni approuvé par eux. After Effects est une marque d'Adobe.
