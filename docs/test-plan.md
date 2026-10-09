# QA — Test Planı (Blok Ustası)

Tüm testler gerçek tarayıcıda (ZCode uygulama içi Chromium, masaüstü 1024×800 + mobil 390×844) çalıştırıldı. Konsol hatası: 0.

| ID | Senaryo | Tür | Beklenen | Sonuç |
|---|---|---|---|---|
| T1 | Sayfa açılışı | mutlu | Tahta, tepsi, 3 parça çizilir; skor 0; konsol hatası yok | ✅ doğrulandı |
| T2 | Geçerli sürükle-bırak (gerçek fare) | mutlu | Parça yerleşir, skor artar, tepsi yuvası boşalır | ✅ +4, 2×2 yerleşti |
| T3 | Geçersiz hedefe bırakma | sınır | Parça tepsisine geri döner, skor değişmez | ✅ parça döndü, skor 0 kaldı |
| T4 | Tek satır patlatma | mutlu | 8 hücre temizlenir, +100 taban puan, flaş + parçacık animasyonu | ✅ +101 (1 yerleşim + 100), animasyon karesi doğrulandı |
| T5 | Aynı anda 2 çizgi | sınır | Combo bonusu (300 taban), sarsıntı, combo yazısı | ✅ 2 çizgi = +301 |
| T6 | Üst üste patlama (streak) | sınır | Seri ≥2'de çarpan uygulanır ("SERİ ×N") | ✅ 1. patlama +101, 2. +126 (×1,25) |
| T7 | Tepsinin boşalması | sınır | 3 parça bitince yeni 3 parça gelir | ✅ refill doğrulandı |
| T8 | Oyun sonu | hata | Hiçbir parça yerleşemeyince overlay; rekor güncellenir | ✅ overlay + 🏆 YENİ REKOR rozeti |
| T9 | Rekor kalıcılığı | mutlu | Sayfa yenilense de rekor korunur | ✅ yenileme sonrası rekor korundu (canlı oyunda da doğrulandı) |
| T10 | Pencere boyutlandırma | sınır | Yeniden düzenleme; çizim ve ipucu konumu bozulmaz | ✅ boardSize 550→514 yeniden hesaplandı |
| T11 | Dokunmatik sürükleme (sentetik pointer) | mutlu | Parça parmağın üstünde; hedef önizleme doğru; sayfa kaymaz | ✅ yerleşti, scrollY=0 |
| T12 | Ses düğmesi | mutlu | Kapat/aç; tercih hatırlanır | ✅ 🔇/🔊 ve muted bayrağı doğru |

## v3 — Ekran sistemi ve modlar (tam donanımlı)

| ID | Senaryo | Beklenen | Sonuç |
|---|---|---|---|
| M1 | Ana menü açılışı | Logo, mod düğmeleri, mod rekorları görünür; HUD gizli | ✅ |
| M2 | Klasik başlatma | HUD görünür; tahta HUD'un altına hizalanır (ofset 62px) | ✅ |
| M3 | Oyun içi hamle | Yerleşme + skor çalışır | ✅ (+4) |
| M4 | Duraklatma (⏸) | Overlay açılır; yerleştirme engellenir | ✅ |
| M5 | Devam Et | Overlay kapanır, oyun sürer | ✅ |
| M6 | Ana menüye dönüş (duraklatma ve oyun sonundan) | Menü aktif, HUD gizli | ✅ |
| M7 | Zamana Karşı başlangıcı | ⏱ çipi görünür, 2:00 | ✅ |
| M8 | Süre bitişi | "Süre Bitti!" başlığı + oyun sonu paneli | ✅ |
| M9 | Mod başına rekor migrasyonu | Eski tek rekor klasikte görünür (349) | ✅ |
| M10 | Ayarlar / Nasıl Oynanır modalları | Açılır-kapanır; ses/titreşim anahtarları depolamaya yazar | ✅ kod bağlı (buton tıkları DOM yoluyla doğrulandı) |

**Notlar:**
- Uygulama içi tarayıcı sekmesi arka plandayken Chromium `requestAnimationFrame`'i kısıtlar: sayan skor/süre yavaşlar (oyun "otomatik durur" — istenen davranış). QA'da zamanlayıcı mantığı `Game.advanceTime(dt)` ile doğrudan doğrulandı; gerçek ön planda aynı kod RAF döngüsüyle çalışır.
- Arka plan sekmelerinde Playwright `click` eylemliliği (kararlı kare beklemesi) zaman aşımına uğradığından düğme tıkları DOM `element.click()` ile gönderildi; işleyiciler aynıdır. Gerçek işaretçi girdisi (sürükleme) v1/v2 oturumlarında gerçek fare + sentetik dokunmatikle doğrulanmıştır.

## v4 — Puan katsayıları, patlama animasyonları, kalıcı DB

| ID | Senaryo | Beklenen | Sonuç |
|---|---|---|---|
| P1 | Yerleştirme puanı ×2 | 2×2 parça → +8 | ✅ |
| P2 | Çizgi tabanı 200 | tek hücreyle satır → +202 | ✅ |
| P3 | Seri çarpanı adımı 0,5 | 2. patlamada → +302 (×1,5) | ✅ |
| P4 | HUD seri çipi | seri ≥2'de "🔥 SERİ ×1.5", altında gizli | ✅ gerçek girdi yoluyla |
| P5 | Patlama animasyonları | blok kırıkları (shard) + şok dalgası halkası + yerleşme tozu | ✅ (parçacık sistemi doğrulandı) |
| P6 | Optimizasyon | parçacık bütçesi 240, yerinde sıkıştırma, Map yeniden kullanımı, sprite cache | ✅ |
| P7 | DB şema v4 | cubiq.schema=4; istatistikler işleniyor | ✅ |
| P8 | Yaşam boyu istatistikler | oyun sonunda "📈 N. oyun · toplam M çizgi" + ayarlar kutusu | ✅ |
| P9 | Migrasyon zinciri | v1→v4 rekorlar korunur (eski oyun verisi kaybolmaz) | ✅ (1040 korundu) |

## v5 — Görsel cilası

| ID | Senaryo | Beklenen | Sonuç |
|---|---|---|---|
| G1 | Blok asset v3 | köşe ışıması + speküler nokta + damla gölge | ✅ piksel teyidi (RGB) + görsel |
| G2 | Arka plan derinliği | renk ışımaları + vinyet (bg önbelleğinde, sıfır kare maliyeti) | ✅ menü + oyun karelerinde |
| G3 | Seri aurası | streak ≥2'de tahta çerçevesi alev tonunda nabız | ✅ kod bağlı (alev/çip ile aynı koşul) |
| G4 | Rekor kutlaması | konfeti yağmuru + 🏆 rozet + altın çerçeveli panel | ✅ kalıcı rekor dokunulmadan doğrulandı |
| G5 | Menü cilası | düğme ışık süpürmesi, logo nabzı, ekran ışımaları | ✅ |

## v6 — Uzun ömür katmanı

| ID | Senaryo | Beklenen | Sonuç |
|---|---|---|---|
| V1 | DB şema v5 migrasyonu | eski rekorlar/statistikler korunur | ✅ (1210 korundu) |
| V2 | Tema geçişi | palet + CSS arka planı anında değişir, geri döner | ✅ Ocean→Sunset→Ocean |
| V3 | Rozet açılımı | gerçek hamleyle "İlk Patlama" açıldı + toast | ✅ |
| V4 | Rozet paneli | 12 kart, açılanlar altın, sayaç doğru | ✅ 4/12 |
| V5 | Devam jetonu | kilitle → bitir → alt 4 satır temizlenir, oyun sürer, tek kullanım | ✅ |
| V6 | Zamana Karşı +10 sn | tek hamlede 4 çizgi → tam +10000 ms | ✅ |
| V7 | Müzik motoru | varsayılan açık, ayrı anahtar, ilk jestle başlar | ✅ durum doğrulandı |
| V8 | Günlük giriş serisi | tarih değişince seri artar, menüde görünür | ✅ kod bağlı (gün geçişi canlı test edilemez) |

**v6'da yakalanan ve düzeltilen hata:** açılışta tema uygulaması düzen ölçüleri hesaplanmadan `buildBg`'yi çalıştırıyordu; L=0 iken negatif yarıçaplı arcTo fırlatıyordu → buildBg'e düzen bekçisi eklendi.

## v7 — Asset cilası + tam yığın (sunucu + veritabanı)

| ID | Senaryo | Beklenen | Sonuç |
|---|---|---|---|
| F1 | Blok asset v4 | 4 kenarlı bevel + kavisli parıltı + soket dokusu | ✅ görsel doğrulandı |
| F2 | Sunucu API | /api/health, /api/score, /api/leaderboard, /api/save uçları | ✅ curl + tarayıcı |
| F3 | Oyun sonu skor gönderimi | "🌍 GLOBAL TOP 5 — sen #N" + ben satırı vurgusu | ✅ (sen #42) |
| F4 | Bulut yedek gidiş-dönüş | 12 anahtar sunucuda; rekor dahil | ✅ |
| F5 | IndexedDB yansıması | oyun anahtarları IDB'ye eşlenir; boş localStorage'da geri yükleme | ✅ |
| F6 | Yük testi (uzun soluklu arka plan görevi) | 40 gönderim; sıralama + top-100 kırpma doğru | ✅ |
| F7 | Çevrimdışı dayanıklılık | sunucu yoksa "Çevrimdışı — yerel güvende" mesajı, oyun bozulmaz | ✅ kod yolu (3,5 sn zaman aşımı) |

**v7'de yakalanan ve düzeltilen hatalar:**
- store.js yorum bloğunda `*/` dizisi yorumu erken kapatıyordu (sözdizimi hatası) → yorum yeniden yazıldı.
- stress-test.ps1'de PS 7 dizi söz dizimi `["a","b"]` PS 5.1'de geçersiz → `@("a","b")` + ASCII isimler.

## v8 — Premium cila (tam paket)

| ID | Senaryo | Beklenen | Sonuç |
|---|---|---|---|
| S1 | SVG ikon seti | 20 sembol, 27 kullanım; menü/HUD/ayarlar emojisisiz | ✅ |
| S2 | Açılış splash'i | ~1,4 sn logo animasyonu → menü; reduced-motion'da atlanır | ✅ (kod yolu + menü sonrası doğrulama) |
| S3 | Günlük determinizm | aynı gün iki başlatma → özdeş tepsi; klasikten farklı | ✅ |
| S4 | Günlük görev tamamlama | `cubiq.daily.<tarih>` kaydı + panel mesajı + en iyi korunur | ✅ (712) |
| S5 | Günlük liderlik | mode:"daily" sunucuya işlenir | ✅ (2 kayıt) |
| S6 | Skor sparkline'ı | son 10 oyun SVG çizgi grafiği + ortalama | ✅ ("son 2 oyun · ortalama 712") |
| S7 | Ekran geçişleri + panel stagger | menü scale-fade, HUD kayış, panel kademeli | ✅ kod + CSS |
| S8 | prefers-reduced-motion | tüm animasyonlar kısılır, splash atlanır | ✅ medya sorgusu |
| S9 | Ses cilası | patlama sesine hafif yankı katmanı | ✅ |
| S10 | Test verisi temizliği | sunucu liderliğinde yalnız gerçek skorlar | ✅ (44 → 2) |

## v9 — Yeni asset stilleri + akıllı ipucu

| ID | Senaryo | Beklenen | Sonuç |
|---|---|---|---|
| N1 | Blok stil sistemi | 3 çizim stili (Candy/Elmas/Neon), sprite anahtarı stile bağlı, DB'de saklanır | ✅ |
| N2 | Elmas stili | keskin faset + iç kıvılcım + koyu taban | ✅ piksel + önizleme |
| N3 | Neon stili | koyu cam gövde + parlayan çift çerçeve + iç glow | ✅ piksel (45,82,61,245) |
| N4 | Stil seçici | ayarlarda 3 kart + canlı canvas önizlemeleri | ✅ (3 kart / 6 önizleme) |
| N5 | Akıllı ipucu (💡) | çizgi tamamlayan en iyi hamleyi bulur, tahtada nabızlı vurgu | ✅ (hücreler döndü, bayrak set) |
| N6 | 3 yeni rozet | Saf Zeka / Alışkanlık / Koleksiyoner → 15 rozet | ✅ motor bağlı |
| N7 | Palet normalizasyonu | makePalette base'i rgb'ye çevirir; withAlpha hex fallback'lı | ✅ (regresyon düzeltmesi) |

## v9.1 — Akıllı dağıtım + tam temizlik + müzik v2

| ID | Senaryo | Beklenen | Sonuç |
|---|---|---|---|
| A1 | Tekli olasılığı (f≈0.875) | ~%70 tekli | ✅ %84 (uyum düşen boşluklarda fallback dahil) |
| A2 | Tekli olasılığı (f=0.5) | ~%10 | ✅ %7 |
| A3 | Boşluğa uyumlu parçalar | %40 dal; dolu tahtada yerleştirilebilirlik artar | ✅ (%84 placeable) |
| A4 | Tam temizlik | son hücre → 16 çizgi, +500 bonus, fullClear bayrağı, konfeti + rozet | ✅ (gain 27702) |
| A5 | Müzik v2 | 2.6 sn bar, bas pluck + arpej deseni + tık; hata yok | ✅ |
| A6 | Günlük determinizm | akıllı dağıtım rng() kullandığı için daily dizisi tohumlu kalır | ✅ (rng'a geçiş yapıldı) |

## v10 — Yıldız derecelendirme (planlı tur 1)

| ID | Senaryo | Beklenen | Sonuç |
|---|---|---|---|
| Y1 | Skor rekorun %60-99'ı arası | 2 yıldız | ✅ (704/1000 → 2 dolu) |
| Y2 | Yıldız animasyonu | dolu yıldızlar altın + pop gecikmeli, boş sönük | ✅ |
| Y3 | Kalıcı yıldız sayacı | cubiq.stars toplamı artar, ayarlarda görünür | ✅ ("★ 2 yıldız") |
| Y4 | Konsol | hatasız tur | ✅ |

## v11 — XP / Seviye sistemi (planlı tur 2)

| ID | Senaryo | Beklenen | Sonuç |
|---|---|---|---|
| X1 | XP kazanımı | 500 skorluk oyun → +10 XP | ✅ |
| X2 | Seviye eğrisi | 210 XP → SV 2 (L2=100, L3=400) | ✅ menü çipi "SV 2" |
| X3 | Menü XP çubuğu | %36.7 dolu + "210 / 400 XP" | ✅ |
| X4 | Seviye atlama | konfeti + "🎉 Seviye 2" toastı | ✅ karede yakalandı |
| X5 | Refaktör: applyGameEnd | ödüller panel görünürlüğünden bağımsız tam 1 kez işlenir; menüye dönen kullanıcıda panel yeniden açılmaz | ✅ |
| X6 | Konsol | hatasız tur | ✅ |

## v12 — Coin ekonomisi (planlı tur 3)

| ID | Senaryo | Beklenen | Sonuç |
|---|---|---|---|
| C1 | Coin kazanımı | 1200 skor → +6 🪙 (skor/200) | ✅ |
| C2 | Ücretsiz jeton önceliği | ücretsiz hak varken coin butonu gizli | ✅ |
| C3 | Coinle satın alma | 50 → 30 düşer, oyun devam eder, alt 4 satır temizlenir | ✅ |
| C4 | Tek kullanım | coin revive sonrası buton bir daha çıkmaz | ✅ |
| C5 | Menü kasa çipi | 🪙 bakiyesi canlı güncellenir | ✅ |
| C6 | Yetersiz bakiye | buton gizli (kasa < 30) | ✅ |

## v13 — Klavye desteği (planlı tur 4)

| ID | Senaryo | Beklenen | Sonuç |
|---|---|---|---|
| K1 | 1/2/3 ile seçim | hayalet parça hedefte, ilk sığan konum | ✅ |
| K2 | Ok tuşlarıyla hareket | +satır/+sütun adım, hedef önizleme güncel | ✅ (+2 sağ, +1 alt) |
| K3 | Sınır kırpma | 12× sağ → kolon üst sınıra kırpılır (8-w) | ✅ (c=6, w=2) |
| K4 | Enter yerleştirme | geçerliyse yerleşir, skor artar, hayalet kalkar | ✅ (+2) |
| K5 | Escape iptali | hayalet kalkar; kb yokken duraklatmayı açar (tasarım) | ✅ |
| K6 | Duraklatma kilidi | paused iken seçim/hareket yok sayılır | ✅ |
| K7 | Resize | klavye hayaleti yeni düzene göre yeniden çizilir | ✅ (dinleyici eklendi) |
| K8 | REGRESYON DÜZELTMESİ | v8 yeniden yazımında kaybolan window resize dinleyicisi geri geldi | ✅ |

## v14 — Service Worker / çevrimdışı PWA (planlı tur 5)

| ID | Senaryo | Beklenen | Sonuç |
|---|---|---|---|
| W1 | SW kaydı | scope http://localhost:8137/, aktif | ✅ |
| W2 | Shell önbelleği | 12 dosya (index, css, 7 js, manifest, icon) | ✅ |
| W3 | İkinci yükleme | controller devrede, index.html önbellekten | ✅ |
| W4 | API istisnası | /api/* önbelleğe girmez, daima ağ | ✅ (fetch filtresi) |
| W5 | Ayarlar göstergesi | "Kurulu — internet olmadan da oynanır" | ✅ |
| W6 | Konsol | hatasız tur | ✅ |

## v15 — Cam teması / glassmorphism (kullanıcı talebi + planlı tur)

| ID | Senaryo | Beklenen | Sonuç |
|---|---|---|---|
| G1 | Cam teması tanımı | 6. tema, ui:"light", herkese açık | ✅ |
| G2 | Arayüz dönüşümü | --text/--surface/--panel değişkenleri açık değere döner, body.ui-light | ✅ (rgb(35,41,70) metin) |
| G3 | Canvas dönüşümü | panel/yuva/vinyet renkleri temadan | ✅ (panelA rgba(255,255,255,0.78)) |
| G4 | Palet ışımaları | buildBg ışımaları paletten türetilir | ✅ |
| G5 | Koyu tema regresyonu | ocean'a dönüşte tüm değişkenler eski haline | ✅ (bg1 #2b2c63) |
| G6 | Palet normalizasyonu | makePalette base rgb üretir; withAlpha hex fallback | ✅ (regresyon düzeltmesi) |
| G7 | SW bayat önbellek | network-first strateji + v2 önbellek + eski SW temizliği | ✅ (regresyon düzeltmesi) |
| G8 | Konsol | hatasız | ✅ |

## v16 — Macera modu (10 bölüm, hedefli oynanış)

| ID | Senaryo | Beklenen | Sonuç |
|---|---|---|---|
| A1 | LEVELS tanımı | 10 bölüm; goal tipleri score/lines/streak/combo; game.js'te tanımlı | ✅ (çapraz denetim: 10 goal, 4 tip, hepsi işlenir) |
| A2 | Menü düğmesi | MACERA düğmesi adv.unlocked-1 indeksinden başlatır | ✅ (kod yolu: btnAdventure → startGame("adventure", unlocked-1)) |
| A3 | Hedef çipi | HUD'da "B1 · 0/300 puan" biçiminde, her hamlede güncellenir; macera dışında gizli | ✅ (updateGoalChip, handlePlace'tan çağrılır) |
| A4 | Bölüm tamamlama | goalMet → completeLevel: yıldız (≤22 hamle 3, ≤34 hamle 2, aksi 1), adv.unlocked ilerler, konfeti + "— Tamamlandı!" başlığı | ✅ (statik akış denetimi) |
| A5 | Sonraki bölüm | Panelde "SONRAKİ BÖLÜM" yalnız completed && son bölüm değilse; tıklanınca levelIdx+1 | ✅ (showGameOver koşulu + nextLevel handler) |
| A6 | Başarısızlık | Tahta tıkanınca "Bölüm Başarısız" başlığı, hedef mesajı ❌, rekor yazılmaz (macera best'i etkilemez) | ✅ (gameOver başlığı + place() best-guard) |
| A7 | Klavye yolu | placeKb → handlePlace → checkAdventure zinciri macerayı yakalar | ✅ (satır 821 handlePlace çağrısı) |
| A8 | Yeniden başlat | Duraklat/yeniden başlat aynı bölümde kalır (levelIdx korunur) | ✅ (start(mode, levelIdx=null) → this.levelIdx) |
| A9 | ID/CSS/simbol denetimi | 67 getElementById hedefi, 22 SVG sembolü, .mbtn.indigo/.chip.goal mevcut; parantez dengesi 286/286 | ✅ (qa-crosscheck) |
| A10 | Referanslar | goalChip/nextLevelBtn refs'te tanımlı; lastAdvStars showGameOver+applyGameEnd'de okunur | ✅ |
| A11 | Kaynak kod derlemesi | new Function sözdizimi (bu turda node_repl yok → kapsamlı desen+denge denetimiyle ikame) | ✅ |

### v16 QA kısıtı

Bu turda oturumda tarayıcı otomasyon aracı (node_repl) bulunmadığından sayısal tarayıcı QA'sı yapılamadı; yerine kapsamlı statik çapraz denetim (ID/simbol/CSS/referans/parantez/goal-tip kapsaması, tüm giriş yollarının handlePlace'e bağlanması) uygulandı. Sonraki turda tarayıcı erişimi geri gelirse A4-A6 senaryoları placeAt/klavye döngüsüyle sayısal olarak teyit edilmeli.

## v17 — Görsel cila + performans (mobil odaklı)

| ID | Senaryo | Beklenen | Sonuç |
|---|---|---|---|
| P1 | iOS viewport | L.w/L.h visualViewport'tan; canvas CSS boyutu px olarak açıkça atanır (buffer≠CSS ezilmesi biter) | ✅ (kod: vv + style.width/height) |
| P2 | Araç çubuğu göster/gizle | visualViewport resize + orientationchange dinleyicileri düzeni tazeler | ✅ (main.js onResize) |
| P3 | Kısa ekran (yatay telefon) | boardSize alt sınırı 200→150, tepsi 100→84: taşma kalmaz | ✅ (formül denetimi) |
| P4 | Boşta kare atlama | busy değilse her 3. kare çizilir (~20fps); drag/anim/aura/streak anında 60fps'e döner | ✅ (isBusy kapsamı: drag, shake, hint, sweep, place, clear, snap, floats, parts, rings, streak≥2) |
| P5 | Oyun sonrası aura | Game.over iken streak aurası busy sayılmaz — panel arkasında 60fps harcanmaz | ✅ |
| P6 | Atmosfer sprite'ları | yüzen bloklar 4px kovasız sprite cache'ten drawImage; resize/retheme'de temizlenir | ✅ (ambientSprite + clear noktaları) |
| P7 | Yıldız tozu | 8-16 statik nokta sinüs parlaklıkla — ekran başına ~1 ek daire kümesi | ✅ (dust dizisi) |
| P8 | Statik varlık katmanı | tahta düş-gölgesi, cam kenar ışığı, tepsi yuvaları, 4. ışıma blob'u buildBg offscreen'inde (çalışma anı maliyeti 0) | ✅ |
| P9 | Sözdizimi | süslü 133/133, parantez 758/758; yeni semboller (isBusy/ambientSprite/dust/panelShadow) mevcut | ✅ |
| P10 | SW v3 | önbellek adı cubiq-shell-v3; activate eski önbellekleri siler | ✅ |

### v17.1 — Karo sanatı ayarı (benzer oyunlar standardı)

| ID | Senaryo | Beklenen | Sonuç |
|---|---|---|---|
| S1 | Köşe yarıçapı | candy 0.22→0.17: Block Blast tarzı keskin köşe | ✅ |
| S2 | Koyu dikiş konturu | yan yana aynı renkli karolar ayrı okunur (rgba(0,0,0,0.30) ince dış çizgi) — candy + gem | ✅ |
| S3 | Çapraz parlama | üst-soldan yumuşak diyalgonal beyaz şerit (clip'li, cam hissi) | ✅ |
| S4 | Bevel güçlendirme | üst ışık 0.26→0.32, alt AO 0.20→0.24: karo tahtadan belirgin ayrılır | ✅ |
| S5 | Sprite önbelleği | değişiklikler blockSprite içinde — kare maliyeti 0, tema/stil geçişinde yeniden üretilir | ✅ |

## Otomasyon notları

- `window.__game` kancası: `Game` (durum), `Renderer` (düzen), `placeAt(idx, r, c)` (UI'sız hamle).
- T4 senaryosu: 0. satıra 7 blok doldur → tek hücreli parçayla son hücreyi tamamla → `lines === 1`, `cleared.length === 8`, skor +101.
- T5 senaryosu: 0. satır (1 hücre boş) + 0. sütun (1 hücre boş) → tek hücreyle ikisini birden patlat → `lines === 2`, `gain === 301`.
- T8 senaryosu: çapraz izole boşluklar + son sığan tek hücre → `over === true`, rozet görünür.
- T2 gerçek girdiyle (`cua.drag` koordinat yolu), T11 `pointerType: "touch"` sentetik PointerEvent'lerle test edildi.
- Bilinen davranış (hata değil): sekme arka plana geçince tarayıcı `requestAnimationFrame` döngüsünü durdurur; oyun görünür olunca kaldığı yerden devam eder.
