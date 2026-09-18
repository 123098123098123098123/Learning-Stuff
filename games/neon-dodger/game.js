const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("start");

const state = {
  running: false,
  paused: false,
  score: 0,
  best: Number(localStorage.getItem("neon-dodger-best") || 0),
  speed: 2.4,
  spawnTimer: 0,
  lastTime: 0,
  player: { x: 0.5, y: 0.88, w: 0.065, h: 0.035, targetX: 0.5 },
  obstacles: [],
  particles: []
};

bestEl.textContent = state.best;

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();

function reset() {
  state.score = 0;
  state.speed = 2.4;
  state.spawnTimer = 0;
  state.obstacles = [];
  state.particles = [];
  state.player.x = 0.5;
  state.player.targetX = 0.5;
  scoreEl.textContent = "0";
}

function start() {
  reset();
  state.running = true;
  state.paused = false;
  overlay.classList.add("hidden");
  startBtn.textContent = "Restart";
}

function gameOver() {
  state.running = false;
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem("neon-dodger-best", state.best);
    bestEl.textContent = state.best;
  }
  overlay.querySelector("h1").textContent = "Game Over";
  overlay.querySelector("p:not(.eyebrow)").textContent =
    `You scored ${state.score}. Can you beat your best?`;
  startBtn.textContent = "Play Again";
  overlay.classList.remove("hidden");
}

function spawn() {
  const w = 0.045 + Math.random() * 0.065;
  state.obstacles.push({
    x: w / 2 + Math.random() * (1 - w),
    y: -0.06,
    w,
    h: 0.025 + Math.random() * 0.045,
    drift: (Math.random() - 0.5) * 0.15
  });
}

function burst(x, y) {
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * Math.PI * 2;
    state.particles.push({
      x, y, vx: Math.cos(a) * (0.002 + Math.random() * .004),
      vy: Math.sin(a) * (0.002 + Math.random() * .004),
      life: 1
    });
  }
}

function overlaps(a, b) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 &&
         Math.abs(a.y - b.y) < (a.h + b.h) / 2;
}

function update(dt) {
  if (!state.running || state.paused) return;

  const difficulty = Math.min(state.score / 800, 1);
  state.speed = 2.4 + difficulty * 2.2;

  state.player.x += (state.player.targetX - state.player.x) * Math.min(dt * 12, 1);
  state.player.x = Math.max(state.player.w / 2, Math.min(1 - state.player.w / 2, state.player.x));

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawn();
    state.spawnTimer = Math.max(.18, .62 - state.score / 2400);
  }

  for (const o of state.obstacles) {
    o.y += state.speed * dt * .12;
    o.x += o.drift * dt;
    if (o.x < o.w / 2 || o.x > 1 - o.w / 2) o.drift *= -1;
    if (overlaps(state.player, o)) {
      burst(state.player.x, state.player.y);
      gameOver();
      return;
    }
  }

  state.obstacles = state.obstacles.filter(o => {
    if (o.y > 1.08) {
      state.score++;
      scoreEl.textContent = state.score;
      return false;
    }
    return true;
  });

  for (const p of state.particles) {
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.life -= dt * 2.2;
  }
  state.particles = state.particles.filter(p => p.life > 0);
}

function draw() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = "rgba(161,161,170,.09)";
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // Subtle scanline
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "rgba(99,102,241,.10)");
  grad.addColorStop(1, "rgba(9,9,11,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const p = state.player;
  ctx.fillStyle = "#f4f4f5";
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#818cf8";
  ctx.fillRect((p.x - p.w/2)*w, (p.y - p.h/2)*h, p.w*w, p.h*h);
  ctx.shadowBlur = 0;

  for (const o of state.obstacles) {
    ctx.fillStyle = "#a1a1aa";
    ctx.shadowBlur = 14;
    ctx.shadowColor = "#71717a";
    ctx.fillRect((o.x-o.w/2)*w, (o.y-o.h/2)*h, o.w*w, o.h*h);
  }
  ctx.shadowBlur = 0;

  for (const p of state.particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = "#c7d2fe";
    ctx.fillRect(p.x*w, p.y*h, 3, 3);
  }
  ctx.globalAlpha = 1;

  if (state.paused && state.running) {
    ctx.fillStyle = "rgba(9,9,11,.5)";
    ctx.fillRect(0,0,w,h);
    ctx.fillStyle = "#f4f4f5";
    ctx.font = "700 24px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", w/2, h/2);
  }
}

function loop(time) {
  const dt = Math.min((time - state.lastTime) / 1000 || 0, .033);
  state.lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function setTarget(clientX) {
  const rect = canvas.getBoundingClientRect();
  state.player.targetX = (clientX - rect.left) / rect.width;
}
canvas.addEventListener("pointermove", e => setTarget(e.clientX));
canvas.addEventListener("pointerdown", e => {
  canvas.setPointerCapture(e.pointerId);
  setTarget(e.clientX);
});

const keys = new Set();
window.addEventListener("keydown", e => {
  if (["ArrowLeft", "ArrowRight", "a", "d", "A", "D", "Escape", " "].includes(e.key)) e.preventDefault();
  keys.add(e.key);
  if (e.key === "Escape" && state.running) state.paused = !state.paused;
  if ((e.key === " " || e.key === "Enter") && !state.running) start();
});
window.addEventListener("keyup", e => keys.delete(e.key));

setInterval(() => {
  if (!state.running || state.paused) return;
  if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) state.player.targetX -= .035;
  if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) state.player.targetX += .035;
}, 16);

startBtn.addEventListener("click", start);
