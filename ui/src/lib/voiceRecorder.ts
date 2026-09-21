import { encodePcm16Wav, resampleMonoPcm } from '@tj-cortex/shared';

export interface PushToTalkRecording {
  blob: Blob;
  durationMs: number;
  sampleRate: 16000;
}

export class PushToTalkRecorder {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private silentGain: GainNode | null = null;
  private chunks: Float32Array[] = [];
  private startedAt = 0;

  async start(): Promise<void> {
    if (this.stream) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone capture is not available in this desktop webview.');
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    try {
      this.context = new AudioContext();
      this.source = this.context.createMediaStreamSource(this.stream);
      this.processor = this.context.createScriptProcessor(4096, 1, 1);
      this.silentGain = this.context.createGain();
      this.silentGain.gain.value = 0;
      this.processor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        this.chunks.push(new Float32Array(input));
      };
      this.source.connect(this.processor);
      this.processor.connect(this.silentGain);
      this.silentGain.connect(this.context.destination);
      await this.context.resume();
      this.startedAt = performance.now();
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  async stop(): Promise<PushToTalkRecording> {
    if (!this.stream || !this.context) throw new Error('Microphone recording is not active.');

    const durationMs = Math.max(0, Math.round(performance.now() - this.startedAt));
    const inputRate = this.context.sampleRate;
    const samples = concatFloat32(this.chunks);
    const mono16k = resampleMonoPcm(samples, inputRate, 16000);
    const wav = encodePcm16Wav(mono16k, 16000);
    const wavBuffer = new ArrayBuffer(wav.byteLength);
    new Uint8Array(wavBuffer).set(wav);
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    this.cleanup();
    return { blob, durationMs, sampleRate: 16000 };
  }

  cancel(): void {
    this.cleanup();
  }

  private cleanup(): void {
    if (this.processor) this.processor.onaudioprocess = null;
    this.source?.disconnect();
    this.processor?.disconnect();
    this.silentGain?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    void this.context?.close().catch(() => undefined);
    this.stream = null;
    this.context = null;
    this.source = null;
    this.processor = null;
    this.silentGain = null;
    this.chunks = [];
    this.startedAt = 0;
  }
}

function concatFloat32(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}
