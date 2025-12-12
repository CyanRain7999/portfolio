// card-template-v6.js
// 打印用单卡渲染模板（v6）：60x92mm（含 3mm 出血），300dpi。
// - 规则三角形背景
// - 边框同色“色条”
// - 白底文本框
// - ATK/HP：仅数字（无图标）
// - meta 行：仅内容（无“类型：/卡包：”字样）
// - 只在“单位牌”显示 ATK/HP

(function () {
  "use strict";

  const DEFAULT_DPI = 300;

  const LV_STYLES = {
    lv1: { accent: [16, 95, 92, 1] },     // 深青绿
    lv2: { accent: [86, 74, 122, 1] },    // 暗淡紫
    lv3: { accent: [140, 118, 60, 1] },   // 暗淡金
    none: { accent: [110, 120, 140, 1] }
  };

  function mmToPx(mm, dpi) {
    return Math.round((mm * (dpi || DEFAULT_DPI)) / 25.4);
  }

  function rgba(arr, aOverride) {
    const a = typeof aOverride === "number" ? aOverride : (arr[3] ?? 1);
    return `rgba(${arr[0]}, ${arr[1]}, ${arr[2]}, ${a})`;
  }

  function roundedRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function strokeDashedRect(ctx, x, y, w, h, dash, gap, lineWidth) {
    ctx.save();
    ctx.lineWidth = lineWidth;

    ctx.setLineDash([dash, gap]);
    ctx.strokeRect(x, y, w, h);

    ctx.restore();
  }

  function pickLevel(card) {
    const tags = (card.tags || []).map(t => String(t || "").toLowerCase());
    if (tags.includes("lv1")) return "lv1";
    if (tags.includes("lv2")) return "lv2";
    if (tags.includes("lv3")) return "lv3";
    return "none";
  }

  function isUnitCard(card) {
    const type = String(card.type || "").toLowerCase();
    if (type.includes("单位")) return true;

    const tags = (card.tags || []).map(t => String(t || "").toLowerCase());
    if (tags.includes("单位") || tags.includes("核心单位") || tags.includes("雇佣单位")) return true;

    const stats = String(card.stats || "").trim();
    if (/^\s*\d+\s*\/\s*\d+\s*$/.test(stats)) return true;

    return false;
  }

  function parseStats(statsStr) {
    const s = String(statsStr || "").trim();
    const m = s.match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/);
    if (!m) return { atk: "", hp: "" };
    return { atk: m[1], hp: m[2] };
  }

  function sanitizeFileName(name) {
    return String(name || "")
      .replace(/[\\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
  }

  function drawTriangleBackground(ctx, x, y, w, h, accentRgb, seed) {
    // 规则三角形平铺（清楚但不抢内容）
    // seed：保证每张卡的细微变化可控
    let s = (seed >>> 0) || 1;
    const rand = () => {
      // xorshift32
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17; s >>>= 0;
      s ^= s << 5;  s >>>= 0;
      return (s >>> 0) / 4294967296;
    };

    const side = mmToPx(6, DEFAULT_DPI); // 基准用 300dpi（纹理与dpi弱相关，OK）
    const hh = Math.round(side * Math.sqrt(3) / 2);

    const base1 = [242, 246, 252];
    const base2 = [234, 240, 248];
    const base3 = [226, 232, 244];

    function mix(base, k) {
      // k: 0..1
      return [
        Math.round(base[0] * (1 - k) + accentRgb[0] * k),
        Math.round(base[1] * (1 - k) + accentRgb[1] * k),
        Math.round(base[2] * (1 - k) + accentRgb[2] * k)
      ];
    }

    const shade1 = mix(base1, 0.05);
    const shade2 = mix(base2, 0.05);
    const shade3 = mix(base3, 0.06);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    let row = 0;
    for (let yy = y - hh; yy < y + h + hh; yy += 2 * hh, row++) {
      let col = 0;
      for (let xx = x - side; xx < x + w + side; xx += side, col++) {
        const pick = (row + col) % 3;
        const up = [shade1, shade2, shade3][pick];
        const down = [shade2, shade3, shade1][pick];

        // 轻微抖动透明度，避免死板（但仍“规律”）
        const upA = 0.98 + (rand() - 0.5) * 0.04;
        const downA = 0.98 + (rand() - 0.5) * 0.04;

        // 上三角
        ctx.fillStyle = `rgba(${up[0]}, ${up[1]}, ${up[2]}, ${upA})`;
        ctx.beginPath();
        ctx.moveTo(xx, yy + hh);
        ctx.lineTo(xx + side / 2, yy);
        ctx.lineTo(xx + side, yy + hh);
        ctx.closePath();
        ctx.fill();

        // 下三角
        ctx.fillStyle = `rgba(${down[0]}, ${down[1]}, ${down[2]}, ${downA})`;
        ctx.beginPath();
        ctx.moveTo(xx, yy + hh);
        ctx.lineTo(xx + side / 2, yy + 2 * hh);
        ctx.lineTo(xx + side, yy + hh);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }

  function drawEdgeStripes(ctx, rect, accent, seed) {
    // 在边框上随机分布短色条（同色）
    let s = (seed >>> 0) || 7;
    const rand = () => {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17; s >>>= 0;
      s ^= s << 5;  s >>>= 0;
      return (s >>> 0) / 4294967296;
    };

    const [x0, y0, x1, y1] = rect;
    const thickness = mmToPx(0.35, DEFAULT_DPI); // 约 0.35mm
    const w = x1 - x0;
    const h = y1 - y0;

    function segments(lenPx) {
      const segs = [];
      let pos = 0;
      while (pos < lenPx) {
        pos += Math.round(mmToPx(2, DEFAULT_DPI) + rand() * mmToPx(4, DEFAULT_DPI));
        const segLen = Math.round(mmToPx(4, DEFAULT_DPI) + rand() * mmToPx(10, DEFAULT_DPI));
        if (pos + segLen > lenPx) break;
        segs.push([pos, segLen]);
        pos += segLen;
      }
      return segs;
    }

    ctx.save();
    ctx.fillStyle = rgba(accent);

    // top
    for (const [pos, segLen] of segments(w)) {
      ctx.fillRect(x0 + pos, y0, segLen, thickness);
    }
    // bottom
    for (const [pos, segLen] of segments(w)) {
      ctx.fillRect(x0 + pos, y1 - thickness, segLen, thickness);
    }
    // left
    for (const [pos, segLen] of segments(h)) {
      ctx.fillRect(x0, y0 + pos, thickness, segLen);
    }
    // right
    for (const [pos, segLen] of segments(h)) {
      ctx.fillRect(x1 - thickness, y0 + pos, thickness, segLen);
    }

    ctx.restore();
  }

  function drawWhitePanel(ctx, x, y, w, h, r, stroke) {
    ctx.save();
    roundedRect(ctx, x, y, w, h, r);
    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.fill();
    if (stroke) {
      ctx.lineWidth = stroke.width;
      ctx.strokeStyle = stroke.color;
      ctx.stroke();
    }
    ctx.restore();
  }

  function setText(ctx, fontPx, weight) {
    const w = weight || 600;
    // 统一字体：Noto Serif SC（在线字体加载后会生效；否则用系统 serif 兜底）
    ctx.font = `${w} ${fontPx}px "Noto Serif SC", "Noto Serif CJK SC", serif`;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "rgba(18,26,40,1)";
  }

  async function ensureFontsReady() {
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch {}
    }
  }

  async function renderCardToCanvas(canvas, card, pack, opts) {
    await ensureFontsReady();

    const dpi = (opts && opts.dpi) || DEFAULT_DPI;
    const W = mmToPx(60, dpi);
    const H = mmToPx(92, dpi);
    const bleed = mmToPx(3, dpi);
    const safe = mmToPx(5, dpi);

    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // background
    const lv = pickLevel(card);
    const style = LV_STYLES[lv] || LV_STYLES.none;
    const accent = style.accent;
    const accentRgb = [accent[0], accent[1], accent[2]];

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(245,248,252,1)";
    ctx.fillRect(0, 0, W, H);

    drawTriangleBackground(ctx, bleed, bleed, W - 2 * bleed, H - 2 * bleed, accentRgb, (opts && opts.seed) || 123);

    // frame
    const framePad = bleed + mmToPx(2, dpi);
    const frameRect = [framePad, framePad, W - framePad, H - framePad];
    ctx.save();
    ctx.lineWidth = mmToPx(0.6, dpi);
    ctx.strokeStyle = rgba(accent);
    ctx.strokeRect(frameRect[0], frameRect[1], frameRect[2] - frameRect[0], frameRect[3] - frameRect[1]);
    ctx.restore();

    // stripes
    drawEdgeStripes(ctx, frameRect, accent, ((opts && opts.seed) || 123) + 9);

    // guides
    if (!opts || opts.showGuides !== false) {
      // trim: neutral
      ctx.save();
      ctx.strokeStyle = "rgba(120,130,150,0.8)";
      ctx.lineWidth = mmToPx(0.25, dpi);
      ctx.setLineDash([mmToPx(1.4, dpi), mmToPx(1.0, dpi)]);
      ctx.strokeRect(bleed, bleed, W - 2 * bleed, H - 2 * bleed);
      ctx.restore();

      // safe: lv color
      ctx.save();
      ctx.strokeStyle = `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, 0.9)`;
      ctx.lineWidth = mmToPx(0.25, dpi);
      ctx.setLineDash([mmToPx(1.4, dpi), mmToPx(1.0, dpi)]);
      ctx.strokeRect(safe, safe, W - 2 * safe, H - 2 * safe);
      ctx.restore();
    }

    // layout inside safe
    const pad = mmToPx(2, dpi);
    const x0 = safe + pad;
    const y0 = safe + pad;
    const x1 = W - safe - pad;
    const y1 = H - safe - pad;

    const headerH = mmToPx(12, dpi);
    const metaH = mmToPx(7, dpi);
    const tagsH = mmToPx(8, dpi);

    const header = { x: x0, y: y0, w: x1 - x0, h: headerH };
    const meta = { x: x0, y: header.y + header.h + mmToPx(1.6, dpi), w: x1 - x0, h: metaH };
    const bodyTop = meta.y + meta.h + mmToPx(2, dpi);
    const bodyBottom = y1 - tagsH - mmToPx(2, dpi);
    const body = { x: x0, y: bodyTop, w: x1 - x0, h: bodyBottom - bodyTop };
    const tags = { x: x0, y: body.y + body.h + mmToPx(1.5, dpi), w: x1 - x0, h: (y1 - (body.y + body.h + mmToPx(1.5, dpi))) };

    const panelStroke = { width: mmToPx(0.25, dpi), color: "rgba(205,215,230,1)" };
    drawWhitePanel(ctx, header.x, header.y, header.w, header.h, mmToPx(3.2, dpi), panelStroke);
    drawWhitePanel(ctx, meta.x, meta.y, meta.w, meta.h, mmToPx(2.6, dpi), panelStroke);
    drawWhitePanel(ctx, body.x, body.y, body.w, body.h, mmToPx(3.2, dpi), panelStroke);
    drawWhitePanel(ctx, tags.x, tags.y, tags.w, tags.h, mmToPx(2.6, dpi), panelStroke);

    // title centered
    const name = String(card.name || "未命名卡牌");
    setText(ctx, mmToPx(4.2, dpi), 700);
    // fit title if too long
    let titleSize = mmToPx(4.2, dpi);
    while (titleSize > mmToPx(3.2, dpi)) {
      setText(ctx, titleSize, 700);
      const m = ctx.measureText(name);
      if (m.width <= header.w - mmToPx(8, dpi)) break;
      titleSize -= 2;
    }
    setText(ctx, titleSize, 700);
    const titleMetrics = ctx.measureText(name);
    ctx.fillText(name, header.x + (header.w - titleMetrics.width) / 2, header.y + mmToPx(6.8, dpi));

    // code bottom-right inside header
    const code = String(card.code || "");
    if (code) {
      setText(ctx, mmToPx(2.1, dpi), 500);
      ctx.fillStyle = "rgba(70,80,100,1)";
      const cm = ctx.measureText(code);
      ctx.fillText(code, header.x + header.w - mmToPx(2, dpi) - cm.width, header.y + header.h - mmToPx(2.1, dpi));
    }

    // meta row: left=type (no label), right=pack name (no label)
    const typeText = String(card.type || "").trim() || "类型未标注";
    const packText = String((pack && pack.name) || "").trim() || String(card.role || "").trim();

    setText(ctx, mmToPx(2.7, dpi), 500);
    ctx.fillStyle = "rgba(40,55,70,1)";
    ctx.fillText(typeText, meta.x + mmToPx(2, dpi), meta.y + mmToPx(4.7, dpi));

    if (packText) {
      const pm = ctx.measureText(packText);
      ctx.fillText(packText, meta.x + meta.w - mmToPx(2, dpi) - pm.width, meta.y + mmToPx(4.7, dpi));
    }

    // body text
    const text = String(card.text || "").trim();
    setText(ctx, mmToPx(2.6, dpi), 500);
    ctx.fillStyle = "rgba(25,35,50,1)";

    const bx = body.x + mmToPx(2.2, dpi);
    const by = body.y + mmToPx(2.0, dpi) + mmToPx(2.0, dpi);
    const maxW = body.w - mmToPx(4.4, dpi);

    // simple wrap
    const lines = [];
    const paragraphs = text ? text.split("\n") : ["（无描述）"];
    for (const para of paragraphs) {
      if (!para) { lines.push(""); continue; }
      const words = para.split("");
      let line = "";
      for (const ch of words) {
        const test = line + ch;
        if (ctx.measureText(test).width > maxW && line) {
          lines.push(line);
          line = ch;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
    }

    const lineH = mmToPx(3.6, dpi);
    const unit = isUnitCard(card);
    const reserve = unit ? mmToPx(12, dpi) : mmToPx(2, dpi);
    const bottomLimit = body.y + body.h - mmToPx(2, dpi) - reserve;

    let yy = by;
    for (const line of lines) {
      if (yy + lineH > bottomLimit) break;
      ctx.fillText(line, bx, yy);
      yy += lineH;
    }

    // stats badges (numbers only)
    if (unit) {
      const { atk, hp } = parseStats(card.stats || "");
      if (atk || hp) {
        const badgeH = mmToPx(9.0, dpi);
        const badgeW = mmToPx(14.0, dpi);
        const m = mmToPx(2.0, dpi);

        const atkRect = { x: body.x + m, y: body.y + body.h - m - badgeH, w: badgeW, h: badgeH };
        const hpRect = { x: body.x + body.w - m - badgeW, y: body.y + body.h - m - badgeH, w: badgeW, h: badgeH };

        // atk
        ctx.save();
        roundedRect(ctx, atkRect.x, atkRect.y, atkRect.w, atkRect.h, mmToPx(2.4, dpi));
        ctx.fillStyle = "rgba(255,238,238,1)";
        ctx.fill();
        ctx.lineWidth = mmToPx(0.25, dpi);
        ctx.strokeStyle = "rgba(190,92,92,1)";
        ctx.stroke();
        ctx.restore();

        // hp
        ctx.save();
        roundedRect(ctx, hpRect.x, hpRect.y, hpRect.w, hpRect.h, mmToPx(2.4, dpi));
        ctx.fillStyle = "rgba(236,252,238,1)";
        ctx.fill();
        ctx.lineWidth = mmToPx(0.25, dpi);
        ctx.strokeStyle = "rgba(76,145,92,1)";
        ctx.stroke();
        ctx.restore();

        // centered text
        setText(ctx, mmToPx(3.6, dpi), 700);
        // atk text
        ctx.fillStyle = "rgba(120,50,50,1)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(atk || ""), atkRect.x + atkRect.w / 2, atkRect.y + atkRect.h / 2);
        // hp text
        ctx.fillStyle = "rgba(40,90,55,1)";
        ctx.fillText(String(hp || ""), hpRect.x + hpRect.w / 2, hpRect.y + hpRect.h / 2);
        ctx.textAlign = "start";
        ctx.textBaseline = "alphabetic";
      }
    }

    // tags centered
    const tagStr = Array.isArray(card.tags) ? card.tags.join(" · ") : "";
    if (tagStr) {
      setText(ctx, mmToPx(2.4, dpi), 500);
      ctx.fillStyle = "rgba(55,70,90,1)";
      const tm = ctx.measureText(tagStr);
      ctx.fillText(tagStr, tags.x + (tags.w - tm.width) / 2, tags.y + mmToPx(5.4, dpi));
    }

    return { width: W, height: H, dpi };
  }

  async function renderCardToBlob(card, pack, opts) {
    const canvas = document.createElement("canvas");
    await renderCardToCanvas(canvas, card, pack, opts);
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("toBlob 失败"));
        resolve(blob);
      }, "image/png");
    });
  }

  window.CardTemplateV6 = {
    mmToPx,
    pickLevel,
    isUnitCard,
    renderCardToCanvas,
    renderCardToBlob,
    sanitizeFileName
  };
})();
