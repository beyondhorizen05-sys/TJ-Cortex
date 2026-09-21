/**
 * Brand sound design: subtle UI ticks, agent speech blips, meeting chime,
 * coin chime on payout. Sounds are synthesized with the Web Audio API so
 * no binary assets are required and nothing is downloaded at runtime.
 */
let ctx: AudioContext | null = null;
function ac(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number) {
  const c = ac();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  osc.connect(g).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + dur);
}

export const sound = {
  tick: () => tone(880, 0.045, 'triangle', 0.05),
  blip: () => tone(660, 0.09, 'sine', 0.06),
  meetingChime: () => { tone(523, 0.18, 'sine', 0.08); setTimeout(() => tone(784, 0.22, 'sine', 0.08), 140); },
  coin: () => { tone(1320, 0.08, 'triangle', 0.09); setTimeout(() => tone(1760, 0.14, 'triangle', 0.09), 70); },
};