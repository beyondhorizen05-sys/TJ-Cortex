import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { PushToTalkRecorder } from '../lib/voiceRecorder';
import { cn } from '../lib/format';
import { api } from '../lib/api';
import { useAgents } from '../store/agents';

export function VoiceButton() {
  const recorder = useRef<PushToTalkRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [ready, setReady] = useState(false);
  const agentId = useAgents((s) => s.selectedId);

  useEffect(() => () => recorder.current?.cancel(), []);

  const begin = async () => {
    if (recording) return;
    setReady(false);
    const next = new PushToTalkRecorder();
    recorder.current = next;
    try {
      await next.start();
      setRecording(true);
    } catch (error) {
      recorder.current = null;
      console.error('Voice capture failed:', error);
    }
  };

  const end = async () => {
    const active = recorder.current;
    if (!active || !recording) return;
    recorder.current = null;
    try {
      const result = await active.stop();
      setReady(result.blob.size > 44);
      if (agentId && result.blob.size > 44) {
        const response = await api.transcribeVoice(agentId, result.blob);
        if (response.ok && typeof response.output?.text === 'string') {
          window.dispatchEvent(new CustomEvent('tj-cortex:voice-transcript', { detail: response.output.text }));
        }
      }
    } catch (error) {
      console.error('Voice capture failed:', error);
    } finally {
      setRecording(false);
    }
  };

  const cancel = () => {
    recorder.current?.cancel();
    recorder.current = null;
    setRecording(false);
  };

  return (
    <button
      type="button"
      title={recording ? 'Release to stop voice capture' : 'Hold to talk'}
      aria-label={recording ? 'Release to stop voice capture' : 'Hold to talk'}
      aria-pressed={recording}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        void begin();
      }}
      onPointerUp={() => void end()}
      onPointerCancel={cancel}
      onLostPointerCapture={() => {
        if (recording) void end();
      }}
      className={cn(
        'h-8 w-8 rounded-lg flex items-center justify-center transition-colors',
        recording
          ? 'bg-soma-rose/20 text-soma-rose'
          : ready
            ? 'bg-dendrite-green/15 text-dendrite-green'
            : 'text-glia-gray hover:bg-white/5 hover:text-white',
      )}
    >
      {recording ? <MicOff size={16} /> : <Mic size={16} />}
    </button>
  );
}
