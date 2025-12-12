// card-print.js
// 在线制卡（整包导出 ZIP）：读取 boardgame-data.js + data/cards-<id>.js
// 生成每张卡的 60x92mm（含出血）PNG，打包下载。

(function () {
  "use strict";

  const els = {
    packSelect: document.getElementById("pack-select"),
    dupToggle: document.getElementById("dup-toggle"),
    guideToggle: document.getElementById("guide-toggle"),
    dpiInput: document.getElementById("dpi-input"),
    btnGen: document.getElementById("btn-generate"),
    status: document.getElementById("status"),
    previewTitle: document.getElementById("preview-title"),
    previewCanvas: document.getElementById("preview-canvas"),
    progress: document.getElementById("progress"),
  };

  function logStatus(msg) {
    els.status.textContent = msg;
  }

  function setProgress(cur, total) {
    els.progress.textContent = total ? `${cur} / ${total}` : "";
  }

  function wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function loadPackCards(packId) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `data/cards-${encodeURIComponent(packId)}.js`;
      script.async = true;

      script.onload = () => {
        const cards = window.CARD_PACK_CARDS;
        if (Array.isArray(cards)) {
          // 用完可以清掉（避免污染）
          // delete window.CARD_PACK_CARDS;
          resolve(cards);
        } else {
          reject(new Error("CARD_PACK_CARDS 未定义或不是数组。"));
        }
      };

      script.onerror = () => reject(new Error(`无法加载 data/cards-${packId}.js`));

      document.head.appendChild(script);
    });
  }

  function getPacks() {
    if (!window.CARD_GAME || !Array.isArray(window.CARD_GAME.packs)) return [];
    return window.CARD_GAME.packs.filter((p) => p && p.status !== "placeholder");
  }

  function fillPackSelect() {
    const packs = getPacks();
    els.packSelect.innerHTML = "";
    for (const p of packs) {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.name}（${p.id}）`;
      els.packSelect.appendChild(opt);
    }
    if (!packs.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "未找到卡包（请检查 boardgame-data.js）";
      els.packSelect.appendChild(opt);
    }
  }

  function sanitize(name) {
    return window.CardTemplateV6.sanitizeFileName(name);
  }

  function expandByCount(cards, enableDup) {
    if (!enableDup) return cards.map((c) => ({ ...c, __dupIndex: 1, __dupTotal: 1 }));

    const out = [];
    for (const c of cards) {
      const raw = String(c.count || "").trim();
      let n = parseInt(raw, 10);
      if (!Number.isFinite(n) || n <= 0) n = 1;
      // 防炸：极端情况给个上限
      n = Math.min(n, 20);

      for (let i = 1; i <= n; i++) {
        out.push({ ...c, __dupIndex: i, __dupTotal: n });
      }
    }
    return out;
  }

  async function previewFirst(pack, cards) {
    if (!cards.length) {
      els.previewTitle.textContent = "（该卡包暂无单卡数据）";
      const ctx = els.previewCanvas.getContext("2d");
      ctx.clearRect(0, 0, els.previewCanvas.width, els.previewCanvas.height);
      return;
    }
    const c = cards[0];
    els.previewTitle.textContent = `预览：${c.name || "未命名"}（${pack.name}）`;
    await window.CardTemplateV6.renderCardToCanvas(els.previewCanvas, c, pack, {
      dpi: parseInt(els.dpiInput.value, 10) || 300,
      showGuides: els.guideToggle.checked,
      seed: 123
    });
  }

  async function generateZipForPack(packId) {
    const packs = getPacks();
    const pack = packs.find((p) => p.id === packId);
    if (!pack) throw new Error("未找到该卡包（boardgame-data.js 中没有这个 id）");

    logStatus("正在加载卡包单卡数据…");
    setProgress(0, 0);

    const cards = await loadPackCards(packId);
    if (!cards.length) throw new Error("该卡包的 CARD_PACK_CARDS 为空");

    await previewFirst(pack, cards);

    const dpi = parseInt(els.dpiInput.value, 10) || 300;
    const enableDup = els.dupToggle.checked;
    const showGuides = els.guideToggle.checked;

    const expanded = expandByCount(cards, enableDup);

    logStatus("正在渲染图片并打包 ZIP…");
    const zip = new JSZip();
    const folder = zip.folder(sanitize(pack.name || pack.id) || pack.id);

    const total = expanded.length;
    let done = 0;

    // 稍微让 UI 有喘息
    await wait(50);

    for (const card of expanded) {
      const seed = (done + 1) * 97; // 每张卡一个稳定变化
      const blob = await window.CardTemplateV6.renderCardToBlob(card, pack, { dpi, showGuides, seed });

      const code = sanitize(card.code || "");
      const nm = sanitize(card.name || "card");
      const idx = card.__dupTotal > 1 ? `_x${card.__dupTotal}_${String(card.__dupIndex).padStart(2, "0")}` : "";
      const fileName = `${code ? code + "_" : ""}${nm}${idx}.png`;

      folder.file(fileName, blob);

      done += 1;
      setProgress(done, total);

      // 每几张让事件循环喘一下，避免页面“假死”
      if (done % 6 === 0) await wait(0);
    }

    logStatus("正在生成 ZIP 文件…");
    const zipBlob = await zip.generateAsync({ type: "blob" });

    const zipName = `${sanitize(pack.name || pack.id) || pack.id}_cards_${dpi}dpi.zip`;
    saveAs(zipBlob, zipName);

    logStatus(`完成：已下载 ${zipName}`);
    setProgress(total, total);
  }

  async function onPackChange() {
    const packId = els.packSelect.value;
    const packs = getPacks();
    const pack = packs.find((p) => p.id === packId);
    if (!pack) return;

    try {
      logStatus("正在加载预览…");
      const cards = await loadPackCards(packId);
      await previewFirst(pack, cards);
      logStatus("就绪：可以点击“下载整包 ZIP”。");
      setProgress(0, 0);
    } catch (e) {
      console.error(e);
      logStatus(`预览失败：${e.message}`);
      setProgress(0, 0);
    }
  }

  async function init() {
    fillPackSelect();

    els.packSelect.addEventListener("change", onPackChange);
    els.btnGen.addEventListener("click", async () => {
      const packId = els.packSelect.value;
      if (!packId) return;
      els.btnGen.disabled = true;
      try {
        await generateZipForPack(packId);
      } catch (e) {
        console.error(e);
        logStatus(`失败：${e.message}`);
      } finally {
        els.btnGen.disabled = false;
      }
    });

    // 初始预览
    await onPackChange();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
