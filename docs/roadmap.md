# Cubiq Yol Haritası

> Block Blast karşılaştırması + özgün fikirler. Planlı 15 dakikalık geliştirme turları buradaki sırayla çalışır: her tur İLK işaretlenmemiş maddeyi alır, uygular, QA'lar ve [x] işaretler.

## Temel durum (v9 itibarıyla TAMAM)
- [x] v1-v9: oyun motoru, premium görseller, 2+1 mod (Klasik/Zamana Karşı/Günlük), temalar, 16 rozet, tam yığın (liderlik + bulut yedek), akıllı ipucu, blok stilleri, akıllı parça dağıtımı, tam temizlik kutlaması, jeneratif müzik
- Tamamlandığı tarih: 2026-10-06

## Sıra bekleyen maddeler (Block Blast kıyası + değer analizi)

- [x] **Yıldız derecelendirme:** oyun sonunda performansa 1-3 yıldız (rekorun %'sine göre eşikler: ≥%100→3, ≥%60→2, aksi 1); panelde yıldız animasyonu + kalıcı toplam yıldız sayacı + ayarlarda gösterim. (2026-10-06, v10) (Block Blast'ın yıldız bonusu benzeri)
- [x] **XP / Seviye sistemi:** her oyun +XP (skor/50, en az 1); menüde SV çipi + XP çubuğu (kare eğri: L2=100, L3=400, L4=900 XP); seviye atlamada konfeti + toast. (2026-10-06, v11)
- [x] **Madalya/coin ekonomisi:** oyun sonunda coin kazanımı (skor/200 + tam temizlik 25); menüde kasa çipi; devam jetonu coin ile ikinci kez alınabilir (30 altın, oyun başına 1). (2026-10-06, v12)
- [x] **Macera modu v1:** hedefli 10 bölüm (puan/çizgi/seri/combo hedefleri); tamamlanınca sonraki açılır (adv.unlocked); hamle sayısına göre bölüm başına 1-3 yıldız + altın bonus (10+idx·2); HUD hedef çipi, "SONRAKİ BÖLÜM" düğmesi, "Bölüm Başarısız" durumu; menü MACERA düğmesi son açılan bölümden devam eder. (2026-10-06, v16)
- [x] **Klavye desteği (masaüstü erişilebilirlik):** 1/2/3 ile parça seç, ok tuşlarıyla hedef gez (sınır kırpma), Enter bırak, Escape iptal; duraklatmadayken girişler kilitli; fare dokunuşu klavye modundan gracefully çıkar. (2026-10-06, v13)
- [ ] **Ekran sarsıntısı aç/kapa** ayarı (hassasiyeti olan oyuncular için).
- [x] **Service Worker:** tam çevrimdışı PWA (kurulunca internet olmadan oynanır — Block Blast'ın "offline play" karşılığı). Uygulama kabuğu cache-first + arka planda tazeleme; /api uçları daima ağa gider. (2026-10-06, v14)
- [x] **Cam teması (glassmorphism + açık mod)** — kullanıcı talebi: 6. tema "Cam" (pastel açık zemin, buğulu cam paneller `backdrop-filter: blur(16px)`, herkese açık); tüm arayüz renkleri CSS değişkenlerine taşındı (`--text/--surface/--panel-a…`), koyu/açık mod dönüşümü `ui` alanıyla; canvas katmanı (panel, yuvalar, vinyet, ışımalar) tema başına özelleşti. (2026-10-06, v15)
- [ ] **Combo zinciri görseli:** ardışık combo'larda tahta kenarlarında artan ateş efekti.
- [ ] **Oyun sonu karşılaştırma:** "geçen oyuna göre +%X" göstergesi ve en iyi 3 oyun listesi.

## Bilinen eksikler (Block Blast kıyası, öncelik sırası)
1. ~~Macera/bölüm modu~~ — v16'da 10 bölümlük Macera modu eklendi; ileride bölüm sayısı artırılabilir (Block Blast'ta 250+).
2. ~~Yıldız sistemi~~ — v10'da eklendi; v16'da macera bölümlerine de taşındı.
3. ~~Coin/ödül ekonomisi~~ — v12'de eklendi.
4. ~~Offline PWA~~ — v14 Service Worker ile tamam.
