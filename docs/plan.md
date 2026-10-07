# Blok Ustası — Planlama Dokümanı

## CEO — Stratejik Çerçeve

- **Kimin için:** Gün içinde kısa oturumlar halinde "bir el daha" oynayan kazel-bulmaca oyuncuları (Block Blast kitlesi: toplu taşima, kuyruk, mola).
- **Problem:** Benzer oyunların kaliteli, reklamsız ve kurulum gerektirmeyen bir web sürümü zor bulunuyor. Aynı oyunun telefonlarda da olması gerekiyor ama iki ayrı native kod tabanı küçük ekip için maliyet.
- **Çözüm:** Tek HTML5 kod tabanı; web'de anında oynanır, Capacitor ile mağaza sürümlerine dönüşür.
- **Başarı ölçütü:** İlk oturumda ortalama 3+ oyun; masaüstü ve telefonda akıcı 60 FPS; üç platforma çıkış maliyeti yalnızca paketleme.
- **V1'de yapMAYAcAğımız:** Hesap sistemi, çevrimiçi sıralama, reklam SDK, çoklu dil. Bunlar kapsamı şişirir, çekirdek eğlenceyi geciktirir.

## Ürün Yöneticisi — PRD

**Kapsam (MVP — bu teslim)**

- **Dahil:** 8×8 ızgara, 3'lü parça tepsisi, sürükle-bırak (fare + dokunmatik), satır/sütun patlatma, combo + streak puanlama, kalıcı rekor, yerleşme/patlama animasyonları, parçacık + ekran sarsıntısı, uçan puan yazıları, kapatılabilir ses, oyun sonu ekranı, PWA meta'ları, Capacitor yapılandırması.
- **Hariç:** Parça döndürme, geri alma, hesaplar, çevrimiçi skor tablosu, reklamlar, temalar, çoklu dil.

**Kullanıcı hikâyeleri**

1. Oyuncu olarak bir parçayı ızgaraya sürükleyip bırakmak istiyorum, çünkü oyunun temel eylemi bu.
   *Kabul:* Geçerli hedefte hücreler yarı saydam renkle önizlenir; geçersiz yerde bırakılırsa parça tepsisine geri döner, skor değişmez.
2. Oyuncu olarak dolu satırın/sütunun patladığını net görmek istiyorum, çünkü geri bildirim tatmin olmalı.
   *Kabul:* Beyaz flaş + küçülme + parçacık + "+puan" uçuşu; 2+ çizgide ekran hafifçe sarsılır ve büyük combo yazısı çıkar.
3. Oyuncu olarak rekorumu kalıcı görmek istiyorum.
   *Kabul:* Depolamada saklanır; rekor kırılınca oyun sonunda "YENİ REKOR" rozeti.
4. Mobil oyuncu olarak parmağım parçayı kapatmadan oynamak istiyorum.
   *Kabul:* Dokunmatikte parça, parmağın ~1,5 hücre üstünde sürüklenir.
5. Oyuncu olarak sesi kapatabilmek istiyorum.
   *Kabul:* 🔊/🔇 düğmesi; tercih hatırlanır.
6. Oyuncu olarak oyunun bittiğini net bilmek istiyorum.
   *Kabul:* Tepsideki hiçbir parça yerleşemeyince karartılmış overlay: skor, rekor, Tekrar Oyna.

**Fazlar**

- **MVP (bu teslim):** Yukarıdaki her şey.
- **v1:** Günlük görev + ödül, temalar, yerel istatistik ekranı.
- **v2:** Çevrimiçi skor tablosu, "reklam izle → ekstra hamle", mağaza yayınları.

**Puanlama kuralı (netleştirilmiş):** Yerleştirme = blok sayısı kadar puan. Aynı anda L çizgi = `100 × L × (L+1) / 2` (1 çizgi 100, 2 çizgi 300, 3 çizgi 600, 4 çizgi 1000). Üst üste patlama serisi n'de çarpan `1 + 0,25 × (n−1)`.

## CTO — Mimari ve Teknoloji

**Kararlar ve gerekçeler**

- **Vanilla JS + Canvas 2D, sıfır bağımlılık.** Tek WebView'de 60 FPS'ye ulaşmanın en kısa yolu; çift tıkla açılabilir; Capacitor sarmalaması sorunsuz. (React Native/Flutter web tarafını ikincilleştiriyordu; Phaser'ın bağımlılık ağırlığı bu oyun için gereksiz.)
- **Klasik `<script>` etiketleri, ES module değil:** `file://` üzerinden çift tıkla çalışabilsin (module CORS'a takılır).
- **Katmanlar:** `pieces.js` (şekil havuzu, ağırlıklı rastgele) → `game.js` (arayüzden bağımsız saf oyun mantığı) → `renderer.js` (canvas düzeni + animasyonlar) → `main.js` (girdi, ses, başlatma). Mantık katmanı UI'sız olduğu için test edilebilir.
- **Kalıcılık:** localStorage, try/catch sarmalayıcıyla (depolama kapalıysa oyun çökmez).
- **Test kancası:** `window.__game` — QA otomasyonu oyun durumunu okuyup hamle yapabilir.
- **DPR tavanı 2,5:** Çok yüksek piksel yoğunluğunda performans koruması.

**Riskler ve önlemler**

| Risk | Önlem |
|---|---|
| Dokunmatikte sayfa kaydırması sürüklemeyi bozar | `touch-action: none` + `overscroll-behavior: none` + preventDefault |
| iOS Safari adres çubuğu/safe-area | `viewport-fit=cover` + `env(safe-area-inset-*)` |
| Sentezlenen ses ilk dokunuşta çalınmaz | AudioContext ilk jest içinde oluşturulur + resume |
| Çok yüksek DPR'da yavaşlık | dpr 2,5 ile sınırlandı |
| setPointerCapture sentetik/eski işaretçide hata fırlatır | try/catch |

**Çapraz platform yolu:** Aynı dosyalar `www/` altına kopyalanır → `npx cap add android/ios` → Xcode/Android Studio derlemesi. Web'den ayrıca PWA olarak "Ana ekrana ekle" ile kurulabilir.

## UX/UI Tasarımcı — Ekran Akışı ve Dil

- **Tek ekran:** Üst bar (marka · SKOR · REKOR · ses) → tahta (kare, ortalanmış) → tepsi (3 yuva).
- **Sürükleme dili:** Parça tepside küçük (~%55), sürüklerken tam boy; hedef hücreler yarı saydam renk önizleme; tamamlanacak satır/sütun beyaz nabızla parlar; geçersiz hedefte önizleme yok.
- **Geri bildirim:** Yerleşmede elastik büyüme (easeOutBack); patlamada flaş → küçülme + parçacık + "+puan"; combo'da büyük yazı (GÜZEL! / ÇİFT TEMİZLİK! / ÜÇLÜ TEMİZLİK! / EFSANE!), seri ≥3'te "SERİ ×N".
- **Palet:** Gece lacivert radyal zemin; 7 renk candy blok (açık→koyu dikey geçiş + üst parlama); yüksek kontrast; geniş yuvarlak köşeler.
- **İlk açılış:** 7 saniyede kaybolan tek satır ipucu.

## Veri Analisti — KPI (v1 telemetrisinde ölçülecek)

| KPI | Hedef | Ölçüm |
|---|---|---|
| Oturum başına oyun sayısı | ≥ 3 | Olay sayacı |
| Ortalama skor (ilk 5 oyun) | Artış trendi | Yerel istatistik |
| Ses kapatma oranı | < %30 | Yerel bayrak |
| D1 geri dönüş | ≥ %25 | Anonim telemetri (v2) |

MVP'de telemetri yok — hiçbir veri cihaz dışına çıkmaz.
