# Cubiq Premium — v2 Planı

> Block Blast analizi temel alınarak hazırlanmış "premium his" yükseltmesi.

## Block Blast incelemesi — premium yapan 3 şey

1. **Seri (streak) ekonomisi:** Asıl yüksek skor, kırılmayan patlama serilerinden gelir; her üst üste patlama çarpanı büyütür, tek bir patlamayan hamle her şeyi sıfırlar. Oyunun gerilimi "seriyi kaybetme korkusu" üzerine kurulu.
2. **Katmanlı juice:** Her eyleme titreşim + parçacık + ses + tırmanan animasyon eklenir; seri sürerken **tepsi alev alır** (ikonik görsel).
3. **Skor geri bildirimi:** Sayaç animasyonlu sayar, hedef/rekor görselleştirilir; övgü metinleri tırmanır.

Kaynaklar: theblockblast.com, qgreptides.com (combo/streak mekaniği), webbcanyonchronicle.com (juice/retansyon analizi) — bağlantılar final raporda.

## CEO — Strateji

- **Konumlandırma:** Cubiq = reklamsız, "el yapımı" hissi veren premium blok bulmaca. Kalite sinyali ilk 5 saniyede algılanmalı (görsel + ses + titreşim).
- **Başarı ölçütü:** Seri mekaniği görünür hale gelsin (ateş + taç çubuğu); oyuncu "bir el daha" hissini taşımaya başlasın.
- **Yapmayacaklarımız (v2'de):** Hesap, çevrimiçi özellikler, reklam, tema mağazası, günlük görev. Bu teslim çekirdek hissi mükemmelleştirir.

## Ürün Yöneticisi — Kapsam

**Dahil (v2):**
1. Marka: **Cubiq** (başlık, logo, manifest, Capacitor, depolama anahtarları + eski rekorun otomatik taşınması)
2. Premium blok: parlak candy gövde + bevel + damla gölge (sprite önbelleğiyle 60 FPS)
3. **Streak ateşi:** seri ≥2 iken tepsideki parçalar alev içinde (parçacık + additive glow)
4. Skor: animasyonlu sayma, 👑 rekor işaretçili ilerleme çubuğu, altın dolgu rekoru geçince
5. Övgü merdiveni: GÜZEL! → MUHTEŞEM! → EFSANE! → İNANILMAZ! + SERİ ×N (seri ≥2'de görünür)
6. Çizgi temizliğinde beyaz süpürme efekti + yıldız kıvılcımları
7. Arka plan atmosferi: süzülen soluk renkli bloklar
8. Titreşim (mobil haptic), zengin ses seti (alma/yerleştirme/geçersiz/patlama/rekor)
9. Yeniden başlat düğmesi (↺)
10. Oyun sonu istatistikleri: toplam çizgi + en iyi seri
11. İpucu balonu yalnızca ilk oyunda (rekor 0 iken) görünür

**Hariç:** Temalar, günlük ödül, "devam et" (revive), çoklu dil, çevrimiçi sıralama.

**Kabul kriterleri (öz):**
- Streak ≥2'de tepside alev parçacıkları akar; patlamayan hamlede alev söner ve sesle bildirilir.
- Skor hamleden sonra ~0,5 sn içinde yumuşakça sayar; rekor taç çubukta işaretlidir; rekor geçilince çubuk altın olur.
- Eski rekor (blokustasi.best) Cubiq ilk açılışında otomatik taşınır.
- 60 FPS hedefi korunur (sprite cache; partikül bütçesi sınırlı).

## CTO — Teknik kararlar

- **Sprite cache:** Her renk × taban boyut (tahta hücresi, tepsi hücresi) için tek offscreen canvas; bevel/gölge/parlama bir kez çizilir, her kare `drawImage` ile basılır. Ölçek animasyonları aynı sprite'ı ölçekleyerek kullanır. `resize`'da önbellek tazelenir.
- **Alev & kıvılcım:** Tek parçacık sistemi üç türle (`sq`, `spark`, `flame`); alev `lighter` kompozit ile glow verir. Parçacık ömrü ≤ 900 ms, süpürme çubuğu 300 ms.
- **Depolama migrasyonu:** `cubiq.best` / `cubiq.mute` yoksa `blokustasi.*` okunur ve Cubiq anahtarına yazılır.
- **Sayma animasyonu:** Görüntülenen skor RAF döngüsünde `%16` adımla hedefe yaklaşır; aşağı yönde anlık snap (sıfırlama ani görünsün).
- **Titreşim:** `navigator.vibrate` guard'lı; yerleştirme 8 ms, patlama desenli, oyun sonu çift vuruş.

## UX — Görsel dil

- Üst bar: gradient "CUBIQ" logosu solda; ortada büyük skor + altında taç işaretçili ince ilerleme çubuğu; sağda 👑 rekor çipi, ↺ ve 🔊.
- Blok: dikey candy gradyanı + iç bevel çerçeve + üst parlama + yumuşak damla gölge.
- Tahta paneli: üst kenar ışığı + alt iç gölge; yuvalar korundu.
- Oyun sonu paneli: skor/rekorun altında tek satır istatistik (🔥 çizgi · en iyi seri ×N).

## Veri Analisti

- KPI'lara eklenenler: **ortalama en uzun seri** ve **oyun başına çizgi sayısı** (v2'de oyun sonu panelinde oyuncuya da gösterilir; telemetri yine yok).
