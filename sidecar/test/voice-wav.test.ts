import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodePcm16Wav, resampleMonoPcm } from '@tj-cortex/shared';

test('encodes mono 16-bit PCM WAV at 16 kHz', () => {
  const wav = encodePcm16Wav(new Float32Array([0, 1, -1]), 16000);
  assert.equal(new TextDecoder().decode(wav.slice(0, 4)), 'RIFF');
  assert.equal(new TextDecoder().decode(wav.slice(8, 12)), 'WAVE');
  assert.equal(new DataView(wav.buffer).getUint16(20, true), 1);
  assert.equal(new DataView(wav.buffer).getUint16(22, true), 1);
  assert.equal(new DataView(wav.buffer).getUint32(24, true), 16000);
  assert.equal(new DataView(wav.buffer).getUint16(34, true), 16);
  assert.equal(new DataView(wav.buffer).getUint32(40, true), 6);
});

test('resamples microphone PCM to 16 kHz', () => {
  const input = new Float32Array(480);
  const output = resampleMonoPcm(input, 48000, 16000);
  assert.equal(output.length, 160);
});
