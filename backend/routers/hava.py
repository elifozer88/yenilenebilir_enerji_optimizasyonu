"""
backend/routers/hava.py
Open-Meteo API — Anlık ve tahmin bazlı güneş + rüzgâr verisi
"""
import httpx
from fastapi import APIRouter, Query
from database import get_pool

router = APIRouter()

OPEN_METEO = "https://api.open-meteo.com/v1/forecast"

# İzmir ilçe merkez koordinatları (lat, lon)
ILCE_COORDS = {
    "Aliağa":      (38.80, 26.97),
    "Balçova":     (38.39, 27.05),
    "Bayındır":    (38.22, 27.65),
    "Bayraklı":    (38.46, 27.17),
    "Bergama":     (39.12, 27.18),
    "Beydağ":      (38.09, 28.21),
    "Bornova":     (38.47, 27.22),
    "Buca":        (38.38, 27.18),
    "Çeşme":       (38.32, 26.30),
    "Çiğli":       (38.52, 27.05),
    "Dikili":      (39.07, 26.89),
    "Foça":        (38.67, 26.76),
    "Gaziemir":    (38.32, 27.13),
    "Güzelbahçe":  (38.38, 26.90),
    "Karabağlar":  (38.37, 27.12),
    "Karaburun":   (38.64, 26.51),
    "Karşıyaka":   (38.46, 27.11),
    "Kemalpaşa":   (38.43, 27.42),
    "Kınık":       (39.09, 27.38),
    "Kiraz":       (38.23, 28.19),
    "Konak":       (38.42, 27.14),
    "Menderes":    (38.25, 27.13),
    "Menemen":     (38.61, 27.06),
    "Narlıdere":   (38.39, 26.98),
    "Ödemiş":      (38.22, 27.97),
    "Seferihisar": (38.20, 26.84),
    "Selçuk":      (37.95, 27.37),
    "Tire":        (38.09, 27.73),
    "Torbalı":     (38.16, 27.37),
    "Urla":        (38.32, 26.76),
}

_cache = {}  # basit in-memory cache


async def fetch_meteo(lat: float, lon: float) -> dict:
    cache_key = f"{lat:.3f}_{lon:.3f}"
    if cache_key in _cache:
        import time
        if time.time() - _cache[cache_key]["_ts"] < 900:  # 15 dk cache
            return _cache[cache_key]

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(OPEN_METEO, params={
            "latitude": lat,
            "longitude": lon,
            "current": "shortwave_radiation,windspeed_10m,windspeed_100m,winddirection_10m,temperature_2m,cloudcover",
            "hourly": "shortwave_radiation,windspeed_100m",
            "forecast_days": 7,
            "timezone": "Europe/Istanbul",
        })
        data = resp.json()

    # Günlük max solar + ortalama rüzgâr hesapla (7 gün)
    hourly_solar = data["hourly"]["shortwave_radiation"]
    hourly_wind  = data["hourly"]["windspeed_100m"]
    hourly_time  = data["hourly"]["time"]

    # Gün bazında grupla
    daily = {}
    for i, t in enumerate(hourly_time):
        day = t[:10]
        if day not in daily:
            daily[day] = {"solar": [], "wind": []}
        daily[day]["solar"].append(hourly_solar[i])
        daily[day]["wind"].append(hourly_wind[i])

    daily_summary = []
    for day, vals in sorted(daily.items()):
        solar_vals = [v for v in vals["solar"] if v > 0]
        daily_summary.append({
            "tarih":      day,
            "max_solar":  round(max(vals["solar"]), 1),
            "ort_solar":  round(sum(solar_vals)/len(solar_vals), 1) if solar_vals else 0,
            "max_wind":   round(max(vals["wind"]), 1),
            "ort_wind":   round(sum(vals["wind"])/len(vals["wind"]), 1),
        })

    import time
    result = {
        "_ts": time.time(),
        "konum": {"lat": lat, "lon": lon},
        "anlik": {
            "zaman":       data["current"]["time"],
            "solar_wm2":   data["current"]["shortwave_radiation"],
            "ruzgar_10m":  data["current"]["windspeed_10m"],
            "ruzgar_100m": data["current"]["windspeed_100m"],
            "ruzgar_yon":  data["current"]["winddirection_10m"],
            "sicaklik":    data["current"]["temperature_2m"],
            "bulutluluk":  data["current"]["cloudcover"],
        },
        "tahmin_7gun": daily_summary,
        "saatlik": {
            "zaman": hourly_time[:48],  # Sadece 2 gün
            "solar": hourly_solar[:48],
            "wind":  hourly_wind[:48],
        },
    }

    _cache[cache_key] = result
    return result


@router.get("/hava/current")
async def get_current(
    lat: float = Query(38.42, description="Enlem"),
    lon: float = Query(27.14, description="Boylam"),
):
    """Belirli koordinat için anlık hava + 7 günlük tahmin."""
    return await fetch_meteo(lat, lon)


@router.get("/hava/ilce/{ilce_adi}")
async def get_ilce_hava(ilce_adi: str):
    """İlçe adına göre hava verisi — DB'den merkez koordinat alır."""
    # Önce sabit dict'e bak
    ilce_key = next((k for k in ILCE_COORDS if k.lower() == ilce_adi.lower()), None)
    if ilce_key:
        lat, lon = ILCE_COORDS[ilce_key]
    else:
        # DB'den al
        async with get_pool().acquire() as conn:
            row = await conn.fetchrow("""
                SELECT
                    ST_Y(ST_Transform(ST_Centroid(geom_32635), 4326)) as lat,
                    ST_X(ST_Transform(ST_Centroid(geom_32635), 4326)) as lon
                FROM enerji.ilceler
                WHERE LOWER(ilce_adi) = LOWER($1)
            """, ilce_adi)
        if not row:
            return {"hata": f"{ilce_adi} bulunamadı"}
        lat, lon = float(row["lat"]), float(row["lon"])

    data = await fetch_meteo(lat, lon)
    data["ilce"] = ilce_adi
    return data


OPEN_METEO_ARCHIVE = "https://archive-api.open-meteo.com/v1/archive"

_archive_cache = {}


@router.get("/hava/gecmis/{ilce_adi}")
async def get_gecmis(ilce_adi: str):
    """Son 6 aylık günlük solar + rüzgâr — aylık ortalamaya çevrilmiş."""
    from datetime import date, timedelta
    bugun = date.today()
    bitis = (bugun - timedelta(days=1)).isoformat()
    baslangic = (bugun - timedelta(days=183)).isoformat()

    cache_key = f"archive_{ilce_adi.lower()}_{baslangic}"
    if cache_key in _archive_cache:
        return _archive_cache[cache_key]

    ilce_key = next((k for k in ILCE_COORDS if k.lower() == ilce_adi.lower()), None)
    if ilce_key:
        lat, lon = ILCE_COORDS[ilce_key]
    else:
        async with get_pool().acquire() as conn:
            row = await conn.fetchrow("""
                SELECT
                    ST_Y(ST_Transform(ST_Centroid(geom_32635), 4326)) as lat,
                    ST_X(ST_Transform(ST_Centroid(geom_32635), 4326)) as lon
                FROM enerji.ilceler WHERE LOWER(ilce_adi) = LOWER($1)
            """, ilce_adi)
        if not row:
            return {"hata": f"{ilce_adi} bulunamadı"}
        lat, lon = float(row["lat"]), float(row["lon"])

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(OPEN_METEO_ARCHIVE, params={
            "latitude":  lat,
            "longitude": lon,
            "start_date": baslangic,
            "end_date":   bitis,
            "daily": "shortwave_radiation_sum,windspeed_10m_max",
            "timezone": "Europe/Istanbul",
        })
        raw = resp.json()

    times  = raw["daily"]["time"]
    solar  = raw["daily"]["shortwave_radiation_sum"]
    wind   = raw["daily"]["windspeed_10m_max"]

    # Aylık gruplama
    aylik = {}
    for i, t in enumerate(times):
        ay = t[:7]  # "2026-03"
        if ay not in aylik:
            aylik[ay] = {"solar": [], "wind": []}
        if solar[i] is not None:
            aylik[ay]["solar"].append(solar[i])
        if wind[i] is not None:
            aylik[ay]["wind"].append(wind[i])

    AY_AD = {"01":"Oca","02":"Şub","03":"Mar","04":"Nis","05":"May",
              "06":"Haz","07":"Tem","08":"Ağu","09":"Eyl","10":"Eki","11":"Kas","12":"Ara"}

    aylik_ozet = []
    for ay, vals in sorted(aylik.items()):
        yil, m = ay.split("-")
        aylik_ozet.append({
            "ay":       ay,
            "ay_kisa":  AY_AD.get(m, m),
            "yil":      yil,
            "ort_solar": round(sum(vals["solar"])/len(vals["solar"]), 2) if vals["solar"] else 0,
            "max_solar": round(max(vals["solar"]), 2) if vals["solar"] else 0,
            "ort_wind":  round(sum(vals["wind"])/len(vals["wind"]), 1) if vals["wind"] else 0,
            "max_wind":  round(max(vals["wind"]), 1) if vals["wind"] else 0,
        })

    result = {
        "ilce":      ilce_adi,
        "baslangic": baslangic,
        "bitis":     bitis,
        "aylik":     aylik_ozet,
        "gunluk": {
            "zaman": times,
            "solar": solar,
            "wind":  wind,
        },
    }

    _archive_cache[cache_key] = result
    return result
    """İzmir geneli için tüm ilçelerin anlık solar + rüzgâr ortalaması."""
    # Örnekleme — her ilçeyi çekmek yavaş, 5 temsili ilçe al
    temsili = ["Konak", "Bergama", "Selçuk", "Karaburun", "Ödemiş"]
    results = []
    for ilce in temsili:
        lat, lon = ILCE_COORDS[ilce]
        try:
            d = await fetch_meteo(lat, lon)
            results.append(d["anlik"])
        except Exception:
            pass

    if not results:
        return {"hata": "Veri alınamadı"}

    return {
        "ortalama": {
            "solar_wm2":   round(sum(r["solar_wm2"] for r in results) / len(results), 1),
            "ruzgar_100m": round(sum(r["ruzgar_100m"] for r in results) / len(results), 1),
            "sicaklik":    round(sum(r["sicaklik"] for r in results) / len(results), 1),
            "bulutluluk":  round(sum(r["bulutluluk"] for r in results) / len(results), 1),
        },
        "ilceler": {temsili[i]: results[i] for i in range(len(results))},
        "kaynak": "Open-Meteo",
    }