import { readFileSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAdvancedTools } from './tools/advanced.js';
import { registerMotionTools } from './tools/motion.js';
import { LINK_INSTRUCTIONS } from './links.js';

/** serverInfo.version comes from package.json (reachable as ../package.json from dist/ and src/). */
export function readPackageVersion(): string {
  try {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(path.resolve(dir, '../package.json'), 'utf-8')) as { version?: unknown };
    if (typeof pkg.version === 'string' && pkg.version) return pkg.version;
  } catch {
    // package.json not shipped next to the bundle: still start
  }
  return '0.0.0-unknown';
}

export function createServer(): McpServer {
  const server = new McpServer(
    { name: 'effectcraft-mcp-server', version: readPackageVersion() },
    {
      instructions:
        'Creates motion graphics and visual effects with the engine of the locally installed EffectCraft (Windows, macOS, Linux), an ' +
        'open-source After Effects-class compositor: animated titles and designs from layers (text, shapes, solids, images, videos) with ' +
        'entrances, keyframes, expressions and 306 effects; effects and titles on existing videos; motion templates (lower thirds, title ' +
        'cards, social posts); renders to MP4, HEVC, AV1, ProRes, WebM, GIF, image sequences and Lottie; .ecproj projects; After ' +
        'Effects-style scripts. Positions are pixels from the top-left of the comp; times are seconds. All paths must be absolute; inputs ' +
        'are only read; files are never overwritten unless overwrite is true. The engine runs headless and never touches the EffectCraft ' +
        'app unless live=true.' +
        ' ' +
        LINK_INSTRUCTIONS,
    },
  );
  registerMotionTools(server);
  registerAdvancedTools(server);
  return server;
}
