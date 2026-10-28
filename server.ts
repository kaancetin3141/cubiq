/* Cubiq üretim sunucusu — tek dosya, Bun + PostgreSQL 17 (Prisma), port 3005.
   Eski: serve.js (yalnız statik) / serve.ps1 (statik + dosya veritabanı). Yeni: server.ts.
   Sözleşme js/api.js'e birebir uyar; oyun kodu değişmedi.

   Uçlar:
     GET  /api/health                      → { ok, service, db, uptimeSec, scores, schema }
     POST /api/score {name,score,mode,lines,streak} → { ok, rank, total, at }
     GET  /api/leaderboard?mode=X[&limit=N]→ NDJSON: her satır {name,score,mode,lines,streak,at}
     POST /api/save {slot,data,at}         → { ok, slot }
     GET  /api/save?slot=X                  → { slot, data, at } | 404 { ok:false, error:"yedek yok" }

   Notlar:
   - Score.at dizesi istemciye dönen ve satıra yazılan DEĞERLE aynıdır; main.js "me"
     vurgusunu e.at === res.at birebir eşleşmesiyle yapar → asla dönüştürme/yuvarlama.
   - /api/* → Cache-Control: no-store (sw.js network-first kabuğuyla çakışmaz).
   - /api/* → IP başına 30 istek/dakika bellek içi hız limiti.
   - Statik dosyalar dokunulmazlık listesiyle servis edilir (yol tırmanışı kapalı). */

import { PrismaClient } from "@prisma/client";

/* --- ortam: yerel .env kazanır (sandbox'ta parent projenin DATABASE_URL'i
       global ortamda overrides yapabilir; Prisma hem CLI hem client'ta
       process.env'i .env dosyasına tercih eder → burada bilinçli düzeltiyoruz). --- */
async function loadLocalEnv() {
  const file = Bun.file(import.meta.dir + "/.env");
  if (!(await file.exists())) return;
  for (const line of (await file.text()).split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && m[2]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
await loadLocalEnv();

const PORT = 3005; // sabit — deploy: cubiq.gncinc.online (gateway ?XTransformPort=3005)
const ROOT = import.meta.dir;
const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
const startedAt = Date.now();

/* --- veritabanı sağlığı (30 sn'de bir tazelenir; /api/health'e de yansır) --- */
let dbUp = false;
async function checkDb() {
  try { await db.$queryRaw`SELECT 1`; dbUp = true; } catch { dbUp = false; }
}
await checkDb();
const healthTimer = setInterval(checkDb, 30_000);
healthTimer.unref?.();

/* --- hız limiti: /api/* için IP başına 30 istek/dakika (bellek içi) --- */
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  if (hits.size > 4096) hits.clear(); // bellek koruması
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 30;
}

/* --- yardımcılar --- */
const NO_STORE = { "Cache-Control": "no-store" };
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...NO_STORE },
  });
}
function ndjson(rows: unknown[]) {
  return new Response(rows.length ? rows.map((r) => JSON.stringify(r)).join("\n") + "\n" : "", {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", ...NO_STORE },
  });
}

/* sanitizasyon — serve.ps1 eşdeğeri (oyun beklentisi aynı kalır) */
const clamp = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.trunc(Number(v) || 0)));
function cleanName(raw: unknown): string {
  const n = String(raw ?? "").replace(/[<>&]/g, "").trim().slice(0, 12);
  return n || "Konuk";
}
function cleanMode(raw: unknown): string {
  return String(raw ?? "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 24) || "classic";
}
function cleanSlot(raw: unknown): string {
  return String(raw ?? "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32) || "main";
}

class HttpError extends Error {
  constructor(public status: number, msg: string) { super(msg); }
}
const MAX_BODY = 512 * 1024;
async function readBody(req: Request): Promise<any> {
  const text = await req.text();
  if (text.length > MAX_BODY) throw new HttpError(413, "gövde çok büyük");
  try { return JSON.parse(text || "{}"); } catch { throw new HttpError(400, "geçersiz JSON"); }
}

/* --- API yönlendirici --- */
async function api(req: Request, path: string, ip: string): Promise<Response> {
  const method = req.method;
  if (rateLimited(ip)) return json({ ok: false, error: "çok fazla istek" }, 429);
  try {
    if (path === "/api/health") {
      await checkDb();
      const scores = dbUp ? await db.score.count() : 0;
      return json({
        ok: true, service: "cubiq", db: dbUp ? "connected" : "down",
        uptimeSec: Math.floor((Date.now() - startedAt) / 1000), scores, schema: 2,
      });
    }

    if (path === "/api/score" && method === "POST") {
      const b = await readBody(req);
      const at = new Date().toISOString(); // tek üretim → hem satıra hem yanıta birebir yazılır
      const mode = cleanMode(b.mode);
      const row = await db.score.create({
        data: {
          name: cleanName(b.name),
          score: clamp(b.score, 10_000_000),
          mode,
          lines: clamp(b.lines, 100_000),
          streak: clamp(b.streak, 100_000),
          at,
        },
      });
      const [ahead, total] = await Promise.all([
        db.score.count({ where: { mode, score: { gt: row.score } } }),
        db.score.count({ where: { mode } }),
      ]);
      return json({ ok: true, rank: ahead + 1, total, at });
    }

    if (path === "/api/leaderboard" && method === "GET") {
      const u = new URL(req.url);
      const mode = cleanMode(u.searchParams.get("mode"));
      const limit = clamp(u.searchParams.get("limit"), 50) || 10;
      const rows = await db.score.findMany({
        where: { mode },
        orderBy: [{ score: "desc" }, { id: "asc" }],
        take: limit,
        select: { name: true, score: true, mode: true, lines: true, streak: true, at: true },
      });
      return ndjson(rows);
    }

    if (path === "/api/save" && method === "POST") {
      const b = await readBody(req);
      const slot = cleanSlot(b.slot);
      const data = b.data && typeof b.data === "object" && !Array.isArray(b.data) ? b.data : {};
      const at = typeof b.at === "string" ? b.at.slice(0, 64) : new Date().toISOString();
      await db.saveState.upsert({
        where: { slot },
        create: { slot, data, at },
        update: { data, at },
      });
      return json({ ok: true, slot });
    }

    if (path === "/api/save" && method === "GET") {
      const slot = cleanSlot(new URL(req.url).searchParams.get("slot"));
      const row = await db.saveState.findUnique({ where: { slot } });
      if (!row) return json({ ok: false, error: "yedek yok" }, 404);
      return json({ slot: row.slot, data: row.data, at: row.at });
    }

    if (path === "/api/score" || path === "/api/leaderboard" || path === "/api/save")
      return json({ ok: false, error: "yöntem desteklenmiyor" }, 405);
    return json({ ok: false, error: "bilinmeyen uç" }, 404);
  } catch (e) {
    if (e instanceof HttpError) return json({ ok: false, error: e.message }, e.status);
    console.error("[api]", path, e);
    return json({ ok: false, error: "sunucu hatası" }, 500);
  }
}

/* --- statik dosyalar --- */
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".woff2": "font/woff2",
};
/* sunuculaması yasak iç dosyalar (oyun kabuğu dışındaki her şey halka kapalı) */
const BLOCKED = /^\/(server\.ts|serve\.js|serve\.ps1|stress-test\.ps1|package\.json|package-lock\.json|bun\.lockb?|capacitor\.config\.json|prisma|node_modules)(\/|$)/;

async function serveStatic(pathname: string): Promise<Response> {
  let p: string;
  try { p = decodeURIComponent(pathname); } catch { return new Response("geçersiz adres", { status: 400 }); }
  p = p.replace(/\\/g, "/");
  if (p === "/" || p === "") p = "/index.html";
  if (p.includes("..") || p.split("/").some((s) => s.startsWith(".")) || BLOCKED.test(p))
    return new Response("yasak", { status: 403 });
  const file = Bun.file(ROOT + p);
  if (!(await file.exists())) return new Response("bulunamadı", { status: 404 });
  const ext = p.slice(p.lastIndexOf(".")).toLowerCase();
  return new Response(file, {
    headers: { "Content-Type": MIME[ext] ?? "application/octet-stream", "Cache-Control": "no-cache" },
  });
}

/* --- sunucu --- */
Bun.serve({
  port: PORT,
  idleTimeout: 30,
  async fetch(req) {
    const { pathname } = new URL(req.url);
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        req.headers.get("x-real-ip") || "local";
      return api(req, pathname, ip);
    }
    return serveStatic(pathname);
  },
});

console.log(`◆ Cubiq sunucu → http://localhost:${PORT}/  (PostgreSQL 17: ${dbUp ? "bağlı" : "KAPALI"})`);

/* düzgün kapanış */
process.on("SIGTERM", async () => { await db.$disconnect(); process.exit(0); });
process.on("SIGINT", async () => { await db.$disconnect(); process.exit(0); });
