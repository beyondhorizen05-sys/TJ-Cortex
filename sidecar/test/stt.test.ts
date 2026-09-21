import { strict as assert } from 'node:assert';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { transcribeWav, type WhisperRunner } from '../src/tools/voice.js';

test('transcribeWav returns the transcript produced by the whisper runner', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tj-cortex-stt-test-'));
  const wav = join(dir, 'sample.wav');
  await writeFile(wav, Buffer.from('RIFFTEST'));
  const runner: WhisperRunner = async (_executable, args) => {
    const outputIndex = args.indexOf('--output-file');
    assert.notEqual(outputIndex, -1);
    const outputBase = args[outputIndex + 1];
    assert.ok(outputBase);
    await writeFile(String(outputBase) + '.txt', '  hello from local speech  ');
  };
  const previousCli = process.env.TJ_CORTEX_WHISPER_CLI;
  const previousModel = process.env.TJ_CORTEX_WHISPER_MODEL;
  process.env.TJ_CORTEX_WHISPER_CLI = 'test-whisper';
  process.env.TJ_CORTEX_WHISPER_MODEL = 'models/ggml-base.en.bin';
  try {
    const result = await transcribeWav(wav, runner);
    assert.equal(result.text, 'hello from local speech');
    assert.ok(result.model.endsWith(join('models', 'ggml-base.en.bin')));
  } finally {
    if (previousCli === undefined) delete process.env.TJ_CORTEX_WHISPER_CLI; else process.env.TJ_CORTEX_WHISPER_CLI = previousCli;
    if (previousModel === undefined) delete process.env.TJ_CORTEX_WHISPER_MODEL; else process.env.TJ_CORTEX_WHISPER_MODEL = previousModel;
    await rm(dir, { recursive: true, force: true });
  }
});

test('transcribeWav rejects non-WAV input before starting whisper', async () => {
  const runner: WhisperRunner = async () => { throw new Error('runner should not execute'); };
  await assert.rejects(() => transcribeWav('/tmp/not-audio.mp3', runner), /16-bit WAV audio only/);
});
