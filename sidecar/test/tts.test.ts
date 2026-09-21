import { strict as assert } from 'node:assert';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { synthesizeSpeech, type PiperRunner } from '../src/tools/voice.js';

test('synthesizeSpeech writes through Piper with one configured voice', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tj-cortex-tts-test-'));
  const output = join(dir, 'speech.wav');
  const runner: PiperRunner = async (_executable, args, input) => {
    assert.deepEqual(args, ['--model', 'models/en_US-lessac-medium.onnx', '--output_file', output, '--quiet']);
    assert.equal(input, 'Hello from TJ-Cortex.');
    await writeFile(output, Buffer.from('RIFFFAKEWAV'));
  };
  try {
    const result = await synthesizeSpeech('  Hello from TJ-Cortex.  ', output, runner, {
      executable: 'test-piper',
      model: 'models/en_US-lessac-medium.onnx',
    });
    assert.equal(result.audioPath, output);
    assert.ok(result.model.endsWith(join('models', 'en_US-lessac-medium.onnx')));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('synthesizeSpeech rejects empty text and non-WAV output', async () => {
  const runner: PiperRunner = async () => { throw new Error('runner should not execute'); };
  await assert.rejects(
    () => synthesizeSpeech('   ', '/tmp/speech.wav', runner, { executable: 'test-piper', model: 'voice.onnx' }),
    /non-empty text/,
  );
  await assert.rejects(
    () => synthesizeSpeech('hello', '/tmp/speech.mp3', runner, { executable: 'test-piper', model: 'voice.onnx' }),
    /WAV audio only/,
  );
});
