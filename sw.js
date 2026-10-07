/* Cubiq Service Worker v2 — çevrimdışı PWA
   Strateji: NETWORK-FIRST (çevrimiçiyken hep taze dosyalar; çevrimdışında önbellek).
   /api/* uçları daima ağa gider (liderlik/bulut çevrimdışında sessizce düşer).
   Sürüm notu: asset değişince CACHE sürümünü yükseltmek yerine network-first
   strateji tazeliği zaten sağlar; CACHE adı yalnız şema kırılımında değişir. */

const CACHE = "cubiq-shell-v2";
const SHELL = [
  "/",
  "/index.html",
  "/css/styles.css",
  "/js/pieces.js",
  "/js/themes.js",
  "/js/store.js",
  "/js/api.js",
  "/js/game.js",
  "/js/renderer.js",
  "/js/main.js",
  "/manifest.json",
  "/icon.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.pathname.startsWith("/api/")) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then((hit) => hit || caches.match("/index.html"))
      )
  );
});
