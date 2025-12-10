// portfolio-particles.js
// 月之森资料馆专用粒子：
// - 基于主站粒子参数（数量、排斥、速度）
// - 方向：自下而上缓慢飘动
// - 鼠标排斥 & 连线
// - 三点成面，面淡入淡出，颜色偏森林绿

(() => {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;

  let width = window.innerWidth;
  let height = window.innerHeight;

  // === 基础参数：尽量贴近主站的手感 ===
  const MAX_PARTICLES_DESKTOP = 80;
  const MAX_PARTICLES_MOBILE = 40;

  const LINK_DISTANCE = 140;
  const LINK_DISTANCE2 = LINK_DISTANCE * LINK_DISTANCE;

  const MOUSE_RADIUS = 220;
  const MOUSE_FORCE = 4.2;

  // 三角面淡入淡出
  const FACE_FADE_SPEED = 0.12; // 越大越快
  const FACE_ALPHA_MIN = 0.07;
  const FACE_ALPHA_MAX = 0.18;

  let particles = [];
  const faces = new Map(); // "i-j-k" -> { i,j,k,alpha,targetAlpha,baseAlpha,activeThisFrame }

  class Particle {
    constructor(w, h) {
      this.neighbors = [];
      this.reset(w, h, true);
    }

    reset(w, h, randomY = false) {
      this.x = Math.random() * w;
      // 方向：从下往上 —— 初始可以是全屏随机
      this.y = randomY ? Math.random() * h : h + 10;

      this.baseRadius = 0.7 + Math.random() * 1.8;
      this.radius = this.baseRadius;

      // 自下而上基础速度
      this.speed = 0.18 + Math.random() * 0.5;
      this.dx = (Math.random() - 0.5) * 0.25; // 轻微左右漂

      // 分站颜色：偏灰/偏绿，柔一点
      this.hue = 150 + Math.random() * 40; // 绿青段
      this.alpha = 0.3 + Math.random() * 0.35;
      this.twinkleOffset = Math.random() * Math.PI * 2;
    }

    update(dt, w, h, t, mouse) {
      this.x += this.dx * dt;
      // 向上运动
      this.y -= this.speed * dt;

      // 轻微闪烁
      const twinkle = 0.35 * Math.sin(t * 0.002 + this.twinkleOffset);
      this.radius = this.baseRadius * (1 + twinkle * 0.3);

      // 鼠标排斥 —— 基本逻辑和主站一致
      if (mouse.active) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist2 = dx * dx + dy * dy;
        const radius2 = MOUSE_RADIUS * MOUSE_RADIUS;

        if (dist2 < radius2) {
          const dist = Math.sqrt(dist2) || 0.001;
          const ratio = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
          const force = ratio * ratio * MOUSE_FORCE; // 越近力越大
          const nx = dx / dist;
          const ny = dy / dist;

          this.x += nx * force;
          this.y += ny * force;
        }
      }

      // 出界重生：飞到顶上就从底部再生
      if (this.y + this.radius < -20) {
        this.reset(w, h, false);
      }
      if (this.x < -20) this.x = w + 20;
      if (this.x > w + 20) this.x = -20;
    }

    draw(ctx) {
      // 发光小点：偏灰绿光晕
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
        `hsla(${this.hue}, 32%, 40%, ${this.alpha})`
      );
      gradient.addColorStop(1, "rgba(246, 245, 241, 0)");

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

    // 屏幕尺寸变化时，清空面，避免索引错乱
    faces.clear();
  }

  const mouse = {
    x: 0,
    y: 0,
    active: false,
  };

  // 用 window 监听指针，避免 canvas 被盖住导致收不到事件
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

  // === 构建连线 + 三角面 ===
  function buildNetwork() {
    const n = particles.length;

    // 清空邻接关系
    for (const p of particles) {
      p.neighbors.length = 0;
    }

    const links = [];

    // 标记所有已有面为“本帧未激活”
    faces.forEach((face) => {
      face.activeThisFrame = false;
    });

    // ① 计算连线 & 邻居
    for (let i = 0; i < n; i++) {
      const p1 = particles[i];
      for (let j = i + 1; j < n; j++) {
        const p2 = particles[j];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist2 = dx * dx + dy * dy;

        if (dist2 < LINK_DISTANCE2) {
          const t = 1 - dist2 / LINK_DISTANCE2; // 越近越大
          const alpha = 0.08 + 0.32 * t;

          links.push({ i, j, alpha });
          p1.neighbors.push(j);
          p2.neighbors.push(i);
        }
      }
    }

    // ② 基于邻接关系组成三角形面：三点互相都在连线范围内
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
              activeThisFrame: true,
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

      // 森林绿的轻薄色块
      ctx.fillStyle = `rgba(59, 122, 87, ${face.alpha})`;
      ctx.fill();
    });
  }

  function drawConnections(links) {
    for (const { i, j, alpha } of links) {
      if (alpha <= 0.02) continue;
      const p1 = particles[i];
      const p2 = particles[j];

      ctx.strokeStyle = `rgba(100, 116, 139, ${alpha})`;
      ctx.lineWidth = 0.7 * (0.4 + alpha); // 近一点稍微粗一点
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  }

  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = (timestamp - lastTime) * 0.06; // 保持和主站类似的时间缩放
    lastTime = timestamp;

    // 浅色背景
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, "rgba(246,245,241,0.98)");
    g.addColorStop(1, "rgba(232,238,232,0.98)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    // 更新粒子
    for (const p of particles) {
      p.update(dt, width, height, timestamp, mouse);
    }

    // 构建网络（邻接 + 面）
    const links = buildNetwork();

    // 先画面，再画线，再画粒子，让粒子浮在最上层
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
