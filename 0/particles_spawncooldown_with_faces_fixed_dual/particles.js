// particles.js - 拖尾 + 连线 + 三角面 + 鼠标排斥版
(() => {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;

  let width = window.innerWidth;
  let height = window.innerHeight;

  // 粒子数量和交互参数
  const MAX_PARTICLES_DESKTOP = 80;
  const MAX_PARTICLES_MOBILE = 40;

  const LINK_DISTANCE = 140; // 两粒子之间多少像素内连线
  const LINK_DISTANCE2 = LINK_DISTANCE * LINK_DISTANCE;

  const MOUSE_RADIUS = 220; // 鼠标影响半径
  const MOUSE_FORCE = 4.2; // 鼠标排斥强度（越大越狠）

  // 三角面的淡入淡出参数（主站背景较暗，适当控制亮度）
  const FACE_FADE_SPEED = 0.14;
  const FACE_ALPHA_MIN = 0.06;
  const FACE_ALPHA_MAX = 0.16;

  

  // 粒子“重生冷却”：避免粒子从另一端重生时，连线/三角面横跨全屏
  const SPAWN_COOLDOWN = 18; // 约等于 ~18 帧（dt 是本脚本的时间缩放单位）
let particles = [];
  const faces = new Map(); // "i-j-k" -> { i,j,k,alpha,targetAlpha,baseAlpha,activeThisFrame }

  class Particle {
    constructor(w, h) {
      this.neighbors = [];
      this.reset(w, h, true);
    }

    reset(w, h, randomY = false) {
      this.x = Math.random() * w;
      this.y = randomY ? Math.random() * h : -10;

      this.baseRadius = 0.7 + Math.random() * 1.8;
      this.radius = this.baseRadius;

      this.speed = 0.18 + Math.random() * 0.5; // 向下飘的速度
      this.dx = (Math.random() - 0.5) * 0.25; // 横向轻微漂动

      // 冷一点的星星色调
      this.hue = 190 + Math.random() * 40;
      this.alpha = 0.3 + Math.random() * 0.35;
      this.twinkleOffset = Math.random() * Math.PI * 2;
    
      this.spawnCooldown = SPAWN_COOLDOWN;
    }

    update(dt, w, h, t, mouse) {
      if (this.spawnCooldown > 0) {
        this.spawnCooldown -= dt;
        if (this.spawnCooldown < 0) this.spawnCooldown = 0;
      }

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
          const ratio = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
          const force = ratio * ratio * MOUSE_FORCE; // 越近越大力
          const nx = dx / dist;
          const ny = dy / dist;

          this.x += nx * force;
          this.y += ny * force;
        }
      }

      // 出界重生（重生/穿屏后进入冷却，避免跨屏连线/大三角）
      if (this.y - this.radius > h + 20) {
        this.reset(w, h, false); // reset 内会设置 spawnCooldown
      }
      if (this.x < -20) {
        this.x = w + 20;
        this.spawnCooldown = SPAWN_COOLDOWN;
      }
      if (this.x > w + 20) {
        this.x = -20;
        this.spawnCooldown = SPAWN_COOLDOWN;
      }
    }

    draw(ctx) {
      const glowRadius = this.radius * 3.1;


      const appear = this.spawnCooldown > 0 ? Math.max(0, 1 - this.spawnCooldown / SPAWN_COOLDOWN) : 1;
      const a = this.alpha * appear;
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
        `hsla(${this.hue}, 100%, 75%, ${a})`
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

    // 尺寸变了就清空面，避免索引错乱
    faces.clear();
  }

  const mouse = {
    x: 0,
    y: 0,
    active: false
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

  // 构建连线 + 三角面
  function buildNetwork() {
    const n = particles.length;

    // 清空邻接
    for (const p of particles) {
      p.neighbors.length = 0;
    }

    const links = [];

    // 先把所有面标记为“本帧未激活”
    faces.forEach((face) => {
      face.activeThisFrame = false;
    });

    // ① 计算连线和邻居
    for (let i = 0; i < n; i++) {
      const p1 = particles[i];
      if (p1.spawnCooldown > 0) continue;
      for (let j = i + 1; j < n; j++) {
        const p2 = particles[j];

        if (p2.spawnCooldown > 0) continue;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist2 = dx * dx + dy * dy;

        if (dist2 < LINK_DISTANCE2) {
          const t = 1 - dist2 / LINK_DISTANCE2;
          const alpha = 0.15 + 0.35 * t;

          links.push({ i, j, alpha });

          p1.neighbors.push(j);
          p2.neighbors.push(i);
        }
      }
    }

    // ② 从邻居关系中找三角形面（i-j-k 互相在 LINK_DISTANCE 内）
    for (let i = 0; i < n; i++) {
      const ni = particles[i].neighbors;
      const len = ni.length;
      if (len < 2) continue;

      for (let a = 0; a < len - 1; a++) {
        for (let b = a + 1; b < len; b++) {
          const j = ni[a];
          const k = ni[b];
          if (j === k) continue;

          const pj = particles[j];
          const pk = particles[k];

          const dx = pj.x - pk.x;
          const dy = pj.y - pk.y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 > LINK_DISTANCE2) continue;

          // 面的 key：排序过的索引组合，避免重复
          const indices = [i, j, k].sort((a, b) => a - b);
          const key = indices.join("-");

          let face = faces.get(key);
          if (!face) {
            face = {
              i: indices[0],
              j: indices[1],
              k: indices[2],
              alpha: 0,
              baseAlpha:
                FACE_ALPHA_MIN +
                Math.random() * (FACE_ALPHA_MAX - FACE_ALPHA_MIN),
              targetAlpha: 0,
              activeThisFrame: true
            };
            faces.set(key, face);
          } else {
            face.activeThisFrame = true;
          }
        }
      }
    }

    // ③ 面的淡入淡出
    faces.forEach((face, key) => {
      face.targetAlpha = face.activeThisFrame ? face.baseAlpha : 0;
      face.alpha +=
        (face.targetAlpha - face.alpha) * FACE_FADE_SPEED;

      if (!face.activeThisFrame && face.alpha < 0.01) {
        faces.delete(key);
      }
    });

    return links;
  }

  function drawFaces() {
    faces.forEach((face) => {
      if (face.alpha <= 0.01) return;

      const p1 = particles[face.i];
      const p2 = particles[face.j];
      const p3 = particles[face.k];

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();

      // 面的颜色：偏青蓝，在深色背景上有一点“选中”感
      ctx.fillStyle = `rgba(56, 189, 248, ${face.alpha})`;
      ctx.fill();
    });
  }

  // 画“星轨连线”
  function drawConnections(links) {
    for (const { i, j, alpha } of links) {
      if (alpha <= 0.02) continue;
      const p1 = particles[i];
      const p2 = particles[j];

      ctx.strokeStyle = `hsla(${(p1.hue + p2.hue) / 2}, 100%, 72%, ${alpha})`;
      ctx.lineWidth = 0.7 * (0.4 + alpha);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  }

  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = (timestamp - lastTime) * 0.06; // 统一控制所有速度
    lastTime = timestamp;

    // 拖尾效果：盖一层半透明深色遮罩
    ctx.fillStyle = "rgba(2, 6, 23, 0.18)";
    ctx.fillRect(0, 0, width, height);

    // 更新粒子位置
    for (const p of particles) {
      p.update(dt, width, height, timestamp, mouse);
    }

    // 构建连线 + 面
    const links = buildNetwork();

    // 先画面，再画线，再画星星
    drawFaces();
    drawConnections(links);

    for (const p of particles) {
      p.draw(ctx);
    }

    requestAnimationFrame(loop);
  }

  resize();
  requestAnimationFrame(loop);
})();
