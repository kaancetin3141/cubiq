"use strict";
/* Cubiq — ekran yönetimi, girdi, ses, haptik, zamanlayıcı ve başlatma */

const Sfx = (() => {
  let ac = null;
  let muted = DB.get("cubiq.mute", "0") === "1";

  function ctx() {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
    return ac;
  }

  function tone(freq, delay, dur, type, vol) {
    const a = ctx();
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.value = freq;
    const t0 = a.currentTime + delay;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g);
    g.connect(a.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  return {
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      store.set("cubiq.mute", muted ? "1" : "0");
      return muted;
    },
    pickup() { if (!muted) tone(330, 0, 0.045, "sine", 0.07); },
    place() { if (!muted) { tone(196, 0, 0.07, "triangle", 0.13); tone(262, 0.03, 0.06, "triangle", 0.08); } },
    invalid() { if (!muted) { tone(150, 0, 0.07, "square", 0.05); tone(110, 0.06, 0.09, "square", 0.05); } },
    tick() { if (!muted) tone(880, 0, 0.05, "square", 0.06); },
    clear(lines) {
      if (!muted) {
        const notes = [523, 659, 784, 988, 1175, 1319];
        for (let i = 0; i < Math.min(lines + 1, 6); i++) tone(notes[i], i * 0.07, 0.12, "square", 0.08);
        if (lines >= 2) tone(notes[Math.min(lines, 5)] * 2, lines * 0.07 + 0.05, 0.16, "triangle", 0.07);
        /* hafif yankı */
        tone(notes[Math.min(lines, 5)], lines * 0.07 + 0.26, 0.16, "triangle", 0.035);
      }
    },
    over() { if (!muted) [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.16, 0.18, "sawtooth", 0.07)); },
    best() { if (!muted) [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.14, "triangle", 0.11)); },
  };
})();

/* Jeneratif arka plan müziği v2 — canlı: akor pedi + bas pluck + desenli arpej + tık (ayrı anahtar) */
const Music = (() => {
  let ac = null;
  let timer = 0;
  let step = 0;
  let on = DB.get("cubiq.music", "1") === "1";
  const BAR_S = 2.6; // bar süresi (s) — v1'den daha tempolu
  const chords = [
    [220.0, 261.63, 329.63], // Am
    [174.61, 220.0, 261.63], // F
    [130.81, 164.81, 196.0], // C
    [196.0, 246.94, 293.66], // G
    [220.0, 261.63, 329.63], // Am
    [146.83, 174.61, 220.0], // Dm
    [174.61, 220.0, 261.63], // F
    [196.0, 246.94, 293.66], // G
  ];

  function ctx() {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
    return ac;
  }

  function voice(type, freq, start, dur, vol, attack) {
    const a = ctx();
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(vol, start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g);
    g.connect(a.destination);
    o.start(start);
    o.stop(start + dur + 0.05);
  }

  function playBar(freqs, delay) {
    const a = ctx();
    const start = a.currentTime + delay;
    /* akor pedi (yumuşak) */
    freqs.forEach((f) => voice("sine", f / 2, start, BAR_S + 0.6, 0.024, 0.5));
    /* canlı bas: kök nota pluck'ları (üçüncüde beşlisi) */
    [0, 0.95, 1.9].forEach((t, i) => {
      voice("triangle", (freqs[0] / 2) * (i === 2 ? 1.5 : 1), start + t, 0.3, 0.05, 0.012);
    });
    /* desenli arpej — her barda dönüşümlü figür */
    const pattern = step % 2 === 0 ? [0, 1, 2, 1, 2, 0] : [2, 1, 0, 1, 2, 1];
    pattern.forEach((pi, i) => {
      voice("triangle", freqs[pi] * 2, start + i * (BAR_S / 6), 0.34, 0.026 + (i % 2) * 0.008, 0.02);
    });
    /* tık vurguları */
    [0.6, 1.8].forEach((t) => voice("square", 1568, start + t, 0.04, 0.012, 0.005));
  }

  function loop() {
    if (!on) return;
    playBar(chords[step % chords.length], 0.06);
    step++;
    timer = setTimeout(loop, BAR_S * 1000);
  }

  function start() {
    if (!on || timer) return;
    ctx();
    loop();
  }
  function stop() {
    clearTimeout(timer);
    timer = 0;
  }
  return {
    get on() { return on; },
    set on(v) {
      on = !!v;
      DB.set("cubiq.music", on ? "1" : "0");
      if (on) start(); else stop();
    },
    kick: start,
  };
})();

(() => {
  const menuEl = document.getElementById("screen-menu");
  const hudEl = document.getElementById("hud");
  const scoreEl = document.getElementById("score");
  const fillEl = document.getElementById("scorefill");
  const crownEl = document.getElementById("crown");
  const multEl = document.getElementById("mult");
  const ovLife = document.getElementById("ovLife");
  const lifeStats = document.getElementById("lifeStats");
  const ovClose = document.getElementById("ovClose");
  const reviveBtn = document.getElementById("revive");
  const coinReviveBtn = document.getElementById("coinRevive");
  const ovSpark = document.getElementById("ovSpark");
  let lastCoinsEarned = 0;
  const timerWrap = document.getElementById("timerWrap");
  const timerEl = document.getElementById("timer");
  const pauseEl = document.getElementById("pauseOverlay");
  const overlay = document.getElementById("overlay");
  const ovTitle = document.getElementById("ovTitle");
  const ovScore = document.getElementById("ovScore");
  const ovBest = document.getElementById("ovBest");
  const ovNew = document.getElementById("ovNew");
  const ovStats = document.getElementById("ovStats");
  const muteBtn = document.getElementById("mute");
  const goalChip = document.getElementById("goalChip");
  const nextLevelBtn = document.getElementById("nextLevel");
  const hintEl = document.getElementById("hint");
  const canvas = Renderer.canvas;

  const settings = {
    get vib() { return DB.get("cubiq.vib", "1") === "1"; },
    set vib(v) { DB.set("cubiq.vib", v ? "1" : "0"); },
  };
  const vib = (pattern) => {
    try { if (settings.vib && navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* yoksa yok say */ }
  };

  /* ---------- rozet motoru ---------- */
  const BADGES = [
    { id: "first_line", icon: "💥", name: "İlk Patlama", desc: "İlk çizgiyi temizle", check: (s) => s.totalLines >= 1 },
    { id: "lines_25", icon: "🧱", name: "Isınma Turu", desc: "Toplam 25 çizgi", check: (s) => s.totalLines >= 25 },
    { id: "lines_100", icon: "🏗️", name: "Usta", desc: "Toplam 100 çizgi", check: (s) => s.totalLines >= 100 },
    { id: "lines_500", icon: "👑", name: "Efsane", desc: "Toplam 500 çizgi", check: (s) => s.totalLines >= 500 },
    { id: "streak_2", icon: "🔥", name: "Sıcak Eller", desc: "×1.5 seriye ulaş", check: (s, ev) => (ev.bestStreak || 0) >= 2 },
    { id: "streak_4", icon: "🌋", name: "Alev Ustası", desc: "×2.5 seriye ulaş", check: (s, ev) => (ev.bestStreak || 0) >= 4 },
    { id: "streak_6", icon: "☄️", name: "Ateş Yarıcısı", desc: "×3.5 seriye ulaş", check: (s, ev) => (ev.bestStreak || 0) >= 6 },
    { id: "score_1000", icon: "⭐", name: "Yıldız Avcısı", desc: "Tek oyunda 1000 puan", check: (s, ev) => (ev.gameScore || 0) >= 1000 },
    { id: "score_3000", icon: "🌟", name: "Süpernova", desc: "Tek oyunda 3000 puan", check: (s, ev) => (ev.gameScore || 0) >= 3000 },
    { id: "combo_3", icon: "💣", name: "Üçlü Vuruş", desc: "Tek hamlede 3 çizgi", check: (s, ev) => (ev.maxCombo || 0) >= 3 },
    { id: "combo_4", icon: "🌠", name: "Göktaşı", desc: "Tek hamlede 4+ çizgi", check: (s, ev) => (ev.maxCombo || 0) >= 4 },
    { id: "games_10", icon: "🎯", name: "Vazgeçmeyen", desc: "10 oyun tamamla", check: (s) => s.gamesPlayed >= 10 },
    { id: "pure_2000", icon: "🧠", name: "Saf Zeka", desc: "İpucu kullanmadan 2000 puan", check: (s, ev) => (ev.gameScore || 0) >= 2000 && !ev.hintUsed },
    { id: "daily_3", icon: "📅", name: "Alışkanlık", desc: "3 farklı günde günlük görev", check: (s, ev) => (ev.dailyDays || 0) >= 3 },
    { id: "total_10000", icon: "💎", name: "Koleksiyoner", desc: "Toplam 10.000 puan", check: (s) => s.totalScore >= 10000 },
    { id: "full_clear", icon: "🧹", name: "Masa Temiz", desc: "Tahtadaki bütün kareleri tek hamlede temizle", check: (s, ev) => !!ev.fullClear },
  ];

  function countDailyDays() {
    let n = 0;
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i).startsWith("cubiq.daily.")) n++;
    }
    return n;
  }

  function toast(msg) {
    const box = document.getElementById("toasts");
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => el.remove(), 3300);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function playerName() {
    return (DB.get("cubiq.name", "") || "").trim() || "Konuk";
  }

  /* ---------- günlük görev ---------- */
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function dailyKey() { return "cubiq.daily." + todayStr(); }
  function updateDailyUI() {
    const best = DB.get(dailyKey(), null);
    const st = document.getElementById("dailyStatus");
    st.textContent = best === null ? "Bugünün dizisi · henüz oynanmadı" : `Bugün tamamlandı · en iyi ${best}`;
  }

  /* ---------- XP / seviye ---------- */
  function levelFromXp(xp) {
    let L = 1;
    while (xp >= 100 * L * L) L++;
    return L;
  }

  /* ---------- coin ekonomisi ---------- */
  const REVIVE_COST = 30; // altınla ikinci devam jetonu
  function coins() { return Number(DB.get("cubiq.coins", 0)) || 0; }
  function updateCoins() {
    const el = document.getElementById("coinChip");
    if (el) el.textContent = "🪙 " + coins();
  }
  function updateLevelUI() {
    const xp = Number(DB.get("cubiq.xp", 0)) || 0;
    const L = levelFromXp(xp);
    const prev = 100 * (L - 1) * (L - 1);
    const next = 100 * L * L;
    document.getElementById("lvlChip").textContent = "SV " + L;
    document.getElementById("xpfill").style.width = Math.min(100, ((xp - prev) / (next - prev)) * 100) + "%";
    document.getElementById("lvltext").textContent = `${xp} / ${next} XP`;
  }

  /* ---------- son 10 oyun sparkline'ı ---------- */
  function buildSpark(hist) {
    if (hist.length < 2) return "";
    const w = 220, h = 36, pad = 3;
    const max = Math.max(...hist, 1);
    const stepX = (w - pad * 2) / (hist.length - 1);
    const pts = hist.map((v, i) => [(pad + i * stepX).toFixed(1), (h - pad - (v / max) * (h - pad * 2)).toFixed(1)]);
    const avg = Math.round(hist.reduce((a, b) => a + b, 0) / hist.length);
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">` +
      `<polyline points="${pts.map((p) => p.join(",")).join(" ")}" fill="none" stroke="#a3eff9" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` +
      pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="2" fill="#ffd93d"/>`).join("") +
      `</svg><div class="sparket">son ${hist.length} oyun · ortalama ${avg}</div>`;
  }

  /* ---------- yıldız derecelendirme: rekor kıyaslı 1-3 yıldız ---------- */
  function earnedStars() {
    if (Game.score <= 0) return 0;
    const r = Game.score / Math.max(Game.best, 1);
    if (r >= 0.999) return 3;
    if (r >= 0.6) return 2;
    return 1;
  }

  function syncMuteIcon() {
    muteBtn.querySelector(".ion").classList.toggle("hidden", Sfx.muted);
    muteBtn.querySelector(".ioff").classList.toggle("hidden", !Sfx.muted);
  }

  /* küresel liderlik: skor gönder, TOP 5'i panele bas (sunucu yoksa sessiz yerel mod) */
  async function renderLeaderboard(mode) {
    const el = document.getElementById("lbSection");
    if (Game.score <= 0) { el.innerHTML = ""; return; }
    el.innerHTML = `<div class="lboff">🌍 Skor gönderiliyor…</div>`;
    const res = await Api.submitScore({
      name: playerName(),
      score: Game.score,
      mode,
      lines: Game.stats ? Game.stats.lines : 0,
      streak: Game.stats ? Game.stats.bestStreak : 0,
    });
    if (!res || !res.ok) {
      el.innerHTML = `<div class="lboff">🌍 Çevrimdışı — skorun yerel olarak güvende</div>`;
      return;
    }
    const list = await Api.leaderboard(mode);
    if (!list) { el.innerHTML = `<div class="lboff">🌍 Liderlik tablosu alınamadı</div>`; return; }
    const rows = list.slice(0, 5).map((e, i) =>
      `<div class="lbrow${e.at === res.at ? " me" : ""}"><i>${i + 1}</i><b>${escapeHtml(e.name)}</b><span>${e.score}</span></div>`
    ).join("");
    el.innerHTML = `<div class="lbtitle">🌍 GLOBAL TOP 5 — sen #${res.rank}</div>${rows}`;
  }

  function checkBadges(ev) {
    const s = DB.getStats();
    const owned = DB.getJSON("cubiq.badges", []);
    const newly = [];
    for (const b of BADGES) {
      if (!owned.includes(b.id) && b.check(s, ev)) newly.push(b);
    }
    if (!newly.length) return;
    DB.setJSON("cubiq.badges", owned.concat(newly.map((b) => b.id)));
    newly.forEach((b) => toast(`${b.icon} Rozet açıldı: ${b.name}`));
    Sfx.best();
  }

  /* ---------- tema sistemi ---------- */
  function applyTheme(id) {
    DB.set("cubiq.theme", id);
    const t = activeTheme();
    COLORS = t.palette;
    const root = document.documentElement.style;
    root.setProperty("--bg1", t.bg[0]);
    root.setProperty("--bg2", t.bg[1]);
    root.setProperty("--bg3", t.bg[2]);
    /* açık/koyu arayüz değişkenleri (Cam teması: glassmorphism açık mod) */
    const light = t.ui === "light";
    const vars = {
      "--text": light ? "#232946" : "#eef0ff",
      "--text2": light ? "#5b6390" : "#a9afea",
      "--chip-bg": light ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.08)",
      "--chip-border": light ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.12)",
      "--surface": light ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.05)",
      "--surface-border": light ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.09)",
      "--panel-a": light ? "rgba(255,255,255,0.78)" : "#292b66",
      "--panel-b": light ? "rgba(238,244,255,0.60)" : "#1d1f47",
      "--panel-border": light ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.15)",
      "--hint-bg": light ? "rgba(255,255,255,0.7)" : "rgba(10,11,30,0.75)",
      "--toast-bg": light ? "rgba(255,255,255,0.85)" : "rgba(18,20,48,0.94)",
      "--brand1": light ? "#4a6fe3" : "#a3eff9",
      "--brand2": light ? "#7a5ae0" : "#9dbcf5",
      "--brand3": light ? "#8b46d6" : "#dcb2f8",
    };
    Object.entries(vars).forEach(([k, v]) => root.setProperty(k, v));
    document.body.classList.toggle("ui-light", light);
    Renderer.retheme();
  }

  function buildThemeGrid() {
    const grid = document.getElementById("themegrid");
    const total = DB.getStats().totalLines;
    grid.innerHTML = "";
    for (const t of THEMES) {
      const unlocked = total >= t.unlockLines;
      const selected = activeTheme().id === t.id;
      const card = document.createElement("button");
      card.className = "themecard" + (unlocked ? "" : " locked") + (selected ? " selected" : "");
      card.innerHTML =
        `<div class="swatches">${t.palette.map((p) => `<i style="background:${p.base}"></i>`).join("")}</div>` +
        `<b>${unlocked ? t.name : "🔒 " + t.name}</b>` +
        `<span>${selected ? "Seçili" : unlocked ? "Seç" : t.unlockLines + " çizgi"}</span>`;
      card.addEventListener("click", () => {
        if (!unlocked) {
          toast(`🔒 ${t.name} teması: ${t.unlockLines} çizgi gerekli`);
          Sfx.invalid();
          return;
        }
        applyTheme(t.id);
        buildThemeGrid();
        Sfx.pickup();
      });
      grid.appendChild(card);
    }
    document.getElementById("themeHint").textContent = `· toplam ${total} çizgi`;
  }

  /* ---------- blok stili seçici (candy / elmas / neon) ---------- */
  function buildStyleGrid() {
    const grid = document.getElementById("stylegrid");
    const styles = [
      { id: "candy", name: "Candy", desc: "Yumuşak" },
      { id: "gem", name: "Elmas", desc: "Keskin" },
      { id: "neon", name: "Neon", desc: "Işıltı" },
    ];
    const current = DB.get("cubiq.blockstyle", "candy");
    grid.innerHTML = "";
    for (const st of styles) {
      const selected = current === st.id;
      const card = document.createElement("button");
      card.className = "themecard" + (selected ? " selected" : "");
      card.innerHTML =
        `<div class="swatchcanvas"><canvas class="stylecv" width="52" height="52" data-style="${st.id}"></canvas>` +
        `<canvas class="stylecv" width="52" height="52" data-style="${st.id}" data-color="3"></canvas></div>` +
        `<b>${st.name}</b><span>${selected ? "Seçili" : st.desc}</span>`;
      card.addEventListener("click", () => {
        DB.set("cubiq.blockstyle", st.id);
        Renderer.setBlockStyle(st.id);
        buildStyleGrid();
        Sfx.pickup();
      });
      grid.appendChild(card);
    }
    grid.querySelectorAll("canvas.stylecv").forEach((cv) => {
      Renderer.previewBlock(cv, Number(cv.dataset.color || 0), cv.dataset.style);
    });
  }

  function fillBadges() {
    const grid = document.getElementById("badgegrid");
    const owned = DB.getJSON("cubiq.badges", []);
    grid.innerHTML = "";
    for (const b of BADGES) {
      const has = owned.includes(b.id);
      const card = document.createElement("div");
      card.className = "badgecard" + (has ? " unlocked" : " locked");
      card.innerHTML = `<div class="bicon">${has ? b.icon : "🔒"}</div><b>${b.name}</b><span>${b.desc}</span>`;
      grid.appendChild(card);
    }
    document.getElementById("badgeProgress").textContent = `${owned.length} / ${BADGES.length} rozet açıldı`;
  }

  /* günlük giriş serisi */
  function updateLoginStreak() {
    const today = new Date().toDateString();
    if (DB.get("cubiq.lastPlay", "") === today) return;
    const yesterday = new Date(Date.now() - 864e5).toDateString();
    const streak = DB.get("cubiq.lastPlay", "") === yesterday ? Number(DB.get("cubiq.playStreak", 0)) + 1 : 1;
    DB.set("cubiq.playStreak", String(streak));
    DB.set("cubiq.lastPlay", today);
    if (streak >= 2) setTimeout(() => toast(`🔥 ${streak} günlük giriş serisi!`), 1200);
  }

  /* migrasyon zinciri DB.migrate() içinde (v1 → v4) */

  let screen = "menu"; // "menu" | "game"
  let shown = 0;       // animasyonlu sayılan skor
  let lastT = 0;
  let lastTickSecond = -1;

  /* ipucu balonunu tahta ile tepsi arasındaki şeride yerleştir */
  function positionHint() {
    hintEl.style.top = Math.round(Renderer.L.boardY + Renderer.L.boardSize + 6) + "px";
  }

  function popEl(el) {
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  }

  function updateBar() {
    const barMax = Math.max(Game.best * 1.25, 100);
    fillEl.style.width = Math.min(100, (shown / barMax) * 100) + "%";
    crownEl.style.left = Game.best > 0 ? Math.min(100, (Game.best / barMax) * 100) + "%" : "0%";
    crownEl.style.opacity = Game.best > 0 ? "1" : "0.25";
    fillEl.classList.toggle("gold", Game.best > 0 && shown >= Game.best);
  }

  function updateMenuBests() {
    document.getElementById("bestClassic").textContent = Number(DB.get("cubiq.best.classic", 0)) || 0;
    document.getElementById("bestTime").textContent = Number(DB.get("cubiq.best.time", 0)) || 0;
  }

  /* HUD'daki seri çarpanı çipi */
  function updateMultChip(streak) {
    if (streak >= 2) {
      const m = 1 + SCORE.streakStep * (streak - 1);
      multEl.textContent = "🔥 SERİ ×" + (Number.isInteger(m) ? m : m.toFixed(1));
      multEl.classList.remove("hidden");
    } else {
      multEl.classList.add("hidden");
    }
  }

  function fillLifeStats() {
    const s = DB.getStats();
    const stars = Number(DB.get("cubiq.stars", 0)) || 0;
    lifeStats.textContent =
      `🎮 ${s.gamesPlayed} oyun (${s.gamesClassic} klasik · ${s.gamesTime} zamanlı) · 💥 ${s.totalLines} çizgi · 🔥 en iyi seri ×${s.bestStreakEver} · ★ ${stars} yıldız · 🪙 ${coins()} altın`;
  }

  function updateTimer() {
    const s = Math.max(0, Math.ceil(Game.timeLeft / 1000));
    timerEl.textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
    timerWrap.classList.toggle("low", s <= 10);
    if (s !== lastTickSecond) {
      lastTickSecond = s;
      if (s <= 5 && s > 0) Sfx.tick();
    }
  }

  /* ---------- ekran geçişleri ---------- */
  function startGame(mode, levelIdx) {
    Game.start(mode, levelIdx);
    screen = "game";
    menuEl.classList.remove("active");
    hudEl.classList.remove("hidden");
    pauseEl.classList.add("hidden");
    overlay.classList.add("hidden");
    ovClose.style.display = "none";
    nextLevelBtn.classList.add("hidden");
    timerWrap.classList.toggle("hidden", Game.mode !== "time");
    if (Game.mode === "time") updateTimer();
    Renderer.setMenuMode(false);
    positionHint();
    hintEl.style.visibility = Game.best > 0 ? "hidden" : "visible";
    shown = 0;
    scoreEl.textContent = "0";
    updateBar();
    updateMultChip(0);
    updateGoalChip();
    Sfx.pickup();
  }

  function showMenu() {
    screen = "menu";
    Game.paused = false;
    hudEl.classList.add("hidden");
    pauseEl.classList.add("hidden");
    overlay.classList.add("hidden");
    hintEl.style.visibility = "hidden";
    menuEl.classList.add("active");
    Renderer.setMenuMode(true);
    updateMenuBests();
    updateDailyUI();
    updateLevelUI();
    updateCoins();
    updateAdventureUI();
    const streak = Number(DB.get("cubiq.playStreak", 0)) || 0;
    const ls = document.getElementById("loginStreak");
    ls.textContent = streak >= 2 ? `🔥 ${streak} günlük giriş serisi` : "";
    ls.classList.toggle("hidden", streak < 2);
  }

  function togglePause() {
    if (screen !== "game" || Game.over) return;
    Game.paused = !Game.paused;
    pauseEl.classList.toggle("hidden", !Game.paused);
    Sfx.pickup();
  }

  function gameOver(reason) {
    Game.over = true;
    Sfx.over();
    vib([80, 50, 80]);
    if (Game.score > 0 && Game.score === Game.best) {
      Sfx.best();
      vib([10, 30, 10, 30, 40]);
    }
    ovTitle.textContent = reason === "time" ? "Süre Bitti!" : Game.mode === "adventure" ? "Bölüm Başarısız" : "Oyun Bitti";
    applyGameEnd();
    setTimeout(showGameOver, 500);
  }

  /* oyun sonu işlemleri — panel görünsün ya da görünmesin TAM BİR KEZ işlenir */
  function applyGameEnd() {
    const st = Game.stats;
    /* kalıcı yaşam boyu istatistikler */
    DB.bumpStats((s) => {
      s.gamesPlayed += 1;
      if (Game.mode === "time") s.gamesTime += 1;
      else s.gamesClassic += 1;
      s.totalLines += st ? st.lines : 0;
      s.totalScore += Game.score;
      if (st) s.bestStreakEver = Math.max(s.bestStreakEver, st.bestStreak);
    });
    /* yıldız sayacı — macerada bölüm yıldızları */
    const stars = Game.mode === "adventure" ? lastAdvStars : earnedStars();
    DB.set("cubiq.stars", String((Number(DB.get("cubiq.stars", 0)) || 0) + stars));
    /* günlük görev sonucu */
    if (Game.mode === "daily") {
      const k = dailyKey();
      const prev = Number(DB.get(k, 0)) || 0;
      if (Game.score > prev) DB.set(k, String(Game.score));
    }
    /* son 10 oyun geçmişi (sparkline) */
    const hist = DB.getJSON("cubiq.history", []);
    hist.push(Game.score);
    while (hist.length > 10) hist.shift();
    DB.setJSON("cubiq.history", hist);
    /* XP: her oyun skor/50 (en az 1); seviye atlanırsa kutlama */
    const gainedXp = Game.score > 0 ? Math.max(1, Math.round(Game.score / 50)) : 0;
    const oldXp = Number(DB.get("cubiq.xp", 0)) || 0;
    const newXp = oldXp + gainedXp;
    DB.set("cubiq.xp", String(newXp));
    if (levelFromXp(newXp) > levelFromXp(oldXp)) {
      Renderer.confetti();
      toast(`🎉 Seviye ${levelFromXp(newXp)}!`);
      Sfx.best();
      vib([15, 30, 15, 30, 45]);
    }
    /* rozetler + liderlik gönderimi */
    checkBadges({ gameScore: Game.score, bestStreak: Game.stats.bestStreak, maxCombo: Game.stats.maxCombo, hintUsed: Game.hintUsed, dailyDays: countDailyDays(), fullClear: lastFullClear });
    /* coin kazanımı: skor/200 + tam temizlik 25 */
    const coinsEarned = Math.round(Game.score / 200) + (lastFullClear ? 25 : 0);
    DB.set("cubiq.coins", String(coins() + coinsEarned));
    lastCoinsEarned = coinsEarned;
    updateCoins();
    renderLeaderboard(Game.mode);
  }

  /* oyun sonu paneli: yalnızca görüntüleme (oyun hâlâ ekrandaysa) */
  function showGameOver() {
    if (screen !== "game") return; /* kullanıcı menüye döndüyse panel gösterme */
    const isRecord = Game.score > 0 && Game.score === Game.best;
    ovScore.textContent = Game.score;
    ovBest.textContent = Game.best;
    ovNew.classList.toggle("hidden", !isRecord);
    document.querySelector("#overlay .panel").classList.toggle("gold", isRecord);
    const stars = Game.mode === "adventure" ? lastAdvStars : earnedStars();
    ovStars.innerHTML = [1, 2, 3].map((n) =>
      `<svg class="icon${n <= stars ? " full" : ""}" aria-hidden="true"><use href="#i-star"/></svg>`).join("");
    const canRevive = !Game.reviveUsed && Game.mode === "classic" && Game.score > 0;
    reviveBtn.classList.toggle("hidden", !canRevive);
    /* coinle ikinci jeton: ücretsiz hak bitince ve kasada yeterli altın varsa */
    const canCoinRevive = !canRevive && !Game.coinReviveUsed && Game.mode === "classic" && Game.score > 0 && coins() >= REVIVE_COST;
    coinReviveBtn.classList.toggle("hidden", !canCoinRevive);
    coinReviveBtn.innerHTML = `🪙 ${REVIVE_COST} — ALTINLA DEVAM`;
    /* macerada bölüm tamamlandıysa ve sonraki bölüm varsa "SONRAKİ BÖLÜM" göster */
    nextLevelBtn.classList.toggle("hidden",
      !(Game.mode === "adventure" && Game.completed && Game.levelIdx + 1 < LEVELS.length));
    if (Game.mode === "adventure") {
      ovClose.textContent = Game.completed
        ? `✅ ${LEVELS[Game.levelIdx].name} tamamlandı · +${10 + Game.levelIdx * 2} altın`
        : `❌ Hedefe ulaşılamadı · ${LEVELS[Game.levelIdx].name}`;
      ovClose.style.display = "block";
    } else if (Game.mode === "daily") {
      const prev = Number(DB.get(dailyKey(), 0)) || 0;
      ovClose.textContent = `📅 Günlük görev tamamlandı · bugünkü en iyi ${Math.max(prev, Game.score)}`;
      ovClose.style.display = "block";
    } else if (!isRecord && Game.best > 0 && Game.score > 0) {
      const pct = Math.min(100, Math.round((Game.score / Game.best) * 100));
      ovClose.textContent = `🎯 Rekoruna %${pct} ulaştın`;
      ovClose.style.display = "block";
    } else {
      ovClose.style.display = "none";
    }
    const hist = DB.getJSON("cubiq.history", []);
    ovSpark.innerHTML = buildSpark(hist);
    const st = Game.stats;
    const has = st && st.lines > 0;
    ovStats.textContent = has ? `🔥 ${st.lines} çizgi · en iyi seri ×${st.bestStreak}` : "";
    ovStats.style.display = has ? "block" : "none";
    const life = DB.getStats();
    ovLife.textContent = `📈 ${life.gamesPlayed}. oyun · toplam ${life.totalLines} çizgi`;
    ovCoins.textContent = lastCoinsEarned > 0 ? `🪙 +${lastCoinsEarned} altın kazandın · kasada ${coins()}` : "";
    ovCoins.style.display = lastCoinsEarned > 0 ? "block" : "none";
    overlay.classList.remove("hidden");
  }

  /* devam jetonu: ücretsiz hak ya da 30 altın — alt 4 satırı temizleyerek sürdürür */
  function revive(useCoins) {
    if (!Game.over || Game.mode !== "classic") return false;
    if (!useCoins) {
      if (Game.reviveUsed) return false;
      Game.reviveUsed = true;
    } else {
      if (Game.coinReviveUsed) return false;
      if (coins() < REVIVE_COST) {
        toast("🪙 Yetersiz altın");
        Sfx.invalid();
        return false;
      }
      DB.set("cubiq.coins", String(coins() - REVIVE_COST));
      Game.coinReviveUsed = true;
    }
    const cleared = [];
    for (let r = 4; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (Game.grid[r][c] !== null) {
          cleared.push({ r, c, color: Game.grid[r][c] });
          Game.grid[r][c] = null;
        }
      }
    }
    Game.over = false;
    overlay.classList.add("hidden");
    Renderer.placeEffect({ placed: [], cleared, lines: 0, rows: [], cols: [], gain: 0 });
    Sfx.best();
    vib([20, 40, 20]);
    toast(useCoins ? "🪙 Altınla devam edildi — alt 4 satır temizlendi!" : "❤️ Devam jetonu — alt 4 satır temizlendi!");
    updateCoins();
    return true;
  }

  /* ---------- oyun içi girdi ---------- */
  function xy(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function trayHit(x, y) {
    for (let i = 0; i < 3; i++) {
      const p = Game.tray[i];
      if (!p) continue;
      const s = Renderer.slotCenter(i);
      const hw = (p.w * Renderer.L.trayCell) / 2 + 16;
      const hh = (p.h * Renderer.L.trayCell) / 2 + 16;
      if (Math.abs(x - s.cx) <= hw && Math.abs(y - s.cy) <= hh) return i;
    }
    return -1;
  }

  function computeTarget() {
    const piece = drag.piece;
    const cx = drag.px, cy = drag.py - drag.lift;
    const Lb = Renderer.L;
    /* hayalet parça merkezi → ızgara hücresi (merkez, hücre merkezine denk gelmeli) */
    const r = Math.round((cy - Lb.boardY) / Lb.cell - piece.h / 2);
    const c = Math.round((cx - Lb.boardX) / Lb.cell - piece.w / 2);
    if (Game.canPlace(piece, r, c)) return { r, c, valid: true, sim: Game.previewLines(piece, r, c) };
    return { r, c, valid: false };
  }

  let drag = null;
  let lastFullClear = false;
  let lastAdvStars = 0;
  let kb = null; // klavye modu: { idx, r, c } — 1/2/3 seç · oklar taşı · Enter bırak

  /* ---------- macera modu ---------- */
  function advState() { return DB.getJSON("cubiq.adv", { unlocked: 1, stars: {} }); }
  function goalMet() {
    const g = LEVELS[Game.levelIdx].goal;
    if (g.type === "score") return Game.score >= g.v;
    if (g.type === "lines") return Game.stats.lines >= g.v;
    if (g.type === "streak") return Game.streak >= g.v;
    if (g.type === "combo") return Game.stats.maxCombo >= g.v;
    return false;
  }
  function updateGoalChip() {
    const show = Game.mode === "adventure";
    goalChip.classList.toggle("hidden", !show);
    if (!show) return;
    const g = LEVELS[Game.levelIdx].goal;
    const unit = g.type === "score" ? " puan" : g.type === "lines" ? " çizgi" : g.type === "streak" ? " seri" : " combo";
    let cur = 0;
    if (g.type === "score") cur = Math.min(Game.score, g.v);
    else if (g.type === "lines") cur = Math.min(Game.stats.lines, g.v);
    else if (g.type === "streak") cur = Math.min(Game.streak, g.v);
    else cur = Math.min(Game.stats.maxCombo, g.v);
    goalChip.textContent = "B" + (Game.levelIdx + 1) + " · " + cur + "/" + g.v + unit;
  }
  function checkAdventure() {
    if (Game.mode !== "adventure" || Game.over || Game.completed) return;
    if (goalMet()) completeLevel();
  }
  function completeLevel() {
    const G = Game;
    G.completed = true;
    G.over = true;
    const idx = G.levelIdx;
    lastAdvStars = G.stats.moves <= 22 ? 3 : G.stats.moves <= 34 ? 2 : 1;
    const adv = advState();
    adv.stars[String(idx + 1)] = Math.max(Number(adv.stars[String(idx + 1)]) || 0, lastAdvStars);
    adv.unlocked = Math.max(Number(adv.unlocked) || 1, Math.min(LEVELS.length, idx + 2));
    DB.setJSON("cubiq.adv", adv);
    Renderer.confetti();
    Sfx.best();
    vib([25, 40, 25, 40, 60]);
    ovTitle.textContent = LEVELS[idx].name + " — Tamamlandı!";
    applyGameEnd();
    /* bölüm bonusu */
    const bonus = 10 + idx * 2;
    DB.set("cubiq.coins", String(coins() + bonus));
    lastCoinsEarned = (lastCoinsEarned || 0) + bonus;
    updateCoins();
    setTimeout(showGameOver, 600);
  }
  function updateAdventureUI() {
    const adv = advState();
    const st = document.getElementById("advStatus");
    st.textContent = adv.unlocked >= LEVELS.length ? "Tüm bölümler tamam! 🏆" : "Bölüm " + adv.unlocked + "/" + LEVELS.length;
  }

  function kbPiece() { return kb ? Game.tray[kb.idx] : null; }
  function cancelKb() {
    kb = null;
    Renderer.setDrag(null);
  }
  function updateKbDrag() {
    if (!kb) return;
    const p = kbPiece();
    if (!p) { cancelKb(); return; }
    const Lb = Renderer.L;
    const px = Lb.boardX + (kb.c + p.w / 2) * Lb.cell;
    const py = Lb.boardY + (kb.r + p.h / 2) * Lb.cell;
    const valid = Game.canPlace(p, kb.r, kb.c);
    Renderer.setDrag({
      idx: kb.idx, piece: p, px, py, lift: 0,
      target: valid
        ? { r: kb.r, c: kb.c, valid: true, sim: Game.previewLines(p, kb.r, kb.c) }
        : { r: kb.r, c: kb.c, valid: false },
    });
  }
  function selectKb(i) {
    const p = Game.tray[i];
    if (!p || Game.over || Game.paused) return;
    const spot = Game.anyPlacement(p);
    kb = { idx: i, r: spot ? spot.r : 0, c: spot ? spot.c : 0 };
    Sfx.pickup();
    updateKbDrag();
  }
  function moveKb(dr, dc) {
    if (!kb) return;
    const p = kbPiece();
    if (!p) { cancelKb(); return; }
    kb.r = Math.max(0, Math.min(Game.N - p.h, kb.r + dr));
    kb.c = Math.max(0, Math.min(Game.N - p.w, kb.c + dc));
    updateKbDrag();
  }
  function placeKb() {
    if (!kb) return;
    const p = kbPiece();
    if (!p) { cancelKb(); return; }
    if (!Game.canPlace(p, kb.r, kb.c)) { Sfx.invalid(); return; }
    const res = Game.place(kb.idx, kb.r, kb.c);
    cancelKb();
    if (res) handlePlace(res);
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (kb) { kb = null; Renderer.setDrag(null); } /* klavye modundan fareye geçiş */
    if (screen !== "game" || Game.over || Game.paused || drag) return;
    const { x, y } = xy(e);
    const idx = trayHit(x, y);
    if (idx < 0) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* sentetik test işaretçileri yakalanamayabilir */ }
    const lift = e.pointerType === "touch" ? Renderer.L.cell * 1.5 : Renderer.L.cell * 0.4;
    drag = { idx, piece: Game.tray[idx], pointerId: e.pointerId, px: x, py: y, lift };
    Renderer.setDrag({ idx, piece: drag.piece, px: x, py: y, lift, target: null });
    Sfx.pickup();
    vib(6);
  }, { passive: false });

  canvas.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.preventDefault();
    const { x, y } = xy(e);
    drag.px = x;
    drag.py = y;
    const d = Renderer.getDrag();
    d.px = x;
    d.py = y;
    d.target = computeTarget();
  }, { passive: false });

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = Renderer.getDrag();
    let placed = false;
    if (d.target && d.target.valid) {
      const res = Game.place(drag.idx, d.target.r, d.target.c);
      if (res) {
        placed = true;
        handlePlace(res);
      }
    }
    if (!placed) {
      Renderer.snapBack(drag.idx, d.px, d.py - drag.lift);
      Sfx.invalid();
      vib(18);
    }
    Renderer.setDrag(null);
    drag = null;
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  function placedCenter(res) {
    let sr = 0, sc = 0;
    for (const [r, c] of res.placed) { sr += r; sc += c; }
    const n = res.placed.length;
    const Lb = Renderer.L;
    return { x: Lb.boardX + (sc / n + 0.5) * Lb.cell, y: Lb.boardY + (sr / n + 0.5) * Lb.cell };
  }

  function handlePlace(res) {
    lastFullClear = !!res.fullClear;
    Renderer.placeEffect(res);
    popEl(scoreEl);
    updateBar();
    Sfx.place();
    vib(8);
    const bc = Renderer.boardCenter();
    if (res.lines > 0) {
      Sfx.clear(res.lines);
      vib(res.lines >= 2 ? [12, 30, 12, 30, 24] : 12);
      const labels = { 1: "GÜZEL!", 2: "MUHTEŞEM!", 3: "EFSANE!" };
      const txt = res.lines >= 4 ? "İNANILMAZ!" : labels[res.lines];
      const col = res.lines >= 4 ? "#ff9296" : res.lines === 3 ? "#ffd93d" : res.lines === 2 ? "#a3eff9" : "#ffffff";
      Renderer.float(txt, bc.x, bc.y - 26, true, col);
      if (res.streak >= 2) Renderer.float("SERİ x" + res.streak, bc.x, bc.y - 64, false, "#ffb86b");
      Renderer.float("+" + res.gain, bc.x, bc.y + 22, res.lines >= 2, res.lines >= 2 ? "#ffd93d" : "#a3eff9");
      updateMultChip(res.streak);
      /* TAM TEMİZLİK: tahta sıfırlandı — konfeti + özel ses */
      if (res.fullClear) {
        Renderer.confetti();
        Renderer.float("TAM TEMİZLİK!", bc.x, bc.y - 100, true, "#ffd93d");
        Sfx.best();
        vib([30, 40, 30, 40, 60]);
      }
    } else {
      const pc = placedCenter(res);
      Renderer.float("+" + res.gain, pc.x, pc.y, false);
    }
    /* Zamana Karşı: büyük patlamaya süre bonusu */
    if (Game.mode === "time" && !res.over && res.lines >= 4) {
      Game.timeLeft += 10000;
      Renderer.float("+10s", bc.x, bc.y - 92, true, "#6bcb77");
      Sfx.tick();
    }
    checkBadges({ gameScore: Game.score, bestStreak: Game.streak, maxCombo: Game.stats.maxCombo, hintUsed: Game.hintUsed, dailyDays: countDailyDays(), fullClear: res.fullClear });
    updateGoalChip();
    checkAdventure();
    if (res.over) gameOver("stuck");
  }

  /* ---------- düğmeler ---------- */
  document.getElementById("btnClassic").addEventListener("click", () => startGame("classic"));
  document.getElementById("btnTime").addEventListener("click", () => startGame("time"));
  document.getElementById("btnDaily").addEventListener("click", () => startGame("daily"));
  document.getElementById("btnAdventure").addEventListener("click", () => {
    /* en son açılan bölümden başla (bölüm 1 tabanlı) */
    const adv = DB.getJSON("cubiq.adv", { unlocked: 1, stars: {} });
    startGame("adventure", Math.max(0, Math.min(LEVELS.length, Number(adv.unlocked) || 1) - 1));
  });
  document.getElementById("btnHow").addEventListener("click", () => {
    document.getElementById("modal-how").classList.remove("hidden");
    Sfx.pickup();
  });
  document.getElementById("btnBadges").addEventListener("click", () => {
    fillBadges();
    document.getElementById("modal-badges").classList.remove("hidden");
    Sfx.pickup();
  });
  document.getElementById("btnSettings").addEventListener("click", () => {
    fillLifeStats();
    buildThemeGrid();
    buildStyleGrid();
    document.getElementById("modal-settings").classList.remove("hidden");
    Sfx.pickup();
  });
  document.querySelectorAll(".close").forEach((btn) =>
    btn.addEventListener("click", () => document.getElementById(btn.dataset.close).classList.add("hidden"))
  );

  document.getElementById("pause").addEventListener("click", togglePause);
  document.getElementById("hintBtn").addEventListener("click", () => {
    if (screen !== "game" || Game.over || Game.paused) return;
    let best = null;
    for (let i = 0; i < 3; i++) {
      const p = Game.tray[i];
      if (!p) continue;
      for (let r = 0; r <= 8 - p.h; r++) {
        for (let c = 0; c <= 8 - p.w; c++) {
          if (!Game.canPlace(p, r, c)) continue;
          const sim = Game.previewLines(p, r, c);
          const val = (sim.rows.length + sim.cols.length) * 1000;
          if (!best || val > best.val) {
            best = { val, cells: p.cells.map(([dr, dc]) => [r + dr, c + dc]) };
          }
        }
      }
    }
    if (best) {
      Game.hintUsed = true;
      Renderer.showHint(best.cells);
      Sfx.pickup();
    }
  });
  document.getElementById("resume").addEventListener("click", togglePause);
  document.getElementById("restart").addEventListener("click", () => startGame(Game.mode));
  document.getElementById("pauseRestart").addEventListener("click", () => startGame(Game.mode));
  document.getElementById("pauseMenu").addEventListener("click", showMenu);
  document.getElementById("toMenu").addEventListener("click", showMenu);
  document.getElementById("again").addEventListener("click", () => startGame(Game.mode));
  document.getElementById("nextLevel").addEventListener("click", () => startGame("adventure", Game.levelIdx + 1));

  muteBtn.addEventListener("click", () => {
    Sfx.toggle();
    syncMuteIcon();
    syncSwitches();
  });

  window.addEventListener("keydown", (e) => {
    if (screen !== "game") return;
    if (e.key === "Escape") {
      if (kb) cancelKb();
      else togglePause();
      return;
    }
    if (Game.paused || Game.over) return;
    if (e.key === "1" || e.key === "2" || e.key === "3") {
      selectKb(Number(e.key) - 1);
      return;
    }
    if (!kb) return;
    const p = kbPiece();
    if (!p) { cancelKb(); return; }
    const moves = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
    if (moves[e.key]) {
      e.preventDefault();
      moveKb(moves[e.key][0], moves[e.key][1]);
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      placeKb();
    }
  });

  /* ---------- ayarlar ---------- */
  const swSound = document.getElementById("swSound");
  const swVib = document.getElementById("swVib");
  const resetBtn = document.getElementById("resetBest");

  function syncSwitches() {
    swSound.checked = !Sfx.muted;
    swVib.checked = settings.vib;
    swMusic.checked = Music.on;
  }

  swSound.addEventListener("change", () => {
    if (swSound.checked === Sfx.muted) Sfx.toggle();
    syncMuteIcon();
    if (!Sfx.muted) Sfx.pickup();
  });
  swVib.addEventListener("change", () => {
    settings.vib = swVib.checked;
    if (swVib.checked) vib(30);
  });
  swMusic.addEventListener("change", () => {
    Music.on = swMusic.checked;
    if (Music.on) toast("🎵 Müzik açıldı");
  });
  reviveBtn.addEventListener("click", () => revive(false));
  document.getElementById("coinRevive").addEventListener("click", () => revive(true));
  /* müzik tarayıcı politikası gereği ilk kullanıcı jestiyle başlar */
  document.addEventListener("pointerdown", () => Music.kick(), { capture: true });

  /* tam yığın: oyuncu adı + bulut yedeği */
  const nameInput = document.getElementById("playerName");
  nameInput.value = DB.get("cubiq.name", "");
  nameInput.addEventListener("change", () => {
    DB.set("cubiq.name", nameInput.value.replace(/[<>&]/g, "").trim().slice(0, 12));
    nameInput.value = DB.get("cubiq.name", "");
    toast("🌍 Adın kaydedildi");
  });
  document.getElementById("cloudSave").addEventListener("click", async () => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith("cubiq.") || k.startsWith("blokustasi.")) data[k] = localStorage.getItem(k);
    }
    const ok = await Api.saveGame("main", data);
    toast(ok ? "☁️ Yedek sunucuya kaydedildi" : "☁️ Sunucuya ulaşılamadı");
  });
  document.getElementById("cloudLoad").addEventListener("click", async () => {
    const res = await Api.loadGame("main");
    if (!res || !res.data) { toast("☁️ Sunucuda yedek bulunamadı"); return; }
    Object.keys(res.data).forEach((k) => DB.set(k, String(res.data[k])));
    toast("☁️ Yedek geri yüklendi — sayfa yenileniyor");
    setTimeout(() => location.reload(), 900);
  });

  let resetArmed = false;
  let resetTimer = 0;
  function disarmReset() {
    resetArmed = false;
    resetBtn.textContent = "👑 REKORLARI SIFIRLA";
  }
  resetBtn.addEventListener("click", () => {
    if (!resetArmed) {
      resetArmed = true;
      resetBtn.textContent = "EMİN MİSİN? TEKRAR DOKUN";
      clearTimeout(resetTimer);
      resetTimer = setTimeout(disarmReset, 3000);
      return;
    }
    clearTimeout(resetTimer);
    ["cubiq.best.classic", "cubiq.best.time", "cubiq.best", "blokustasi.best"].forEach((k) => DB.set(k, "0"));
    Game.best = 0;
    updateMenuBests();
    updateBar();
    disarmReset();
    Sfx.pickup();
  });

  /* ---------- başlat ---------- */
  Game.init();
  applyTheme(activeTheme().id);
  Renderer.setBlockStyle(DB.get("cubiq.blockstyle", "candy"));
  updateLoginStreak();
  updateDailyUI();
  updateLevelUI();
  updateCoins();
  syncSwitches();
  syncMuteIcon();
  updateMenuBests();
  updateBar();
  Renderer.resize();
  showMenu();
  ovClose.style.display = "none";
  hintEl.style.visibility = "hidden";

  /* çevrimdışı PWA: service worker kaydı (yalnız http/https üstünde) */
  const swStatus = document.getElementById("swStatus");
  if ("serviceWorker" in navigator && (location.protocol === "http:" || location.protocol === "https:")) {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        const ready = navigator.serviceWorker.controller ? "Kurulu — internet olmadan da oynanır" : "İlk yükleme tamamlandı";
        if (swStatus) swStatus.textContent = ready;
      })
      .catch(() => { if (swStatus) swStatus.textContent = "Kayıt başarısız"; });
  } else if (swStatus) {
    swStatus.textContent = "Bu ortamda desteklenmiyor";
  }

  /* açılış splash'i: hareket azaltma tercihi varsa atla */
  const splash = document.getElementById("splash");
  const reducedMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) splash.remove();
  else setTimeout(() => splash.remove(), 2100);

  /* pencere yeniden boyutlandırma: düzen + ipucu + klavye hayaleti tazelenir */
  const onResize = () => {
    Renderer.resize();
    positionHint();
    if (kb) updateKbDrag();
  };
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", () => setTimeout(onResize, 250));
  /* iOS Safari: araç çubuğu göster/gizle visualViewport ile gelir, window.resize tetiklenmeyebilir */
  if (window.visualViewport) window.visualViewport.addEventListener("resize", onResize);

  function loop(now) {
    Renderer.draw(now);
    /* animasyonlu skor sayacı */
    if (shown !== Game.score) {
      if (Game.score < shown) {
        shown = Game.score;
      } else {
        shown += Math.max(1, Math.ceil((Game.score - shown) * 0.16));
        if (shown > Game.score) shown = Game.score;
      }
      scoreEl.textContent = shown;
      updateBar();
    }
    /* Zamana Karşı sayacı */
    if (screen === "game" && Game.mode === "time") {
      const dt = Math.min(120, now - (lastT || now));
      if (Game.advanceTime(dt)) gameOver("time");
      updateTimer();
    }
    lastT = now;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* QA / otomasyon kancası */
  window.__game = {
    Game, Renderer, Sfx,
    startGame, showMenu, togglePause,
    applyTheme, buildThemeGrid, checkBadges,
    advanceTimer(ms) { return Game.advanceTime(ms); },
    forceTimeUp() { gameOver("time"); },
    placeAt(idx, r, c) {
      const res = Game.place(idx, r, c);
      if (res) {
        Renderer.placeEffect(res);
        updateBar();
        if (res.over) gameOver("stuck");
      }
      return res;
    },
  };
})();
