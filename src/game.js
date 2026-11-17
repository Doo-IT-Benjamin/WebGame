// Placeholder game loop — replace with the real game.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let running = false;
let t = 0;

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#38bdf8';
  ctx.font = '20px system-ui';
  ctx.textAlign = 'center';
  const msg = running ? 'Game running…' : 'Coming soon';
  ctx.fillText(msg, canvas.width / 2, canvas.height / 2 + Math.sin(t / 20) * 10);
}

function loop() {
  t++;
  draw();
  requestAnimationFrame(loop);
}

canvas.addEventListener('pointerdown', () => { running = true; });
loop();
