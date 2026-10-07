# Cubiq v6 — "Uzun Ömür" Planı

> Hedef: oyunu saatlerce oynanır kılmak — ilerleme, koleksiyon, geri dönüş ve atmosfer.

## CEO
Premium bir bulmacanın geri dönüşü üç ayakta durur: **ilerleme hissi** (temalar), **koleksiyon** (rozetler) ve **ritüel** (günlük seri). v6 bu üçünü kalıcı veritabanına bağlar.

## Ürün Yöneticisi — Kapsam
1. **Tema sistemi (5 tema):** Okyanus (başlangıç), Gün Batımı (100 çizgi), Orman (250), Şeker (500), Neon (1000). Palet + arka plan üçlüsü anında değişir; kilit koşulu yaşam boyu çizgi.
2. **12 rozet:** ilk patlama, çizgi (25/100/500), seri (×1.5/×2.5/×3.5), skor (1000/3000), combo (3/4 çizgi), 10 oyun. Açılınca toast bildirimi; 🏆 paneli menüden.
3. **Devam jetonu:** klasik modda oyuncu başına 1 kez — alt 4 satır animasyonla temizlenir, oyun sürer.
4. **Jeneratif müzik:** WebAudio ile Am-F-G-Em akor pedi + seyrek arpej; ses efektlerinden bağımsız anahtar.
5. **Günlük giriş serisi:** ardışık günlerde menüde 🔥 rozeti + toast.
6. **Zamana Karşı bonusu:** tek hamlede 4+ çizgi = **+10 saniye** (strateji katmanı).
7. **Oyun sonunda "rekoruna %X ulaştın"** yakınlık göstergesi.

**Hariç:** günlük seed'li zorluk (v7), çevrimiçi sıralama, mağaza.

## CTO
- `js/themes.js`: palet üretici (`tintHex` ile light/dark türetme) → `let COLORS` global; tema değişince yeniden atanır, sprite önbelleği `retheme()` ile tazelenir.
- Rozetler `cubiq.badges` (JSON dizi); koşul motoru her hamle + oyun sonunda çalışır.
- Şema **v5**: migrasyon zinciri korunur (v1→v5), eski veriler asla kaybolmaz.
- Müzik: ayrı AudioContext, lookahead'siz basit zamanlayıcı (3.7s akor döngüsü), ilk kullanıcı jestiyle başlar (tarayıcı politikası).

## UX
- Ayarlar → 🎨 Tema ızgarası: palet damlaları + seçili/kilitli durumu.
- Rozet kartları: açılanlar altın çerçeve, kilitliler griler 🔒.
- Toast'lar üstte kademeli iner, 3 sn'de kaybolur.

## Veri
Yeni kalıcı alanlar: `cubiq.badges`, `cubiq.theme`, `cubiq.music`, `cubiq.lastPlay`, `cubiq.playStreak`.
