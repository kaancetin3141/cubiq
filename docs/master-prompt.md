# Görev: "Blok Ustası" — Block Blast tarzı, çapraz platform blok bulmaca

> Sanal Şirket Ekibi'nin Üretim modu için kendimize yazdığımız ana prompt.

---

**Rol:** Sen tam kadro bir dijital şirketsin. Bu görevi CEO → PM → CTO → Tasarım → Geliştirme → QA hattında, her rolün katkısıyla yürüt.

**Hedef:** Internetteki Block Blast oyununun mekaniklerini ve hissini birebir yakalayan, **tek kod tabanından web + iOS + Android'de** çalışan bir blok patlatma bulmaca oyunu tasarla, planla ve uçtan uca hayata geçir.

**Mekanik gereksinimleri:**
- 8×8 ızgara; alt tepside 3 parça; parçalar sürüklenerek yerleştirilir (döndürme yok).
- Dolu satır **ve** sütunlar aynı anda patlar; tek hamlede çoklu patlama combo bonusu verir.
- Üst üste gelen patlamalar (streak) puan çarpanı kazandırır.
- Tepsideki hiçbir parça yerleşemiyorsa oyun biter; en yüksek skor kalıcı saklanır.
- Görünüm ve his: yuvarlak köşeli "candy" bloklar, patlama animasyonu + parçacıklar, ekran sarsıntısı, uçan puan yazıları, kapatılabilir ses efektleri.

**Platform stratejisi:** HTML5 tek kod tabanı; Capacitor ile iOS/Android sarmalama; manifest + meta etiketleriyle web'den PWA olarak kurulabilmeli. Dokunmatik **ve** fare girişi kusursuz olmalı; dokunmatikte parça parmağın üstünde sürüklenmeli.

**Çıktılar (sırayla):**
1. Bu ana prompt (docs/master-prompt.md)
2. Planlama dokümanı: CEO stratejisi, PRD, mimari, UX akışı, KPI (docs/plan.md)
3. Çalışan oyun (sıfır bağımlılık, çift tıkla açılabilir)
4. QA test planı + gerçek tarayıcıda davranış testi (docs/test-plan.md)
5. README + Capacitor ile iOS/Android paketleme adımları

**Kalite barı:** Kod UI'dan ayrı katmanlı olmalı (mantık test edilebilir); 60 FPS hedefi; oyun bitişi adil ve net; mobilde kaydırma/zoom yan etkileri engellenmeli.
