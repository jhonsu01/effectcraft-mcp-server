import { statSync, writeFileSync } from 'fs';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { EffectCraftSession, withSession } from '../engine.js';
import {
  MEDIA, READ, VIDEO, WRITE, OutputFormat, Rendered, collectInputs, errorResult, formatsSchema, json, outputFor, outputSchema, preview,
  renderAll, renderOptionsSchema, withPreview,
} from './common.js';

// ---------------------------------------------------------------- layers

/** Short names for the common transform properties. */
const PROP: Record<string, string> = {
  position: 'transform/position',
  scale: 'transform/scale',
  rotation: 'transform/rotation',
  opacity: 'transform/opacity',
  anchor: 'transform/anchor',
};
export function propPath(p: string): string {
  return PROP[p] ?? p;
}

const ANIMATIONS = ['fade', 'slide_left', 'slide_right', 'slide_up', 'slide_down', 'pop', 'zoom', 'blur', 'typewriter', 'spin'] as const;
const animSchema = z.object({
  type: z.enum(ANIMATIONS),
  duration: z.number().positive().max(60).default(0.6).describe('Seconds.'),
});

const effectSchema = z.object({
  effect: z.string().describe('Effect name or id: Gaussian Blur, Glow, Drop Shadow, Curves, Levels, Hue/Saturation, Lumetri Color, Fill, CC Particle World, Fractal Noise... (list_effectcraft_catalog kind=effects).'),
  values: z.record(z.string(), z.any()).optional().describe('Parameter id → value, e.g. {"blurriness": 12}.'),
  keyframes: z
    .array(z.object({ param: z.string(), keys: z.array(z.object({ time: z.number(), value: z.any() })).min(1) }))
    .optional()
    .describe('Animate effect parameters: [{param: "blurriness", keys: [{time: 0, value: 30}, {time: 1, value: 0}]}].'),
});

const keyframeSchema = z.object({
  property: z.string().describe('position, scale, rotation, opacity, anchor, or any property path (get_project_info / run_effectcraft_commands get_layer).'),
  keys: z.array(z.object({ time: z.number().describe('Seconds (comp time).'), value: z.any().describe('Number, [x, y], "#rrggbb" or text.') })).min(1),
  easing: z.enum(['linear', 'easyEase', 'easyEaseIn', 'easyEaseOut', 'hold', 'bezier']).optional(),
});

export const layerSchema = z.object({
  type: z.enum(['text', 'solid', 'shape', 'media', 'null', 'adjustment']).describe('media = an image, video or audio file (path).'),
  name: z.string().optional(),
  // text
  text: z.string().optional(),
  font: z.string().optional().describe('Font family (list_effectcraft_catalog kind=fonts), e.g. Arial, Inter, Montserrat.'),
  style: z.string().optional().describe('Font style: Bold, Italic...'),
  size: z.number().positive().optional().describe('text: font size in px.'),
  align: z.enum(['left', 'center', 'right']).optional(),
  color: z.string().optional().describe('Text fill / solid / shape fill colour "#rrggbb".'),
  stroke_color: z.string().optional(),
  stroke_width: z.number().min(0).optional(),
  tracking: z.number().optional(),
  // shape
  shape: z.enum(['rect', 'rounded', 'ellipse', 'star', 'polygon']).optional(),
  width: z.number().positive().optional().describe('shape / solid / text box width in px.'),
  height: z.number().positive().optional(),
  // media
  path: z.string().optional().describe('media: absolute path of an image, video or audio file.'),
  fit: z.enum(['cover', 'contain', 'none']).optional().describe('media: scale to fill (cover) or fit (contain) the comp. Default contain for images and video.'),
  speed: z.number().positive().max(1000).optional().describe('media: playback speed in % (50 = slow motion, 200 = twice as fast).'),
  // placement & timing
  x: z.number().optional().describe('Position in px from the left (default: the centre).'),
  y: z.number().optional().describe('Position in px from the top (text: the baseline).'),
  scale: z.number().optional().describe('%.'),
  rotation: z.number().optional().describe('Degrees.'),
  opacity: z.number().min(0).max(100).optional(),
  blend: z.string().optional().describe('Blend mode: Normal, Multiply, Screen, Overlay, Add...'),
  start: z.number().min(0).optional().describe('When the layer appears (s).'),
  end: z.number().positive().optional().describe('When it disappears (s).'),
  // motion
  animate_in: animSchema.optional().describe('Entrance: fade, slide_left / right / up / down (the direction of motion: slide_up rises in from below the frame), pop, zoom, blur, typewriter (text), spin.'),
  animate_out: animSchema.optional().describe('Exit, ending at the layer\'s end; slide_* leave the frame moving in that direction.'),
  keyframes: z.array(keyframeSchema).max(50).optional(),
  expressions: z.array(z.object({ property: z.string(), expression: z.string() })).max(20).optional().describe('After Effects-style expressions, e.g. {property: "rotation", expression: "time*90"} or wiggle(2, 30).'),
  effects: z.array(effectSchema).max(20).optional(),
});
export type LayerSpec = z.infer<typeof layerSchema>;

export interface CompInfo {
  id: number;
  width: number;
  height: number;
  duration: number;
}

function need(l: LayerSpec, ...keys: (keyof LayerSpec)[]): void {
  const missing = keys.filter((k) => l[k] === undefined);
  if (missing.length) throw new Error(`${l.type} layer needs ${missing.join(', ')}.`);
}

/** Create one layer in the active comp and style, time and animate it. Returns the layer id. */
export async function addLayer(s: EffectCraftSession, comp: CompInfo, l: LayerSpec): Promise<{ layer: number; name?: string; warnings?: string[] }> {
  const pos = l.x !== undefined || l.y !== undefined ? [l.x ?? comp.width / 2, l.y ?? comp.height / 2] : undefined;
  let r: any;
  let media: Awaited<ReturnType<EffectCraftSession['importMedia']>> | undefined;
  switch (l.type) {
    case 'text': {
      need(l, 'text');
      const p: Record<string, unknown> = { text: l.text, size: l.size ?? 72, fill: l.color ?? '#ffffff', justify: l.align ?? 'center' };
      if (l.font) p['font'] = l.font;
      if (l.style) p['style'] = l.style;
      if (l.stroke_color) Object.assign(p, { stroke: l.stroke_color, strokeWidth: l.stroke_width ?? 2, applyStroke: true });
      if (l.tracking !== undefined) p['tracking'] = l.tracking;
      if (l.width && l.height) p['box'] = [(l.x ?? comp.width / 2) - l.width / 2, (l.y ?? comp.height / 2) - l.height / 2, l.width, l.height];
      else p['position'] = pos ?? [comp.width / 2, comp.height / 2];
      if (l.name) p['name'] = l.name;
      r = await s.cmd('layer.newText', p);
      break;
    }
    case 'solid':
      r = await s.cmd('layer.newSolid', { color: l.color ?? '#000000', width: Math.round(l.width ?? comp.width), height: Math.round(l.height ?? comp.height), ...(l.name ? { name: l.name } : {}) });
      break;
    case 'shape': {
      const p: Record<string, unknown> = { kind: l.shape ?? 'rect', size: [l.width ?? 200, l.height ?? l.width ?? 200], fill: l.color ?? '#ffffff' };
      if (l.stroke_color) Object.assign(p, { stroke: l.stroke_color, strokeWidth: l.stroke_width ?? 4 });
      if (pos) p['position'] = pos;
      if (l.name) p['name'] = l.name;
      r = await s.cmd('layer.newShape', p);
      break;
    }
    case 'media': {
      need(l, 'path');
      const [file] = collectInputs([l.path!]);
      media = await s.importMedia(file);
      r = await s.cmd('layer.addItem', { item: media.id, time: l.start ?? 0, ...(pos ? { position: pos } : {}), ...(media.kind === 'image' || !media.duration ? { duration: (l.end ?? comp.duration) - (l.start ?? 0) } : {}) });
      break;
    }
    case 'null':
      r = await s.cmd('layer.newNull', l.name ? { name: l.name } : {});
      break;
    case 'adjustment':
      r = await s.cmd('layer.newAdjustment', l.name ? { name: l.name } : {});
      break;
  }
  const id: number = r?.layer;
  if (typeof id !== 'number') throw new Error(`${l.type} layer: EffectCraft returned no layer id (${JSON.stringify(r).slice(0, 200)}).`);
  if (l.name && (l.type === 'media' || l.type === 'shape')) await s.cmd('layer.rename', { layer: id, name: l.name });

  // fit media to the comp
  if (media && media.width && media.height && (l.fit ?? 'contain') !== 'none' && l.scale === undefined) {
    const k = (l.fit === 'cover' ? Math.max : Math.min)(comp.width / media.width, comp.height / media.height) * 100;
    await s.json('set_property', { layer: id, path: 'transform/scale', value: [k, k] });
  }
  if (media && l.speed && l.speed !== 100) {
    await s.cmd('layer.timeStretch', { layers: [id], percent: 10000 / l.speed });
    // the stretch scales the visible span (clipped to the comp): reopen it
    await s.cmd('layer.timing', { layers: [id], in: l.start ?? 0, out: l.end ?? comp.duration });
  }

  if (pos && (l.type === 'solid' || l.type === 'media' || l.type === 'null' || l.type === 'adjustment')) await s.json('set_property', { layer: id, path: 'transform/position', value: pos });
  if (l.scale !== undefined) await s.json('set_property', { layer: id, path: 'transform/scale', value: [l.scale, l.scale] });
  if (l.rotation !== undefined) await s.json('set_property', { layer: id, path: 'transform/rotation', value: l.rotation });
  if (l.opacity !== undefined) await s.json('set_property', { layer: id, path: 'transform/opacity', value: l.opacity });
  if (l.blend) await s.cmd('layer.setBlendMode', { layers: [id], mode: l.blend.charAt(0).toUpperCase() + l.blend.slice(1) });
  if (l.start !== undefined || l.end !== undefined) {
    await s.cmd('layer.timing', { layers: [id], ...(l.start !== undefined && l.type !== 'media' ? { in: l.start } : {}), ...(l.end !== undefined ? { out: l.end } : {}) });
  }

  const warnings: string[] = [];
  let fxCount = 0;
  for (const e of l.effects ?? []) {
    const fx = await s.json('add_effect', { layer: id, effect: e.effect, ...(e.values ? { values: e.values } : {}) });
    fxCount = fx?.index ?? fxCount + 1;
    for (const k of e.keyframes ?? []) await s.json('add_keyframe', { layer: id, path: `effects/#${fxCount}/${k.param}`, keys: k.keys });
  }
  for (const k of l.keyframes ?? []) await s.json('add_keyframe', { layer: id, path: propPath(k.property), keys: k.keys, ...(k.easing ? { interpolation: k.easing } : {}) });
  for (const e of l.expressions ?? []) {
    const res = await s.json('set_property', { layer: id, path: propPath(e.property), expression: e.expression });
    if (res?.expressionError) warnings.push(`${e.property}: ${res.expressionError}`);
  }
  if (l.animate_in || l.animate_out) {
    const timing = await s.json('get_comp', {});
    const me = (timing?.layers ?? []).find((x: any) => x.id === id) ?? { in: 0, out: comp.duration };
    if (l.animate_in) fxCount = await animate(s, id, l, l.animate_in, me.in, false, comp, fxCount);
    if (l.animate_out) await animate(s, id, l, l.animate_out, me.out, true, comp, fxCount);
  }
  return { layer: id, ...(warnings.length ? { warnings } : {}) };
}

/** Keyframe a ready-made entrance (at `t` forward) or exit (ending at `t`). Returns the effect count. */
async function animate(
  s: EffectCraftSession,
  id: number,
  l: LayerSpec,
  a: z.infer<typeof animSchema>,
  t: number,
  out: boolean,
  comp: CompInfo,
  fxCount: number,
): Promise<number> {
  const d = a.duration;
  const t0 = out ? t - d : t;
  const t1 = out ? t : t + d;
  const key = async (p: string, from: unknown, to: unknown) => {
    const [a0, a1] = out ? [to, from] : [from, to];
    await s.json('add_keyframe', { layer: id, path: p, keys: [{ time: t0, value: a0 }, { time: t1, value: a1 }], interpolation: 'easyEase' });
  };
  const cur = async (p: string) => (await s.json('get_property', { layer: id, path: p, time: out ? t0 : t1 }))?.value;
  const opacity = l.opacity ?? 100;
  switch (a.type) {
    case 'fade':
      await key('transform/opacity', 0, opacity);
      break;
    case 'slide_left':
    case 'slide_right':
    case 'slide_up':
    case 'slide_down': {
      const p = ((await cur('transform/position')) ?? [comp.width / 2, comp.height / 2]).slice(0, 2);
      // the name is the direction of motion: slide_up rises in from below and leaves through the top
      const m = { slide_left: [-comp.width, 0], slide_right: [comp.width, 0], slide_up: [0, -comp.height], slide_down: [0, comp.height] }[a.type];
      const sign = out ? 1 : -1;
      await key('transform/position', [p[0] + sign * m[0], p[1] + sign * m[1]], p);
      break;
    }
    case 'pop': {
      const sc = l.scale ?? 100;
      const [a0, mid, a1] = out ? [sc, sc * 1.1, 0] : [0, sc * 1.1, sc];
      await s.json('add_keyframe', { layer: id, path: 'transform/scale', keys: [{ time: t0, value: [a0, a0] }, { time: t0 + d * 0.7, value: [mid, mid] }, { time: t1, value: [a1, a1] }], interpolation: 'easyEase' });
      break;
    }
    case 'zoom': {
      const sc = l.scale ?? 100;
      await key('transform/scale', [sc * 1.6, sc * 1.6], [sc, sc]);
      await key('transform/opacity', 0, opacity);
      break;
    }
    case 'spin': {
      const r = l.rotation ?? 0;
      await key('transform/rotation', r - 360, r);
      await key('transform/opacity', 0, opacity);
      break;
    }
    case 'blur': {
      const fx = await s.json('add_effect', { layer: id, effect: 'Gaussian Blur' });
      fxCount = fx?.index ?? fxCount + 1;
      await key(`effects/#${fxCount}/blurriness`, 40, 0);
      await key('transform/opacity', 0, opacity);
      break;
    }
    case 'typewriter': {
      if (l.type !== 'text') throw new Error('typewriter only animates text layers.');
      const an = await s.cmd('layer.addTextAnimator', { layer: id, properties: ['opacity'] });
      const base = an?.animator !== undefined ? `@${an.animator}` : 'text/animators/animator';
      const tree = await s.json('get_layer', { layer: id, flat: true });
      const paths: string[] = (tree?.properties ?? []).map((p: any) => p.path).filter((p: string) => p.startsWith('text/animators/'));
      const sel = paths.filter((p) => p.endsWith('/selectors/rangeSelector/start')).at(-1) ?? `${base}/selectors/rangeSelector/start`;
      const op = paths.filter((p) => p.endsWith('/properties/opacity')).at(-1) ?? `${base}/properties/opacity`;
      await s.json('set_property', { layer: id, path: op, value: 0 });
      // characters inside the selector range are hidden: moving its start 0 → 100 reveals them one by one
      await s.json('add_keyframe', { layer: id, path: sel, keys: out ? [{ time: t0, value: 100 }, { time: t1, value: 0 }] : [{ time: t0, value: 0 }, { time: t1, value: 100 }], interpolation: 'linear' });
      break;
    }
  }
  return fxCount;
}

export async function addLayers(s: EffectCraftSession, comp: CompInfo, layers: LayerSpec[]): Promise<unknown[]> {
  const out: unknown[] = [];
  // listed top to bottom: create bottom-up so the first layer ends on top
  for (const [i, l] of [...layers].reverse().entries()) {
    try {
      out.unshift({ type: l.type, ...(await addLayer(s, comp, l)) });
    } catch (e) {
      throw new Error(`layer ${layers.length - i} (${l.type}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return out;
}

/** Comp times to show as previews: about the middle, or the given ones. */
function previewTimes(duration: number, times?: number[]): number[] {
  return times?.length ? times : [Math.min(duration, Math.max(0, duration * 0.6))];
}

// ---------------------------------------------------------------- tools

const compSchema = {
  width: z.number().int().positive().max(16384).default(1920),
  height: z.number().int().positive().max(16384).default(1080),
  fps: z.number().positive().max(240).default(30),
  duration: z.number().positive().max(3600).default(5).describe('Seconds.'),
  background: z.string().default('#000000').describe('Comp background colour "#rrggbb".'),
};

export function registerMotionTools(server: McpServer): void {
  server.registerTool(
    'create_motion_graphic',
    {
      title: 'Create a motion graphic',
      description:
        'Build an animated composition from a list of layers (top to bottom) and render it: text with any font, solids, shapes ' +
        '(rectangle, rounded, ellipse, star, polygon), images / videos / audio, nulls and adjustment layers; position, scale, rotation, ' +
        'opacity, blend mode, timing; ready-made entrances and exits (fade, slide, pop, zoom, blur, typewriter, spin), keyframes, ' +
        'After Effects-style expressions (wiggle, time...) and any of the 306 effects (Glow, Gaussian Blur, Drop Shadow, Curves, ' +
        'Lumetri Color, Fractal Noise, CC Particle World...). Renders MP4 / HEVC / AV1 / ProRes / WebM / GIF / image sequences / ' +
        'Lottie, and can save the editable .ecproj. Use it for titles, intros, social clips, lower thirds, animated logos.',
      inputSchema: {
        name: z.string().default('motion').describe('Comp and file name.'),
        ...compSchema,
        layers: z.array(layerSchema).min(1).max(100),
        formats: formatsSchema.default(['mp4']),
        output_dir: z.string().optional().describe('Absolute output folder (required unless output_path).'),
        output_path: z.string().optional(),
        overwrite: z.boolean().default(false),
        ...renderOptionsSchema,
        preview_times: z.array(z.number().min(0)).max(4).optional().describe('Comp times to preview (default one frame at 60 %).'),
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        const dir = args.output_path ? path.dirname(args.output_path) : args.output_dir;
        if (!dir || !path.isAbsolute(dir)) throw new Error('Give an absolute output_dir or output_path.');
        return await withSession(async (s) => {
          const c = await s.cmd('comp.new', { name: args.name, width: args.width, height: args.height, frameRate: args.fps, duration: args.duration, background: args.background });
          const comp: CompInfo = { id: c.comp, width: args.width, height: args.height, duration: args.duration };
          const layers = await addLayers(s, comp, args.layers);
          const outputs = await renderAll(s, comp.id, { stemSource: path.join(dir, args.name), suffix: '', output_dir: dir, output_path: args.output_path, overwrite: args.overwrite }, args.formats, args);
          const imgs = [];
          for (const t of previewTimes(args.duration, args.preview_times)) imgs.push(await preview(s, comp.id, t, 960));
          return withPreview({ success: true, comp: { name: args.name, size: [args.width, args.height], fps: args.fps, duration: args.duration }, layers, outputs }, imgs);
        });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'apply_effects',
    {
      title: 'Add effects and titles to videos / images',
      description:
        'Put a video or image (one file, a list or a folder, each on its own) in a comp of its own size and length, then apply effects to ' +
        'it (colour grading, blur, glow, glitch, stylize, keying, distort... with optional keyframes), change its speed or trim it, and add ' +
        'layers on top (titles, captions, logos, shapes, with animations). Renders each one to MP4 / ProRes / WebM / GIF... next to the input ' +
        'as <name>_fx.<ext> unless output_dir / output_path.',
      inputSchema: {
        input_path: z.string().optional(),
        input_paths: z.array(z.string()).max(200).optional(),
        input_dir: z.string().optional(),
        effects: z.array(effectSchema).max(20).default([]).describe('Effects on the footage itself.'),
        trim_start: z.number().min(0).optional().describe('Start of the part to keep (s of the source).'),
        trim_end: z.number().positive().optional().describe('End of the part to keep (s of the source).'),
        speed: z.number().positive().max(1000).optional().describe('Playback speed in %.'),
        still_duration: z.number().positive().max(3600).default(5).describe('Length for images (s).'),
        width: z.number().int().positive().max(16384).optional().describe('Comp size (default: the media\'s).'),
        height: z.number().int().positive().max(16384).optional(),
        fps: z.number().positive().max(240).optional().describe('Default: the video\'s, or 30.'),
        background: z.string().default('#000000'),
        layers: z.array(layerSchema).max(50).default([]).describe('Layers on top of the footage, listed top to bottom.'),
        formats: formatsSchema.default(['mp4']),
        suffix: z.string().default('_fx'),
        ...outputSchema,
        ...renderOptionsSchema,
        preview: z.boolean().default(true),
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        const inputs = collectInputs([...(args.input_path ? [args.input_path] : []), ...(args.input_paths ?? [])], args.input_dir, MEDIA.filter((e) => !['wav', 'mp3', 'aac', 'm4a', 'flac', 'ogg', 'aif', 'aiff'].includes(e)));
        if (args.output_path && inputs.length > 1) throw new Error('output_path needs a single input; use output_dir.');
        return await withSession(async (s) => {
          const done: { input: string; outputs: Rendered[] }[] = [];
          const errors: { input: string; error: string }[] = [];
          let img: { data: string; mimeType: string } | undefined;
          for (const input of inputs) {
            try {
              await s.json('open_project', { new: true });
              const m = await s.importMedia(input);
              const isVideo = VIDEO.includes(path.extname(input).slice(1).toLowerCase()) && m.duration;
              const srcStart = args.trim_start ?? 0;
              const srcEnd = Math.min(args.trim_end ?? m.duration ?? args.still_duration, m.duration ?? Infinity);
              const speed = args.speed ?? 100;
              const duration = isVideo ? Math.max(0.04, (srcEnd - srcStart) * (100 / speed)) : args.still_duration;
              const width = args.width ?? m.width ?? 1920;
              const height = args.height ?? m.height ?? 1080;
              const c = await s.cmd('comp.new', { name: path.basename(input), width, height, frameRate: args.fps ?? m.frameRate ?? 30, duration, background: args.background });
              const comp: CompInfo = { id: c.comp, width, height, duration };
              const r = await s.cmd('layer.addItem', { item: m.id, time: isVideo ? -srcStart * (100 / speed) : 0, ...(isVideo ? {} : { duration }) });
              const id: number = r.layer;
              if (m.width && m.height && (m.width !== width || m.height !== height)) {
                const k = Math.max(width / m.width, height / m.height) * 100;
                await s.json('set_property', { layer: id, path: 'transform/scale', value: [k, k] });
              }
              if (isVideo && speed !== 100) await s.cmd('layer.timeStretch', { layers: [id], percent: 10000 / speed });
              // a stretch scales the visible span (already clipped to the comp): open it again to the whole comp
              if (isVideo) await s.cmd('layer.timing', { layers: [id], in: 0, out: duration });
              let fx = 0;
              for (const e of args.effects) {
                const res = await s.json('add_effect', { layer: id, effect: e.effect, ...(e.values ? { values: e.values } : {}) });
                fx = res?.index ?? fx + 1;
                for (const k of e.keyframes ?? []) await s.json('add_keyframe', { layer: id, path: `effects/#${fx}/${k.param}`, keys: k.keys });
              }
              if (args.layers.length) await addLayers(s, comp, args.layers);
              const outputs = await renderAll(s, comp.id, { stemSource: input, suffix: args.suffix, output_dir: args.output_dir, output_path: args.output_path, overwrite: args.overwrite }, args.formats, args);
              if (args.preview && !img) img = await preview(s, comp.id, duration * 0.5, 960);
              done.push({ input, outputs });
            } catch (e) {
              errors.push({ input, error: e instanceof Error ? e.message : String(e) });
            }
          }
          const body = inputs.length === 1 && done.length === 1 ? { success: true, ...done[0] } : { success: errors.length === 0, processed: done.length, results: done, ...(errors.length ? { errors } : {}) };
          return withPreview(body, [img], done.length === 0);
        });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'use_template',
    {
      title: 'Render a motion template',
      description:
        'Fill in a motion graphics template and render it: the built-in Lower Third, Title Card, Logo Reveal, Kinetic Type, Social Square ' +
        '1080×1080, Vertical 9:16 Story, Slideshow and 3D Text Orbit, or any .ectemplate file. `values` sets its Essential Graphics controls ' +
        'by name (texts, colours...); `background_media` puts a video or image behind it; `layers` adds more on top. ' +
        'list_effectcraft_catalog kind=templates lists them with their controls.',
      inputSchema: {
        template: z.string().describe('Template id (lower-third, title-card, logo-reveal, kinetic-type, social-square, vertical-story, slideshow, text-orbit-3d) or the absolute path of an .ectemplate.'),
        values: z.record(z.string(), z.any()).default({}).describe('Control name → value, e.g. {"Title": "Big Sale", "Bar Color": "#ff5500"}.'),
        background_media: z.string().optional().describe('Absolute video / image path placed behind the template (replaces its preview background).'),
        duration: z.number().positive().max(3600).optional().describe('Change the length (s).'),
        layers: z.array(layerSchema).max(50).default([]),
        name: z.string().optional().describe('Output file name (default: the template\'s).'),
        formats: formatsSchema.default(['mp4']),
        output_dir: z.string().optional(),
        output_path: z.string().optional(),
        overwrite: z.boolean().default(false),
        ...renderOptionsSchema,
        preview_times: z.array(z.number().min(0)).max(4).optional(),
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        const dir = args.output_path ? path.dirname(args.output_path) : args.output_dir;
        if (!dir || !path.isAbsolute(dir)) throw new Error('Give an absolute output_dir or output_path.');
        const isFile = /\.ectemplate$/i.test(args.template);
        if (isFile) collectInputs([args.template], undefined, ['ectemplate']);
        return await withSession(async (s) => {
          const t = await s.cmd('templates.create', isFile ? { path: args.template } : { id: args.template });
          const compId: number = t.comp;
          const ess = await s.cmd('essential.list', { comp: compId });
          const controls: any[] = ess?.controls ?? [];
          const applied: string[] = [];
          for (const [k, v] of Object.entries(args.values)) {
            const c = controls.find((x) => x.name.toLowerCase() === k.toLowerCase());
            if (!c) throw new Error(`The template has no control "${k}" (it has: ${controls.map((x) => x.name).join(', ')}).`);
            await s.json('set_property', { comp: compId, layer: c.layer, path: c.path, value: v });
            applied.push(c.name);
          }
          if (args.duration) await s.cmd('comp.settings', { comp: compId, duration: args.duration });
          const info = await s.json('get_comp', { comp: compId });
          const comp: CompInfo = { id: compId, width: info.width, height: info.height, duration: info.duration };
          if (args.background_media) {
            const [file] = collectInputs([args.background_media]);
            const m = await s.importMedia(file);
            const bg = (info.layers ?? []).find((x: any) => /preview background/i.test(x.name));
            const r = await s.cmd('layer.addItem', { item: m.id, time: 0, index: (info.layers ?? []).length + 1, ...(m.kind === 'image' ? { duration: comp.duration } : {}) });
            if (m.width && m.height) {
              const k = Math.max(comp.width / m.width, comp.height / m.height) * 100;
              await s.json('set_property', { comp: compId, layer: r.layer, path: 'transform/scale', value: [k, k] });
            }
            if (bg) await s.cmd('edit.clear', { layers: [bg.id] });
          }
          if (args.layers.length) await addLayers(s, comp, args.layers);
          const stem = args.name ?? t.template ?? args.template;
          const outputs = await renderAll(s, compId, { stemSource: path.join(dir, stem), suffix: '', output_dir: dir, output_path: args.output_path, overwrite: args.overwrite }, args.formats, args);
          const imgs = [];
          for (const tm of previewTimes(comp.duration, args.preview_times)) imgs.push(await preview(s, compId, tm, 960));
          return withPreview({ success: true, template: t.template, controls: controls.map((c) => c.name), set: applied, outputs }, imgs);
        });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'render_project',
    {
      title: 'Render an EffectCraft project',
      description:
        'Render a composition of an .ecproj project (default: its active comp) to MP4 / HEVC / AV1 / ProRes / WebM / GIF / image sequences / ' +
        'WAV, or export it as Lottie; a time range, resolution, frame rate, quality, bitrate and alpha can be set. The project file is never modified.',
      inputSchema: {
        input_path: z.string().describe('Absolute path of an .ecproj file.'),
        comp: z.union([z.string(), z.number().int()]).optional().describe('Composition name or id (default: the active one).'),
        formats: formatsSchema.default(['mp4']),
        ...outputSchema,
        ...renderOptionsSchema,
        preview: z.boolean().default(false),
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        const [file] = collectInputs([args.input_path], undefined, ['ecproj', 'ecprojx']);
        if (args.formats.includes('ecproj')) throw new Error('render_project renders; to copy the project use run_effectcraft_commands with save_as.');
        return await withSession(async (s) => {
          await s.json('open_project', { path: file });
          const proj = await s.json('get_project', {});
          const compItem = args.comp !== undefined
            ? (proj.items ?? []).find((i: any) => i.type === 'Composition' && (i.id === args.comp || i.name === args.comp))
            : (proj.items ?? []).find((i: any) => i.id === proj.activeComp) ?? (proj.items ?? []).find((i: any) => i.type === 'Composition');
          if (!compItem) throw new Error(`No composition ${args.comp ?? ''} in ${path.basename(file)} (it has: ${(proj.items ?? []).filter((i: any) => i.type === 'Composition').map((i: any) => i.name).join(', ')}).`);
          const stem = path.join(path.dirname(file), `${path.basename(file).replace(/\.[^.]+$/, '')}${args.comp !== undefined ? '-' + compItem.name : ''}`);
          const outputs = await renderAll(s, compItem.id, { stemSource: stem + '.x', suffix: '', output_dir: args.output_dir, output_path: args.output_path, overwrite: args.overwrite }, args.formats, args);
          return withPreview({ success: true, comp: { id: compItem.id, name: compItem.name, size: compItem.size, duration: compItem.duration }, outputs }, [args.preview ? await preview(s, compItem.id, (compItem.duration ?? 1) / 2, 960) : undefined]);
        });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'get_project_info',
    {
      title: 'Project information',
      description: 'Compositions (size, frame rate, duration, layers with type, timing, blend mode, parent), footage (with missing files), Essential Graphics controls and the active comp of an .ecproj project.',
      inputSchema: { input_path: z.string().describe('Absolute path of an .ecproj file.') },
      annotations: READ,
    },
    async (args) => {
      try {
        const [file] = collectInputs([args.input_path], undefined, ['ecproj', 'ecprojx']);
        return json(
          await withSession(async (s) => {
            await s.json('open_project', { path: file });
            const proj = await s.json('get_project', {});
            const comps = [];
            for (const it of (proj.items ?? []).filter((i: any) => i.type === 'Composition')) {
              const c = await s.json('get_comp', { comp: it.id });
              const ess = await s.cmd('essential.list', { comp: it.id }).catch(() => undefined);
              comps.push({
                id: c.id,
                name: c.name,
                size: [c.width, c.height],
                fps: c.frameRate,
                duration: c.duration,
                layers: (c.layers ?? []).map((l: any) => ({ id: l.id, index: l.index, name: l.name, type: l.type, in: l.in, out: l.out, blend: l.blendMode, ...(l.parent ? { parent: l.parent } : {}), ...(l.trackMatte ? { matte: l.trackMatte } : {}) })),
                ...(ess?.controls?.length ? { controls: ess.controls.map((x: any) => ({ name: x.name, type: x.type, value: x.value })) } : {}),
              });
            }
            const footage = (proj.items ?? []).filter((i: any) => !['Composition', 'Folder'].includes(i.type));
            return { success: true, path: file, bytes: statSync(file).size, bit_depth: proj.bitDepth, active_comp: proj.activeComp, compositions: comps, footage };
          }),
        );
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'render_frame',
    {
      title: 'Preview frames',
      description: 'Render frames of an .ecproj composition (or of a video / image as it is) at the given times so Claude can see them; optionally save them as PNG.',
      inputSchema: {
        input_path: z.string().describe('Absolute path of an .ecproj project, video or image.'),
        comp: z.union([z.string(), z.number().int()]).optional(),
        times: z.array(z.number().min(0)).min(1).max(6).default([0]).describe('Seconds.'),
        max_side: z.number().int().min(64).max(4096).default(960),
        save_dir: z.string().optional().describe('Absolute folder: also write <name>_<time>s.png there.'),
        overwrite: z.boolean().default(false),
      },
      annotations: READ,
    },
    async (args) => {
      try {
        const [file] = collectInputs([args.input_path], undefined, ['ecproj', 'ecprojx', ...MEDIA]);
        return await withSession(async (s) => {
          let comp: number | string | undefined = args.comp;
          if (/\.ecprojx?$/i.test(file)) await s.json('open_project', { path: file });
          else {
            const m = await s.importMedia(file);
            const c = await s.cmd('comp.new', { name: path.basename(file), width: m.width ?? 1920, height: m.height ?? 1080, frameRate: m.frameRate ?? 30, duration: m.duration || 1 });
            await s.cmd('layer.addItem', { item: m.id, time: 0, ...(m.duration ? {} : { duration: 1 }) });
            comp = c.comp;
          }
          const imgs = [];
          const saved: string[] = [];
          for (const t of args.times) {
            const img = await preview(s, comp, t, args.max_side);
            imgs.push(img);
            if (img && args.save_dir) {
              const out = outputFor(path.join(args.save_dir, path.basename(file)), 'png', `_${t}s`, { output_dir: args.save_dir, overwrite: args.overwrite });
              writeFileSync(out, Buffer.from(img.data, 'base64'));
              saved.push(out);
            }
          }
          return withPreview({ success: true, input: file, times: args.times, ...(saved.length ? { saved } : {}) }, imgs);
        });
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}

export type { OutputFormat };
