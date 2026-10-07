# ◆ Cubiq

Block Blast'den ilham alan, **tek kod tabanından web + iOS + Android**'de çalışan premium blok patlatma bulmaca. Sıfır bağımlılık — hiçbir kurulum gerekmeden tarayıcıda çalışır.

## 🗺️ v16 — Macera modu

Yeni **MACERA** düğmesi: 10 hedefli bölüm (puan yap, çizgi temizle, seri/combo yakala). HUD'daki hedef çibi her hamlede ilerlemeyi gösterir; hedefe ulaşınca konfeti + **hamle sayısına göre 1-3 yıldız** + altın bonus kazanır, sonraki bölüm açılır ("SONRAKİ BÖLÜM" ile anında devam). Bölüm tıkanırsa "Bölüm Başarısız" ekranı gelir ve aynı bölümü tekrar denersin — menüden her zaman son açılan bölümden devam edersin. İlerleme (`cubiq.adv`: açılan bölüm + bölüm yıldızları) kalıcıdır ve bulut yedeğe dahildir.

## 💎 v9 — Yeni assetler + akıllı ipucu

- **3 blok stili:** Ayarlar → Blok stili — **Candy** (klasik), **Elmas** (keskin faset + iç kıvılcım, yeni varsayılan) ve **Neon** (koyu cam + parlayan çerçeve). Her stil sprite önbelleğinde ayrı üretilir, canlı önizlemeli.
- **💡 Akıllı ipucu:** HUD'daki ampul düğmesi tüm geçerli hamleleri puanlayıp en iyisini (çizgi tamamlayan) tahtada nabızlı çerçeveyle gösterir. İpucu kullanmadan 2000 puan = "Saf Zeka" rozeti.
- **3 yeni rozet:** Saf Zeka, Alışkanlık (3 farklı günde günlük görev), Koleksiyoner (10.000 toplam puan) → toplam 15 rozet.

## ✨ v8 — Premium cila

- **Tutarlı SVG ikon seti:** tüm arayüz emoji'siz — elle çizilmiş çizgi ikonlar (temayla renklenir)
- **Açılış splash'i:** CUBIQ logosuyla sinematik giriş; `prefers-reduced-motion` tercihinde atlanır
- **Ekran geçişleri:** menü ↔ oyun yumuşak geçiş, oyun sonu panelinde kademeli satır animasyonu
- **📅 Günlük Görev modu:** tohumlanmış (mulberry32) rastgelelik sayesinde **herkese aynı gün aynı parça dizisi**; liderliğe ayrı mod olarak işlenir, günün en iyi skoru saklanır
- **Skor sparkline'ı:** oyun sonunda son 10 oyunun SVG grafiği + ortalama
- **Erişilebilirlik:** aria-label'lar, hareket azaltma desteği; patlama sesine yankı katmanı

## ⌨️ v13 — Klavye desteği

Masaüstünde mouse'suz oyna: **1-2-3** ile parça seç, **ok tuşlarıyla** tahtada gez, **Enter** ile bırak, **Escape** ile iptal/duraklat. Duraklatmadayken girişler kilitlidir; fareye dönmek için tıklaman yeterli.

## 🪙 v12 — Coin ekonomisi

Oyun sonunda **altın kazanırsın** (skor/200 + tam temizlik 25). Menüde kasa çipi göze çarpar; klasik modda ücretsiz devam jetonunu kullandıktan sonra **30 altın ödeyip bir kez daha** devam edebilirsin (Ayarlar'daki yaşam boyu kutusunda da bakiye görünür).

## 🟣 v11 — XP / Seviye sistemi

Her oyun **skor/50 kadar XP** kazandırır (en az 1). Menüde mor "SV" çipi ve XP çubuğu ilerlemeni gösterir (kare eğri: SV2=100, SV3=400, SV4=900 XP); seviye atladığında konfeti + toast kutlaması gelir.

## 📡 v14 — Çevrimdışı PWA

İlk açılıştan sonra **Service Worker** uygulama kabuğunu önbelleğe alır: internet olmasa da oyun açılır ve oynanır (liderlik/bulut özellikleri çevrimdışında sessizce askıya alınır). Ayarlar'da "Çevrimdışı mod" durumu görünür.

## 🪟 v15 — Cam teması (glassmorphism)

Yeni **"Cam" teması**: pastel açık zemin, buğulu cam paneller (`backdrop-filter: blur(16px) saturate(160%)`), beyaz cam HUD çipleri ve ışık dostu blok paleti — herkese açık. Tema sistemi artık **koyu/açık arayüz modunu** destekler: tüm arayüz renkleri CSS değişkenleriyle temaya bağlıdır; canvas katmanı (tahta paneli, yuvalar, vinyet, ışımalar) da tema başına özelleşir.

## ⭐ v10 — Yıldız derecelendirme

Oyun sonunda performansın rekorunun oranına göre **1-3 yıldız** kazanılır (≥%100 → 3, ≥%60 → 2, aksi 1); yıldızlar altın pop animasyonuyla panelde belirir, toplam yıldız sayacı kalıcıdır ve ayarlarda görünür.

## 🌍 Tam yığın (fullstack) modu — v7

Oyun artık gerçek bir istemci-sunucu uygulaması (`serve.ps1` = uzun soluklu sunucu görevi):

- **Küresel liderlik tablosu:** oyun sonunda skor sunucuya gönderilir (`POST /api/score`), panelde "🌍 GLOBAL TOP 5 — sen #N" listesi görünür (`GET /api/leaderboard`, NDJSON).
- **Bulut yedeği:** Ayarlar → ☁️ YEDEKLE / GERİ YÜKLE (`POST|GET /api/save`) — tüm ilerlemen sunucuda `data\` klasöründe saklanır.
- **Veri katmanı üçlüsü:** localStorage (birincil) + IndexedDB yansıması (tarayıcı veritabanı yedeği; silinirse otomatik geri yükler) + sunucu dosya veritabanı (10 dk'da bir otomatik yedek, son 5 kopya).
- **Sağlık ucu:** `GET /api/health` → çalışma süresi + kayıt sayısı.
- **Dayanıklılık:** sunucu kapalıysa oyun sessizce yerel moda döner; hiçbir şey bozulmaz.
- **Yük testi:** `stress-test.ps1` — 40 kademeli skor gönderimi (arka plan görevi).

Tüm bunlar Node'suz çalışır: sunucu saf PowerShell (`serve.ps1`), veritabanı düz dosyalar.

## Hemen oyna

- **En hızlı:** `index.html` dosyasını çift tıklayıp tarayıcıda aç.
- **Ya da yerel sunucu ile:**
  - Node varsa: `node serve.js` → http://localhost:8123
  - Node yoksa (Windows): `powershell -NoProfile -ExecutionPolicy Bypass -File serve.ps1` → http://localhost:8137
- Telefon/PWA: aynı adresi mobil tarayıcıda açıp "Ana ekrana ekle" deyebilirsin.

## Premium ne demek (v2 + v3)

- **Ana menü:** Gradient CUBIQ logosu, iki mod düğmesi (üzerinde mod rekorları), Nasıl Oynanır ve Ayarlar.
- **İki mod:** **Klasik** (sonsuz) ve **Zamana Karşı** (2 dakika, son 10 saniyede kırmızı nabız + tık sesi). Rekor mod başına saklanır.
- **Duraklatma:** ⏸ veya ESC — Devam / Yeniden Başlat / Ana Menü; süre arkada otomatik durur.
- **Puanlar (v4 — katsayılar yükseltildi):** yerleştirme hücre başına **2 puan**; çizgi tabanı **200** (2 çizgi 600, 3 çizgi 1200, 4 çizgi 2000); seri çarpanı adımı **0,5** — HUD'da 🔥 SERİ ×N çipi canlı gösterir.
- **Patlama şöleni:** patlayan bloklar fiziksel kırıklara ayrılır, şok dalgası halkası yayılır, yerleşmede toz efekti çıkar.
- **Kalıcı veritabanı (`js/store.js`):** şema sürümlü migrasyon zinciri (v1→v4, eski rekorlar asla kaybolmaz) + yaşam boyu istatistikler (oyun sonu ve ayarlarda görünür).
- **Optimizasyon:** sprite önbelleği, parçacık bütçesi (240), yerinde dizi sıkıştırma, Map yeniden kullanımı — 60 FPS.
- **Seri ateşi:** Üst üste patladıkça tepsideki parçalar alev alır — seri, çarpanı büyütür; patlamayan tek hamle alevi söndürür.
- **Skor:** Animasyonlu sayan skor, 👑 rekor işaretçili ilerleme çubuğu; rekoru geçince çubuk altın olur.
- **Övgü merdiveni:** GÜZEL! → MUHTEŞEM! → EFSANE! → İNANILMAZ! + SERİ ×N.
- **Premium görsel (v5 cilalı):** candy bloklar (köşe ışıması + speküler nokta + bevel + damla gölge), derinlikli arka plan (ışımalar + vinyet), seri aurası, çizgi süpürme, yıldız kıvılcımlar, fiziksel blok kırıkları, şok dalgası — hepsi sprite önbelleğiyle 60 FPS.
- **Rekor kutlaması:** yeni rekorde konfeti yağmuru + altın çerçeveli oyun sonu paneli.
- **Juice:** Mobilde titreşim (haptic), zengin ses seti (alma/yerleştirme/geçersiz/patlama/rekor), ekran sarsıntısı.
- **Ayarlar:** Ses, titreşim, rekorları sıfırlama (iki adımlı onay) — hepsi kalıcı.
- **Oyun sonu istatistikleri:** 🔥 toplam çizgi + en iyi seri.
- Eski rekorunuz otomatik taşınır (`blokustasi.best` → `cubiq.best.classic`).

## Nasıl oynanır

1. Alttaki tepsideki 3 parçadan birini ızgaraya sürükle (döndürme yok).
2. Dolu **satır ve sütunlar** aynı anda patlar; tek hamlede çoklu patlama combo bonusu verir (`100 × L × (L+1) / 2`).
3. Üst üste patlamalar seri çarpanı kazanır ve tepsi alev alır.
4. Tepsideki hiçbir parça yerleşemeyince oyun biter. Rekorun cihazda saklanır.

## iOS / Android paketleme (Capacitor)

Aynı dosyalar mağaza uygulamasına dönüşür — oyun koduna dokunulmaz:

```bash
# 1) (Node.js kurulu olmalı) proje kökünde:
npm init -y
npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android

# 2) Web dosyalarını sarmalayıcı klasörüne kopyala:
#    bash:    mkdir -p www && cp -r index.html manifest.json icon.svg css js www/
#    PowerShell: ni -ItemType Directory -Force www | Out-Null;
#                copy index.html,manifest.json,icon.svg www;
#                copy -Recurse css,js www

# 3) Platformları ekle ve derle:
npx cap add android        # Android Studio gerekir
npx cap add ios            # macOS + Xcode gerekir
npx cap sync
npx cap open android       # veya: npx cap open ios
```

`capacitor.config.json` hazırdır (`appId: com.erdem.cubiq` — istediğin paket adıyla değiştir).

## Proje yapısı

```
block-blast/
├── index.html            # iskelet + üst bar (skor çubuğu, taç) + oyun sonu paneli
├── css/styles.css        # Cubiq teması: gradient logo, skor çubuğu, panel
├── js/pieces.js          # şekil aileleri (otomatik döndürme) + renkler + ağırlıklı çekmece
├── js/store.js           # şema sürümlü kalıcı depolama + yaşam boyu istatistikler
├── js/game.js            # saf oyun mantığı: ızgara, yerleştirme, patlatma, puan katsayıları, seri
├── js/renderer.js        # premium sprite'lar, atmosfer, alev/kıvılcım/süpürme animasyonları
├── js/main.js            # pointer girdisi, ses sentezi, haptik, sayan skor, taç çubuğu
├── serve.js / serve.ps1  # sıfır bağımlılıklı yerel sunucu (Node / PowerShell)
├── manifest.json         # PWA
├── capacitor.config.json # iOS/Android sarmalama
└── docs/                 # ana prompt, v1 planı, Cubiq premium planı, test planı
```

## Ayar noktaları (tuning)

- **Parça sıklığı:** `js/pieces.js` içindeki `families` dizisindeki `w` (ağırlık) değerleri.
- **Puanlama:** `js/game.js` başındaki `SCORE` sabiti — `perBlock`, `lineBase`, `streakStep`.
- **Ses & titreşim:** `js/main.js` içindeki `Sfx` ve `vib`.
- **Görsel tempo:** `js/renderer.js` içindeki animasyon süreleri ve parçacık bütçeleri.

## QA

Test planı ve otomasyon notları: `docs/test-plan.md`. Tarayıcı konsolunda `window.__game` kancasıyla durum okunabilir ve hamle yapılabilir (`__game.placeAt(0, 0, 0)`).
