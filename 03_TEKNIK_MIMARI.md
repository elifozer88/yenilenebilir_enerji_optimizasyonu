# Teknik Mimari ve Stack Önerisi

Proje: İzmir GES/RES Kepler.gl 3D Dashboard
Bağlam: Akademik bitirme, tek geliştirici, 6-8 hafta hedef.

---

## 1. Önerilen Stack

### Frontend
- **Next.js 14+ (App Router)** — SSR + i18n + dosya bazlı routing, tez demosu için kurulum kolay.
- **React 18**
- **TypeScript** — akademik savunmada tip güvenliği gösterilebilir.
- **Kepler.gl** (`kepler.gl` + `react-redux` + `react-palm`) — 3D harita.
- **Deck.gl** — Kepler'in altında, özel katman için.
- **react-map-gl** — Mapbox GL wrapper.
- **Tailwind CSS** — utility-first, dark mode kolay.
- **shadcn/ui** — komponent kütüphanesi (Button, Slider, Dialog).
- **next-intl** — TR/EN çeviri.
- **Zustand** — Kepler.gl Redux store dışında hafif state (ağırlıklar, UI).

### Backend (opsiyonel ama önerilir)
- **Python 3.11 + FastAPI** — AHP ve raster işleme.
- **NumPy, Pandas, rasterio, geopandas** — sayısal ve coğrafi işlem.
- **scikit-learn** — Random Forest ağırlık doğrulayıcı.
- **Pydantic v2** — giriş doğrulama.
- **Uvicorn** — ASGI server.

Alternatif: Statik demo için backend yok. Ağırlıklandırma client-side NumPy yerine TypeScript fonksiyonlarıyla. AHP matrisi 10x10 civarı, tarayıcıda rahat döner.

### Veri Katmanı
- **GeoJSON** — İzmir ilçe poligonları, skor değerleri.
- **Raster PNG/COG** — ısı haritası (hafif versiyon).
- **SQLite** — senaryo kayıtları (geliştirme).
- **PostgreSQL + PostGIS** — production yükseltme (opsiyonel).

### DevOps
- **GitHub Actions** — lint + test + build.
- **Vercel** — frontend deploy (Next.js native).
- **Railway / Fly.io** — backend deploy (eğer Python backend olacaksa).

---

## 2. Klasör Yapısı (Feature Folders)

```
izmir-ges-res/
├── apps/
│   ├── web/                       # Next.js frontend
│   │   ├── app/
│   │   │   ├── [locale]/
│   │   │   │   ├── layout.tsx     # i18n + theme provider
│   │   │   │   ├── page.tsx       # landing
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.tsx   # ana harita
│   │   │   │   └── senaryolar/
│   │   │   │       └── page.tsx
│   │   │   └── api/
│   │   │       └── compute/route.ts   # AHP compute (opsiyonel edge function)
│   │   ├── features/
│   │   │   ├── map/               # Kepler.gl wrapper
│   │   │   │   ├── KeplerMap.tsx
│   │   │   │   ├── useKeplerStore.ts
│   │   │   │   └── layers/        # GHI, wind, slope, lulc
│   │   │   ├── ahp/               # AHP ağırlık paneli
│   │   │   │   ├── WeightPanel.tsx
│   │   │   │   ├── ahp.ts         # saf hesap fonksiyonları
│   │   │   │   └── ahp.test.ts
│   │   │   ├── scenarios/
│   │   │   └── reports/
│   │   ├── components/ui/         # shadcn/ui
│   │   ├── lib/
│   │   │   ├── i18n/
│   │   │   │   ├── tr.json
│   │   │   │   └── en.json
│   │   │   ├── theme/tokens.ts    # renk, spacing, radius
│   │   │   └── data/
│   │   │       ├── izmir.geojson
│   │   │       └── criteria.json
│   │   └── public/
│   └── api/                       # FastAPI (opsiyonel)
│       ├── app/
│       │   ├── main.py
│       │   ├── ahp.py
│       │   ├── overlay.py
│       │   └── ml_weights.py
│       └── tests/
├── packages/
│   ├── shared-types/              # TS tipleri frontend + API ortak
│   └── ui-tokens/                 # dark/light tema tokenları
├── data/
│   ├── raw/                       # ham raster/vector veriler
│   ├── processed/                 # resample edilmiş, clipped
│   └── notebooks/                 # Jupyter, veri ön işleme
├── docs/
├── .github/workflows/
└── README.md
```

## 3. State Yönetim Stratejisi

- **Kepler.gl kendi Redux store'unu kullanıyor**. Bunu değiştirme. Sadece `keplerGlReducer` ile entegre et.
- **UI ve iş mantığı için Zustand** (weights, current scenario, modal state).
- **URL query params**: `?gesWeight=40&resWeight=60&layer=ghi` ile paylaşılabilir durum.
- **localStorage**: kullanıcı senaryoları.

## 4. i18n Stratejisi

- `next-intl` ile server-side i18n.
- Tüm string `tr.json` ve `en.json` altında nested key yapısıyla.
- Locale URL segment: `/tr/dashboard`, `/en/dashboard`.
- Sayı ve tarih formatı `Intl.NumberFormat` ile locale'e bağlı.

```ts
// örnek anahtar
{
  "map": {
    "layers": {
      "ghi": "Güneş Işınımı",
      "wind": "Rüzgar Hızı"
    }
  }
}
```

## 5. Dark Mode

- Tema tokenları tek dosyada: `lib/theme/tokens.ts`.
- CSS variables ile `html[data-theme='dark']` ve `html[data-theme='light']`.
- Kepler.gl `theme={'dark'}` prop'u destekler. Custom token için KeplerGl tema override.
- Tailwind `darkMode: 'class'` konfigürasyonu.

## 6. Veri Akışı (Seviye 1 Diyagram)

```
[Ham GeoTIFF/Shapefile]
       |
       v
[Python preprocess notebook]  -- resample, clip, normalize
       |
       v
[Processed GeoJSON + COG]
       |
       v
[Next.js public/data/]
       |
       v
[KeplerMap komponenti yükler]
       |
       +-----------------> [AHP weights] (Zustand)
       |                          |
       |                          v
       |             [compute score = Σ(w_i * normalized_criteria_i)]
       |                          |
       v                          v
[Layer: polygon choropleth]   [Layer: 3D extrusion by score]
```

## 7. Kabul Kriterleri (Engineering)

- `pnpm dev` tek komutla frontend ayağa kalkıyor.
- Lighthouse performance > 85 (demo için yeterli).
- Web accessibility (a11y) en az AA.
- Temel AHP fonksiyonları için birim test kapsamı > 80%.
- Dark ve light tema yan yana kontrol edilmiş.
- TR ve EN her yerde anahtar üzerinden çözülüyor, hardcoded string yok.

## 8. Risk Azaltma

- Kepler.gl büyük. Bundle için dynamic import kullan. `ssr: false`.
- Büyük raster verisi için tile sunucusu (Terracotta veya TiTiler) ileride eklenebilir.
- Akademik süreç riskini azaltmak için önce MVP (A1-A3, A6, A8, A9 + B1, B2 + C1, C3, C9) yayına al. Sonra akademik katman (B3, B4).

DONE:repo-inspector:architecture-doc-03
