// End-to-end test over real MCP stdio against dist/bundle.cjs (what the .mcpb runs).
// Needs EffectCraft installed. Usage: npm run build && npm run test:e2e
// E2E_BUNDLE=<path to bundle.cjs> tests another build (e.g. the contents of an unpacked .mcpb).
// Draws its own synthetic image; every video it uses is rendered by EffectCraft itself (no personal files).
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { deflateSync } from 'zlib';

const out = mkdtempSync(join(tmpdir(), 'ec-e2e-'));
const src = join(out, 'Imágenes ñandú');
mkdirSync(src, { recursive: true });

// --- tiny PNG writer
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(path, w, h, pixel) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const [r, g, b] = pixel(x, y);
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
// a photo-like scene: sky-to-grass gradient with a round orange subject in the middle
// a photo-like scene: sky-to-grass gradient with a round orange subject; two "burst" frames, one blurred
const photo = join(src, 'foto.png');
png(photo, 800, 450, (x, y) => {
  const d = Math.hypot(x - 400, y - 225);
  if (d < 120) return [240, 140, 30];
  return y < 300 ? [100 + (y >> 2), 160 + (y >> 3), 235] : [50, 130 + ((x * 7) % 30), 60];
});

const client = new Client({ name: 'e2e', version: '1.0.0' });
await client.connect(new StdioClientTransport({ command: process.execPath, args: [process.env.E2E_BUNDLE || 'dist/bundle.cjs'] }));

let failed = 0;
const check = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failed++; };
const LINKED = [];
const call = async (name, args) => {
  const res = await client.callTool({ name, arguments: args });
  const body = JSON.parse(res.content.find((c) => c.type === 'text').text);
  if (body && body.files_markdown) LINKED.push(body.files_markdown);
  if (res.isError) console.log('      ', JSON.stringify(body).slice(0, 400));
  return { ...body, _imgs: res.content.filter((c) => c.type === 'image').length };
};
const t0 = Date.now();

const { tools } = await client.listTools();
check(tools.length === 11, `11 tools exposed (${tools.map((t) => t.name).join(', ')})`);
check(!JSON.stringify(tools.map((t) => t.inputSchema)).includes('"items":['), 'no JSON Schema tuples in any input schema');

const st = await call('get_effectcraft_status', {});
check(st.ready && /effectcraft-cli \d/.test(st.version ?? '') && st.commands > 500 && st.effects > 250, `status: ${st.version}, ${st.commands} commands, ${st.effects} effects, ${st.platform}`);

const mg = await call('create_motion_graphic', {
  name: 'intro ñ',
  width: 640,
  height: 360,
  fps: 30,
  duration: 2,
  background: '#101828',
  layers: [
    { type: 'text', text: 'Hola ñandú', size: 64, color: '#ffffff', y: 300, animate_in: { type: 'typewriter', duration: 1 }, effects: [{ effect: 'Drop Shadow' }] },
    { type: 'shape', shape: 'star', width: 120, height: 120, color: '#facc15', x: 520, y: 90, animate_in: { type: 'pop', duration: 0.5 }, expressions: [{ property: 'rotation', expression: 'time*90' }] },
    { type: 'text', text: 'FADE', size: 40, color: '#38bdf8', x: 120, y: 80, animate_in: { type: 'slide_left', duration: 0.5 }, animate_out: { type: 'fade', duration: 0.4 } },
    { type: 'media', path: photo, fit: 'cover', opacity: 70, effects: [{ effect: 'Gaussian Blur', keyframes: [{ param: 'blurriness', keys: [{ time: 0, value: 30 }, { time: 1, value: 0 }] }] }] },
  ],
  formats: ['mp4', 'gif', 'ecproj', 'png_sequence', 'lottie'],
  output_dir: join(out, 'mg'),
  preview_times: [0.3, 1.5],
});
const byFmt = Object.fromEntries((mg.outputs ?? []).map((o) => [o.format, o]));
check(mg.success && mg.outputs?.length === 5 && mg._imgs === 2, 'create_motion_graphic: 4 animated layers → MP4 + GIF + .ecproj + PNG sequence + Lottie, 2 previews');
check(byFmt.mp4?.frames === 60 && byFmt.mp4?.bytes > 1000 && byFmt.png_sequence?.files === 60 && /intro ñ_frames$/.test(byFmt.png_sequence?.path ?? ''), `2 s at 30 fps = ${byFmt.mp4?.frames} frames; the sequence has ${byFmt.png_sequence?.files} PNGs in its own folder`);

const proj = byFmt.ecproj?.path;
const info = await call('get_project_info', { input_path: proj });
const layers = info.compositions?.[0]?.layers ?? [];
check(info.success && info.compositions?.length === 1 && layers.length === 4 && layers[0].name === 'Hola ñandú' && layers[3].type === 'Footage', `get_project_info: ${layers.map((l) => l.type).join(', ')} (listed top to bottom as given)`);

const props = await call('run_effectcraft_commands', {
  open_path: proj,
  steps: [
    { id: 'get_property', params: { layer: 'FADE', path: 'transform/opacity' } },
    { id: 'get_property', params: { layer: 'FADE', path: 'transform/position', time: 0 } },
    { id: 'get_property', params: { layer: '#4', path: 'effects/#1/blurriness', time: 0 } },
    { id: 'get_property', params: { layer: '#2', path: 'transform/rotation', time: 1 } },
  ],
});
const [op, posAt0, blur0, rot1] = (props.results ?? []).map((r) => r.result);
check(props.success && op?.keys?.length === 2 && posAt0?.value?.[0] > 640 && blur0?.value === 30 && Math.abs((rot1?.evaluated ?? 0) - 90) < 1, `keys as asked: fade-out ${op?.keys?.length} keys, slide starts at x=${posAt0?.value?.[0]}, blur ${blur0?.value} at 0 s, expression rotation ${rot1?.evaluated}° at 1 s`);

const slides = await call('create_motion_graphic', {
  name: 'slides', width: 400, height: 300, duration: 2,
  layers: [
    { type: 'shape', name: 'UP', shape: 'rect', width: 50, height: 50, x: 200, y: 150, animate_in: { type: 'slide_up', duration: 0.5 }, animate_out: { type: 'slide_right', duration: 0.5 } },
  ],
  formats: ['ecproj'], output_dir: join(out, 'slides'),
});
const sp = await call('run_effectcraft_commands', {
  open_path: slides.outputs?.[0]?.path,
  steps: [0, 0.5, 2].map((time) => ({ id: 'get_property', params: { layer: 'UP', path: 'transform/position', time } })),
});
const [s0, s1, s2] = (sp.results ?? []).map((r) => r.result?.value ?? []);
check(sp.success && s0[1] > 300 && Math.abs(s1[1] - 150) < 1 && s2[0] > 400, `slides follow their names: slide_up rises from y=${s0[1]} to ${s1[1]}, slide_right leaves to x=${s2[0]}`);

const again = await call('create_motion_graphic', { name: 'intro ñ', width: 320, height: 180, duration: 0.5, layers: [{ type: 'solid', color: '#ff0000' }], output_dir: join(out, 'mg') });
const refused = await call('create_motion_graphic', { name: 'x', duration: 0.5, layers: [{ type: 'solid' }], output_path: byFmt.mp4?.path });
check(again.success && /intro ñ_2\.mp4$/.test(again.outputs?.[0]?.path ?? '') && !refused.success && /already exists/.test(refused.error ?? ''), 'never overwrites: a free name (_2) in a folder, an error for an existing output_path');

const fx = await call('apply_effects', {
  input_path: byFmt.mp4.path,
  trim_start: 0.5,
  trim_end: 1.5,
  speed: 200,
  effects: [{ effect: 'Hue/Saturation' }, { effect: 'Glow' }],
  layers: [{ type: 'text', text: 'CAPTION', size: 30, color: '#ffffff', y: 340, animate_in: { type: 'fade', duration: 0.2 } }],
  formats: ['mp4', 'webm'],
  output_dir: join(out, 'fx'),
});
const fxStats = await call('render_frame', { input_path: fx.outputs?.[0]?.path, times: [0.3], max_side: 64 });
check(fx.success && fxStats._imgs === 1 && fx.outputs?.[0]?.frames === 15 && fx.outputs?.[1]?.format === 'webm' && fx._imgs === 1, `apply_effects on a video: 1 s kept at 200 % = ${fx.outputs?.[0]?.frames} frames, effects + caption → MP4 + WebM`);
const still = await call('apply_effects', { input_path: photo, still_duration: 1, effects: [{ effect: 'Gaussian Blur', values: { blurriness: 8 } }], formats: ['prores'], transparent: true, output_dir: join(out, 'fx'), preview: false });
check(still.success && still.outputs?.[0]?.path.endsWith('foto_fx.mov') && still.outputs?.[0]?.frames === 30, 'apply_effects on an image: 1 s ProRes 4444 with alpha');

const tpl = await call('use_template', {
  template: 'lower-third',
  values: { Name: 'Ana Pérez', Title: 'Directora ñ', 'Bar Color': '#ff5500' },
  background_media: photo,
  duration: 2,
  formats: ['mp4'],
  resolution: 'half',
  output_dir: join(out, 'tpl'),
  preview_times: [1.5],
});
check(tpl.success && tpl.set?.length === 3 && tpl.outputs?.[0]?.frames === 60 && tpl._imgs === 1, `use_template lower-third: ${tpl.set?.join(', ')} set, photo behind, 2 s at half resolution`);
const badTpl = await call('use_template', { template: 'title-card', values: { Nope: 1 }, output_dir: join(out, 'tpl') });
check(!badTpl.success && /Title, Subtitle/.test(badTpl.error ?? ''), 'an unknown template control lists the real ones');

const rp = await call('render_project', { input_path: proj, formats: ['webm', 'jpg_sequence'], start: 0, end: 1, output_dir: join(out, 'render'), preview: true });
check(rp.success && rp.outputs?.[0]?.frames === 30 && rp.outputs?.[1]?.files === 30 && rp._imgs === 1, 'render_project: the saved .ecproj, 0–1 s → WebM + JPEG sequence');

const rf = await call('render_frame', { input_path: proj, times: [0.2, 1.5], max_side: 320, save_dir: join(out, 'frames') });
const rfv = await call('render_frame', { input_path: byFmt.mp4.path, times: [1], max_side: 320 });
check(rf.success && rf._imgs === 2 && rf.saved?.length === 2 && rfv.success && rfv._imgs === 1, 'render_frame: two frames of a project (saved) and one of a video');

const ce = await call('list_effectcraft_catalog', { kind: 'effects', filter: 'glow' });
const ct = await call('list_effectcraft_catalog', { kind: 'templates' });
const cf = await call('list_effectcraft_catalog', { kind: 'fonts' });
const cc = await call('list_effectcraft_catalog', { kind: 'commands', filter: 'keyframe' });
check(ce.count >= 1 && ct.templates?.length >= 8 && cf.count >= 1 && cc.count >= 3, `catalog: ${ce.count} glow effects, ${ct.templates?.length} templates, ${cf.count} fonts, ${cc.count} keyframe commands`);

const js = await call('run_effectcraft_script', {
  code: 'var c = app.project.items.addComp("JS", 320, 180, 1, 1, 25); var t = c.layers.addText("Script"); t.property("ADBE Transform Group").property("ADBE Opacity").setValueAtTime(0, 0); t.property("ADBE Transform Group").property("ADBE Opacity").setValueAtTime(1, 100); c.openInViewer(); c.numLayers',
  formats: ['mp4'],
  output_dir: join(out, 'script'),
  preview_time: 0.8,
});
check(js.success && js.result === 1 && js.outputs?.[0]?.frames === 25 && js._imgs === 1, 'run_effectcraft_script: an After Effects-style script builds and animates a comp, rendered');

const rc = await call('run_effectcraft_commands', {
  steps: [
    { id: 'comp.new', params: { name: 'Cmd', width: 320, height: 180, duration: 1, frameRate: 10 } },
    { id: 'layer.newShape', params: { kind: 'ellipse', size: [100, 100], fill: '#22c55e' } },
    { id: 'add_effect', params: { layer: '$steps[1].layer', effect: 'Glow' } },
  ],
  formats: ['gif'],
  output_dir: join(out, 'cmd'),
});
check(rc.success && rc.completed === 3 && rc.outputs?.[0]?.frames === 10, 'run_effectcraft_commands: comp, shape and effect with $steps ids → GIF');

const dotted = await call('create_motion_graphic', { name: 'intro-1.0.1', width: 160, height: 90, duration: 0.5, background: '#2e1065', layers: [{ type: 'text', text: 'v1' }], formats: ['gif', 'ecproj'], output_dir: join(out, 'dots') });
check(dotted.success && dotted.outputs?.every((o) => /intro-1\.0\.1\.(gif|ecproj)$/.test(o.path) && existsSync(o.path)), `create_motion_graphic: dots in the name are kept (${dotted.outputs?.map((o) => o.path.split(/[\\/]/).pop()).join(', ')})`);

const relPath = await call('apply_effects', { input_path: 'foto.png' });
check(!relPath.success && /absolute/.test(relPath.error ?? ''), 'relative paths are rejected');
check(readdirSync(src).length === 1, 'the input folder still holds only the original image');

// every result that names output files carries working links to them
const linkUrls = LINKED.flatMap((m) => [...m.matchAll(/\]\((file:\/\/\/[^)]+)\)/g)].map((x) => x[1]));
check(linkUrls.length > 0 && linkUrls.every((u) => !/[ ()]/.test(u) && existsSync(fileURLToPath(u))), `files_markdown: ${linkUrls.length} file:/// links in ${LINKED.length} results, all valid and existing`);

await client.close();
console.log(`\n${failed ? `${failed} FAILED` : 'ALL PASSED'} in ${((Date.now() - t0) / 1000).toFixed(1)} s · output in ${out}`);
process.exit(failed ? 1 : 0);
