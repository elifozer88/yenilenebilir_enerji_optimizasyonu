"""
backend/routers/santral.py
Mevcut GES/RES santralleri — OSM Overpass API (canlı veri)
"""
import httpx
from fastapi import APIRouter, Query
import time

router = APIRouter()

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
HEADERS = {"User-Agent": "YE-ATLAS/1.0 (izmir-enerji-atlas; iklim@izmir.bel.tr)"}

_osm_cache: dict = {}
CACHE_TTL = 3600


def _cache_get(key):
    if key in _osm_cache:
        if time.time() - _osm_cache[key]["_ts"] < CACHE_TTL:
            return _osm_cache[key]["data"]
    return None


def _cache_set(key, data):
    _osm_cache[key] = {"_ts": time.time(), "data": data}


async def fetch_osm_santraller(kaynak: str) -> list:
    cache_key = f"osm_{kaynak}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    if kaynak == "solar":
        query = """[out:json][timeout:60];
(
  node["power"="plant"]["plant:source"="solar"](37.5,26,39.5,29);
  way["power"="plant"]["plant:source"="solar"](37.5,26,39.5,29);
  relation["power"="plant"]["plant:source"="solar"](37.5,26,39.5,29);
  way["power"="generator"]["generator:source"="solar"](37.5,26,39.5,29);
);
out center tags;"""
    else:
        query = """[out:json][timeout:60];
(
  node["power"="plant"]["plant:source"="wind"](37.5,26,39.5,29);
  way["power"="plant"]["plant:source"="wind"](37.5,26,39.5,29);
  relation["power"="plant"]["plant:source"="wind"](37.5,26,39.5,29);
  node["power"="generator"]["generator:source"="wind"](37.5,26,39.5,29);
  way["power"="generator"]["generator:source"="wind"](37.5,26,39.5,29);
);
out center tags;"""

    async with httpx.AsyncClient(headers=HEADERS, timeout=60) as client:
        resp = await client.post(OVERPASS_URL, data={"data": query})
        data = resp.json()

    elements = data.get("elements", [])
    santraller = []
    seen_coords = set()

    for el in elements:
        if el["type"] == "node":
            lat, lon = el.get("lat"), el.get("lon")
        else:
            center = el.get("center", {})
            lat, lon = center.get("lat"), center.get("lon")

        if not lat or not lon:
            continue

        coord_key = (round(lat, 2), round(lon, 2))
        if coord_key in seen_coords:
            continue
        seen_coords.add(coord_key)

        tags = el.get("tags", {})
        kapasite = None
        for k in ["plant:output:electricity", "generator:output:electricity"]:
            v = tags.get(k)
            if v and v != "yes":
                try:
                    kapasite = float(v.replace("MW", "").replace("kW", "").strip())
                    if "kW" in str(tags.get(k, "")):
                        kapasite /= 1000
                except Exception:
                    pass
                if kapasite:
                    break

        santraller.append({
            "osm_id":      el["id"],
            "osm_type":    el["type"],
            "lat":         lat,
            "lon":         lon,
            "santral_adi": tags.get("name") or tags.get("name:tr") or f"OSM-{el['id']}",
            "operator":    tags.get("operator") or tags.get("owner") or "—",
            "kapasite_mw": kapasite,
            "kaynak":      kaynak,
        })

    _cache_set(cache_key, santraller)
    return santraller


from database import get_pool

# PostGIS ile doğru ilçe eşleştirmesi
async def ilce_ata_postgis(noktalar: list) -> list:
    """Koordinat listesine PostGIS ST_Contains ile ilçe ata."""
    if not noktalar:
        return []
    async with get_pool().acquire() as conn:
        results = []
        for lat, lon in noktalar:
            row = await conn.fetchrow("""
                SELECT ilce_adi
                FROM enerji.ilceler
                WHERE ST_Contains(
                    geom_32635,
                    ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 32635)
                )
                LIMIT 1
            """, lon, lat)
            results.append(row["ilce_adi"] if row else "Diğer")
        return results


@router.get("/santral/list")
async def get_santraller(enerji: str = Query(default="GES")):
    kaynak = "solar" if enerji == "GES" else "wind"
    santraller = await fetch_osm_santraller(kaynak)

    # PostGIS ile ilçe eşleştir (cache'li veri üzerinde)
    koordinatlar = [(s["lat"], s["lon"]) for s in santraller]
    ilceler = await ilce_ata_postgis(koordinatlar)

    features = []
    for s, ilce in zip(santraller, ilceler):
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [s["lon"], s["lat"]]},
            "properties": {
                "osm_id":      s["osm_id"],
                "santral_adi": s["santral_adi"],
                "operator":    s["operator"],
                "enerji_tipi": enerji,
                "kapasite_mw": s["kapasite_mw"],
                "ilce":        ilce,
                "kaynak":      "OpenStreetMap",
            }
        })
    return {
        "type": "FeatureCollection",
        "features": features,
        "meta": {
            "enerji": enerji,
            "toplam_santral": len(features),
            "kaynak": "OpenStreetMap (Overpass API)",
            "cache_ttl_dk": 60,
        }
    }


@router.get("/santral/izmir-ozet")
async def get_izmir_ozet():
    ges = await fetch_osm_santraller("solar")
    res = await fetch_osm_santraller("wind")
    return {
        "GES": {"santral_sayisi": len(ges), "kaynak": "OpenStreetMap"},
        "RES": {"santral_sayisi": len(res), "kaynak": "OpenStreetMap"},
        "kaynak": "OpenStreetMap",
    }


@router.get("/santral/ilce/{ilce_adi}")
async def get_ilce_santraller(ilce_adi: str, enerji: str = Query(default="GES")):
    kaynak = "solar" if enerji == "GES" else "wind"
    santraller = await fetch_osm_santraller(kaynak)
    koordinatlar = [(s["lat"], s["lon"]) for s in santraller]
    ilceler = await ilce_ata_postgis(koordinatlar)
    ilce_santraller = [
        s for s, ilce in zip(santraller, ilceler)
        if ilce.lower() == ilce_adi.lower()
    ]
    return {
        "ilce": ilce_adi,
        "enerji": enerji,
        "santral_sayisi": len(ilce_santraller),
        "santraller": ilce_santraller,
        "kaynak": "OpenStreetMap",
    }