import { readFile, writeFile, readdir, stat, mkdir, rm } from 'node:fs/promises';
import { join, resolve, normalize } from 'node:path';
import { config } from '../config.js';
import { registerTool } from './registry.js';

/**
 * Filesystem tools. All paths are confined to the workspace directory unless
 * the user has granted a broader scope. Absolute paths outside the workspace
 * require explicit consent (`fs.write` or `fs.read` policies).
 */

function guard(p: string): string {
  const abs = resolve(config.workspaceDir, normalize(p));
  if (!abs.startsWith(config.workspaceDir)) {
    throw new Error(
      `Path escapes workspace. Workspace is ${config.workspaceDir}. Absolute paths require an explicit policy.`,
    );
  }
  return abs;
}

registerTool({
  descriptor: {
    name: 'fs.read',
    category: 'fs',
    description: 'Read a UTF-8 text file from the workspace.',
    risk: 'read',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path'],
    },
    requiresConsent: false,
    scoped: true,
    enabled: true,
  },
  async run(inv) {
    const p = guard(String(inv.args.path ?? ''));
    const text = await readFile(p, 'utf8');
    return { path: p, text, bytes: Buffer.byteLength(text, 'utf8') };
  },
});

registerTool({
  descriptor: {
    name: 'fs.write',
    category: 'fs',
    description: 'Write a UTF-8 text file to the workspace.',
    risk: 'write',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        text: { type: 'string' },
        append: { type: 'boolean' },
      },
      required: ['path', 'text'],
    },
    requiresConsent: false,
    scoped: true,
    enabled: true,
  },
  async run(inv) {
    const p = guard(String(inv.args.path ?? ''));
    const text = String(inv.args.text ?? '');
    const append = Boolean(inv.args.append);
    await mkdir(join(p, '..'), { recursive: true });
    await writeFile(p, text, { encoding: 'utf8', flag: append ? 'a' : 'w' });
    const s = await stat(p);
    return { path: p, bytes: s.size };
  },
});

registerTool({
  descriptor: {
    name: 'fs.list',
    category: 'fs',
    description: 'List a directory in the workspace.',
    risk: 'read',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path'],
    },
    requiresConsent: false,
    scoped: true,
    enabled: true,
  },
  async run(inv) {
    const p = guard(String(inv.args.path ?? '.'));
    const entries = await readdir(p, { withFileTypes: true });
    return {
      path: p,
      entries: entries.map((e) => ({
        name: e.name,
        kind: e.isDirectory() ? 'dir' : 'file',
      })),
    };
  },
});

registerTool({
  descriptor: {
    name: 'fs.delete',
    category: 'fs',
    description: 'Delete a file or empty directory in the workspace.',
    risk: 'destructive',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path'],
    },
    requiresConsent: true,
    scoped: true,
    enabled: true,
  },
  async run(inv) {
    const p = guard(String(inv.args.path ?? ''));
    await rm(p, { recursive: false });
    return { deleted: p };
  },
});