"use strict";
/* Cubiq — çekirdek oyun mantığı (arayüzden ve çizimden bağımsız) */

/* Puanlama katsayıları (v4: tavlanmış his için yükseltildi)
   - yerleştirme: hücre başına perBlock
   - patlama: lineBase × L × (L+1) / 2 (1 çizgi 200, 2 çizgi 600, 3 çizgi 1200, 4 çizgi 2000)
   - seri çarpanı: 1 + streakStep × (seri−1) → seri 5'te ×3 */
const SCORE = { perBlock: 2, lineBase: 200, streakStep: 0.5 };

const TIME_MODE_MS = 120000; // Zamana Karşı: 2 dakika

/* Macera modu bölümleri — hedef tipleri: score | lines | streak | combo */
const LEVELS = [
  { name: "İlk Adım", goal: { type: "score", v: 300 } },
  { name: "Çizgi Ustası", goal: { type: "lines", v: 3 } },
  { name: "Bin Puan", goal: { type: "score", v: 1000 } },
  { name: "Alev Al", goal: { type: "streak", v: 2 } },
  { name: "Çift Vuruş", goal: { type: "combo", v: 2 } },
  { name: "Sekiz Çizgi", goal: { type: "lines", v: 8 } },
  { name: "Alev Ustası", goal: { type: "streak", v: 4 } },
  { name: "Üç Bin", goal: { type: "score", v: 3000 } },
  { name: "Üçlü Vuruş", goal: { type: "combo", v: 3 } },
  { name: "Final: 6000", goal: { type: "score", v: 6000 } },
];

/* seed'li RNG: Günlük Görev'de tüm oyuncular aynı gün aynı parça dizisini alır */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rng = Math.random;

const Game = {
  N: 8,
  grid: null,            // 8x8; hücre: null veya renk indeksi
  tray: [null, null, null],
  score: 0,
  best: 0,
  streak: 0,             // üst üste patlama serisi
  over: false,
  paused: false,
  reviveUsed: false,
  coinReviveUsed: false,
  hintUsed: false,
  completed: false,
  mode: "classic",       // "classic" | "time" | "daily" | "adventure"
  levelIdx: 0,           // yalnızca adventure modunda
  timeLeft: 0,           // yalnızca time modunda (ms)
  stats: null,           // oyun içi: { lines, maxCombo, bestStreak }

  init() {
    this.grid = Array.from({ length: this.N }, () => Array(this.N).fill(null));
    this.reset();
  },

  /* Mod başlatma: mod rekorunu yükler (eski tek-rekor anahtarını klasik'e taşır) */
  start(mode, levelIdx) {
    this.mode = mode === "time" ? "time" : mode === "daily" ? "daily" : mode === "adventure" ? "adventure" : "classic";
    if (this.mode === "daily") {
      const d = new Date();
      rng = mulberry32(d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate());
    } else {
      rng = Math.random;
    }
    if (this.mode === "adventure") {
      /* levelIdx verilmezse (yeniden başlat) mevcut bölüm korunur */
      this.levelIdx = Math.max(0, Math.min(LEVELS.length - 1,
        levelIdx != null ? Number(levelIdx) || 0 : this.levelIdx || 0));
    }
    const key = this.bestKey();
    let raw = DB.get(key, null);
    if (raw === null && this.mode === "classic") raw = DB.get("cubiq.best", null); // v2 tek rekor
    this.best = raw === null ? 0 : Number(raw) || 0;
    if (this.best > 0) DB.set(key, String(this.best));
    this.paused = false;
    this.timeLeft = this.mode === "time" ? TIME_MODE_MS : 0;
    this.reset();
  },

  bestKey() { return "cubiq.best." + this.mode; },

  /* Zamana Karşı sayacı; true dönerse süre bitti (arayüz oyunu bitirmeli) */
  advanceTime(dt) {
    if (this.mode !== "time" || this.paused || this.over) return false;
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    return this.timeLeft === 0;
  },

  reset() {
    for (let r = 0; r < this.N; r++) this.grid[r].fill(null);
    this.score = 0;
    this.streak = 0;
    this.over = false;
    this.paused = false;
    this.reviveUsed = false;
    this.coinReviveUsed = false;
    this.hintUsed = false;
    this.completed = false;
    this.stats = { lines: 0, maxCombo: 0, bestStreak: 0, moves: 0 };
    this.tray = [null, null, null];
    this.refill();
  },

  refill() {
    if (this.tray.every((p) => p === null)) {
      this.tray = [this.smartPiece(), this.smartPiece(), this.smartPiece()];
    }
  },

  /* ---------- akıllı parça dağıtımı ----------
     - tekli (1x1) olasılığı dolulukla artar: %50 boşta %10, neredeyse doluda %70
     - her parça %40 ihtimalle tahtadaki boşluklara uyan şekillerden seçilir
     - kalan durumlarda klasik ağırlıklı çekmece kullanılır
     - Günlük Görev'de rng() tohumlu olduğu için determinizm korunur */
  smartPiece() {
    const filled = this.grid.flat().filter((v) => v !== null).length;
    const f = filled / (this.N * this.N);
    const singleChance = f <= 0.5 ? 0.10 : Math.min(0.70, 0.10 + (f - 0.5) * 2.4);
    const roll = rng();
    if (roll < singleChance) {
      return { cells: [[0, 0]], color: (rng() * COLORS.length) | 0, w: 1, h: 1, id: Math.random().toString(36).slice(2, 9) };
    }
    if (roll < singleChance + 0.40) {
      const fit = this.findFittingPiece();
      if (fit) return fit;
    }
    return randomPiece();
  },

  findFittingPiece() {
    const empties = [];
    for (let r = 0; r < this.N; r++) {
      for (let c = 0; c < this.N; c++) {
        if (this.grid[r][c] === null) empties.push([r, c]);
      }
    }
    if (!empties.length) return null;
    for (let attempt = 0; attempt < 24; attempt++) {
      const shape = SHAPES[(rng() * SHAPES.length) | 0];
      const [er, ec] = empties[(rng() * empties.length) | 0];
      const [dr, dc] = shape.c[(rng() * shape.c.length) | 0];
      const r0 = er - dr, c0 = ec - dc;
      if (this.canPlaceRaw(shape.c, r0, c0)) {
        const maxR = Math.max(...shape.c.map((p) => p[0]));
        const maxC = Math.max(...shape.c.map((p) => p[1]));
        return {
          cells: shape.c.map(([a, b]) => [a, b]),
          color: (rng() * COLORS.length) | 0,
          w: maxC + 1, h: maxR + 1,
          id: Math.random().toString(36).slice(2, 9),
        };
      }
    }
    return null;
  },

  canPlaceRaw(cells, r, c) {
    for (const [dr, dc] of cells) {
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || rr >= this.N || cc < 0 || cc >= this.N || this.grid[rr][cc] !== null) return false;
    }
    return true;
  },

  canPlace(piece, r, c) {
    for (const [dr, dc] of piece.cells) {
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || rr >= this.N || cc < 0 || cc >= this.N || this.grid[rr][cc] !== null) return false;
    }
    return true;
  },

  anyPlacement(piece) {
    for (let r = 0; r <= this.N - piece.h; r++)
      for (let c = 0; c <= this.N - piece.w; c++)
        if (this.canPlace(piece, r, c)) return { r, c };
    return null;
  },

  fullLines() {
    const rows = [], cols = [];
    for (let r = 0; r < this.N; r++) if (this.grid[r].every((v) => v !== null)) rows.push(r);
    for (let c = 0; c < this.N; c++) {
      let full = true;
      for (let r = 0; r < this.N; r++) if (this.grid[r][c] === null) { full = false; break; }
      if (full) cols.push(c);
    }
    return { rows, cols };
  },

  /* Parça (r,c)'ye konursa hangi çizgiler dolar? (ızgarayı geçici olarak doldurur) */
  previewLines(piece, r, c) {
    for (const [dr, dc] of piece.cells) this.grid[r + dr][c + dc] = piece.color;
    const res = this.fullLines();
    for (const [dr, dc] of piece.cells) this.grid[r + dr][c + dc] = null;
    return res;
  },

  place(trayIdx, r, c) {
    const piece = this.tray[trayIdx];
    if (!piece || this.over || this.paused || !this.canPlace(piece, r, c)) return null;

    const placed = piece.cells.map(([dr, dc]) => [r + dr, c + dc]);
    for (const [rr, cc] of placed) this.grid[rr][cc] = piece.color;
    this.tray[trayIdx] = null;

    let gain = SCORE.perBlock * piece.cells.length;
    const { rows, cols } = this.fullLines();
    const lines = rows.length + cols.length;
    const cleared = [];

    if (lines > 0) {
      this.streak += 1;
      const mult = 1 + SCORE.streakStep * (this.streak - 1);
      gain += Math.round((SCORE.lineBase * lines * (lines + 1)) / 2 * mult);
      const seen = new Set();
      const push = (rr, cc) => {
        const k = rr * this.N + cc;
        if (!seen.has(k)) {
          seen.add(k);
          cleared.push({ r: rr, c: cc, color: this.grid[rr][cc] });
        }
      };
      for (const rr of rows) for (let cc = 0; cc < this.N; cc++) push(rr, cc);
      for (const cc of cols) for (let rr = 0; rr < this.N; rr++) push(rr, cc);
      for (const cell of cleared) this.grid[cell.r][cell.c] = null;
    } else {
      this.streak = 0;
    }

    /* TAM TEMİZLİK: tek hamlede tahtadaki bütün kareler temizlendi */
    const fullClear = lines > 0 && this.grid.every((row) => row.every((v) => v === null));
    if (fullClear) gain += 500;

    this.score += gain;
    /* Macera modunda rekor tutulmaz — hedef bazlı ilerleme var */
    if (this.mode !== "adventure" && this.score > this.best) {
      this.best = this.score;
      DB.set(this.bestKey(), String(this.best));
    }

    this.stats.lines += lines;
    this.stats.maxCombo = Math.max(this.stats.maxCombo, lines);
    this.stats.bestStreak = Math.max(this.stats.bestStreak, this.streak);
    this.stats.moves += 1;

    this.refill();

    if (!this.tray.some((p) => p && this.anyPlacement(p))) this.over = true;

    return { placed, cleared, lines, rows, cols, gain, streak: this.streak, over: this.over, fullClear };
  },
};
