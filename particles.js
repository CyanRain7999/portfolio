// particles.js - 拖尾 + 连线 + 更强鼠标排斥版
(() => {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;

  let width = window.innerWidth;
  let height = window.innerHeight;

  // 粒子数量和交互参数（想调风格就改这里）
  const MAX_PARTICLES_DESKTOP = 80;
  const MAX_PARTICLES_MOBILE = 40;

  const LINK_DISTANCE = 140; // 两粒子之间多少像素内连线
  const LINK_DISTANCE2 = LINK_DISTANCE * LINK_DISTANCE;

  const MOUSE_RADIUS = 220; // 鼠标影响半径
  const MOUSE_FORCE = 4.2;  // 鼠标排斥强度（越大越狠）

  let particles = [];

  class Particle {
    constructor(w, h) {
      this.reset(w, h, true);
    }

    reset(w, h, randomY = false) {
      this.x = Math.random() * w;
      this.y = randomY ? Math.random() * h : -10;

      this.baseRadius = 0.7 + Math.random() * 1.8;
      this.radius = this.baseRadius;

      this.speed = 0.18 + Math.random() * 0.5; // 向下飘的速度
      this.dx = (Math.random() - 0.5) * 0.25;  // 横向轻微漂动

      // 冷一点的星星色调
      this.hue = 190 + Math.random() * 40;
      this.alpha = 0.3 + Math.random() * 0.35;
      this.twinkleOffset = Math.random() * Math.PI * 2;
    }

    update(dt, w, h, t, mouse) {
      this.x += this.dx * dt;
      this.y += this.speed * dt;

      // 轻微闪烁
      const twinkle = 0.35 * Math.sin(t * 0.002 + this.twinkleOffset);
      this.radius = this.baseRadius * (1 + twinkle * 0.3);

      // 鼠标排斥：在一定半径内，被甩开一点
      if (mouse.active) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist2 = dx * dx + dy * dy;
        const radius2 = MOUSE_RADIUS * MOUSE_RADIUS;

        if (dist2 < radius2) {
          const dist = Math.sqrt(dist2) || 0.001;
          const force = (1 - dist / MOUSE_RADIUS) * MOUSE_FORCE; // 越近越大力
          const nx = dx / dist;
          const ny = dy / dist;

          this.x += nx * force;
          this.y += ny * force;
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
      // 发光小星星（带辉光）
      const glowRadius = this.radius * 3.1;

      const gradient = ctx.createRadialGradient(
        this.x,
        this.y,
        0,
        this.x,
        this.y,
        glowRadius
      );
      gradient.addColorStop(
        0,
        `hsla(${this.hue}, 100%, 75%, ${this.alpha})`
      );
      gradient.addColorStop(1, "rgba(15, 23, 42, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
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

    // 让我们用 CSS 像素坐标画就行
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

  // 画“星轨连线”
  function drawConnections() {
    const n = particles.length;

    for (let i = 0; i < n; i++) {
      const p1 = particles[i];
      for (let j = i + 1; j < n; j++) {
        const p2 = particles[j];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist2 = dx * dx + dy * dy;

        if (dist2 < LINK_DISTANCE2) {
          const t = 1 - dist2 / LINK_DISTANCE2; // 越近 t 越接近 1
          const alpha = 0.15 + 0.35 * t;

          ctx.strokeStyle = `hsla(${(p1.hue + p2.hue) / 2}, 100%, 72%, ${alpha})`;
          ctx.lineWidth = 0.7 * t;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }
  }

  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = (timestamp - lastTime) * 0.06; // 统一控制所有速度
    lastTime = timestamp;

    // 拖尾效果：不要把画布清得太干净，盖一层半透明遮罩
    ctx.fillStyle = "rgba(2, 6, 23, 0.18)";
    ctx.fillRect(0, 0, width, height);

    // 更新粒子位置
    for (const p of particles) {
      p.update(dt, width, height, timestamp, mouse);
    }

    // 先画星轨连线，再画星星，这样星星在上层更亮
    drawConnections();

    for (const p of particles) {
      p.draw(ctx);
    }

    requestAnimationFrame(loop);
  }

  resize();
  requestAnimationFrame(loop);
})();
