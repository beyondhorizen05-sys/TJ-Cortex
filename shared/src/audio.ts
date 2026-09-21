export function resampleMonoPcm(input: Float32Array, inputRate: number, outputRate = 16000): Float32Array {
  if (!Number.isFinite(inputRate) || inputRate <= 0) throw new Error('inputRate must be positive.');
  if (!Number.isFinite(outputRate) || outputRate <= 0) throw new Error('outputRate must be positive.');
  if (input.length === 0 || inputRate === outputRate) return new Float32Array(input);
  const outputLength = Math.max(1, Math.round(input.length * outputRate / inputRate));
  const output = new Float32Array(outputLength);
  const ratio = inputRate / outputRate;
  for (let i = 0; i < outputLength; i += 1) {
    const position = i * ratio;
    const left = Math.min(Math.floor(position), input.length - 1);
    const right = Math.min(left + 1, input.length - 1);
    const fraction = position - left;
    output[i] = input[left] + (input[right] - input[left]) * fraction;
  }
  return output;
}

export function encodePcm16Wav(samples: Float32Array, sampleRate = 16000): Uint8Array {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) throw new Error('sampleRate must be positive.');
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeAscii = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };
  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, Math.round(sampleRate), true);
  view.setUint32(28, Math.round(sampleRate) * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    const pcm = sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff);
    view.setInt16(44 + i * 2, pcm, true);
  }
  return new Uint8Array(buffer);
}
