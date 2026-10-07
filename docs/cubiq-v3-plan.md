# Cubiq v3 — "Tam Donanımlı" Planı

> Geri bildirim: "ana sayfası bile yok" → menü/ekran sistemi + modlar + ayarlar bu sürümün özü.

## CEO

Cubiq artık bir "web sayfası oyunu" değil, **ürün** gibi açılacak: logo, mod seçimi, ayarlar. Başarı ölçütü: açılışta 2 net yol (Klasik / Zamana Karşı) ve her yerden ana menüye dönüş.

## Ürün Yöneticisi

**Ekran haritası:** Ana Menü → Oyun (HUD) → Duraklatma / Oyun Sonu; Ayarlar + Nasıl Oynanır üstünden açılan modaller.

**Modlar:**
- **Klasik:** sonsuz, tahta dolunca biter (mevcut).
- **Zamana Karşı:** 2 dakika, en yüksek skor; son 10 saniyede kırmızı nabız + son 5 saniyede tık sesi. Rekor mod başına ayrı saklanır.

**Ayarlar:** Ses aç/kapa, titreşim aç/kapa, rekorları sıfırla (iki adımlı onay). Tüm tercihler kalıcı.
**Nasıl Oynanır:** 4 maddelik görsel rehber.
**Duraklatma:** ⏸ düğmesi veya ESC; süre durur, giriş kilitlenir; Devam / Yeniden Başlat / Ana Menü.

**Hariç:** Hesap, çevrimiçi, tema mağazası, seviye modu (v4 adayı).

## CTO

- Ekran yöneticisi: `.screen.active` + `pointer-events`; canvas **tüm ekran sabit** katman (z0), menüde yalnız atmosfer çizilir (`setMenuMode`), oyunda HUD yüksekliği kadar `L.top` ofsetiyle tahta hizalanır.
- Zamanlayıcı RAF döngüsünde `dt` ile işler; sekme arka plana geçince otomatik durur (tarayıcı davranışı bizim lehimize).
- Depolama: `cubiq.best.classic` / `cubiq.best.time` (eski `cubiq.best` klasik'e taşınır), `cubiq.vib`.
- Oyun sonu başlığı nedene göre: "OYUN BİTTİ" / "SÜRE BİTTİ!".

## UX

- Menü: gradient CUBIQ logosu (yüzüyor), renkli blok saçakları, gradyan mod düğmeleri (üzerinde mod rekoru), sıralı giriş animasyonu.
- HUD: küçük logo + büyük skor + taç çubuğu + (zaman modunda) ⏱ çipi + ⏸ ↺ 🔊.
- Panellerde birincil + hayalet düğme ayrımı.

## Veri

Mod başına rekor ayrımı yeni KPI: "hangisi daha çok oynanıyor" (v4'te sayaçla).
