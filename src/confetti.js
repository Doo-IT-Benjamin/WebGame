// Confetti burst over the whole page.
const COLORS = ['#a61e29', '#ef4423', '#f28c18', '#2e9e4f', '#fbbf24', '#434f58', '#ffffff'];

let canvas = null, ctx = null, pieces = [], running = false, last = 0;

function setup() {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '50' });
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');
  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  window.addEventListener('resize', resize);
  resize();
}

/** Fire confetti. `amount` ~ 120 for a normal celebration, ~300 for a big one. */
export function confetti(amount = 120) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) amount = Math.min(amount, 30);
  setup();
  const W = innerWidth, H = innerHeight;
  for (let i = 0; i < amount; i++) {
    const fromLeft = i % 2 === 0;
    pieces.push({
      x: fromLeft ? -10 : W + 10,
      y: H * (0.55 + Math.random() * 0.3),
      vx: (fromLeft ? 1 : -1) * (250 + Math.random() * 550),
      vy: -(500 + Math.random() * 600),
      w: 6 + Math.random() * 6, h: 8 + Math.random() * 10,
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 14,
      wobble: Math.random() * Math.PI * 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      t: 0, life: 2.6 + Math.random() * 1.6,
    });
  }
  if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); }
}

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const p of pieces) {
    p.t += dt;
    p.vy += 900 * dt;              // gravity, of course
    p.vx *= 1 - 1.6 * dt;          // air drag
    p.vy = Math.min(p.vy, 260);    // flutter down slowly
    p.wobble += dt * 8;
    p.x += (p.vx + Math.sin(p.wobble) * 40) * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, (p.life - p.t) / 0.5));
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.scale(1, Math.cos(p.wobble));
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }
  pieces = pieces.filter((p) => p.t < p.life && p.y < innerHeight + 40);
  if (pieces.length) requestAnimationFrame(tick);
  else { running = false; ctx.clearRect(0, 0, canvas.width, canvas.height); }
}
