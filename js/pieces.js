"use strict";
/* Cubiq — parça şekilleri ve ağırlıklı rastgele çekmece
   (renk paleti temalardan gelir: js/themes.js → COLORS) */

/*
 * Şekil aileleri taban birim tanımlanır, döndürülerek tüm yönleri üretilir
 * ve tekrarlar ayıklanır (örn. kare ve artı döndürmede değişmez).
 * w = çekmecede seçilme ağırlığı; büyük w = daha sık çıkar.
 */
const SHAPES = (() => {
  const norm = (cells) => {
    const minR = Math.min(...cells.map((c) => c[0]));
    const minC = Math.min(...cells.map((c) => c[1]));
    return cells.map(([r, c]) => [r - minR, c - minC]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  };
  const rotate = (cells) => {
    const maxR = Math.max(...cells.map((c) => c[0]));
    return norm(cells.map(([r, c]) => [c, maxR - r]));
  };
  const key = (cells) => cells.map((c) => c.join(",")).join(";");

  const families = [
    { base: [[0, 0]], w: 2 },                                              // tek blok
    { base: [[0, 0], [0, 1]], w: 5 },                                      // 1x2
    { base: [[0, 0], [0, 1], [0, 2]], w: 5 },                              // 1x3
    { base: [[0, 0], [0, 1], [0, 2], [0, 3]], w: 3 },                      // 1x4
    { base: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], w: 1 },              // 1x5
    { base: [[0, 0], [0, 1], [1, 0], [1, 1]], w: 5 },                      // 2x2
    { base: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]], w: 2 },      // 2x3
    { base: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], w: 1 }, // 3x3
    { base: [[0, 0], [1, 0], [1, 1]], w: 4 },                              // küçük köşe
    { base: [[0, 0], [1, 0], [2, 0], [2, 1]], w: 2 },                      // L
    { base: [[0, 1], [1, 1], [2, 1], [2, 0]], w: 2 },                      // J
    { base: [[0, 0], [0, 1], [0, 2], [1, 1]], w: 2 },                      // T
    { base: [[0, 1], [0, 2], [1, 0], [1, 1]], w: 1 },                      // S
    { base: [[0, 0], [0, 1], [1, 1], [1, 2]], w: 1 },                      // Z
    { base: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]], w: 1 },              // artı
  ];

  const out = [];
  for (const f of families) {
    const seen = new Set();
    let cells = norm(f.base);
    for (let i = 0; i < 4; i++) {
      const k = key(cells);
      if (!seen.has(k)) {
        seen.add(k);
        out.push({ c: cells.map(([r, c]) => [r, c]), w: f.w });
      }
      cells = rotate(cells);
    }
  }
  return out;
})();

function randomPiece() {
  const total = SHAPES.reduce((s, x) => s + x.w, 0);
  let r = rng() * total;
  let pick = SHAPES[0];
  for (const s of SHAPES) {
    r -= s.w;
    if (r <= 0) { pick = s; break; }
  }
  const color = (rng() * COLORS.length) | 0;
  let h = 0, w = 0;
  for (const [rr, cc] of pick.c) {
    h = Math.max(h, rr + 1);
    w = Math.max(w, cc + 1);
  }
  return { cells: pick.c.map(([a, b]) => [a, b]), color, w, h, id: Math.random().toString(36).slice(2, 9) };
}
