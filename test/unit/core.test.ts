import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { cleanEnv, connectorDir, resolveInstall, resolveInt } from '../../src/config.js';
import { resolveOutputPath, sameFile } from '../../src/paths.js';
import { substitute } from '../../src/tools/advanced.js';
import { OUTPUTS, collectInputs, nameStem, sequenceFolder } from '../../src/tools/common.js';
import { layerSchema, propPath } from '../../src/tools/motion.js';

describe('config', () => {
  it('treats unfilled MCPB placeholders as unset', () => {
    expect(cleanEnv('${user_config.effectcraft_dir}')).toBeUndefined();
    expect(resolveInt('${user_config.control_port}', 9877, 65535)).toBe(9877);
  });
  it('Windows: install folder, an .exe inside it, or nothing', () => {
    const exists = (p: string) => /^D:\\EC\\effectcraft(-cli)?\.exe$/i.test(p);
    const r = resolveInstall({ EFFECTCRAFT_DIR: 'D:\\EC' }, exists, 'win32', 'C:\\Users\\u');
    expect([r.cli, r.app]).toEqual(['D:\\EC\\effectcraft-cli.exe', 'D:\\EC\\effectcraft.exe']);
    const pf = (p: string) => p === 'C:\\Program Files\\EffectCraft\\effectcraft-cli.exe';
    expect(resolveInstall({ ProgramFiles: 'C:\\Program Files' }, pf, 'win32').cli).toBe('C:\\Program Files\\EffectCraft\\effectcraft-cli.exe');
  });
  it('Linux: deb/rpm, tar.gz root, PATH, AppImage app', () => {
    const deb = new Set(['/usr/bin/effectcraft-cli', '/usr/bin/effectcraft']);
    expect(Object.values(resolveInstall({}, (p) => deb.has(p), 'linux', '/home/u')).slice(2, 4)).toEqual(['/usr/bin/effectcraft-cli', '/usr/bin/effectcraft']);
    const tar = new Set(['/opt/x/effectcraft-0.7.0-linux-x86_64/bin/effectcraft-cli']);
    expect(resolveInstall({ EFFECTCRAFT_DIR: '/opt/x/effectcraft-0.7.0-linux-x86_64' }, (p) => tar.has(p), 'linux', '/home/u').cli).toBe('/opt/x/effectcraft-0.7.0-linux-x86_64/bin/effectcraft-cli');
    const img = '/home/u/effectcraft-0.7.0-linux-x86_64.AppImage';
    expect(resolveInstall({ EFFECTCRAFT_APP: img }, (p) => p === img, 'linux', '/home/u').app).toBe(img);
  });
  it('macOS: EffectCraft.app plus the separate CLI zip', () => {
    const files = new Set(['/Applications/EffectCraft.app/Contents/MacOS/EffectCraft', '/usr/local/bin/effectcraft-cli']);
    const r = resolveInstall({}, (p) => files.has(p), 'darwin', '/Users/u');
    expect([r.cli, r.app]).toEqual(['/usr/local/bin/effectcraft-cli', '/Applications/EffectCraft.app/Contents/MacOS/EffectCraft']);
    expect(connectorDir({}, 'darwin', '/Users/u')).toBe('/Users/u/Library/Application Support/effectcraft-mcp-server');
  });
});

describe('paths and formats', () => {
  it('keeps dots in output names, dropping only a real extension', () => {
    expect(nameStem('intro-1.0.1')).toBe('intro-1.0.1');
    expect(nameStem('promo.2026')).toBe('promo.2026');
    expect(nameStem('intro.mp4')).toBe('intro');
    expect(nameStem('Título final.ECPROJ')).toBe('Título final');
  });
  it('never overwrites, POSIX case-sensitive', () => {
    const exists = (p: string) => p === 'D:\\v\\intro.mp4';
    expect(resolveOutputPath({ inputPath: 'D:\\v\\intro.mov', ext: 'mp4', exists, platform: 'win32' })).toEqual({ path: 'D:\\v\\intro_2.mp4' });
    expect(resolveOutputPath({ inputPath: '/v/a.mov', ext: 'mp4', outputPath: '/v/out.webm', platform: 'linux' })).toHaveProperty('error');
    expect(sameFile('/a/A.mp4', '/a/a.mp4', 'linux')).toBe(false);
  });
  it('maps every output to an engine format and extension', () => {
    expect(OUTPUTS.prores).toEqual({ format: 'prores', ext: 'mov' });
    expect(OUTPUTS.hevc.ext).toBe('mp4');
    expect('sequence' in OUTPUTS.png_sequence).toBe(true);
  });
  it('gives each image sequence a fresh folder', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ec-unit-'));
    mkdirSync(join(dir, 'intro_frames'));
    expect(sequenceFolder(dir, 'intro')).toBe(join(dir, 'intro_frames_2'));
    expect(sequenceFolder(dir, 'intro', true)).toBe(join(dir, 'intro_frames'));
  });
  it('collects media from a folder', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ec-unit-'));
    for (const f of ['b.MOV', 'a.mp4', 'c.png', 'd.txt', 'e.ecproj']) writeFileSync(join(dir, f), 'x');
    expect(collectInputs([], dir).map((p) => p.slice(dir.length + 1))).toEqual(['a.mp4', 'b.MOV', 'c.png']);
    expect(() => collectInputs(['rel.mp4'])).toThrow(/absolute/);
  });
});

describe('layers', () => {
  it('maps short property names to paths', () => {
    expect(propPath('position')).toBe('transform/position');
    expect(propPath('effects/#1/blurriness')).toBe('effects/#1/blurriness');
  });
  it('layer schema has no JSON Schema tuples and parses a text layer', () => {
    expect(JSON.stringify(z.toJSONSchema(layerSchema))).not.toContain('prefixItems');
    const l = layerSchema.parse({ type: 'text', text: 'Hi', animate_in: { type: 'fade' } });
    expect(l.animate_in?.duration).toBe(0.6);
  });
});

describe('run_effectcraft_commands references', () => {
  it('replaces $steps values', () => {
    expect(substitute({ layer: '$steps[0].layer', items: ['$steps[1].items[0]'], x: '$x' }, [{ layer: 4 }, { items: [7] }])).toEqual({ layer: 4, items: [7], x: '$x' });
    expect(() => substitute('$steps[3].layer', [])).toThrow();
  });
});
