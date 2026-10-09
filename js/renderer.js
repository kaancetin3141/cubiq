"use strict";
/* Cubiq — canvas düzeni, premium blok sprite'ları, atmosfer ve animasyonlar */

const Renderer = (() => {
  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  let dpr = 1;

  const L = { w: 0, h: 0, boardX: 0, boardY: 0, boardSize: 0, cell: 0, trayY: 0, trayH: 0, trayCell: 0, slots: [] };

  const anims = { place: [], clear: [], sweep: null, snap: [], floats: [], parts: [], rings: [], hint: null, shake: null };
  const PART_BUDGET = 240; // aynı andaki parçacık tavanı (perf)
  const placeScaleMap = new Map(); // her karede yeniden Map üretmemek için
  let drag = null;
  let bg = null;

  /* --- premium blok sprite önbelleği (3 çizim stili) --- */
  const MARGIN = 0.18; // sprite'ın gölge payı (blok boyutunun oranı)
  const sprites = new Map();
  let blockStyle = "candy"; // "candy" | "gem" | "neon"

  const easeOutBack = (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  /* candy blok: gölge + gradyan gövde + köşe ışıması + bevel + parlama + speküler nokta */
  function drawCandyBlock(c, x, y, s, color) {
    const rad = Math.max(3, s * 0.22);
    c.save();
    c.shadowColor = "rgba(0,0,0,0.38)";
    c.shadowBlur = s * 0.14;
    c.shadowOffsetY = s * 0.07;
    rr(c, x, y, s, s, rad);
    c.fillStyle = COLORS[color].base;
    c.fill();
    c.restore();

    const g = c.createLinearGradient(x, y, x, y + s);
    g.addColorStop(0, COLORS[color].light);
    g.addColorStop(0.45, COLORS[color].base);
    g.addColorStop(1, COLORS[color].dark);
    rr(c, x, y, s, s, rad);
    c.fillStyle = g;
    c.fill();

    /* sol üst köşeden yumuşak ışıma (hacim hissi) */
    const rg = c.createRadialGradient(x + s * 0.26, y + s * 0.22, s * 0.04, x + s * 0.26, y + s * 0.22, s * 0.8);
    rg.addColorStop(0, "rgba(255,255,255,0.32)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    rr(c, x, y, s, s, rad);
    c.fillStyle = rg;
    c.fill();

    rr(c, x + 1.5, y + 1.5, s - 3, s - 3, rad * 0.85);
    const bevel = c.createLinearGradient(x, y, x, y + s);
    bevel.addColorStop(0, "rgba(255,255,255,0.35)");
    bevel.addColorStop(0.35, "rgba(255,255,255,0.06)");
    bevel.addColorStop(0.75, "rgba(0,0,0,0.06)");
    bevel.addColorStop(1, "rgba(0,0,0,0.22)");
    c.strokeStyle = bevel;
    c.lineWidth = Math.max(1.5, s * 0.055);
    c.stroke();

    /* 4 kenarlı bevel: üst/sol aydınlık, alt/sağ gölgeli kenar şeritleri */
    c.save();
    rr(c, x, y, s, s, rad);
    c.clip();
    c.fillStyle = "rgba(255,255,255,0.26)";
    c.fillRect(x + rad * 0.6, y + 1, s - rad * 1.2, Math.max(1, s * 0.05));
    c.fillStyle = "rgba(0,0,0,0.20)";
    c.fillRect(x + rad * 0.6, y + s - 1 - Math.max(1, s * 0.06), s - rad * 1.2, Math.max(1, s * 0.06));
    c.fillStyle = "rgba(255,255,255,0.09)";
    c.fillRect(x + 1, y + rad * 0.6, Math.max(1, s * 0.04), s - rad * 1.2);
    c.fillStyle = "rgba(0,0,0,0.12)";
    c.fillRect(x + s - 1 - Math.max(1, s * 0.05), y + rad * 0.6, Math.max(1, s * 0.05), s - rad * 1.2);
    c.restore();

    rr(c, x + s * 0.14, y + s * 0.10, s * 0.55, s * 0.20, s * 0.10);
    c.fillStyle = "rgba(255,255,255,0.34)";
    c.fill();
    /* kavisli parıltı */
    c.strokeStyle = "rgba(255,255,255,0.20)";
    c.lineWidth = Math.max(1.2, s * 0.035);
    c.beginPath();
    c.arc(x + s * 0.38, y + s * 0.44, s * 0.26, Math.PI * 1.02, Math.PI * 1.5);
    c.stroke();
    rr(c, x + s * 0.20, y + s * 0.13, s * 0.10, s * 0.10, s * 0.05);
    c.fillStyle = "rgba(255,255,255,0.55)";
    c.fill();
  }

  function blockSprite(color, size) {
    const s = Math.round(size);
    const key = blockStyle + ":" + color + ":" + s;
    if (sprites.has(key)) return sprites.get(key);
    const side = Math.ceil(s * (1 + 2 * MARGIN));
    const cv = document.createElement("canvas");
    cv.width = cv.height = Math.max(1, Math.round(side * dpr));
    const c = cv.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBlockBody(c, s * MARGIN, s * MARGIN, s, color);
    sprites.set(key, cv);
    return cv;
  }

  /* rgb() ya da #hex dizgesine alfa ekler */
  function withAlpha(colStr, a) {
    const s = String(colStr);
    const m = s.match(/\d+/g);
    if (m && m.length >= 3) return `rgba(${m[0]},${m[1]},${m[2]},${a})`;
    const h = s.replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const n = parseInt(full, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  /* ---------- stil seçici + gem/neon stilleri ---------- */
  function drawBlockBody(c, x, y, s, color) {
    if (blockStyle === "gem") return drawGemBlock(c, x, y, s, color);
    if (blockStyle === "neon") return drawNeonBlock(c, x, y, s, color);
    return drawCandyBlock(c, x, y, s, color);
  }

  /* ---------- stil 2: elmas (keskin faset + iç kıvılcım) ---------- */
  function drawGemBlock(c, x, y, s, color) {
    const rad = Math.max(2, s * 0.10);
    const col = COLORS[color];
    c.save();
    c.shadowColor = "rgba(0,0,0,0.45)";
    c.shadowBlur = s * 0.16;
    c.shadowOffsetY = s * 0.08;
    rr(c, x, y, s, s, rad);
    c.fillStyle = col.dark;
    c.fill();
    c.restore();

    rr(c, x, y, s, s, rad);
    c.fillStyle = col.dark;
    c.fill();

    /* üst faset */
    c.save();
    rr(c, x, y, s, s, rad);
    c.clip();
    const fg = c.createLinearGradient(x, y, x + s * 0.2, y + s * 0.8);
    fg.addColorStop(0, col.light);
    fg.addColorStop(0.55, col.base);
    fg.addColorStop(1, col.dark);
    c.fillStyle = fg;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + s, y);
    c.lineTo(x + s * 0.55, y + s * 0.55);
    c.lineTo(x, y + s * 0.8);
    c.closePath();
    c.fill();
    /* alt gölge faseti */
    c.fillStyle = "rgba(0,0,0,0.25)";
    c.beginPath();
    c.moveTo(x + s, y + s * 0.25);
    c.lineTo(x + s, y + s);
    c.lineTo(x, y + s);
    c.lineTo(x + s * 0.55, y + s * 0.55);
    c.closePath();
    c.fill();
    c.restore();

    rr(c, x + 1, y + 1, s - 2, s - 2, rad);
    c.strokeStyle = "rgba(255,255,255,0.35)";
    c.lineWidth = Math.max(1, s * 0.04);
    c.stroke();

    /* iç kıvılcım */
    c.save();
    c.translate(x + s * 0.3, y + s * 0.3);
    c.fillStyle = "rgba(255,255,255,0.85)";
    c.beginPath();
    const k = s * 0.09;
    c.moveTo(0, -k * 2);
    c.lineTo(k * 0.6, 0);
    c.lineTo(0, k * 2);
    c.lineTo(-k * 0.6, 0);
    c.closePath();
    c.fill();
    c.restore();
  }

  /* ---------- stil 3: neon (koyu cam + parlayan çerçeve) ---------- */
  function drawNeonBlock(c, x, y, s, color) {
    const rad = Math.max(2, s * 0.12);
    const col = COLORS[color];
    rr(c, x, y, s, s, rad);
    c.fillStyle = "rgba(10,12,30,0.92)";
    c.fill();
    c.save();
    rr(c, x, y, s, s, rad);
    c.clip();
    const g = c.createRadialGradient(x + s / 2, y + s / 2, 0, x + s / 2, y + s / 2, s * 0.7);
    g.addColorStop(0, withAlpha(col.base, 0.38));
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(x, y, s, s);
    c.restore();
    c.save();
    c.shadowColor = col.base;
    c.shadowBlur = s * 0.28;
    rr(c, x + 2, y + 2, s - 4, s - 4, rad);
    c.strokeStyle = col.light;
    c.lineWidth = Math.max(1.5, s * 0.06);
    c.stroke();
    c.restore();
    rr(c, x + s * 0.22, y + s * 0.22, s * 0.56, s * 0.56, rad * 0.6);
    c.strokeStyle = withAlpha(col.light, 0.5);
    c.lineWidth = 1;
    c.stroke();
  }

  function drawBlock(c, x, y, size, color, alpha = 1, scale = 1) {
    const s = size * scale;
    if (s < 2) return;
    const spr = blockSprite(color, size);
    const inset = (size - s) / 2;
    c.globalAlpha = alpha;
    c.drawImage(spr, x + inset - size * MARGIN, y + inset - size * MARGIN, s * (1 + 2 * MARGIN), s * (1 + 2 * MARGIN));
    c.globalAlpha = 1;
  }

  function drawPiece(c, piece, cx, cy, cell, alpha) {
    const w = piece.w * cell, h = piece.h * cell;
    for (const [dr, dc] of piece.cells) {
      drawBlock(c, cx - w / 2 + dc * cell, cy - h / 2 + dr * cell, cell, piece.color, alpha);
    }
  }

  let menuMode = true; // ana menüde yalnızca atmosfer çizilir

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    /* iOS Safari: innerHeight araç çubuğu durumuna göre değişir; visualViewport
       şu an GERÇEKTEN görünen alanı verir. CSS boyutu da açıkça piksel olarak
       atanır ki buffer ile CSS boyutu hiçbir zaman ayrışmasın (dikey kayma/ezilme). */
    const vv = window.visualViewport;
    L.w = Math.max(1, Math.round(vv ? vv.width : window.innerWidth));
    L.h = Math.max(1, Math.round(vv ? vv.height : window.innerHeight));
    canvas.style.width = L.w + "px";
    canvas.style.height = L.h + "px";
    canvas.width = Math.max(1, Math.round(L.w * dpr));
    canvas.height = Math.max(1, Math.round(L.h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = Math.max(10, L.w * 0.02);
    const gap = 14;
    const trayH = Math.min(150, Math.max(84, L.h * 0.22));
    const hudEl = document.getElementById("hud");
    L.top = menuMode || !hudEl || hudEl.classList.contains("hidden") ? 0 : hudEl.offsetHeight;
    /* -36: tahta ile tepsi arasına ipucu şeridi için pay */
    L.boardSize = Math.max(150, Math.min(L.w - pad * 2, L.h - L.top - pad - trayH - gap - 36));
    L.cell = L.boardSize / 8;
    L.boardX = (L.w - L.boardSize) / 2;
    L.boardY = pad + L.top;
    L.trayH = trayH;
    L.trayY = L.boardY + L.boardSize + gap;
    L.trayCell = Math.max(10, Math.min(L.cell * 0.55, (trayH - 16) / 5, (L.w / 3 - 18) / 5));
    L.slots = [0, 1, 2].map((i) => ({ cx: (L.w / 3) * i + L.w / 6, cy: L.trayY + trayH / 2 }));

    sprites.clear();
    initAmbient();
    buildBg();
  }

  /* --- arka plan atmosferi: süzülen soluk bloklar + yıldız tozu --- */
  const ambient = [];
  const dust = [];
  const ambientSprites = new Map(); /* boyut kovası + renk anahtarlı mini sprite'lar */
  function initAmbient() {
    ambient.length = 0;
    const n = Math.min(18, Math.max(10, Math.round(L.w / 70)));
    for (let i = 0; i < n; i++) {
      ambient.push({
        x: Math.random() * L.w,
        y: Math.random() * L.h,
        s: 10 + Math.random() * 26,
        vy: 8 + Math.random() * 18,
        sway: 6 + Math.random() * 14,
        phase: Math.random() * Math.PI * 2,
        color: (Math.random() * COLORS.length) | 0,
        alpha: 0.03 + Math.random() * 0.04,
      });
    }
    dust.length = 0;
    const dn = Math.min(16, Math.max(8, Math.round((L.w * L.h) / 42000)));
    for (let i = 0; i < dn; i++) {
      dust.push({
        x: Math.random() * L.w,
        y: Math.random() * L.h,
        r: 0.8 + Math.random() * 1.5,
        sp: 0.5 + Math.random() * 1.1,
        ph: Math.random() * Math.PI * 2,
      });
    }
    ambientSprites.clear();
  }

  function ambientSprite(color, s) {
    const bucket = Math.max(6, Math.round(s / 4) * 4); /* 4px kovası: sprite sayısı sınırlı kalır */
    const key = color + ":" + bucket;
    let cv = ambientSprites.get(key);
    if (!cv) {
      const pad = 2;
      cv = document.createElement("canvas");
      cv.width = bucket + pad * 2;
      cv.height = bucket + pad * 2;
      const c2 = cv.getContext("2d");
      c2.fillStyle = COLORS[color].base;
      rr(c2, pad, pad, bucket, bucket, bucket * 0.3);
      c2.fill();
      ambientSprites.set(key, cv);
    }
    return cv;
  }

  function drawAmbient(now) {
    const t = now / 1000;
    /* yıldız tozu: sabit konum, sinüsle yanıp sönen minik noktalar */
    ctx.fillStyle = "#ffffff";
    for (const d of dust) {
      ctx.globalAlpha = 0.08 + 0.18 * (0.5 + 0.5 * Math.sin(t * d.sp + d.ph));
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    const span = L.h + 60;
    for (const a of ambient) {
      const y = (((a.y - a.vy * t) % span) + span) % span - 30;
      const x = a.x + Math.sin(t * 0.4 + a.phase) * a.sway;
      ctx.globalAlpha = a.alpha;
      ctx.drawImage(ambientSprite(a.color, a.s), x, y, a.s, a.s);
    }
    ctx.globalAlpha = 1;
  }

  function buildBg() {
    if (L.w <= 0 || L.cell <= 0) return; /* düzen henüz hesaplanmadı (resize sonrası yeniden kurulur) */
    bg = document.createElement("canvas");
    bg.width = Math.max(1, Math.round(L.w * dpr));
    bg.height = Math.max(1, Math.round(L.h * dpr));
    const b = bg.getContext("2d");
    b.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* derinlik: tema paletinden ışımalar + vinyet (statik olduğu için önbelleğe pişer) */
    const CV = activeTheme().canvas || {};
    const big = Math.max(L.w, L.h);
    const blobs = [
      { x: L.w * 0.16, y: L.h * 0.22, r: big * 0.32, c: withAlpha(COLORS[5].base, 0.10) },
      { x: L.w * 0.86, y: L.h * 0.62, r: big * 0.30, c: withAlpha(COLORS[6].base, 0.09) },
      { x: L.w * 0.52, y: L.h * 0.98, r: big * 0.28, c: withAlpha(COLORS[4].base, 0.08) },
      { x: L.w * 0.50, y: L.h * 0.06, r: big * 0.24, c: withAlpha(COLORS[2].base, 0.07) },
    ];
    for (const bl of blobs) {
      const rg = b.createRadialGradient(bl.x, bl.y, 0, bl.x, bl.y, bl.r);
      rg.addColorStop(0, bl.c);
      rg.addColorStop(1, "rgba(0,0,0,0)");
      b.fillStyle = rg;
      b.fillRect(0, 0, L.w, L.h);
    }
    const vg = b.createRadialGradient(L.w / 2, L.h / 2, Math.min(L.w, L.h) * 0.45, L.w / 2, L.h / 2, big * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, CV.vignette || "rgba(0,0,0,0.26)");
    b.fillStyle = vg;
    b.fillRect(0, 0, L.w, L.h);

    const px = L.boardX - 9, py = L.boardY - 9;
    const pw = L.boardSize + 18, ph = L.boardSize + 18;
    const prad = 20;

    /* yumuşak düş-gölgesi: tahta havada asılı gibi durur */
    b.save();
    b.shadowColor = CV.panelShadow || "rgba(0,0,0,0.42)";
    b.shadowBlur = 30;
    b.shadowOffsetY = 14;
    rr(b, px, py, pw, ph, prad);
    b.fillStyle = CV.panelBottom || "rgba(255,255,255,0.035)";
    b.fill();
    b.restore();

    rr(b, px, py, pw, ph, prad);
    const pg = b.createLinearGradient(0, py, 0, py + ph);
    pg.addColorStop(0, CV.panelTop || "rgba(255,255,255,0.075)");
    pg.addColorStop(1, CV.panelBottom || "rgba(255,255,255,0.035)");
    b.fillStyle = pg;
    b.fill();

    rr(b, px + 2, py + 2, pw - 4, ph - 4, prad - 2);
    b.strokeStyle = CV.panelStroke || "rgba(255,255,255,0.10)";
    b.lineWidth = 1.5;
    b.stroke();

    /* premium üst kenar ışığı: cam çerçeve hissi */
    b.save();
    rr(b, px + 3, py + 3, pw - 6, ph - 6, prad - 3);
    b.clip();
    b.fillStyle = "rgba(255,255,255,0.10)";
    b.fillRect(px + prad, py + 3, pw - prad * 2, Math.max(1, ph * 0.012));
    b.restore();

    b.save();
    rr(b, px, py, pw, ph, prad);
    b.clip();
    const sh = b.createLinearGradient(0, py + ph - L.cell * 0.9, 0, py + ph);
    sh.addColorStop(0, "rgba(0,0,0,0)");
    sh.addColorStop(1, CV.inner || "rgba(0,0,0,0.16)");
    b.fillStyle = sh;
    b.fillRect(px, py + ph - L.cell * 0.9, pw, L.cell * 0.9);
    b.restore();

    const inset = Math.max(2, L.cell * 0.06);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sx = L.boardX + c * L.cell + inset, sy = L.boardY + r * L.cell + inset, ss = L.cell - inset * 2;
        rr(b, sx, sy, ss, ss, Math.max(3, L.cell * 0.15));
        const sg = b.createLinearGradient(0, sy, 0, sy + ss);
        sg.addColorStop(0, CV.socketTop || "rgba(0,0,0,0.28)");
        sg.addColorStop(1, CV.socketBottom || "rgba(0,0,0,0.13)");
        b.fillStyle = sg;
        b.fill();
        b.fillStyle = CV.socketHi || "rgba(255,255,255,0.035)";
        b.fillRect(sx + ss * 0.2, sy + 1, ss * 0.6, Math.max(1, ss * 0.04));
      }
    }

    /* tepsi yuvaları: parçaların altında yumuşak "kuyu" (statik, bedava) */
    if (!menuMode && L.slots.length === 3) {
      const wellW = Math.min(L.w / 3 - 12, L.trayCell * 5 + 14);
      const wellH = L.trayH - 6;
      for (const s of L.slots) {
        const wx = s.cx - wellW / 2, wy = s.cy - wellH / 2;
        rr(b, wx, wy, wellW, wellH, 16);
        const wg = b.createLinearGradient(0, wy, 0, wy + wellH);
        wg.addColorStop(0, CV.socketTop || "rgba(0,0,0,0.24)");
        wg.addColorStop(1, CV.socketBottom || "rgba(0,0,0,0.10)");
        b.fillStyle = wg;
        b.fill();
        b.strokeStyle = "rgba(255,255,255,0.05)";
        b.lineWidth = 1;
        rr(b, wx + 1, wy + 1, wellW - 2, wellH - 2, 15);
        b.stroke();
      }
    }
  }

  /* --- parçacıklar --- */
  function spawnClearParts(cells, now) {
    for (const cell of cells) {
      const cxp = L.boardX + (cell.c + 0.5) * L.cell;
      const cyp = L.boardY + (cell.r + 0.5) * L.cell;
      const n = 2 + ((Math.random() * 2) | 0);
      for (let i = 0; i < n && anims.parts.length < PART_BUDGET; i++) {
        anims.parts.push({
          x: cxp + (Math.random() - 0.5) * L.cell * 0.6,
          y: cyp + (Math.random() - 0.5) * L.cell * 0.6,
          vx: (Math.random() - 0.5) * 190,
          vy: -(50 + Math.random() * 190),
          g: 600,
          s: 4 + Math.random() * 6,
          hex: Math.random() < 0.4 ? "#ffffff" : COLORS[cell.color].light,
          kind: "spark",
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 6,
          t0: now + Math.random() * 90,
          life: 500 + Math.random() * 400,
        });
      }
    }
  }

  /* patlayan bloklar fiziksel kırıklara ayrılır */
  function spawnShatter(cells, now) {
    for (const cell of cells) {
      const cxp = L.boardX + (cell.c + 0.5) * L.cell;
      const cyp = L.boardY + (cell.r + 0.5) * L.cell;
      const n = 2 + ((Math.random() * 2) | 0);
      for (let i = 0; i < n && anims.parts.length < PART_BUDGET; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 130 + Math.random() * 230;
        anims.parts.push({
          x: cxp + (Math.random() - 0.5) * L.cell * 0.4,
          y: cyp + (Math.random() - 0.5) * L.cell * 0.4,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 130,
          g: 980,
          s: L.cell * (0.2 + Math.random() * 0.16),
          hex: COLORS[cell.color].base,
          kind: "shard",
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 12,
          t0: now + Math.random() * 60,
          life: 520 + Math.random() * 320,
        });
      }
    }
  }

  /* yerleştirmede hücre diplerinden ufak toz */
  function spawnDust(placed, now) {
    for (const [r, c] of placed) {
      if (anims.parts.length >= PART_BUDGET) break;
      anims.parts.push({
        x: L.boardX + (c + 0.5) * L.cell + (Math.random() - 0.5) * L.cell * 0.5,
        y: L.boardY + (r + 0.9) * L.cell,
        vx: (Math.random() - 0.5) * 60,
        vy: -(15 + Math.random() * 45),
        g: 160,
        s: 2 + Math.random() * 3,
        hex: "rgba(255,255,255,0.75)",
        kind: "dust",
        rot: 0,
        vr: 0,
        t0: now + Math.random() * 50,
        life: 260 + Math.random() * 180,
      });
    }
  }

  function spawnFlames(now) {
    if (Game.streak < 2 || anims.parts.length >= PART_BUDGET) return;
    const flameColors = ["#ffd93d", "#ff9f43", "#ff5a5f"];
    for (let i = 0; i < 3; i++) {
      const piece = Game.tray[i];
      if (!piece || (drag && drag.idx === i)) continue;
      if (Math.random() > 0.35) continue;
      const s = L.slots[i];
      const wpx = piece.w * L.trayCell, hpx = piece.h * L.trayCell;
      anims.parts.push({
        x: s.cx + (Math.random() - 0.5) * wpx,
        y: s.cy + hpx / 2 - Math.random() * hpx * 0.5,
        vx: (Math.random() - 0.5) * 22,
        vy: -(30 + Math.random() * 45),
        g: -60,
        s: 3 + Math.random() * 6,
        hex: flameColors[(Math.random() * 3) | 0],
        kind: "flame",
        rot: 0,
        vr: 0,
        t0: now,
        life: 450 + Math.random() * 300,
      });
    }
  }

  /* rekor kutlaması: kademeli konfeti yağmuru */
  function spawnConfetti(now) {
    for (let i = 0; i < 90 && anims.parts.length < PART_BUDGET + 60; i++) {
      anims.parts.push({
        x: Math.random() * L.w,
        y: -20 - Math.random() * L.h * 0.5,
        vx: (Math.random() - 0.5) * 40,
        vy: 70 + Math.random() * 130,
        g: 26,
        s: 4 + Math.random() * 5,
        hex: COLORS[(Math.random() * COLORS.length) | 0].light,
        kind: "confetti",
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 8,
        sway: Math.random() * Math.PI * 2,
        t0: now + Math.random() * 900,
        life: 2400 + Math.random() * 1400,
      });
    }
  }

  function drawParts(now) {
    /* yerinde sıkıştırma: kare başına yeni dizi tahsisi yok */
    let w = 0;
    for (let i = 0; i < anims.parts.length; i++) {
      const p = anims.parts[i];
      if (now - p.t0 < p.life) anims.parts[w++] = p;
    }
    anims.parts.length = w;
    for (const p of anims.parts) {
      if (now < p.t0) continue;
      const k = (now - p.t0) / p.life;
      const tt = k * (p.life / 1000);
      const x = p.x + p.vx * tt;
      const y = p.y + p.vy * tt + 0.5 * p.g * tt * tt;
      if (p.kind === "flame") {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = Math.max(0, (1 - k) * 0.5);
        ctx.fillStyle = p.hex;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.5, p.s * (1 - k * 0.5)), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }
      ctx.globalAlpha = Math.max(0, 1 - k);
      ctx.fillStyle = p.hex;
      if (p.kind === "spark") {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.rot + p.vr * tt);
        const s1 = p.s, s2 = p.s * 0.3;
        ctx.beginPath();
        ctx.moveTo(0, -s1); ctx.lineTo(s2, 0); ctx.lineTo(0, s1); ctx.lineTo(-s2, 0); ctx.closePath();
        ctx.moveTo(-s1, 0); ctx.lineTo(0, s2); ctx.lineTo(s1, 0); ctx.lineTo(0, -s2); ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (p.kind === "shard") {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.rot + p.vr * tt);
        const s = Math.max(1, p.s * (1 - k * 0.25));
        rr(ctx, -s / 2, -s / 2, s, s, s * 0.25);
        ctx.fill();
        ctx.globalAlpha = Math.max(0, (1 - k) * 0.5);
        rr(ctx, -s / 2 + s * 0.12, -s / 2 + s * 0.1, s * 0.5, s * 0.16, s * 0.08);
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fill();
        ctx.restore();
      } else if (p.kind === "dust") {
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.5, p.s * (1 - k * 0.6)), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "confetti") {
        ctx.save();
        ctx.translate(x + Math.sin(tt * 4 + p.sway) * 12, y);
        ctx.rotate(p.rot + p.vr * tt);
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.62);
        ctx.restore();
      } else {
        rr(ctx, x, y, p.s, p.s, p.s * 0.35);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  let frozen = false; // QA görüntü yakalama için çizim anahtarı

  function renderFrame(now) {
    ctx.clearRect(0, 0, L.w, L.h);
    drawAmbient(now);
    if (menuMode) return; // ana menü: yalnızca atmosfer

    let sx = 0, sy = 0;
    if (anims.shake) {
      const t = (now - anims.shake.t0) / 380;
      if (t >= 1) anims.shake = null;
      else if (t > 0) {
        const m = anims.shake.mag * (1 - t);
        sx = Math.sin(now / 22) * m;
        sy = Math.cos(now / 17) * m;
      }
    }

    ctx.save();
    ctx.translate(sx, sy);
    if (bg) ctx.drawImage(bg, 0, 0, L.w, L.h);

    /* seri aurası: tahta çerçevesi alev tonunda nabız verir */
    if (Game.streak >= 2) {
      const aura = 0.30 + 0.15 * Math.sin(now / 240);
      ctx.save();
      ctx.shadowColor = "rgba(255,150,60,0.85)";
      ctx.shadowBlur = 24;
      ctx.strokeStyle = `rgba(255,175,80,${aura.toFixed(3)})`;
      ctx.lineWidth = 3;
      rr(ctx, L.boardX - 9, L.boardY - 9, L.boardSize + 18, L.boardSize + 18, 20);
      ctx.stroke();
      ctx.restore();
    }

    // yerleşme animasyonu ölçekleri (Map her karede yeniden üretilmez)
    anims.place = anims.place.filter((a) => now - a.t0 < 220);
    const placeScale = placeScaleMap;
    placeScale.clear();
    for (const a of anims.place) {
      const s = Math.max(0, easeOutBack(Math.min(1, (now - a.t0) / 220)));
      for (const [r, c] of a.cells) placeScale.set(r * 8 + c, s);
    }

    // dolu hücreler
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const col = Game.grid[r][c];
        if (col === null) continue;
        drawBlock(ctx, L.boardX + c * L.cell, L.boardY + r * L.cell, L.cell, col, 1, placeScale.get(r * 8 + c) ?? 1);
      }
    }

    // ipucu: en iyi hamle hücrelerinde nabızlı çerçeve
    if (anims.hint) {
      const t = (now - anims.hint.t0) / anims.hint.dur;
      if (t >= 1) anims.hint = null;
      else {
        const a = 0.45 + 0.3 * Math.sin(now / 140);
        ctx.save();
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 14;
        ctx.strokeStyle = `rgba(255,255,255,${(a * (1 - t * 0.35)).toFixed(3)})`;
        ctx.lineWidth = 3;
        for (const [r, c] of anims.hint.cells) {
          rr(ctx, L.boardX + c * L.cell + 2, L.boardY + r * L.cell + 2, L.cell - 4, L.cell - 4, L.cell * 0.16);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // patlayan hücreler (mantıkta silindi, görsel olarak burada söner)
    anims.clear = anims.clear.filter((a) => now - a.t0 < 380);
    for (const a of anims.clear) {
      const t = Math.max(0, (now - a.t0) / 380);
      for (const cell of a.cells) {
        const x = L.boardX + cell.c * L.cell, y = L.boardY + cell.r * L.cell;
        if (t < 0.3) {
          ctx.globalAlpha = 0.85 * (1 - t / 0.3);
          rr(ctx, x + 1, y + 1, L.cell - 2, L.cell - 2, L.cell * 0.15);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.globalAlpha = 1;
          drawBlock(ctx, x, y, L.cell, cell.color);
        } else {
          const k = (t - 0.3) / 0.7;
          drawBlock(ctx, x, y, L.cell, cell.color, 1 - k, 1 - k * 0.9);
        }
      }
    }

    // beyaz süpürme çubuğu
    if (anims.sweep) {
      const t = (now - anims.sweep.t0) / 300;
      if (t >= 1) anims.sweep = null;
      else if (t > 0) {
        const barLen = L.boardSize * 0.55;
        const cxp = L.boardX + (t * 1.6 - 0.3) * L.boardSize;
        const cyp = L.boardY + (t * 1.6 - 0.3) * L.boardSize;
        ctx.globalAlpha = (1 - t) * 0.55;
        const gh = ctx.createLinearGradient(cxp - barLen / 2, 0, cxp + barLen / 2, 0);
        gh.addColorStop(0, "rgba(255,255,255,0)");
        gh.addColorStop(0.5, "rgba(255,255,255,0.9)");
        gh.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = gh;
        for (const r of anims.sweep.rows) ctx.fillRect(cxp - barLen / 2, L.boardY + r * L.cell + 2, barLen, L.cell - 4);
        const gv = ctx.createLinearGradient(0, cyp - barLen / 2, 0, cyp + barLen / 2);
        gv.addColorStop(0, "rgba(255,255,255,0)");
        gv.addColorStop(0.5, "rgba(255,255,255,0.9)");
        gv.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = gv;
        for (const c of anims.sweep.cols) ctx.fillRect(L.boardX + c * L.cell + 2, cyp - barLen / 2, L.cell - 4, barLen);
        ctx.globalAlpha = 1;
      }
    }

    // şok dalgası halkaları
    {
      let rw = 0;
      for (let i = 0; i < anims.rings.length; i++) {
        const ring = anims.rings[i];
        const t = (now - ring.t0) / ring.dur;
        if (t < 1) anims.rings[rw++] = ring;
        if (t <= 0 || t >= 1) continue;
        const rad = ring.r0 + (ring.r1 - ring.r0) * easeOut(t);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = (1 - t) * 0.55;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = Math.max(1, L.cell * 0.16 * (1 - t));
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, rad, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      anims.rings.length = rw;
    }

    // sürükleme hedefi önizlemesi (yumuşak ışıltıyla)
    if (drag && drag.target && drag.target.valid) {
      const { rows, cols } = drag.target.sim;
      ctx.globalAlpha = 0.22 + 0.14 * Math.sin(now / 120);
      ctx.fillStyle = "#ffffff";
      for (const r of rows) ctx.fillRect(L.boardX, L.boardY + r * L.cell, L.boardSize, L.cell);
      for (const c of cols) ctx.fillRect(L.boardX + c * L.cell, L.boardY, L.cell, L.boardSize);
      ctx.globalAlpha = 1;
      const t = drag.target;
      ctx.save();
      ctx.shadowColor = "rgba(255,255,255,0.35)";
      ctx.shadowBlur = L.cell * 0.22;
      for (const [dr, dc] of drag.piece.cells) {
        drawBlock(ctx, L.boardX + (t.c + dc) * L.cell, L.boardY + (t.r + dr) * L.cell, L.cell, drag.piece.color, 0.55);
      }
      ctx.restore();
    }

    // tepsi
    for (let i = 0; i < 3; i++) {
      const piece = Game.tray[i];
      if (!piece || (drag && drag.idx === i)) continue;
      drawPiece(ctx, piece, L.slots[i].cx, L.slots[i].cy, L.trayCell, 1);
    }
    spawnFlames(now);

    // tepsisine geri seken parçalar
    anims.snap = anims.snap.filter((a) => now - a.t0 < 170);
    for (const a of anims.snap) {
      const t = easeOut(Math.min(1, (now - a.t0) / 170));
      drawPiece(ctx, a.piece, a.fx + (a.tx - a.fx) * t, a.fy + (a.ty - a.fy) * t, L.trayCell, 1);
    }

    // sürüklenen parça (tam boy)
    if (drag) drawPiece(ctx, drag.piece, drag.px, drag.py - drag.lift, L.cell, 0.96);

    drawParts(now);

    // uçan yazılar
    anims.floats = anims.floats.filter((f) => now - f.t0 < 950);
    for (const f of anims.floats) {
      const t = (now - f.t0) / 950;
      const sc = 0.7 + 0.3 * easeOutBack(Math.min(1, t * 4));
      ctx.globalAlpha = t < 0.7 ? 1 : Math.max(0, (1 - t) / 0.3);
      ctx.font = `900 ${Math.round((f.big ? 30 : 20) * sc)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 5;
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(0,0,0,0.45)";
      const y = f.y - t * 46;
      ctx.strokeText(f.text, f.x, y);
      ctx.fillStyle = f.color || "#ffffff";
      ctx.fillText(f.text, f.x, y);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  /* --- boşta performans: hareket yoksa kareleri sektir (~20fps'e düşer) ---
     busy = sürükleme, herhangi bir animasyon (yerleşme/patlama/süpürme/halka/
     yazı/parçacık), ipucu, sarsıntı, seri aurası… hiçbiri yoksa ekran yalnızca
     yavaş süzülen atmosferden ibarettir; tam kalitede çizmeye gerek yok. */
  let idleSkip = 0;
  function isBusy() {
    if (frozen) return true; /* dondurma karelerinde tutarlılık */
    if (drag) return true;
    if (anims.shake || anims.hint || anims.sweep) return true;
    if (anims.place.length || anims.clear.length || anims.snap.length) return true;
    if (anims.floats.length || anims.parts.length || anims.rings.length) return true;
    if (!menuMode && !Game.over && Game.streak >= 2) return true; /* alevli seri aurası nabız verir */
    return false;
  }

  return {
    canvas, L, resize,
    draw(now) {
      if (frozen) return;
      if (!isBusy()) {
        idleSkip = (idleSkip + 1) % 3;
        if (idleSkip !== 0) return; /* bu kareyi çizme — bir sonraki kareye atla */
      } else {
        idleSkip = 0;
      }
      renderFrame(now);
    },
    setFrozen(v) { frozen = !!v; },
    getHint() { return anims.hint; },
    confetti() { spawnConfetti(performance.now()); },
    retheme() { sprites.clear(); ambientSprites.clear(); buildBg(); },
    setBlockStyle(id) { blockStyle = id; sprites.clear(); },
    previewBlock(canvasEl, color, styleId) {
      const prev = blockStyle;
      if (styleId) blockStyle = styleId;
      const c = canvasEl.getContext("2d");
      const d = Math.min(window.devicePixelRatio || 1, 2.5);
      const s = canvasEl.width / d;
      canvasEl.height = canvasEl.width;
      c.setTransform(d, 0, 0, d, 0, 0);
      c.clearRect(0, 0, s, s);
      drawBlockBody(c, s * MARGIN, s * MARGIN, s, color);
      blockStyle = prev;
    },
    showHint(cells) {
      anims.hint = { cells, t0: performance.now(), dur: 2600 };
    },
    setMenuMode(m) { menuMode = !!m; resize(); },
    setDrag(d) { drag = d; },
    getDrag() { return drag; },
    placeEffect(res) {
      const now = performance.now();
      anims.place.push({ cells: res.placed.map(([r, c]) => [r, c]), t0: now });
      spawnDust(res.placed, now);
      if (res.cleared.length) {
        anims.clear.push({ cells: res.cleared, t0: now + 40 });
        anims.sweep = { rows: res.rows, cols: res.cols, t0: now + 20 };
        if (res.lines >= 2) anims.shake = { t0: now + 40, mag: Math.min(11, 4 + res.lines * 2) };
        spawnClearParts(res.cleared, now);
        spawnShatter(res.cleared, now);
        const bc = { x: L.boardX + L.boardSize / 2, y: L.boardY + L.boardSize / 2 };
        anims.rings.push({ x: bc.x, y: bc.y, r0: L.cell * 0.5, r1: L.boardSize * 0.55, t0: now + 30, dur: 430 });
        if (res.lines >= 2) {
          anims.rings.push({ x: bc.x, y: bc.y, r0: L.cell * 0.3, r1: L.boardSize * 0.68, t0: now + 160, dur: 480 });
        }
      }
    },
    snapBack(idx, fx, fy) {
      const piece = Game.tray[idx];
      if (!piece) return;
      anims.snap.push({ piece, fx, fy, tx: L.slots[idx].cx, ty: L.slots[idx].cy, t0: performance.now() });
    },
    float(text, x, y, big, color) {
      anims.floats.push({ text, x, y, big: !!big, color, t0: performance.now() });
    },
    boardCenter() { return { x: L.boardX + L.boardSize / 2, y: L.boardY + L.boardSize / 2 }; },
    slotCenter(i) { return { cx: L.slots[i].cx, cy: L.slots[i].cy }; },
    clearFx() {
      anims.place.length = 0;
      anims.clear.length = 0;
      anims.snap.length = 0;
      anims.floats.length = 0;
      anims.parts.length = 0;
      anims.rings.length = 0;
      anims.sweep = null;
      anims.shake = null;
      anims.hint = null;
    },
  };
})();
