"use strict";
/* Cubiq — kalıcı depolama katmanı: şema sürümlü migrasyon + yaşam boyu istatistikler.
   Tüm kalıcı veriler bu katmandan geçer; anahtarlar doğrudan kullanılmaz. */

const DB = (() => {
  const SCHEMA = 5;

  const get = (k, d) => {
    try {
      const v = localStorage.getItem(k);
      return v === null ? d : v;
    } catch (e) {
      return d;
    }
  };
  const set = (k, v) => {
    try { localStorage.setItem(k, v); } catch (e) { /* depolama kapalıysa sessizce devam */ }
    if (k.startsWith("cubiq.") || k.startsWith("blokustasi.")) idbPut(k, v);
  };
  const del = (k) => {
    try { localStorage.removeItem(k); } catch (e) { /* yok say */ }
  };

  /* --- IndexedDB yansıması: tarayıcının gerçek veritabanına eş yedek ---
     localStorage birincildir; her oyun anahtarı (cubiq. ve blokustasi. önekli)
     IDB'ye de kopyalanır. localStorage boşsa (tarayıcı verisi silinmişse)
     açılışta IDB'den geri yüklenir. */
  let idb = null;
  function openIdb() {
    return new Promise((resolve) => {
      if (!window.indexedDB) return resolve(null);
      try {
        const rq = indexedDB.open("cubiq-db", 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore("kv");
        rq.onsuccess = () => resolve(rq.result);
        rq.onerror = () => resolve(null);
      } catch (e) { resolve(null); }
    });
  }
  function idbPut(k, v) {
    if (!idb) return;
    try {
      const tx = idb.transaction("kv", "readwrite");
      tx.objectStore("kv").put(v, k);
    } catch (e) { /* sessiz */ }
  }
  function idbGetAll() {
    return new Promise((resolve) => {
      if (!idb) return resolve([]);
      try {
        const out = [];
        const store = idb.transaction("kv", "readonly").objectStore("kv");
        const krq = store.openCursor();
        krq.onsuccess = () => {
          const cur = krq.result;
          if (cur) { out.push([cur.key, cur.value]); cur.continue(); }
          else resolve(out);
        };
        krq.onerror = () => resolve(out);
      } catch (e) { resolve([]); }
    });
  }

  const getJSON = (k, d) => {
    const raw = get(k, null);
    if (raw === null) return d;
    try { return JSON.parse(raw); } catch (e) { return d; }
  };
  const setJSON = (k, v) => set(k, JSON.stringify(v));

  const DEFAULT_STATS = {
    schema: SCHEMA,
    gamesClassic: 0,
    gamesTime: 0,
    gamesPlayed: 0,
    totalLines: 0,
    totalScore: 0,
    bestStreakEver: 0,
  };

  /* Migrasyon zinciri:
     v1 blokustasi.best → v2 cubiq.best → v3 cubiq.best.classic (mod başına)
     → v4 + istatistikler → v5 + rozetler/tema/müzik/günlük seri */
  function migrate() {
    if (get("cubiq.best.classic", null) === null) {
      const v2 = get("cubiq.best", null);
      if (v2 !== null) {
        set("cubiq.best.classic", v2);
      } else {
        const legacy = get("blokustasi.best", null);
        if (legacy !== null) set("cubiq.best.classic", legacy);
      }
    }
    if (get("cubiq.mute", null) === null) {
      const legacy = get("blokustasi.mute", null);
      if (legacy !== null) set("cubiq.mute", legacy);
    }

    let s = getJSON("cubiq.stats", null);
    if (!s || typeof s !== "object" || s.schema !== SCHEMA) {
      const old = s || {};
      s = {
        schema: SCHEMA,
        gamesClassic: Number(old.gamesClassic) || 0,
        gamesTime: Number(old.gamesTime) || 0,
        gamesPlayed: Number(old.gamesPlayed) || 0,
        totalLines: Number(old.totalLines) || 0,
        totalScore: Number(old.totalScore) || 0,
        bestStreakEver: Number(old.bestStreakEver) || 0,
      };
      setJSON("cubiq.stats", s);
    }
    if (getJSON("cubiq.badges", null) === null) setJSON("cubiq.badges", []);
    set("cubiq.schema", String(SCHEMA));
  }

  const getStats = () => getJSON("cubiq.stats", { ...DEFAULT_STATS });
  const bumpStats = (fn) => {
    const s = getStats();
    fn(s);
    setJSON("cubiq.stats", s);
    return s;
  };

  migrate();

  /* IDB yansımasını aç; localStorage boşsa IDB'den geri yükle (async, sessiz) */
  openIdb().then((db) => {
    if (!db) return;
    idb = db;
    if (get("cubiq.schema", null) === null) {
      idbGetAll().then((pairs) => {
        if (!pairs.length) return;
        pairs.forEach(([k, v]) => {
          try { localStorage.setItem(k, v); } catch (e) { /* yok say */ }
        });
        migrate(); /* geri yüklenen veriyle migrasyon zincirini tazele */
      });
    }
  });

  return { get, set, del, getJSON, setJSON, getStats, bumpStats, migrate, SCHEMA };
})();
