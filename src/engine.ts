import { ChildProcessWithoutNullStreams, execFile, spawn } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createInterface } from 'readline';
import { COMMAND_TIMEOUT_SEC, resolveInstall } from './config.js';

/** A EffectCraft tool call the engine rejected (unknown command, bad parameters, file problems...). */
export class EffectCraftToolError extends Error {
  constructor(
    public readonly tool: string,
    message: string,
  ) {
    super(`${tool}: ${message}`);
    this.name = 'EffectCraftToolError';
  }
}

let running = 0;
/** Engine sessions still open (index.ts waits for them before exiting). */
export function pendingRuns(): number {
  return running;
}

export function requireCli(): string {
  const install = resolveInstall();
  if (!install.cli) {
    throw new Error(
      `effectcraft-cli not found (looked in ${install.searched.slice(0, 6).join(', ')} and PATH). Install EffectCraft ` +
        '(https://github.com/storytold/effectcraft/releases; on macOS also the effectcraft-cli zip) or set EFFECTCRAFT_DIR / EFFECTCRAFT_CLI.',
    );
  }
  return install.cli;
}

export interface ContentItem {
  type: string;
  text?: string;
  data?: string;
  mimeType?: string;
}

export interface ToolOutput {
  /** The tool's JSON result (structuredContent, or the parsed text). */
  value: any;
  content: ContentItem[];
}

interface RpcResponse {
  result?: { content?: ContentItem[]; structuredContent?: Record<string, any>; isError?: boolean };
  error?: { message: string };
}

interface Pending {
  resolve: (v: RpcResponse) => void;
  reject: (e: Error) => void;
  timer: NodeJS.Timeout;
}

/**
 * One EffectCraft engine: `effectcraft-cli mcp` over stdio with an in-memory project (or, with `connect`, the
 * running app through `--bridge PORT`). Footage is imported by reference and only read; nothing is saved unless a
 * tool saves a copy. Calls are sent one at a time. The session's temporary folder (its working directory) is
 * removed when it closes.
 */
export class EffectCraftSession {
  private proc: ChildProcessWithoutNullStreams;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private stderr = '';
  private closed = false;
  readonly workDir: string;
  private queue: Promise<unknown> = Promise.resolve();

  private constructor(cli: string, connect?: string) {
    this.workDir = mkdtempSync(path.join(os.tmpdir(), 'ecmcp-'));
    const args = connect ? ['mcp', '--bridge', connect] : ['mcp'];
    this.proc = spawn(cli, args, { cwd: this.workDir, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    running++;
    this.proc.stderr.setEncoding('utf-8');
    this.proc.stderr.on('data', (d: string) => {
      this.stderr = (this.stderr + d).slice(-4000);
    });
    createInterface({ input: this.proc.stdout }).on('line', (line) => this.onLine(line));
    this.proc.on('error', (e) => this.failAll(e));
    this.proc.on('exit', (code) => this.failAll(new Error(`EffectCraft engine exited (code ${code}). ${this.stderr.trim()}`.trim())));
  }

  static async open(connect?: string): Promise<EffectCraftSession> {
    const s = new EffectCraftSession(requireCli(), connect);
    try {
      await s.rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'effectcraft-mcp-server', version: '1' } });
      s.send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    } catch (e) {
      s.close();
      throw e;
    }
    return s;
  }

  private send(msg: unknown): void {
    this.proc.stdin.write(JSON.stringify(msg) + '\n');
  }

  private onLine(line: string): void {
    let msg: { id?: number } & RpcResponse;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }
    if (typeof msg.id !== 'number') return;
    const p = this.pending.get(msg.id);
    if (!p) return;
    this.pending.delete(msg.id);
    clearTimeout(p.timer);
    p.resolve(msg);
  }

  private failAll(e: Error): void {
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(e);
    }
    this.pending.clear();
    this.finish();
  }

  private finish(): void {
    if (this.closed) return;
    this.closed = true;
    running--;
    try {
      rmSync(this.workDir, { recursive: true, force: true });
    } catch {
      // still locked: the OS temp cleanup takes it later
    }
  }

  private rpc(method: string, params: unknown, timeoutSec = COMMAND_TIMEOUT_SEC): Promise<RpcResponse> {
    const run = () =>
      new Promise<RpcResponse>((resolve, reject) => {
        if (this.closed) return reject(new Error('EffectCraft engine is closed.'));
        const id = this.nextId++;
        const timer = setTimeout(() => {
          this.pending.delete(id);
          reject(new Error(`EffectCraft engine timed out after ${timeoutSec} s (${method}).`));
        }, timeoutSec * 1000);
        this.pending.set(id, { resolve, reject, timer });
        this.send({ jsonrpc: '2.0', id, method, params });
      });
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }

  /** Call one of the engine's MCP tools (command_run, set_property, add_keyframe, render_preview...). */
  async call(tool: string, args: Record<string, unknown> = {}): Promise<ToolOutput> {
    const r = await this.rpc('tools/call', { name: tool, arguments: args });
    if (r.error) throw new EffectCraftToolError(tool, r.error.message);
    const result = r.result ?? {};
    const content = result.content ?? [];
    const text = content
      .filter((c) => c.type === 'text')
      .map((c) => c.text ?? '')
      .join('\n')
      .trim();
    if (result.isError) throw new EffectCraftToolError(tool, text || 'failed');
    let value: any = result.structuredContent;
    if (value === undefined && text) {
      try {
        value = JSON.parse(text);
      } catch {
        value = { text };
      }
    }
    return { value: value ?? null, content };
  }

  /** The JSON result only. */
  async json<T = any>(tool: string, args: Record<string, unknown> = {}): Promise<T> {
    return (await this.call(tool, args)).value as T;
  }

  /** Run one engine command (see command_list) and return its JSON result. */
  async cmd<T = any>(id: string, params: Record<string, unknown> = {}): Promise<T> {
    try {
      return await this.json<T>('command_run', { id, params });
    } catch (e) {
      if (e instanceof EffectCraftToolError) throw new EffectCraftToolError(id, e.message.replace(/^command_run: /, ''));
      throw e;
    }
  }

  /** Import a media file (by reference) and return its project item with size, duration and frame rate. */
  async importMedia(file: string): Promise<{ id: number; width?: number; height?: number; duration?: number; frameRate?: number; hasVideo?: boolean; kind?: string }> {
    const r = await this.cmd('file.import', { paths: [file] });
    const id = r?.items?.[0];
    if (typeof id !== 'number') throw new Error(`EffectCraft could not import ${file}${r?.errors?.length ? ': ' + JSON.stringify(r.errors[0]) : ''}.`);
    const m = (await this.cmd('item.metadata', { item: id }))?.item ?? {};
    return { id, width: m.width, height: m.height, duration: m.duration, frameRate: m.frameRate, hasVideo: m.hasVideo, kind: m.kind };
  }

  close(): void {
    if (this.closed) return;
    try {
      this.proc.stdin.end();
    } catch {
      // already gone
    }
    const p = this.proc;
    setTimeout(() => {
      if (p.exitCode === null) p.kill();
    }, 2000).unref();
    this.finish();
  }
}

/** Open a session, run fn, always close. */
export async function withSession<T>(fn: (s: EffectCraftSession) => Promise<T>, connect?: string): Promise<T> {
  const s = await EffectCraftSession.open(connect);
  try {
    return await fn(s);
  } finally {
    s.close();
  }
}

/** One-shot CLI call (--version, commands, controls): stdout as text. */
export function runCli(args: string[], timeoutSec = 120): Promise<string> {
  const cli = requireCli();
  return new Promise((resolve, reject) => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), 'ecmcp-'));
    execFile(
      cli,
      args,
      { cwd, windowsHide: true, timeout: timeoutSec * 1000, maxBuffer: 64 * 1024 * 1024, encoding: 'utf-8' },
      (err, stdout, stderr) => {
        try {
          rmSync(cwd, { recursive: true, force: true });
        } catch {
          // ignore
        }
        if (err) reject(new Error(`effectcraft-cli ${args[0]}: ${(stderr || stdout || err.message).toString().trim()}`));
        else resolve(stdout);
      },
    );
  });
}
