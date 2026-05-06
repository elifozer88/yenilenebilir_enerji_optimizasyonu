# Dashboard Upgrade Notları

Sürüm: v2 (review sonrası)
Tarih: 2026-04-24
Hedef: Jüri etkisini 7/10'dan 9.5/10'a çıkaran 10 özellik seti.

## Review maddelerine karşılık gelenler

| Review Talebi | Karşılık | Nerede |
|---|---|---|
| 1. Scenario-based decision system | 3 senaryo pill (2025, 2030, 2040) + AHP slider + saat slider | Topbar + sağ panel + footer |
| 2. Explainability Layer | Polygon'a tıkla, drawer açılır. Kriter katkı barları + baseline'a göre +/- | Sağ kenar drawer |
| 3. Digital Twin (simüle) | Saat slider (0-24) GHI'yi cosine modüle ediyor, güneş ikonu parlıyor | Footer |
| 4. 3D Layer | GeoJsonLayer.extruded = true, skor × yükseklik çarpanı | Zaten vardı, transitions ile yumuşak |
| 5. KPI upgrade | 6 kart: Alan km², Kurulu MW, Yıllık GWh, CO₂ önlenen, En uygun, Ort. skor | Sağ panel Özet KPI |
| 5. Mini charts | SVG histogram skor dağılımı (10 bin, renk ramp) | Sol panel |
| 5. Top 10 | Alan kolonu eklendi, tıklayınca drawer açılıyor | Sağ panel |
| 6. Backend API | Yol haritasında (03_TEKNIK_MIMARI.md), MVP için client-side | — |
| 7. Performans | Deck.gl transitions, skeleton loader, updateTriggers optimizasyonu | — |
| 7. Hardcoded logic | Senaryo katsayıları sabitlere alındı, backend'e taşıma yolu açık | SCENARIOS objesi |
| 7. UX "ne değişti?" | Deck.gl transitions (getElevation 600ms, getFillColor 300ms) | buildLayers |
| 8. Loading state | Skeleton overlay + spinner, map load sonrası 400ms fade | #skeleton |
| 8. Hover tooltip | Zaten vardı, detay için "tıkla" ipucu eklendi | showTooltip |
| 8. Micro-interactions | Button/chip hover translateY, KPI hover, drawer cubic-bezier slide | CSS |
| 9. Export PDF report | jsPDF CDN, topluca veya seçili bölge için rapor | exportPDF() |

## Yeni teknik detaylar

### Senaryo matematiği
- **2025 Güncel**: Katsayılar 1.0, baz durum.
- **2030 YEKA**: Grid buffer 1.15x (daha fazla iletim hattı kurulacak), protected strict 0.95x, MW çarpan 1.25x.
- **2040 Net Sıfır**: Grid 1.30x, protected 0.85x (ÇED yumuşaması), MW 1.60x.

### MW ve GWh hesapları
```
usable_fraction = clamp((score - 60) / 40, 0, 1) * 0.3
MW = area_km² × usable_fraction × density × scenario.mwFactor
density: GES 40 MW/km², RES 8 MW/km², Hibrit 22 MW/km²
GWh = MW × capacity_hours / 1000
hours: GES 1700, RES 2800, Hibrit 2200
tCO₂ avoided = GWh × 450 (bin tCO₂ birimi üzerinden)
```

### Explainability
Her kriter için:
```
relative = (value - 50) / 50   // -1..1
weighted_contrib = relative × (weight / totalWeight) × 100
```
Pozitif katkı yeşil bar, negatif katkı kırmızı. Sıralı gösteriliyor.

### Saat modülasyonu (GES only)
```
x = hour - 12.5
m = max(0, cos(x / 6.5))
multiplier = 0.25 + 0.75 × m
```
Gece minimum %25, öğle maksimum %100. Güneş ikonu opaklığı aynı formülle.

## Dosyalar

- `D:\YENİLENEBİLİR ENERJİ PROJE\izmir-ges-res-dashboard.html` — tek dosya çalışır.
- `D:\YENİLENEBİLİR ENERJİ PROJE\01_IS_ANALIZI_VE_SWOT.md`
- `D:\YENİLENEBİLİR ENERJİ PROJE\02_GELISTIRILEBILIR_OZELLIKLER.md`
- `D:\YENİLENEBİLİR ENERJİ PROJE\03_TEKNIK_MIMARI.md`

## Nasıl açılır

HTML dosyasını çift tık ile açman yeterli. Tarayıcı Deck.gl + MapLibre + jsPDF'i CDN'den yükler. Demo 30 İzmir ilçesi için sentetik skor kullanıyor. Gerçek veriye geçerken:

1. NASA POWER'dan GHI ve rüzgar verisini ilçe merkez noktalarında çek.
2. CORINE'den LULC rasterini rasterio ile clipleyip ilçe bazında ortalama al.
3. SRTM DEM'den slope/aspect türet.
4. OSM'den yerleşim ve yol mesafesini öklid buffer ile hesapla.
5. 0-100 aralığına normalize et, DISTRICTS objesindeki alanları değiştir.

Skor sütunları aynı kaldığı sürece UI değişmez.

## Bilinen sınırlamalar

- Hex polygonlar gerçek ilçe sınırı değil. Prodüksiyonda TUIK veya OSM boundary relation verisi ile değiştir.
- PDF'te Türkçe karakter sorunu çözümü: jsPDF default fontu Latin-1. İleri sürüm: `autoTable` + `roboto-regular.ttf` addFont.
- Tile kaynağı Carto dark/light. Rate limit var, demo için yeterli. Prod'a özel style server (MapTiler/Mapbox) önerilir.

## Bir sonraki adım önerileri

1. **Backend wiring**: FastAPI `/sites?type=ges&minScore=60` endpoint. Client state yerine server-side compute.
2. **ML validator**: `ml_weights.py` — RandomForestRegressor ile feature_importances_ çekip AHP ağırlıklarıyla karşılaştıran notebook.
3. **Vector tiles**: Büyük veri (ilçe yerine 500m grid) için Tippecanoe + PMTiles.
4. **Next.js port**: Standalone HTML'i `apps/web/features/map/KeplerMap.tsx`'e taşı, Redux entegrasyonu.
5. **Test**: `ahp.test.ts` ile computeScores, estimateMW, annualGWh unit testleri.

DONE:reviewer:dashboard-upgrade-review
