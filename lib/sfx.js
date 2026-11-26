// Tiny WebAudio sound effects. No audio files. Turn off with state.child.sound === false.
let ctx = null;
const NOTES = {
  good: [[660, 0], [880, 0.1]],
  soft: [[330, 0], [294, 0.12]],
  win: [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36]],
  tap: [[500, 0]],
  pop: [[780, 0], [1100, 0.05]],
};
export function sfx(name, enabled = true) {
  if (!enabled || typeof window === "undefined") return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = ctx.currentTime;
    for (const [freq, at] of NOTES[name] ?? []) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0 + at);
      g.gain.exponentialRampToValueAtTime(0.18, t0 + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(t0 + at);
      o.stop(t0 + at + 0.2);
    }
  } catch {}
}
