# Geliştirilebilir Özellikler — Yol Haritası

Proje: İzmir GES/RES Yer Seçimi
Odak: Akademik bitirme + yayın + demo kalitesi

Özellikler MoSCoW ile önceliklendirildi.
- M: Must — tezde zorunlu
- S: Should — güçlü etki, makul eforla
- C: Could — süre varsa
- W: Won't (şimdilik) — sonraki faz

---

## A. Görselleştirme ve UX (Frontend)

| # | Özellik | Öncelik | Not |
|---|---|---|---|
| A1 | Kepler.gl 3D harita (Deck.gl tabanlı) | M | Sen zaten bunu istedin. Ana özellik. |
| A2 | Katman yöneticisi (GHI, rüzgar, eğim, yerleşim, iletim, CORINE) | M | Toggle + opaklık slider |
| A3 | AHP ağırlık slider paneli (canlı yeniden hesap) | M | Her kriter için 0-100 slider, normalize |
| A4 | Senaryo karşılaştırma (split view, 2 harita yan yana) | S | Farklı ağırlık setleri görsel karşılaştırma |
| A5 | Hexbin / H3 aggregation modu | S | Büyük veri için performans |
| A6 | 3D extrusion (uygunluk skoru yüksekliğe map) | M | Kepler.gl native |
| A7 | Time slider (aylık güneş/rüzgar animasyonu) | S | NASA POWER verisiyle |
| A8 | Dark mode | M | Proje kuralı, end-to-end |
| A9 | i18n (TR/EN) | M | Proje kuralı, next-intl |
| A10 | Mobile responsive layout | C | Tablet öncelik |
| A11 | Onboarding turu (react-joyride) | C | Jüri demosunda pürüzsüz akış |
| A12 | Keyboard shortcuts | W | İleri faz |

## B. Analiz ve Hesaplama (Backend)

| # | Özellik | Öncelik | Not |
|---|---|---|---|
| B1 | AHP ağırlık motoru (tutarlılık kontrolü CR) | M | Python backend, NumPy |
| B2 | Raster üst üste bindirme (weighted overlay) | M | rasterio + numpy |
| B3 | TOPSIS alternatif yöntem | S | AHP ile karşılaştırma, akademik değer |
| B4 | ML ağırlık doğrulayıcı (Random Forest feature importance) | S | Bitirme katkısı |
| B5 | K-Means mikro-bölge kümeleme | C | Hibrit santral keşfi |
| B6 | LSTM/Prophet zaman serisi tahmini | C | İleri seviye |
| B7 | LCOE/IRR hesaplayıcı | S | Yatırım kararı kısmı |
| B8 | Hibrit GES+RES skor motoru | S | Hem GES hem RES uygun alanlar |
| B9 | Buffer/exclusion zone motoru (korunan alanlar, havayolu) | M | Zorunlu eleme kriterleri |
| B10 | Sonuç caching (Redis) | C | 3D harita hız için |

## C. Veri Entegrasyonları

| # | Özellik | Öncelik | Not |
|---|---|---|---|
| C1 | NASA POWER API (GHI, rüzgar) | M | Ücretsiz, API key yok |
| C2 | Copernicus ERA5 reanaliz verisi | S | Yüksek doğruluk |
| C3 | CORINE arazi örtüsü | M | Avrupa Çevre Ajansı, ücretsiz |
| C4 | OSM yol ve yerleşim verisi | M | Overpass API |
| C5 | TEİAŞ iletim hattı ağı | M | Açık veri portalı veya OSM power=line |
| C6 | EPDK lisanslı santral listesi | S | Doğrulama için |
| C7 | MGM rasat istasyonu verileri | C | Nokta doğrulama |
| C8 | Sentinel-2 NDVI (bitki örtüsü) | C | Arazi dışlama kontrolü |
| C9 | SRTM / ASTER DEM (30m yükseklik) | M | Eğim ve bakı hesabı için |

## D. Raporlama ve Çıktı

| # | Özellik | Öncelik | Not |
|---|---|---|---|
| D1 | Tek tık PDF rapor üretici | S | Harita + kriter özeti + skorlar |
| D2 | GeoJSON / Shapefile export | M | QGIS'te açılabilir |
| D3 | KML export (Google Earth) | C | Saha ziyareti için |
| D4 | Excel skor tablosu export | S | Karar matrisi |
| D5 | Paylaşılabilir URL (state in URL) | C | Jüri linke tıklar, aynı görünümü açar |

## E. Kullanıcı ve Oturum

| # | Özellik | Öncelik | Not |
|---|---|---|---|
| E1 | Senaryo kaydet/yükle (localStorage) | M | Kullanıcı oturumu olmadan |
| E2 | NextAuth ile kullanıcı girişi | C | Ekip kullanımı için |
| E3 | Kullanıcı bazlı senaryo kütüphanesi | C | Backend veritabanı |
| E4 | Yorum ve işaretleme (harita üzeri annotasyon) | W | İleri faz |

## F. Kalite, Operasyon, Test

| # | Özellik | Öncelik | Not |
|---|---|---|---|
| F1 | Birim testler (Jest + Vitest) | M | Hesap motoru için |
| F2 | E2E testler (Playwright) | S | Ana akışlar |
| F3 | Storybook (UI komponent galerisi) | C | Tez ekinde sergilenebilir |
| F4 | GitHub Actions CI | M | Her push'ta test |
| F5 | Vercel/Netlify deploy | M | Demo için |
| F6 | Sentry hata izleme | C | Demo gününde sigorta |

## G. İleri Seviye / Yayın Katkısı

| # | Özellik | Öncelik | Not |
|---|---|---|---|
| G1 | Dijital ikiz 3D bina/arazi modeli | C | Unity/Three.js, prestij |
| G2 | Drone/iHA veri yükleme arayüzü | W | Gelecek genişleme |
| G3 | Mobile companion app (React Native) | W | Saha ziyareti |
| G4 | Chatbot asistan ("GES önerisi al") | C | LLM entegrasyonu, tez eki |
| G5 | Karbon avoidance hesabı | S | Çevre etkisi bölümü |
| G6 | API public endpoint + Swagger | C | Akademik paylaşım |

---

## MVP Kapsamı (Bitirme için önerilen minimum)

Bu 12 özellik, akademik savunmada yeterli içerikli bir ürün ortaya çıkarır:

A1, A2, A3, A6, A8, A9
B1, B2, B9
C1, C3, C9
D1 veya D2

Tahmini süre: 6-8 hafta, tek kişilik akademik efor.

## Yayın Katkısı (ekstra değer)

Eğer 2-3 hafta ek süre varsa B4 (ML doğrulayıcı) + B3 (TOPSIS) + B8 (hibrit) eklenmesi, bitirme tezini 1001 bildirisine çevirme şansı doğurur.

DONE:supervisor:features-doc-02
