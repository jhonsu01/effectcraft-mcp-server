import { execFile, spawn } from 'child_process';
import { mkdirSync, readFileSync } from 'fs';
import * as net from 'net';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { COMMAND_TIMEOUT_SEC, CONTROL_PORT, connectorDir, resolveInstall } from '../config.js';
import { EffectCraftSession, runCli, withSession } from '../engine.js';
import { MEDIA, OUTPUTS, READ, RenderOpts, collectInputs, errorResult, formatsSchema, json, preview, renderAll, renderOptionsSchema, withPreview } from './common.js';

interface CommandDef {
  id: string;
  label: string;
  menu?: string[];
  params?: string | null;
}

let commandCache: CommandDef[] | undefined;
async function engineCommands(): Promise<CommandDef[]> {
  if (!commandCache) commandCache = JSON.parse(await runCli(['commands', '--json'])) as CommandDef[];
  return commandCache;
}

export function controlPortOpen(port = CONTROL_PORT, timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = net.connect({ host: '127.0.0.1', port });
    const done = (ok: boolean) => {
      sock.destroy();
      resolve(ok);
    };
    sock.setTimeout(timeoutMs, () => done(false));
    sock.once('connect', () => done(true));
    sock.once('error', () => done(false));
  });
}

function appRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      execFile('tasklist', ['/FI', 'IMAGENAME eq effectcraft.exe', '/NH'], { windowsHide: true }, (err, out) => resolve(!err && /effectcraft\.exe/i.test(out)));
    } else {
      // exact process name: never matches our own effectcraft-cli engines
      execFile('pgrep', ['-xi', 'effectcraft'], (err, out) => resolve(!err && out.trim().length > 0));
    }
  });
}

/** Replace "$steps[N].path.to[0]" with a value returned by step N (0-based), e.g. "$steps[0].layer". */
export function substitute(value: unknown, steps: unknown[] = []): unknown {
  if (typeof value === 'string') {
    const st = /^\$steps\[(\d+)\]((?:\.[A-Za-z_]\w*|\[\d+\])*)$/.exec(value);
    if (st) {
      let cur: unknown = steps[Number(st[1])];
      for (const part of st[2].match(/\.[A-Za-z_]\w*|\[\d+\]/g) ?? []) {
        const key = part.startsWith('.') ? part.slice(1) : Number(part.slice(1, -1));
        cur = cur && typeof cur === 'object' ? (cur as Record<string | number, unknown>)[key] : undefined;
      }
      if (cur === undefined) throw new Error(`${value} is not available (step results so far: ${steps.length}).`);
      return cur;
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => substitute(v, steps));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, substitute(v, steps)]));
  return value;
}

const projectInput = {
  open_path: z.string().optional().describe('Absolute .ecproj to open first (never saved over; use formats ecproj to save a copy).'),
  import_paths: z.array(z.string()).max(200).optional().describe('Absolute media files to import into the project first (their item ids are returned).'),
};
const renderTarget = {
  comp: z.union([z.string(), z.number().int()]).optional().describe('Comp to render / preview (default: the active one).'),
  formats: formatsSchema.optional().describe('Render / export / save the result (needs output_dir or output_path).'),
  name: z.string().optional().describe('Output file name (default: the comp\'s).'),
  output_dir: z.string().optional(),
  output_path: z.string().optional(),
  overwrite: z.boolean().default(false),
  ...renderOptionsSchema,
  preview_time: z.number().min(0).optional().describe('Return a preview frame at this time.'),
};

/** Open / import, run fn, then render, preview: shared by run_effectcraft_script and run_effectcraft_commands. */
async function inProject(
  s: EffectCraftSession,
  a: { open_path?: string; import_paths?: string[] } & Record<string, any>,
  fn: (imported: number[]) => Promise<Record<string, unknown> & { failed?: boolean }>,
) {
  if (a.open_path) {
    const [file] = collectInputs([a.open_path], undefined, ['ecproj', 'ecprojx']);
    await s.json('open_project', { path: file });
  }
  const imported: number[] = [];
  for (const p of a.import_paths?.length ? collectInputs(a.import_paths, undefined, MEDIA) : []) imported.push((await s.importMedia(p)).id);
  const body = await fn(imported);
  let outputs: unknown[] | undefined;
  if (a.formats?.length && !body.failed) {
    const dir = a.output_path ? path.dirname(a.output_path) : a.output_dir;
    if (!dir || !path.isAbsolute(dir)) throw new Error('Rendering needs an absolute output_dir or output_path.');
    const proj = await s.json('get_project', {});
    const comp = a.comp ?? proj.activeComp ?? undefined;
    const compName = (proj.items ?? []).find((i: any) => i.id === comp || i.name === comp)?.name ?? 'effectcraft';
    const needsComp = a.formats.some((f: keyof typeof OUTPUTS) => f !== 'ecproj');
    if (needsComp && comp === undefined) throw new Error('There is no composition to render: create one (comp.new) or give comp.');
    outputs = await renderAll(s, comp, { stemSource: path.join(dir, a.name ?? compName), suffix: '', output_dir: dir, output_path: a.output_path, overwrite: a.overwrite }, a.formats, a as RenderOpts);
  }
  const img = a.preview_time !== undefined ? await preview(s, a.comp, a.preview_time, 960).catch(() => undefined) : undefined;
  return withPreview({ ...body, success: !body.failed, ...(imported.length ? { imported } : {}), ...(outputs ? { outputs } : {}) }, [img], !!body.failed);
}

export function registerAdvancedTools(server: McpServer): void {
  server.registerTool(
    'list_effectcraft_catalog',
    {
      title: 'List effects, templates, fonts, commands, formats',
      description:
        'What EffectCraft can do: effects (306, with After Effects names, categories and parameter ids for add_effect values), templates ' +
        '(motion templates and their controls, for use_template), fonts (bundled and installed), commands (665 engine commands with ' +
        'parameters, for run_effectcraft_commands), formats (import and render).',
      inputSchema: {
        kind: z.enum(['effects', 'templates', 'fonts', 'commands', 'formats']),
        filter: z.string().optional().describe('Case-insensitive text to match.'),
      },
      annotations: READ,
    },
    async (args) => {
      try {
        const f = (args.filter ?? '').toLowerCase();
        const match = (...parts: unknown[]) => !f || parts.some((p) => String(p ?? '').toLowerCase().includes(f));
        if (args.kind === 'formats') return json({ success: true, import: MEDIA.concat(['ecproj', 'ecprojx', 'ectemplate', 'json (Lottie)', 'gltf', 'glb', 'obj']), render: Object.keys(OUTPUTS) });
        if (args.kind === 'commands') {
          const l = (await engineCommands()).filter((c) => match(c.id, c.label, (c.menu ?? []).join(' ')));
          return json({ success: true, count: l.length, commands: l.slice(0, 300).map((c) => ({ id: c.id, label: c.label, params: c.params ?? null })), truncated: l.length > 300 });
        }
        return json(
          await withSession(async (s) => {
            if (args.kind === 'effects') {
              const l = ((await s.json('list_effects', {})) ?? []) as any[];
              const sel = l.filter((e) => match(e.id, e.name, e.category));
              return { success: true, count: sel.length, effects: sel.slice(0, 200).map((e) => ({ id: e.id, name: e.name, category: e.category, params: (e.params ?? []).map((p: any) => `${p.id}=${JSON.stringify(p.default)}`).join(', ') })), truncated: sel.length > 200 };
            }
            if (args.kind === 'templates') {
              const l = ((await s.cmd('templates.list', {})) ?? []) as any[];
              return { success: true, templates: l.filter((t) => match(t.id, t.name, t.category, t.description)).map((t) => ({ id: t.id, name: t.name, category: t.category, size: [t.width, t.height], duration: t.duration, controls: t.controls, description: t.description })) };
            }
            const r = await s.json('list_fonts', { ...(f ? { query: args.filter } : {}) });
            const fams = (r?.families ?? r ?? []) as any[];
            return { success: true, count: fams.length, fonts: fams.slice(0, 300).map((x) => ({ family: x.family, styles: x.styles, origin: x.origin })) };
          }),
        );
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'run_effectcraft_script',
    {
      title: 'Run an After Effects-style script',
      description:
        'Run JavaScript with EffectCraft\'s After Effects-compatible object model (app.project, items.addComp, comp.layers.addText / addSolid / ' +
        'addShape / addNull / addCamera / addLight, layer.property("ADBE Transform Group")..., setValueAtTime, expressions, effects) on a new ' +
        'project, an opened .ecproj or imported media, then render / save the result. Most After Effects .jsx scripts run as they are.',
      inputSchema: {
        code: z.string().optional().describe('JavaScript source; the value of the last expression is returned.'),
        script_path: z.string().optional().describe('Absolute path of a .jsx / .js file to run instead.'),
        ...projectInput,
        ...renderTarget,
        live: z.boolean().default(false).describe(`Run in the open EffectCraft app (control port ${CONTROL_PORT}).`),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    },
    async (args) => {
      try {
        let code = args.code;
        if (args.script_path) {
          const [file] = collectInputs([args.script_path], undefined, ['jsx', 'js', 'jsxbin']);
          code = readFileSync(file, 'utf-8');
        }
        if (!code) throw new Error('Give code or script_path.');
        if (args.live && !(await controlPortOpen())) throw new Error(`EffectCraft is not listening on port ${CONTROL_PORT}: call open_in_effectcraft with control=true first.`);
        return await withSession(
          (s) =>
            inProject(s, args, async () => {
              const r = await s.json('run_script', { code, name: args.script_path ? path.basename(args.script_path) : 'script' });
              return { result: r?.result, output: r?.output || undefined, ...(r?.ok === false || r?.error ? { failed: true, error: r?.error } : {}) };
            }),
          args.live ? String(CONTROL_PORT) : undefined,
        );
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'run_effectcraft_commands',
    {
      title: 'Run EffectCraft engine commands',
      description:
        'Advanced: run any of EffectCraft\'s 665 engine commands in order (comp.*, layer.*, text.*, shape.*, mask.*, keys.*, effect.*, camera.*, ' +
        'track.*, roto.*, puppet.*, essential.*, templates.*...) plus the engine tools set_property / get_property / add_keyframe / add_effect / ' +
        'get_comp / get_layer (step id = the tool name), on a new project, an opened .ecproj or imported media, then render / save. Parameters ' +
        'can use "$steps[N].field" for a value returned by step N (0-based), e.g. "$steps[0].layer".',
      inputSchema: {
        steps: z.array(z.object({ id: z.string(), params: z.record(z.string(), z.any()).optional() })).max(500).default([]),
        stop_on_error: z.boolean().default(true),
        ...projectInput,
        ...renderTarget,
        live: z.boolean().default(false).describe(`Drive the open EffectCraft app (control port ${CONTROL_PORT}).`),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    },
    async (args) => {
      try {
        if (args.live && !(await controlPortOpen())) throw new Error(`EffectCraft is not listening on port ${CONTROL_PORT}: call open_in_effectcraft with control=true first.`);
        const TOOLS = new Set(['set_property', 'get_property', 'add_keyframe', 'add_effect', 'get_comp', 'get_layer', 'get_project', 'list_fonts', 'render_frame', 'undo', 'redo']);
        return await withSession(
          (s) =>
            inProject(s, args, async () => {
              const values: unknown[] = [];
              const results: Record<string, unknown>[] = [];
              let failed = 0;
              for (const step of args.steps) {
                try {
                  const params = substitute(step.params ?? {}, values) as Record<string, unknown>;
                  const out = TOOLS.has(step.id) ? await s.json(step.id, params) : await s.cmd(step.id, params);
                  values.push(out);
                  results.push({ id: step.id, ok: true, result: out });
                } catch (e) {
                  failed++;
                  values.push(undefined);
                  results.push({ id: step.id, ok: false, error: e instanceof Error ? e.message : String(e) });
                  if (args.stop_on_error) break;
                }
              }
              return { completed: results.length - failed, failed_steps: failed, results, ...(failed ? { failed: true } : {}) };
            }),
          args.live ? String(CONTROL_PORT) : undefined,
        );
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'open_in_effectcraft',
    {
      title: 'Open in EffectCraft',
      description:
        'Open an .ecproj project or media files in the EffectCraft desktop app for manual editing. With control=true the app also starts its ' +
        'loopback-only control channel so run_effectcraft_commands / run_effectcraft_script live=true can drive it (the channel has no ' +
        'password: close the app when done).',
      inputSchema: {
        paths: z.array(z.string()).max(50).default([]).describe('Absolute .ecproj or media files.'),
        control: z.boolean().default(false),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async (args) => {
      try {
        const files = args.paths.length ? collectInputs(args.paths, undefined, ['ecproj', 'ecprojx', ...MEDIA]) : [];
        const install = resolveInstall();
        if (!install.app) throw new Error('EffectCraft desktop app not found. Set EFFECTCRAFT_DIR (or EFFECTCRAFT_APP for an AppImage).');
        const extra = args.control && !(await controlPortOpen()) ? ['--control', String(CONTROL_PORT)] : [];
        // run it from this connector's folder: GPU drivers drop log folders into the working directory
        const cwd = connectorDir();
        mkdirSync(cwd, { recursive: true });
        const child = spawn(install.app, [...extra, ...files], { cwd, detached: true, stdio: 'ignore', windowsHide: false });
        child.on('error', () => undefined);
        child.unref();
        let listening: boolean | undefined;
        if (extra.length) {
          const deadline = Date.now() + 20_000;
          while (!(listening = await controlPortOpen()) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 500));
          if (!listening) throw new Error(`EffectCraft started but is not listening on port ${CONTROL_PORT} after 20 s (it may have closed). Start it by hand with: effectcraft --control ${CONTROL_PORT}`);
        }
        return json({ success: true, app: install.app, opened: files, ...(extra.length ? { control_port: CONTROL_PORT, listening } : {}) });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'get_effectcraft_status',
    {
      title: 'EffectCraft status',
      description: 'Check the EffectCraft installation: platform, executables, version, commands, effects, render formats, whether the app is running / listening for control.',
      inputSchema: {},
      annotations: READ,
    },
    async () => {
      const install = resolveInstall();
      const status: Record<string, unknown> = { ready: !!install.cli, platform: `${install.platform} ${process.arch}`, install_dir: install.dir, cli: install.cli ?? null, app: install.app ?? null };
      try {
        if (!install.cli) throw new Error(`effectcraft-cli not found (searched ${install.searched.length} folders). Install EffectCraft or set EFFECTCRAFT_DIR / EFFECTCRAFT_CLI.`);
        status['version'] = (await runCli(['--version'])).split('\n')[0].trim();
        const st = await withSession((s) => s.json('get_state', {}));
        status['commands'] = st?.app?.commands;
        status['effects'] = st?.app?.effects?.total;
        status['engine_export'] = st?.app?.export;
        status['app_running'] = await appRunning();
        status['control_port'] = CONTROL_PORT;
        status['control_listening'] = await controlPortOpen();
        status['render_formats'] = Object.keys(OUTPUTS);
        status['timeout_sec'] = COMMAND_TIMEOUT_SEC;
        return json(status);
      } catch (e) {
        return json({ ...status, ready: false, error: e instanceof Error ? e.message : String(e) }, true);
      }
    },
  );
}
