"use strict";
/* Cubiq — sunucu API istemcisi (tam yığın: küresel liderlik tablosu + bulut yedeği).
   Tüm istekler 3,5 sn'de zaman aşımına uğrar; sunucu kapalıysa oyun sessizce yerel moda döner. */

const Api = (() => {
  async function request(path, opts = {}) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3500);
      const res = await fetch(path, { ...opts, signal: ctrl.signal });
      clearTimeout(t);
      return res.ok ? res : null;
    } catch (e) {
      return null; // çevrimdışı: çağıran taraf yerel davranışa döner
    }
  }

  /* skor gönder → { ok, rank, total, at } ya da null */
  async function submitScore(entry) {
    const res = await request("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (!res) return null;
    try { return await res.json(); } catch (e) { return null; }
  }

  /* NDJSON liderlik listesi → dizi ya da null */
  async function leaderboard(mode) {
    const res = await request("/api/leaderboard?mode=" + encodeURIComponent(mode));
    if (!res) return null;
    const text = await res.text();
    if (!text.trim()) return [];
    return text.trim().split("\n").map((line) => JSON.parse(line));
  }

  /* bulut yedeği kaydet → boolean */
  async function saveGame(slot, data) {
    const res = await request("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot, data, at: new Date().toISOString() }),
    });
    return !!res;
  }

  /* bulut yedeği oku → { slot, data, at } ya da null */
  async function loadGame(slot) {
    const res = await request("/api/save?slot=" + encodeURIComponent(slot));
    if (!res) return null;
    try { return await res.json(); } catch (e) { return null; }
  }

  async function health() {
    const res = await request("/api/health");
    if (!res) return null;
    try { return await res.json(); } catch (e) { return null; }
  }

  return { submitScore, leaderboard, saveGame, loadGame, health };
})();
