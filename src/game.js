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

// ---- Setup ----------------------------------------------------------------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const $ = (id) => document.getElementById(id);
const hud = $('hud'), livesEl = $('lives'), scoreEl = $('score');
const startScreen = $('start'), overScreen = $('over');

let W = 0, H = 0, R = 40; // canvas size (css px) and face radius

function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  R = Math.max(32, Math.min(56, Math.min(W, H) * 0.08));
}
window.addEventListener('resize', resize);
resize();

// Preload teacher photos; fall back to initials if missing/broken.
const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f97316', '#14b8a6', '#ec4899', '#eab308'];
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
let state = 'menu'; // menu | playing | over
let faces = [];
let pops = [];      // little "+1" / "-1" effects
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
  return face;
}

function startGame() {
  score = 0; lives = LIVES; elapsed = 0; gravity = GRAVITY_START;
  faces = []; pops = []; deck = [];
  nextFaceAt = FIRST_SPAWN_DELAY;
  state = 'playing';
  startScreen.hidden = true;
  overScreen.hidden = true;
  hud.hidden = false;
  updateHud();
}

function endGame() {
  state = 'over';
  hud.hidden = true;
  $('finalScore').textContent = score;
  let best = 0;
  try {
    best = Number(localStorage.getItem('gravity-best') || 0);
    if (score > best) { best = score; localStorage.setItem('gravity-best', String(score)); }
  } catch { best = Math.max(best, score); }
  $('best').textContent = score >= best && score > 0 ? 'New personal best!' : `Personal best: ${best}`;
  overScreen.hidden = false;
}

function updateHud() {
  livesEl.textContent = '♥'.repeat(lives) + '♡'.repeat(LIVES - lives);
  scoreEl.textContent = score;
}

// ---- Input ----------------------------------------------------------------
canvas.addEventListener('pointerdown', (e) => {
  if (state !== 'playing') return;
  const px = e.clientX, py = e.clientY;
  // Topmost face first (last drawn).
  for (let i = faces.length - 1; i >= 0; i--) {
    const f = faces[i];
    if (f.waiting > 0) continue;
    const dx = px - f.x, dy = py - f.y;
    if (dx * dx + dy * dy > (R * HIT_SLOP) ** 2) continue;
    if (f.vy <= 0) return; // only counts while falling
    launch(f, dx);
    score++;
    updateHud();
    pops.push({ x: f.x, y: f.y - R, text: '+1', color: '#fbbf24', t: 0 });
    return;
  }
});

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
  window.__game = { get faces() { return faces; }, get score() { return score; }, get lives() { return lives; }, get state() { return state; }, step: (dt) => { if (state === 'playing') update(dt); draw(); } };
}

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
    if (f.y < R && f.vy < 0) { f.y = R; f.vy = 0; } // don't fly off the top

    if (f.y - R > H) {
      lives--;
      updateHud();
      pops.push({ x: f.x, y: H - 30, text: '−♥', color: '#ef4444', t: 0 });
      f.waiting = RESPAWN_DELAY;
      if (lives <= 0) { endGame(); return; }
    }
  }

  for (const p of pops) p.t += dt;
  pops = pops.filter((p) => p.t < 0.8);
}

// ---- Drawing --------------------------------------------------------------
function draw() {
  ctx.clearRect(0, 0, W, H);
  drawStars();
  // ground line
  ctx.fillStyle = 'rgba(239,68,68,.35)';
  ctx.fillRect(0, H - 4, W, 4);

  for (const f of faces) if (f.waiting <= 0) drawFace(f);

  ctx.textAlign = 'center';
  ctx.font = 'bold 28px Georgia, serif';
  for (const p of pops) {
    ctx.globalAlpha = 1 - p.t / 0.8;
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y - p.t * 60);
  }
  ctx.globalAlpha = 1;
}

const stars = Array.from({ length: 80 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.5 + 0.3 }));
function drawStars() {
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  for (const s of stars) {
    ctx.beginPath();
    ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
    ctx.fill();
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
    ctx.font = `bold ${Math.round(R * 0.8)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.initials, 0, 2);
  }
  ctx.restore();

  ctx.lineWidth = 4;
  ctx.strokeStyle = f.vy > 0 ? '#fbbf24' : 'rgba(255,255,255,.5)';
  ctx.stroke();
  ctx.restore();
}
