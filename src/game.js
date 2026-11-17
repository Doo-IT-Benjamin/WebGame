import { TEACHERS } from './teachers.js';

// ---- Tuning ---------------------------------------------------------------
const LIVES = 5;
const GRAVITY_START = 500;      // px/s² at game start
const GRAVITY_MAX = 1100;       // px/s² cap
const GRAVITY_RAMP = 8;         // px/s² added per second of play
const FIRST_SPAWN_DELAY = 0.5;  // s
const NEW_FACE_EVERY = 10;      // s between extra faces joining
const MAX_FACES = 6;
const RESPAWN_DELAY = 1.2;      // s before a dropped face comes back
const HIT_SLOP = 1.25;          // click radius multiplier (forgiving on touch)
const MIN_HITS = 3, MAX_HITS = 6; // clicks a teacher takes before popping (random per teacher)
const POP_BONUS = 3;            // extra points for popping a teacher

// Ring colour shows how close a teacher is to popping.
const RING_GREEN = '#2e9e4f', RING_ORANGE = '#f28c18', RING_RED = '#d62828';

// ---- Setup ----------------------------------------------------------------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const $ = (id) => document.getElementById(id);
const stage = $('stage'), livesEl = $('lives'), scoreEl = $('score');
const startScreen = $('start'), overScreen = $('over'), pausedScreen = $('paused');
const pauseBtn = $('pauseBtn');

let W = 0, H = 0, R = 40; // canvas size (css px) and face radius
const TOP = 0;             // top edge of the play area

function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = stage.clientWidth;
  H = stage.clientHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  R = Math.max(32, Math.min(56, Math.min(W, H) * 0.08));
}
new ResizeObserver(resize).observe(stage);
resize();

// Preload teacher photos; fall back to initials if missing/broken.
const COLORS = ['#434f58', '#5e6a74', '#2f3a42', '#6b7280', '#374151', '#4b5563'];
const teachers = TEACHERS.map((t, i) => {
  const entry = {
    name: t.name,
    initials: t.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
    color: COLORS[i % COLORS.length],
    img: null,
  };
  if (t.photo) {
    const img = new Image();
    img.onload = () => { entry.img = img; };
    img.src = t.photo;
  }
  return entry;
});

// ---- Game state -----------------------------------------------------------
let state = 'menu'; // menu | playing | paused | over
let faces = [];
let pops = [];      // little "+1" / "-1" effects
let shards = [];    // burst particles when a teacher pops
let score = 0, lives = LIVES, elapsed = 0, gravity = GRAVITY_START;
let nextFaceAt = 0;
let deck = [];

function nextTeacher() {
  if (deck.length === 0) deck = [...teachers].sort(() => Math.random() - 0.5);
  return deck.pop();
}

function spawnFace(face = {}) {
  face.teacher = nextTeacher();
  face.x = R + Math.random() * (W - 2 * R);
  face.y = -R;
  face.vx = (Math.random() - 0.5) * 120;
  face.vy = 40;
  face.angle = 0;
  face.spin = (Math.random() - 0.5) * 2;
  face.waiting = 0;
  face.squash = 0;
  face.maxHits = MIN_HITS + Math.floor(Math.random() * (MAX_HITS - MIN_HITS + 1));
  face.hits = 0;
  return face;
}

function startGame() {
  score = 0; lives = LIVES; elapsed = 0; gravity = GRAVITY_START;
  faces = []; pops = []; shards = []; deck = [];
  nextFaceAt = FIRST_SPAWN_DELAY;
  state = 'playing';
  startScreen.hidden = true;
  overScreen.hidden = true;
  pausedScreen.hidden = true;
  pauseBtn.disabled = false;
  updateHud();
}

function endGame() {
  state = 'over';
  pauseBtn.disabled = true;
  $('finalScore').textContent = score;
  let best = 0;
  try {
    best = Number(localStorage.getItem('gravity-best') || 0);
    if (score > best) { best = score; localStorage.setItem('gravity-best', String(score)); }
  } catch { best = Math.max(best, score); }
  $('best').textContent = score >= best && score > 0 ? 'Nieuw persoonlijk record!' : `Jouw record: ${best}`;
  overScreen.hidden = false;
}

function updateHud() {
  livesEl.textContent = '♥'.repeat(lives) + '♡'.repeat(LIVES - lives);
  scoreEl.textContent = score;
}

// ---- Input ----------------------------------------------------------------
canvas.addEventListener('pointerdown', (e) => {
  if (state !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left, py = e.clientY - rect.top;
  // Topmost face first (last drawn).
  for (let i = faces.length - 1; i >= 0; i--) {
    const f = faces[i];
    if (f.waiting > 0) continue;
    const dx = px - f.x, dy = py - f.y;
    if (dx * dx + dy * dy > (R * HIT_SLOP) ** 2) continue;
    if (f.vy <= 0) return; // only counts while falling
    f.hits++;
    score++;
    if (f.hits >= f.maxHits) {
      score += POP_BONUS;
      popFace(f);
      pops.push({ x: f.x, y: f.y - R, text: `+${1 + POP_BONUS}`, color: RING_GREEN, t: 0, big: true });
    } else {
      launch(f, dx);
      pops.push({ x: f.x, y: f.y - R, text: '+1', color: '#ef4423', t: 0 });
    }
    updateHud();
    return;
  }
});

function popFace(f) {
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
    const sp = 180 + Math.random() * 220;
    shards.push({
      x: f.x + Math.cos(a) * R * 0.8, y: f.y + Math.sin(a) * R * 0.8,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120,
      color: i % 3 === 0 ? f.teacher.color : RING_RED, size: 4 + Math.random() * 6, t: 0,
    });
  }
  f.waiting = RESPAWN_DELAY; // a fresh teacher drops in after a moment
}

function ringColor(f) {
  const left = f.maxHits - f.hits;
  if (left <= 1) return RING_RED;
  return left / f.maxHits > 0.5 ? RING_GREEN : RING_ORANGE;
}

function launch(f, dx) {
  // Launch high enough to reach roughly the top third of the screen.
  const targetHeight = f.y - H * (0.1 + Math.random() * 0.2);
  f.vy = -Math.sqrt(2 * gravity * Math.max(targetHeight, H * 0.3));
  // Hitting off-centre pushes it sideways a bit.
  f.vx = -dx * 4 + (Math.random() - 0.5) * 160;
  f.spin = (Math.random() - 0.5) * 6;
  f.squash = 1;
}

if (new URLSearchParams(location.search).has('debug')) {
  window.__game = { get faces() { return faces; }, get score() { return score; }, get lives() { return lives; }, get state() { return state; }, get shards() { return shards; }, pause, resume, step: (dt) => { if (state === 'playing') update(dt); draw(); } };
}

function pause() {
  if (state !== 'playing') return;
  state = 'paused';
  pausedScreen.hidden = false;
  pauseBtn.textContent = '▶';
  pauseBtn.setAttribute('aria-label', 'Hervat');
  $('resumeBtn').focus();
}
function resume() {
  if (state !== 'paused') return;
  state = 'playing';
  pausedScreen.hidden = true;
  pauseBtn.textContent = '❚❚';
  pauseBtn.setAttribute('aria-label', 'Pauzeer');
  last = performance.now(); // don't jump forward after the pause
}
function quit() {
  resume();
  state = 'menu';
  faces = []; pops = []; shards = [];
  pauseBtn.disabled = true;
  startScreen.hidden = false;
}
pauseBtn.addEventListener('click', () => (state === 'paused' ? resume() : pause()));
$('resumeBtn').addEventListener('click', resume);
$('quitBtn').addEventListener('click', quit);
window.addEventListener('keydown', (e) => {
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') state === 'paused' ? resume() : pause();
});
// Auto-pause when the tab or window loses focus.
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('blur', pause);

$('startBtn').addEventListener('click', startGame);
$('againBtn').addEventListener('click', startGame);

// ---- Loop -----------------------------------------------------------------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state === 'playing') update(dt);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

function update(dt) {
  elapsed += dt;
  gravity = Math.min(GRAVITY_MAX, GRAVITY_START + elapsed * GRAVITY_RAMP);

  if (elapsed >= nextFaceAt && faces.length < MAX_FACES) {
    faces.push(spawnFace());
    nextFaceAt = elapsed + NEW_FACE_EVERY;
  }

  for (const f of faces) {
    if (f.waiting > 0) {
      f.waiting -= dt;
      if (f.waiting <= 0) spawnFace(f);
      continue;
    }
    f.vy += gravity * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.angle += f.spin * dt;
    f.squash = Math.max(0, f.squash - dt * 5);

    if (f.x < R) { f.x = R; f.vx = Math.abs(f.vx); }
    if (f.x > W - R) { f.x = W - R; f.vx = -Math.abs(f.vx); }
    if (f.y < TOP + R && f.vy < 0) { f.y = TOP + R; f.vy = 0; } // don't fly off the top

    if (f.y - R > H) {
      lives--;
      updateHud();
      pops.push({ x: f.x, y: H - 30, text: '−♥', color: '#a61e29', t: 0 });
      f.waiting = RESPAWN_DELAY;
      if (lives <= 0) { endGame(); return; }
    }
  }

  for (const p of pops) p.t += dt;
  pops = pops.filter((p) => p.t < 0.8);
  for (const sh of shards) {
    sh.t += dt;
    sh.vy += gravity * 0.6 * dt;
    sh.x += sh.vx * dt;
    sh.y += sh.vy * dt;
  }
  shards = shards.filter((sh) => sh.t < 0.7);
}

// ---- Drawing --------------------------------------------------------------
function draw() {
  ctx.clearRect(0, 0, W, H);
  drawBackground();
  // ground line
  ctx.fillStyle = '#a61e29';
  ctx.fillRect(0, H - 6, W, 6);

  for (const f of faces) if (f.waiting <= 0) drawFace(f);

  for (const sh of shards) {
    ctx.globalAlpha = 1 - sh.t / 0.7;
    ctx.fillStyle = sh.color;
    ctx.beginPath();
    ctx.arc(sh.x, sh.y, sh.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = 'center';
  for (const p of pops) {
    ctx.font = `700 ${p.big ? 44 : 32}px 'Barlow Semi Condensed', Arial, sans-serif`;
    ctx.globalAlpha = 1 - p.t / 0.8;
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y - p.t * 60);
  }
  ctx.globalAlpha = 1;
}

// Faint words of a poem drifting down in the background — the "Gravity" theme.
const WORDS = 'wat valt moet weer rijzen als jij maar snel genoeg bent zwaartekracht trekt elk woord naar het blad'.split(' ');
const drift = Array.from({ length: 28 }, () => ({
  x: Math.random(), y: Math.random(), w: WORDS[Math.floor(Math.random() * WORDS.length)],
  v: 0.01 + Math.random() * 0.02, size: 14 + Math.random() * 18,
}));
let lastBg = performance.now();
function drawBackground() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastBg) / 1000);
  lastBg = now;
  ctx.fillStyle = 'rgba(67,79,88,.09)';
  ctx.textAlign = 'center';
  for (const d of drift) {
    d.y += d.v * dt;
    if (d.y > 1.05) { d.y = -0.05; d.x = Math.random(); }
    ctx.font = `italic ${d.size}px 'Barlow Semi Condensed', Arial, sans-serif`;
    ctx.fillText(d.w, d.x * W, TOP + d.y * (H - TOP));
  }
}

function drawFace(f) {
  const t = f.teacher;
  const s = 1 + f.squash * 0.15;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(f.angle);
  ctx.scale(s, 2 - s);

  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.closePath();
  ctx.save();
  ctx.clip();
  if (t.img) {
    const { naturalWidth: iw, naturalHeight: ih } = t.img;
    const k = (2 * R) / Math.min(iw, ih);
    ctx.drawImage(t.img, -iw * k / 2, -ih * k / 2, iw * k, ih * k);
  } else {
    ctx.fillStyle = t.color;
    ctx.fillRect(-R, -R, 2 * R, 2 * R);
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${Math.round(R * 0.85)}px 'Barlow Semi Condensed', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.initials, 0, 2);
  }
  ctx.restore();

  ctx.lineWidth = 7;
  ctx.strokeStyle = ringColor(f);
  ctx.globalAlpha = f.vy > 0 ? 1 : 0.45; // faded while rising (can't be clicked then)
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
}

updateHud();
