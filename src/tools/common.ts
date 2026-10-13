import { existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { EffectCraftSession } from '../engine.js';
import { resolveOutputPath, stemOf } from '../paths.js';
import { withFileLinks } from '../links.js';

export type Content = { type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string };
export type ToolResult = { content: Content[]; isError?: boolean };

export function json(obj: unknown, isError = false): ToolResult {
  const out: ToolResult = { content: [{ type: 'text', text: JSON.stringify(withFileLinks(obj), null, 2) }] };
  if (isError) out.isError = true;
  return out;
}

export function errorResult(e: unknown): ToolResult {
  return json({ success: false, error: e instanceof Error ? e.message : String(e) }, true);
}

export const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } as const;
export const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

// ---------------------------------------------------------------- formats

/** Footage EffectCraft imports. */
export const VIDEO = ['mp4', 'mov', 'm4v', 'mkv', 'webm', 'avi', 'mxf', 'gif'];
export const IMAGE = ['png', 'jpg', 'jpeg', 'tif', 'tiff', 'webp', 'bmp', 'exr', 'psd', 'svg'];
export const AUDIO = ['wav', 'mp3', 'aac', 'm4a', 'flac', 'ogg', 'aif', 'aiff'];
export const MEDIA = [...VIDEO, ...IMAGE, ...AUDIO];

/** Output formats: id → engine format, file extension, image sequence or not. */
export const OUTPUTS = {
  mp4: { format: 'h264', ext: 'mp4' },
  hevc: { format: 'hevc', ext: 'mp4' },
  av1: { format: 'av1', ext: 'mp4' },
  prores: { format: 'prores', ext: 'mov' },
  webm: { format: 'webm', ext: 'webm' },
  gif: { format: 'gif', ext: 'gif' },
  png_sequence: { format: 'png', ext: 'png', sequence: true },
  jpg_sequence: { format: 'jpeg', ext: 'jpg', sequence: true },
  tiff_sequence: { format: 'tiff', ext: 'tif', sequence: true },
  exr_sequence: { format: 'exr', ext: 'exr', sequence: true },
  wav: { format: 'wav', ext: 'wav' },
  aiff: { format: 'aiff', ext: 'aif' },
  lottie: { format: 'lottie', ext: 'json' },
  ecproj: { format: 'ecproj', ext: 'ecproj' },
} as const satisfies Record<string, { format: string; ext: string; sequence?: boolean }>;
export type OutputFormat = keyof typeof OUTPUTS;
export const OUTPUT_IDS = Object.keys(OUTPUTS) as [OutputFormat, ...OutputFormat[]];

export const formatsSchema = z
  .array(z.enum(OUTPUT_IDS))
  .min(1)
  .max(10)
  .describe(
    'Outputs: mp4 (H.264), hevc, av1 (.mp4), prores (.mov), webm (VP9), gif, png_sequence / jpg_sequence / tiff_sequence / exr_sequence ' +
      '(a folder of frames), wav / aiff (audio), lottie (.json for web/apps), ecproj (the editable EffectCraft project).',
  );

export const renderOptionsSchema = {
  start: z.number().min(0).optional().describe('Render from this comp time (s).'),
  end: z.number().positive().optional().describe('Render up to this comp time (s).'),
  resolution: z.enum(['full', 'half', 'third', 'quarter']).optional(),
  render_fps: z.number().positive().max(240).optional().describe('Output frame rate (default: the comp\'s).'),
  quality: z.number().int().min(1).max(100).optional().describe('JPEG / WebM quality.'),
  bitrate: z.number().int().positive().optional().describe('Video bitrate in kbps.'),
  prores_profile: z.enum(['proxy', 'lt', 'standard', 'hq', '4444', '4444xq']).optional(),
  transparent: z.boolean().optional().describe('Keep the alpha channel (prores 4444, webm, png / tiff / exr sequences).'),
  audio: z.enum(['auto', 'on', 'off']).optional(),
};
export type RenderOpts = { [K in keyof typeof renderOptionsSchema]?: z.infer<(typeof renderOptionsSchema)[K]> };

export const outputSchema = {
  output_dir: z.string().optional().describe('Absolute output folder (default: next to the input; required for new designs).'),
  output_path: z.string().optional().describe('Absolute output file for the first format (its extension must match).'),
  overwrite: z.boolean().default(false).describe('Replace existing outputs.'),
};

// ---------------------------------------------------------------- inputs

export function collectInputs(paths: string[], dir?: string, exts = MEDIA): string[] {
  const out: string[] = [];
  for (const p of paths) {
    if (!path.isAbsolute(p)) throw new Error(`Paths must be absolute: ${p}`);
    if (!existsSync(p) || !statSync(p).isFile()) throw new Error(`File not found: ${p}`);
    out.push(p);
  }
  if (dir) {
    if (!path.isAbsolute(dir)) throw new Error(`input_dir must be an absolute path: ${dir}`);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) throw new Error(`Folder not found: ${dir}`);
    for (const name of readdirSync(dir).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
      const full = path.join(dir, name);
      if (exts.includes(path.extname(name).slice(1).toLowerCase()) && statSync(full).isFile()) out.push(full);
    }
  }
  if (out.length === 0) throw new Error('No input files: give input_path, input_paths or input_dir.');
  return out;
}

export function outputFor(input: string, ext: string, suffix: string, o: { output_path?: string; output_dir?: string; overwrite?: boolean }): string {
  if (o.output_dir) mkdirSync(o.output_dir, { recursive: true });
  const r = resolveOutputPath({ inputPath: input, ext, suffix, outputPath: o.output_path, outputDir: o.output_dir, overwrite: o.overwrite });
  if ('error' in r) throw new Error(r.error);
  mkdirSync(path.dirname(r.path), { recursive: true });
  return r.path;
}

/** A free folder <dir>/<stem>_frames (then _frames_2...) for an image sequence; existing ones only with overwrite. */
export function sequenceFolder(dir: string, stem: string, overwrite?: boolean): string {
  let candidate = path.join(dir, `${stem}_frames`);
  for (let i = 2; existsSync(candidate) && !overwrite; i++) candidate = path.join(dir, `${stem}_frames_${i}`);
  mkdirSync(candidate, { recursive: true });
  return candidate;
}

// ---------------------------------------------------------------- rendering

export interface Rendered {
  path: string;
  format: string;
  bytes?: number;
  frames?: number;
  files?: number;
  warnings?: string[];
}

/** A file name given by the user: kept as is (dots included), except a trailing output / project extension. */
export function nameStem(name: string): string {
  const exts = new Set<string>([...Object.values(OUTPUTS).map((o) => o.ext), 'ecproj', 'ecprojx', 'tiff', 'jpeg', 'aiff']);
  const m = /\.([^.\\/]+)$/.exec(name);
  return m && exts.has(m[1].toLowerCase()) ? name.slice(0, -m[0].length) : name;
}

/**
 * Render (or export / save) the comp once per format: output_path for the first format, the others as
 * <output_dir or the base's folder>/<stem><suffix>.<ext>; image sequences go to their own <stem>_frames folder.
 * Never replaces anything unless overwrite.
 */
export async function renderAll(
  s: EffectCraftSession,
  comp: number | string | undefined,
  base: { stemSource: string; name?: string; suffix: string; output_dir?: string; output_path?: string; overwrite?: boolean },
  formats: OutputFormat[],
  o: RenderOpts,
): Promise<Rendered[]> {
  const out: Rendered[] = [];
  for (const [i, f] of formats.entries()) {
    const spec = OUTPUTS[f];
    const usePath = i === 0 && base.output_path;
    if (usePath && 'sequence' in spec) throw new Error('output_path cannot name an image sequence; use output_dir.');
    if (usePath && path.extname(base.output_path!).slice(1).toLowerCase() !== spec.ext) {
      throw new Error(`output_path must end in .${spec.ext} for ${f}.`);
    }
    const dir = base.output_dir ?? path.dirname(base.output_path ?? base.stemSource);
    const stem = base.output_path ? stemOf(base.output_path) : (base.name !== undefined ? nameStem(base.name) : stemOf(base.stemSource)) + base.suffix;
    if ('sequence' in spec) {
      const folder = sequenceFolder(dir, stem, base.overwrite);
      const r = await renderQueue(s, comp, path.join(folder, `${stem}.${spec.ext}`), spec.format, o);
      const files = readdirSync(folder).filter((n) => n.toLowerCase().endsWith('.' + spec.ext)).length;
      out.push({ path: folder, format: f, frames: r.frames, files });
      continue;
    }
    const target = usePath
      ? outputFor(base.output_path + '.__src', spec.ext, '', { output_path: base.output_path, overwrite: base.overwrite })
      : outputFor(path.join(dir, stem + '.__src'), spec.ext, '', { output_dir: dir, overwrite: base.overwrite });
    if (f === 'ecproj') {
      await s.json('save_project', { path: target });
      out.push({ path: target, format: f, bytes: statSync(target).size });
    } else if (f === 'lottie') {
      const r = await s.cmd('file.exportLottie', { ...(comp !== undefined ? { comp } : {}), path: target });
      out.push({ path: target, format: f, bytes: statSync(target).size, ...(r?.warnings?.length ? { warnings: r.warnings } : {}) });
    } else {
      const r = await renderQueue(s, comp, target, spec.format, o);
      out.push({ path: target, format: f, bytes: statSync(target).size, frames: r.frames });
    }
  }
  return out;
}

async function renderQueue(s: EffectCraftSession, comp: number | string | undefined, output: string, format: string, o: RenderOpts): Promise<{ frames?: number }> {
  const p: Record<string, unknown> = { format, output, log: 'errorsOnly' };
  if (comp !== undefined) p['comp'] = comp;
  if (o.start !== undefined || o.end !== undefined) {
    p['timeSpan'] = 'custom';
    if (o.start !== undefined) p['start'] = o.start;
    if (o.end !== undefined) p['end'] = o.end;
  }
  if (o.resolution) p['resolution'] = o.resolution;
  if (o.render_fps) p['frameRate'] = o.render_fps;
  if (o.quality) p['quality'] = o.quality;
  if (o.bitrate) p['bitrate'] = o.bitrate;
  if (o.prores_profile) p['proresProfile'] = o.prores_profile;
  else if (o.transparent && format === 'prores') p['proresProfile'] = '4444';
  if (o.transparent) p['channels'] = 'rgba';
  if (o.audio) p['audio'] = o.audio;
  const added = await s.cmd('renderQueue.add', p);
  const r = await s.cmd('renderQueue.render', { wait: true });
  const item = (r?.items ?? []).find((it: any) => it.id === added?.id) ?? r?.items?.at(-1);
  if (r?.failed || (item && item.status && item.status !== 'Done')) {
    throw new Error(`Render to ${path.basename(output)} failed: ${JSON.stringify(item?.error ?? item?.status ?? r).slice(0, 300)}`);
  }
  return { frames: item?.frames ?? added?.frames };
}

/** A rendered frame of the comp, returned as an MCP image. */
export async function preview(s: EffectCraftSession, comp: number | string | undefined, time?: number, maxSide = 960): Promise<{ data: string; mimeType: string } | undefined> {
  const r = await s.call('render_preview', { ...(comp !== undefined ? { comp } : {}), ...(time !== undefined ? { time } : {}), max_side: maxSide });
  const img = r.content.find((c) => c.type === 'image');
  return img?.data ? { data: img.data, mimeType: img.mimeType ?? 'image/png' } : undefined;
}

export function withPreview(body: unknown, imgs: ({ data: string; mimeType: string } | undefined)[], isError = false): ToolResult {
  const res = json(body, isError);
  for (const img of imgs) if (img) res.content.push({ type: 'image', ...img });
  return res;
}

export { stemOf };
