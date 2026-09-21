import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { config } from '../config.js';
import { registerTool } from './registry.js';

export interface WhisperRunner {
  (executable: string, args: string[], cwd?: string): Promise<void>;
}

export async function runWhisperCli(executable: string, args: string[], cwd?: string): Promise<void> {
  await new Promise<void>((resolveRun, rejectRun) => {
    const child: ChildProcess = spawn(executable, args, { cwd, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    child.once('error', rejectRun);
    child.once('close', (code) => {
      if (code === 0) { resolveRun(); return; }
      const detail = stderr.trim();
      rejectRun(new Error('whisper-cli exited with code ' + (code ?? 'unknown') + (detail ? ': ' + detail : '')));
    });
  });
}

function requireWhisperConfig(): { executable: string; model: string } {
  if (!config.whisperCli) throw new Error('TJ_CORTEX_WHISPER_CLI is not configured.');
  if (!config.whisperModel) throw new Error('TJ_CORTEX_WHISPER_MODEL is not configured.');
  return { executable: config.whisperCli, model: config.whisperModel };
}

export async function transcribeWav(audioPath: string, runner: WhisperRunner = runWhisperCli): Promise<{ text: string; model: string }> {
  const inputPath = resolve(audioPath);
  if (!inputPath.toLowerCase().endsWith('.wav')) throw new Error('voice.listen currently accepts 16-bit WAV audio only.');
  const { executable, model } = requireWhisperConfig();
  const tempDir = await mkdtemp(join(tmpdir(), 'tj-cortex-whisper-'));
  const outputBase = join(tempDir, 'transcript');
  const outputPath = outputBase + '.txt';
  try {
    await runner(executable, ['--model', resolve(model), '--file', inputPath, '--output-txt', '--output-file', outputBase, '--no-timestamps', '--no-prints'], dirname(inputPath));
    const text = (await readFile(outputPath, 'utf8')).trim();
    return { text, model: resolve(model) };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

registerTool({
  descriptor: {
    name: 'voice.listen',
    category: 'voice',
    description: 'Transcribe a local 16-bit WAV recording with the configured local whisper.cpp CLI.',
    risk: 'read',
    parameters: { type: 'object', properties: { audioPath: { type: 'string', description: 'Path to a 16-bit WAV recording.' } }, required: ['audioPath'] },
    requiresConsent: true,
    scoped: true,
    enabled: true,
  },
  async run(inv) {
    const audioPath = String(inv.args.audioPath ?? '');
    if (!audioPath) throw new Error('audioPath is required.');
    return transcribeWav(audioPath);
  },
});
