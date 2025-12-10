// particles.js
(() => {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return; // 防止奇怪情况

  const ctx = canvas.getContext("2d");

  const dpr = window.devicePixelRatio || 1;
  let particles = [];
  let width = window.innerWidth;
  let height = window.innerHeight;

  const MAX_PARTICLES_DESKTOP = 90;
  const MAX_PARTICLES_MOBILE = 40;

  class Particle {
    constructor(w, h) {
      this.reset(w, h, true);
    }

    reset(w, h, randomY = false) {
      this.x = Math.random() * w;
      this.y = randomY ? Math.random() * h : -10;

      this.baseRadius = 0.6 + Math.random() * 1.8;
      this.radius = this.baseRadius;

      this.speed = 0.15 + Math.random() * 0.4; // 往下飘
      this.dx = (Math.random() - 0.5) * 0.2;   // 横向轻微漂动

      // 冷一点的蓝青色调
      this.hue = 190 + Math.random() * 40;
      this.alpha = 0.25 + Math.random() * 0.35;
      this.twinkleOffset = Math.random() * Math.PI * 2;
    }

    update(dt, w, h, t, mouse) {
      this.x += this.dx * dt;
      this.y += this.speed * dt;

      // 轻微闪烁
      const twinkle = 0.3 * Math.sin(t * 0.002 + this.twinkleOffset);
      this.radius = this.baseRadius * (1 + twinkle * 0.3);

      // 简单的“被鼠标吸一点”效果
      if (mouse.active) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist2 = dx * dx + dy * dy;

        if (dist2 < 16000) {
          const force = 16000 / (dist2 + 2000); // 距离越近越受影响
          this.x += (dx / Math.sqrt(dist2 + 1)) * force * 0.01;
          this.y += (dy / Math.sqrt(dist2 + 1)) * force * 0.01;
        }
      }

      // 出界重生
      if (this.y - this.radius > h + 20) {
        this.reset(w, h, false);
      }
      if (this.x < -20) this.x = w + 20;
      if (this.x > w + 20) this.x = -20;
    }

    draw(ctx) {
      const r = this.radius * 3;

      const gradient = ctx.createRadialGradient(
        this.x,
        this.y,
        0,
        this.x,
        this.y,
        r
      );
      gradient.addColorStop(
        0,
        `hsla(${this.hue}, 100%, 75%, ${this.alpha})`
      );
      gradient.addColorStop(1, "rgba(15, 23, 42, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const targetCount =
      width < 768 ? MAX_PARTICLES_MOBILE : MAX_PARTICLES_DESKTOP;

    if (particles.length > targetCount) {
      particles.length = targetCount;
    } else {
      while (particles.length < targetCount) {
        particles.push(new Particle(width, height));
      }
    }
  }

  const mouse = {
    x: 0,
    y: 0,
    active: false,
  };

  window.addEventListener("pointermove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });

  window.addEventListener("pointerleave", () => {
    mouse.active = false;
  });

  window.addEventListener("resize", resize);

  let lastTime = 0;

  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = (timestamp - lastTime) * 0.06;
    lastTime = timestamp;

    ctx.clearRect(0, 0, width, height);

    for (const p of particles) {
      p.update(dt, width, height, timestamp, mouse);
      p.draw(ctx);
    }

    requestAnimationFrame(loop);
  }

  resize();
  requestAnimationFrame(loop);
})();
