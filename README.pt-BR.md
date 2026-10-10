<p align="center"><img src="icon.png" width="120" alt="Ícone do EffectCraft Bridge"></p>

<h1 align="center">EffectCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <b>Português</b> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Deixe o Claude criar motion graphics e efeitos visuais com o <b>EffectCraft</b> instalado no seu computador — <b>Windows, macOS e Linux</b>:<br>
  títulos animados, efeitos em vídeos, templates animados e renderização para MP4, ProRes, WebM, GIF, sequências de imagens e Lottie.
</p>

---

## Por quê

O [EffectCraft](https://github.com/storytold/effectcraft) é um compositor de motion graphics de código aberto, no nível do After Effects, escrito em Rust, com uma CLI sem interface (`effectcraft-cli`), 665 comandos, 306 efeitos, um modelo de scripts no estilo do After Effects e um modo MCP. Este servidor [Model Context Protocol](https://modelcontextprotocol.io) transforma esse motor em **ferramentas de arquivo para arquivo** para o Claude, para pedir coisas como:

> *"Faça uma intro de 5 segundos em 1080×1080: fundo roxo, meu logo surgindo com um pulo e 'PROMOÇÃO DE VERÃO' digitado letra por letra com brilho."*
> *"Coloque uma tarja com 'Ana Pérez — Diretora' sobre `entrevista.mp4`."*
> *"Aplique uma correção de cor cinematográfica e um leve desfoque em todos os clipes de `D:\Clips`, acelere para 150 % e exporte MP4."*
> *"Renderize a composição 'Final' de `promo.ecproj` em ProRes 4444 com alfa e como GIF."*
> *"Exporte esta animação como Lottie para o meu site."*

Irmão do [lightcraft-mcp-server](https://github.com/jhonsu01/lightcraft-mcp-server), [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) e [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Plataformas

| Sistema | Pacote do EffectCraft a instalar | Onde o servidor o encontra (sem configurar) | Status |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI ou zip portátil | `C:\Program Files\EffectCraft`, `%LOCALAPPDATA%\Programs\EffectCraft`, `PATH` | ✅ Verificado (Windows 11) |
| **Linux** (x86_64, aarch64) | `.deb`, `.rpm` ou `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/effectcraft/bin`, `~/.local/bin`, `PATH` | ✅ Verificado (Debian 12, sem interface) |
| **macOS** 11+ (Apple silicon e Intel) | `.dmg` (o app) **mais** `effectcraft-cli-<versão>-macos-universal.zip` | `/Applications/EffectCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Suportado, ainda não testado em um Mac |

Downloads: [versões do EffectCraft](https://github.com/storytold/effectcraft/releases) (há também um tar.gz para FreeBSD; aponte `EFFECTCRAFT_DIR` para ele). Em qualquer outro local: defina `EFFECTCRAFT_DIR` (pasta, raiz do `.tar.gz` ou `EffectCraft.app`) ou `EFFECTCRAFT_CLI`.

- **macOS:** o DMG contém apenas o app. Descompacte o zip separado do `effectcraft-cli` e mova `effectcraft-cli` para `/usr/local/bin` (ou aponte `EFFECTCRAFT_CLI` para ele). A primeira execução verifica a notarização da Apple online.
- **Linux:** o AppImage e o Flatpak contêm apenas o app, sem `effectcraft-cli`; use o deb, o rpm ou o tar.gz. Se o app for um AppImage, defina `EFFECTCRAFT_APP` para que `open_in_effectcraft` consiga iniciá-lo. Em um servidor sem GPU, a configuração verificada usou `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## Como funciona

| Parte | O que é |
| --- | --- |
| **Motor do EffectCraft** (`effectcraft-cli mcp`) | O próprio motor do EffectCraft: compositor, texto, formas, keyframes, expressões, efeitos, templates, fila de renderização e exportadores. Iniciado do zero e **sem interface** para cada tarefa com um projeto em memória, então nunca toca o app nem um projeto aberto. |
| **Servidor MCP** (Node.js) | 11 ferramentas de alto nível. Monta composições a partir de uma lista simples de camadas, importa suas mídias por referência (elas só são lidas), renderiza onde você pediu e verifica cada saída antes: o EffectCraft sozinho substituiria arquivos existentes sem avisar. |
| **App ao vivo** (opcional) | `open_in_effectcraft control=true` inicia o app com seu canal de controle apenas local (porta 9877) e `run_effectcraft_commands` / `run_effectcraft_script live=true` o controlam. O canal não tem senha: feche o app ao terminar. |

## Ferramentas

| Ferramenta | O que faz |
| --- | --- |
| `create_motion_graphic` | Uma composição de qualquer tamanho, taxa de quadros e duração a partir de camadas listadas de cima para baixo — texto (qualquer fonte, contorno, alinhamento), formas (retângulo, arredondado, elipse, estrela, polígono), sólidos, imagens / vídeos / áudio (cobrir ou ajustar, velocidade), nulos, camadas de ajuste — com posição, escala, rotação, opacidade, modo de mesclagem e tempo; entradas e saídas (fade, deslizar esquerda / direita / cima / baixo, pulo, zoom, desfoque, máquina de escrever, giro); keyframes; expressões; efeitos com parâmetros animados |
| `apply_effects` | Um vídeo ou imagem (ou uma pasta) em uma composição do próprio tamanho: efeitos com keyframes opcionais, corte, velocidade e camadas por cima (títulos, legendas, logos) |
| `use_template` | Os templates incluídos Lower Third, Title Card, Logo Reveal, Kinetic Type, Social Square, Vertical Story, Slideshow e 3D Text Orbit, ou qualquer `.ectemplate`: altere seus controles pelo nome, coloque um vídeo atrás, adicione camadas, mude a duração |
| `render_project` | Qualquer composição de um `.ecproj` com intervalo de tempo, resolução, taxa de quadros, qualidade, bitrate e alfa; o projeto nunca é modificado |
| `get_project_info` | Composições, camadas, mídias (com arquivos ausentes) e controles de Gráficos essenciais |
| `render_frame` | Quadros de um projeto ou vídeo nos tempos indicados, que o Claude vê e opcionalmente salvos |
| `list_effectcraft_catalog` | 306 efeitos com os ids dos parâmetros, templates e seus controles, fontes, 665 comandos, formatos |
| `run_effectcraft_script` | JavaScript no estilo do After Effects (`app.project`, `addComp`, `layers.addText`, `setValueAtTime`, expressões...) — a maioria dos scripts `.jsx` funciona como está — e depois renderização / salvamento |
| `run_effectcraft_commands` | Quaisquer comandos do motor mais `set_property`, `add_keyframe`, `add_effect`, `get_layer`... em uma sessão (referências `$steps[N].campo`), sem interface ou ao vivo, e depois renderização / salvamento |
| `open_in_effectcraft` | Abre projetos ou mídias no app EffectCraft (opcionalmente com o canal de controle) |
| `get_effectcraft_status` | Plataforma, instalação, versão, comandos, efeitos, app / porta de controle |

| | |
| --- | --- |
| **Importa** | MP4, MOV, MKV, WebM, AVI, MXF, GIF, PNG, JPEG, TIFF, WebP, EXR, PSD, SVG, WAV, MP3, AAC, FLAC, `.ecproj`, `.ectemplate`, Lottie, glTF / GLB / OBJ |
| **Renderiza** | MP4 (H.264), HEVC, AV1, ProRes (proxy … 4444 XQ, com alfa), WebM (VP9, alfa), GIF, sequências PNG / JPEG / TIFF / EXR, WAV, AIFF, Lottie (.json), `.ecproj` |

As posições são **pixels a partir do canto superior esquerdo da composição**; os tempos, **segundos**. As sequências de imagens vão para a própria pasta `<nome>_frames`.

## Exemplo

```json
{
  "name": "promocao",
  "width": 1080,
  "height": 1080,
  "duration": 5,
  "background": "#2e1065",
  "layers": [
    { "type": "text", "text": "PROMOÇÃO DE VERÃO", "size": 100, "color": "#ffffff", "y": 760,
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

- **EffectCraft** com `effectcraft-cli` (testado com **0.7.0**); veja [Plataformas](#plataformas)
- Node.js ≥ 20 (incluído no Claude Desktop para instalações `.mcpb`)

## Instalação

### Claude Desktop (recomendado, todas as plataformas)

1. Baixe `effectcraft-mcp-server.mcpb` da [versão mais recente](https://github.com/jhonsu01/effectcraft-mcp-server/releases/latest).
2. Clique duas vezes (ou arraste para o Claude Desktop → *Configurações → Extensões*) e clique em **Instalar**.
3. Opcional: se o EffectCraft não estiver em um local padrão, informe a pasta ou o caminho do `effectcraft-cli` nas configurações da extensão.

### Claude Code / outros clientes MCP

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

## Configuração

| Variável | Significado |
| --- | --- |
| `EFFECTCRAFT_DIR` | Pasta do EffectCraft, um de seus executáveis, a raiz de um `.tar.gz` (com `bin/`) ou `EffectCraft.app`. Padrão: detecção automática |
| `EFFECTCRAFT_CLI` | Caminho do `effectcraft-cli` / `effectcraft-cli.exe` (tem prioridade sobre `EFFECTCRAFT_DIR`) |
| `EFFECTCRAFT_APP` | Caminho do app de desktop quando está em outro lugar (ex.: um AppImage no Linux) |
| `EFFECTCRAFT_CONTROL_PORT` | Porta de controle do app de desktop (padrão 9877) |
| `EFFECTCRAFT_MCP_TIMEOUT` | Máximo de segundos por chamada ao motor (padrão 3600) |

## Segurança

- Os arquivos **nunca são sobrescritos**, exceto com `overwrite: true`: em uma pasta é usado um nome livre (`_2`) e um `output_path` existente dá erro. Mídias e projetos `.ecproj` só são lidos; um projeto só é salvo como cópia nova (formato `ecproj`).
- Todos os caminhos devem ser absolutos. O motor roda sem interface com um projeto em memória e nunca toca o app do EffectCraft, exceto com `live: true`.
- Tudo roda localmente, sem acesso à rede. Cada tarefa usa um motor privado em uma pasta temporária que é apagada ao final.

## Desenvolvimento

```bash
npm run build       # TypeScript + bundle de arquivo único (dist/bundle.cjs)
npm test            # testes unitários (lógica de caminhos de Windows, macOS e Linux)
npm run test:e2e    # 20 testes de ponta a ponta via MCP stdio real (imagem sintética; vídeos renderizados pelo EffectCraft)
npm run pack:mcpb   # effectcraft-mcp-server.mcpb
```

Teste de Linux no Docker (descompacte antes `effectcraft-<versão>-linux-x86_64.tar.gz`):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/caminho/para/effectcraft-0.7.0-linux-x86_64:/opt/effectcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## Licença

Apache-2.0. O EffectCraft é © de seus autores (Storytold), MIT ou Apache-2.0.
Este projeto não é afiliado nem endossado pelo EffectCraft ou pela Storytold. After Effects é marca da Adobe.
