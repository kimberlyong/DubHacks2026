// A tiny side-scrolling runner in the spirit of Chrome's offline dino, starring
// Sprout. Plain canvas + requestAnimationFrame, no React inside: the component
// owns the UI (questions, hearts, buttons) and listens through callbacks.
export const WIDTH = 800;
export const HEIGHT = 240;

const GROUND = 196; // y of the ground line (Sprout's feet rest here)
const SPROUT_X = 70;
const SPROUT_W = 50;
const SPROUT_H = 55;
const GRAVITY = 1900;
const JUMP_VELOCITY = -660;
const START_SPEED = 280; // px per second
const MAX_SPEED = 620;
const PX_PER_METER = 40;
export const QUESTION_EVERY = 120; // meters between questions
export const MAX_LIVES = 3;

const LEAF_BACK = new Path2D("M46 22 Q38 6 50 2 Q52 16 46 22 Z");
const LEAF_FRONT = new Path2D("M54 22 Q64 8 52 2 Q48 16 54 22 Z");
const EAR_LEFT = new Path2D("M28 40 Q6 44 10 66 Q14 78 30 68 Z");

function drawSprout(ctx, c, x, feetY, { stride, airborne, alpha }) {
  const s = SPROUT_H / 110;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, feetY - 107 * s);
  ctx.scale(s, s);

  const ellipse = (cx, cy, rx, ry, fill, a = 1) => {
    ctx.globalAlpha = alpha * a;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;
  };

  // Paws swap as Sprout runs and tuck up while airborne.
  const lift = (phase) => (airborne ? -6 : Math.max(0, Math.sin(stride + phase)) * -9);
  ellipse(36, 102 + lift(0), 7, 5, c.accent);
  ellipse(64, 102 + lift(Math.PI), 7, 5, c.accent);

  ellipse(50, 92, 22, 14, c.accent);
  ctx.fillStyle = c.accent;
  ctx.fill(EAR_LEFT);
  ellipse(76, 34, 10, 10, c.accent);
  ellipse(50, 52, 32, 32, c.accent);
  ctx.fillStyle = c.action;
  ctx.fill(LEAF_BACK);
  ctx.fillStyle = c.accent;
  ctx.fill(LEAF_FRONT);
  ellipse(29, 58, 5.5, 5.5, c.text, 0.5);
  ellipse(71, 58, 5.5, 5.5, c.text, 0.5);
  ellipse(50, 62, 13, 9, "#ffffff", 0.92);
  ellipse(40, 48, 4, 5.5, "#1a1a1a");
  ellipse(60, 48, 4, 5.5, "#1a1a1a");
  ellipse(50, 60, 2.6, 2.6, "#1a1a1a");
  ctx.restore();
}

function drawObstacle(ctx, c, o) {
  ctx.fillStyle = o.kind === "rock" ? c.muted : c.action;
  if (o.kind === "rock") {
    ctx.beginPath();
    ctx.moveTo(o.x, GROUND);
    ctx.quadraticCurveTo(o.x + o.w * 0.1, GROUND - o.h, o.x + o.w * 0.5, GROUND - o.h);
    ctx.quadraticCurveTo(o.x + o.w * 0.95, GROUND - o.h, o.x + o.w, GROUND);
    ctx.closePath();
    ctx.fill();
  } else {
    // a little cluster of thorny sprigs
    const n = Math.max(2, Math.round(o.w / 14));
    const step = o.w / n;
    for (let i = 0; i < n; i++) {
      const h = o.h * (i % 2 === 0 ? 1 : 0.7);
      ctx.beginPath();
      ctx.moveTo(o.x + i * step, GROUND);
      ctx.lineTo(o.x + i * step + step / 2, GROUND - h);
      ctx.lineTo(o.x + (i + 1) * step, GROUND);
      ctx.closePath();
      ctx.fill();
    }
  }
}

export function createRunner(canvas, { getColors, onDistance, onQuestion, onLifeLost, onGameOver }) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = WIDTH * dpr;
  canvas.height = HEIGHT * dpr;

  let colors = getColors();
  let raf = 0;
  let last = 0;
  let s; // mutable game state, rebuilt by reset()

  function reset() {
    s = {
      phase: "ready", // ready | running | question | over
      y: GROUND,
      vy: 0,
      speed: START_SPEED,
      distance: 0, // meters
      nextQuestion: QUESTION_EVERY,
      lives: MAX_LIVES,
      invulnerable: 0,
      spawnIn: 1.2,
      obstacles: [],
      clouds: [
        { x: 150, y: 50, w: 60 },
        { x: 480, y: 80, w: 80 },
        { x: 720, y: 40, w: 50 },
      ],
      groundOffset: 0,
      stride: 0,
    };
    colors = getColors();
    onDistance(0);
    draw();
  }

  function jump() {
    if (s.phase === "ready") {
      s.phase = "running";
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    if (s.phase === "running" && s.y >= GROUND) s.vy = JUMP_VELOCITY;
  }

  function loseLife() {
    s.lives -= 1;
    onLifeLost(s.lives);
    if (s.lives <= 0) {
      s.phase = "over";
      onGameOver(Math.floor(s.distance));
      draw();
      return true;
    }
    return false;
  }

  // Called by the UI once the student has answered. A wrong answer costs a heart;
  // either way the screen is cleared so they don't resume into an obstacle.
  function resolveQuestion(correct) {
    if (s.phase !== "question") return;
    colors = getColors(); // the theme may have changed while the question was open
    s.nextQuestion += QUESTION_EVERY;
    s.obstacles = [];
    s.spawnIn = 1.2;
    s.invulnerable = 0.8;
    if (!correct && loseLife()) return;
    s.phase = "running";
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function update(dt) {
    s.speed = Math.min(MAX_SPEED, s.speed + dt * 6);
    const dx = s.speed * dt;
    s.distance += dx / PX_PER_METER;
    s.groundOffset = (s.groundOffset + dx) % 40;
    s.stride += dt * 16;
    s.invulnerable = Math.max(0, s.invulnerable - dt);

    s.vy += GRAVITY * dt;
    s.y = Math.min(GROUND, s.y + s.vy * dt);
    if (s.y >= GROUND) s.vy = 0;

    for (const cloud of s.clouds) {
      cloud.x -= dx * 0.25;
      if (cloud.x + cloud.w < 0) {
        cloud.x = WIDTH + Math.random() * 120;
        cloud.y = 30 + Math.random() * 70;
      }
    }

    for (const o of s.obstacles) o.x -= dx;
    s.obstacles = s.obstacles.filter((o) => o.x + o.w > -10);

    s.spawnIn -= dt;
    if (s.spawnIn <= 0) {
      const kind = Math.random() < 0.5 ? "rock" : "thorn";
      s.obstacles.push({
        kind,
        x: WIDTH + 10,
        w: kind === "rock" ? 30 + Math.random() * 30 : 28 + Math.floor(Math.random() * 3) * 14,
        h: kind === "rock" ? 28 + Math.random() * 18 : 32 + Math.random() * 20,
      });
      // Gap scales with speed so the same jump always clears it.
      s.spawnIn = 0.85 + Math.random() * 0.9;
    }

    if (s.invulnerable <= 0) {
      const left = SPROUT_X + 10;
      const right = SPROUT_X + SPROUT_W - 10;
      const top = s.y - SPROUT_H + 10;
      const bottom = s.y - 4;
      const hit = s.obstacles.find(
        (o) => o.x + 4 < right && o.x + o.w - 4 > left && GROUND - o.h + 4 < bottom && GROUND > top,
      );
      if (hit) {
        s.obstacles = s.obstacles.filter((o) => o !== hit);
        s.invulnerable = 1.4;
        if (loseLife()) return;
      }
    }

    onDistance(Math.floor(s.distance));

    if (s.distance >= s.nextQuestion) {
      s.phase = "question";
      draw();
      onQuestion();
    }
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = colors.border;
    for (const cloud of s.clouds) {
      ctx.beginPath();
      ctx.ellipse(cloud.x + cloud.w / 2, cloud.y, cloud.w / 2, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND + 1);
    ctx.lineTo(WIDTH, GROUND + 1);
    ctx.stroke();
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = -s.groundOffset; x < WIDTH; x += 40) {
      ctx.moveTo(x, GROUND + 10);
      ctx.lineTo(x + 12, GROUND + 10);
      ctx.moveTo(x + 22, GROUND + 18);
      ctx.lineTo(x + 28, GROUND + 18);
    }
    ctx.stroke();

    for (const o of s.obstacles) drawObstacle(ctx, colors, o);

    const flicker = s.invulnerable > 0 && Math.floor(s.invulnerable * 12) % 2 === 0;
    drawSprout(ctx, colors, SPROUT_X, s.y, {
      stride: s.stride,
      airborne: s.y < GROUND,
      alpha: flicker ? 0.35 : 1,
    });
  }

  function frame(now) {
    if (s.phase !== "running") return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    if (s.phase === "running") {
      draw();
      raf = requestAnimationFrame(frame);
    }
  }

  reset();

  return {
    jump,
    reset,
    resolveQuestion,
    refreshColors() {
      colors = getColors();
      draw();
    },
    destroy() {
      cancelAnimationFrame(raf);
      s.phase = "over";
    },
  };
}
