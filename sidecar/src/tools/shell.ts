import { spawn } from 'node:child_process';
import { config } from '../config.js';
import { registerTool } from './registry.js';

/**
 * Shell tool. Requires consent every time by default. Runs in the workspace
 * with a bounded timeout and captures stdout/stderr.
 */
registerTool({
  descriptor: {
    name: 'shell.exec',
    category: 'shell',
    description: 'Run a shell command in the workspace. Requires user consent.',
    risk: 'destructive',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string' },
        cwd: { type: 'string' },
        timeoutMs: { type: 'number' },
      },
      required: ['command'],
    },
    requiresConsent: true,
    scoped: true,
    enabled: true,
  },
  async run(inv) {
    const command = String(inv.args.command ?? '');
    const cwd = String(inv.args.cwd ?? config.workspaceDir);
    const timeoutMs = Number(inv.args.timeoutMs ?? 30_000);

    return await new Promise((resolve) => {
      const child = spawn(command, {
        shell: true,
        cwd,
        env: { ...process.env, TJ_CORTEX: '1' },
      });
      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        resolve({ code: -1, stdout, stderr: stderr + '\n[timeout]', timedOut: true });
      }, timeoutMs);
      child.stdout?.on('data', (d) => (stdout += d.toString()));
      child.stderr?.on('data', (d) => (stderr += d.toString()));
      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({ code, stdout, stderr, timedOut: false });
      });
      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({ code: -1, stdout, stderr: stderr + '\n' + err.message, timedOut: false });
      });
    });
  },
});