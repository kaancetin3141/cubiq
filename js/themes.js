"use strict";
/* Cubiq — tema sistemi: paletler, arka plan üçlüsü ve kilit koşulları.
   Bloklar genişletilmiş palet üzerinden çizilir; temalar yaşam boyu çizgi sayısıyla açılır. */

/* hex'i açıp koyult (amt: -1..1) */
function tintHex(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt >= 0) {
    r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt;
  } else {
    r *= 1 + amt; g *= 1 + amt; b *= 1 + amt;
  }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function makePalette(bases) {
  /* base de rgb'ye normalize edilir — tüm palet değerleri tek biçimde kalır */
  return bases.map((h) => ({ base: tintHex(h, 0), light: tintHex(h, 0.42), dark: tintHex(h, -0.32) }));
}

/* koyu temaların canvas katmanı ortak değerleri */
const DARK_CANVAS = {
  panelTop: "rgba(255,255,255,0.075)",
  panelBottom: "rgba(255,255,255,0.035)",
  panelStroke: "rgba(255,255,255,0.10)",
  inner: "rgba(0,0,0,0.16)",
  socketTop: "rgba(0,0,0,0.28)",
  socketBottom: "rgba(0,0,0,0.13)",
  socketHi: "rgba(255,255,255,0.035)",
  vignette: "rgba(0,0,0,0.26)",
};

const THEMES = [
  {
    id: "ocean", name: "Okyanus", unlockLines: 0, ui: "dark", canvas: DARK_CANVAS,
    bg: ["#2b2c63", "#1c1d42", "#12132b"],
    palette: makePalette(["#ff5a5f", "#ffa62b", "#ffd93d", "#6bcb77", "#4dd0e1", "#5b8def", "#b678f0"]),
  },
  {
    id: "sunset", name: "Gün Batımı", unlockLines: 100, ui: "dark", canvas: DARK_CANVAS,
    bg: ["#4d2b50", "#371d3f", "#1d1026"],
    palette: makePalette(["#ff4d6d", "#ff7b54", "#ffb26b", "#ffd93d", "#ff7bac", "#c06bd6", "#7f7cff"]),
  },
  {
    id: "forest", name: "Orman", unlockLines: 250, ui: "dark", canvas: DARK_CANVAS,
    bg: ["#1f3d2b", "#14291f", "#0b1712"],
    palette: makePalette(["#e76f51", "#f4a261", "#ffd166", "#8ac926", "#34a0a4", "#1e8898", "#6a4c93"]),
  },
  {
    id: "candy", name: "Şeker", unlockLines: 500, ui: "dark", canvas: DARK_CANVAS,
    bg: ["#3d2b63", "#2b1d4d", "#191030"],
    palette: makePalette(["#ff6392", "#ff9e6d", "#ffd166", "#7ee081", "#63d2ff", "#9b8cff", "#f286ff"]),
  },
  {
    id: "neon", name: "Neon", unlockLines: 1000, ui: "dark", canvas: DARK_CANVAS,
    bg: ["#101528", "#0b0e1c", "#05060f"],
    palette: makePalette(["#ff2e63", "#ff9f1c", "#eaf04a", "#21e6c1", "#3ac1ff", "#8a7bff", "#d269ff"]),
  },
  {
    id: "glass", name: "Cam", unlockLines: 0, ui: "light",
    bg: ["#dde6f6", "#e9eefb", "#f4f7fd"],
    palette: makePalette(["#e0455e", "#f2792b", "#d99e00", "#2fa84f", "#1a99b8", "#4a6fe3", "#8b46d6"]),
    canvas: {
      panelTop: "rgba(255,255,255,0.55)",
      panelBottom: "rgba(255,255,255,0.28)",
      panelStroke: "rgba(255,255,255,0.85)",
      inner: "rgba(90,110,180,0.12)",
      socketTop: "rgba(25,40,95,0.13)",
      socketBottom: "rgba(25,40,95,0.06)",
      socketHi: "rgba(255,255,255,0.75)",
      vignette: "rgba(120,140,200,0.10)",
    },
  },
];

/* aktif palet — renderer ve parça üretimi bunu okur; tema değişince main.js yeniden atar */
let COLORS = THEMES[0].palette;

function activeTheme() {
  const id = DB.get("cubiq.theme", "ocean");
  return THEMES.find((t) => t.id === id) || THEMES[0];
}
