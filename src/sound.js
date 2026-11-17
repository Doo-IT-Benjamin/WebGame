// Small synthesized sound effects (Web Audio) — no audio files needed.
let ac = null;
let master = null;
let muted = false;
try { muted = localStorage.getItem('gravity-muted') === '1'; } catch {}

/** Must be called from a user gesture (click/tap/key) before sounds can play. */
export function unlock() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
}

export function isMuted() { return muted; }
export function setMuted(m) {
  muted = m;
  try { localStorage.setItem('gravity-muted', m ? '1' : '0'); } catch {}
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.5, ac.currentTime, 0.02);
}

function tone({ type = 'sine', from, to = from, dur = 0.15, vol = 0.4, delay = 0 }) {
  if (!ac || muted) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.15, vol = 0.3, freq = 1200, delay = 0 }) {
  if (!ac || muted) return;
  const t0 = ac.currentTime + delay;
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const g = ac.createGain();
  g.gain.value = vol;
  src.connect(filter).connect(g).connect(master);
  src.start(t0);
}

/** Bounce: pitch rises the closer the teacher is to popping (progress 0..1). */
export function bounce(progress = 0) {
  const base = 300 + progress * 300;
  tone({ type: 'sine', from: base, to: base * 2.2, dur: 0.14, vol: 0.35 });
}

export function pop() {
  noise({ dur: 0.12, vol: 0.6, freq: 1800 });
  tone({ type: 'triangle', from: 900, to: 1800, dur: 0.1, vol: 0.3 });
  tone({ type: 'sine', from: 1320, to: 1320, dur: 0.12, vol: 0.2, delay: 0.06 });
}

export function miss() {
  tone({ type: 'sine', from: 160, to: 55, dur: 0.3, vol: 0.6 });
  noise({ dur: 0.18, vol: 0.25, freq: 300 });
}

export function gameOver() {
  [392, 370, 349, 294].forEach((f, i) =>
    tone({ type: 'triangle', from: f, to: i === 3 ? f * 0.94 : f, dur: i === 3 ? 0.7 : 0.28, vol: 0.35, delay: i * 0.3 }));
}

/** Celebration jingle; `big` for a #1 score. */
export function fanfare(big = false) {
  const notes = big ? [523, 659, 784, 1047, 784, 1047] : [523, 659, 784, 1047];
  notes.forEach((f, i) => tone({ type: 'square', from: f, dur: 0.16, vol: 0.12, delay: 0.9 + i * 0.12 }));
  notes.forEach((f, i) => tone({ type: 'triangle', from: f / 2, dur: 0.18, vol: 0.2, delay: 0.9 + i * 0.12 }));
}

export function click() {
  tone({ type: 'sine', from: 660, to: 880, dur: 0.06, vol: 0.2 });
}
