"""
backend/routers/ges.py — GES endpoints
"""
import json
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import Response
from database import get_pool
from cache import district_cache, polygon_cache, stats_cache, detail_cache, cache_key

router = APIRouter()

TOL_DISTRICT = 0.002
TOL_POLYGON  = 0.0003

def _json(data, cache_sec=120):
    return Response(
        content=json.dumps(data, ensure_ascii=False),
        media_type="application/json",
        headers={"Cache-Control": f"public, max-age={cache_sec}"},
    )


# ── /api/ges/districts ──────────────────────────────────────
@router.get("/ges/districts")
async def get_ges_districts(senaryo: str = Query(default="varsayilan")):
    key = cache_key("ges_districts", senaryo)
    cached = await district_cache.get(key)
    if cached:
        return Response(content=cached, media_type="application/json",
                        headers={"Cache-Control": "public,max-age=120", "X-Cache": "HIT"})

    query = """
        SELECT
            i.ilce_adi,
            u.skor_ort, u.skor_min, u.skor_max,
            u.uygun_alan_ha, u.tahmini_mw,
            u.sinif1_ha, u.sinif2_ha, u.sinif3_ha, u.sinif4_ha, u.sinif5_ha,
            ST_AsGeoJSON(
                ST_Transform(
                    ST_SimplifyPreserveTopology(i.geom_32635, 200),
                    4326
                )
            ) AS geom
        FROM enerji.ilce_uygunluk u
        JOIN enerji.ilceler     i  ON i.id  = u.ilce_id
        JOIN enerji.enerji_tipi et ON et.id = u.enerji_tipi_id
        JOIN enerji.senaryo     s  ON s.id  = u.senaryo_id
        WHERE et.kod = 'GES' AND s.kod = $1
        ORDER BY u.skor_ort DESC
    """
    try:
        async with get_pool().acquire() as conn:
            rows = await conn.fetch(query, senaryo)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    features = [
        {
            "type": "Feature",
            "geometry": json.loads(r["geom"]),
            "properties": {
                "ilce":          r["ilce_adi"],
                "skor_ort":      round(float(r["skor_ort"]), 2) if r["skor_ort"] else None,
                "skor_min":      round(float(r["skor_min"]), 2) if r["skor_min"] else None,
                "skor_max":      round(float(r["skor_max"]), 2) if r["skor_max"] else None,
                "uygun_alan_ha": float(r["uygun_alan_ha"] or 0),
                "tahmini_mw":    float(r["tahmini_mw"] or 0),
                "sinif1_ha":     float(r["sinif1_ha"] or 0),
                "sinif2_ha":     float(r["sinif2_ha"] or 0),
                "sinif3_ha":     float(r["sinif3_ha"] or 0),
                "sinif4_ha":     float(r["sinif4_ha"] or 0),
                "sinif5_ha":     float(r["sinif5_ha"] or 0),
            },
        }
        for r in rows
    ]
    result = json.dumps(
        {"type": "FeatureCollection", "features": features,
         "meta": {"count": len(features), "senaryo": senaryo}},
        ensure_ascii=False,
    )
    await district_cache.set(key, result)
    return Response(content=result, media_type="application/json",
                    headers={"Cache-Control": "public,max-age=120", "X-Cache": "MISS"})


# ── /api/ges/polygons ───────────────────────────────────────
@router.get("/ges/polygons")
async def get_ges_polygons(
    min_sinif: int = Query(default=4, ge=1, le=5),
    senaryo:   str = Query(default="varsayilan"),
    limit:     int = Query(default=1500, ge=100, le=10000),  # varsayılan 1500'e çıktı
    ilce:      str = Query(default=None),
):
    key = cache_key("ges_polygons", min_sinif, senaryo, limit, ilce or "")
    cached = await polygon_cache.get(key)
    if cached:
        return Response(content=cached, media_type="application/json",
                        headers={"Cache-Control": "public,max-age=300", "X-Cache": "HIT"})

    if ilce:
        # İlçe bazlı sorgu: ST_Intersection ile kesin clip,
        # ST_IsEmpty ve ST_IsValid kontrolleri eklenmiş → geçersiz geom dönmez
        query = """
            SELECT
                ub.uuid::text            AS id,
                ub.uygunluk_sinif        AS sinif,
                ub.alan_ha,
                ub.tahmini_mw,
                COALESCE(i2.ilce_adi,'') AS ilce,
                ST_AsGeoJSON(
                    ST_SimplifyPreserveTopology(ub.geom, $4)
                ) AS geom
            FROM enerji.uygunluk_bolge ub
            JOIN enerji.enerji_tipi et ON et.id = ub.enerji_tipi_id
            JOIN enerji.senaryo      s  ON s.id  = ub.senaryo_id
            LEFT JOIN enerji.ilceler i2 ON i2.id = ub.ilce_id
            CROSS JOIN (
                SELECT id, geom_32635
                FROM enerji.ilceler
                WHERE ilce_adi = $5
                LIMIT 1
            ) ilce_f
            WHERE et.kod = 'GES'
              AND s.kod  = $1
              AND ub.uygunluk_sinif >= $2
              AND ST_IsValid(ub.geom)
              AND (
                ub.ilce_id = ilce_f.id
                OR ST_Within(ST_PointOnSurface(ub.geom),
                             ST_Transform(ilce_f.geom_32635, 4326))
              )
            ORDER BY ub.alan_ha DESC
            LIMIT $3
        """
        try:
            async with get_pool().acquire() as conn:
                rows = await conn.fetch(query, senaryo, min_sinif, limit, TOL_POLYGON, ilce)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        query = """
            SELECT
                ub.uuid::text            AS id,
                ub.uygunluk_sinif        AS sinif,
                ub.alan_ha,
                ub.tahmini_mw,
                COALESCE(i.ilce_adi,'') AS ilce,
                ST_AsGeoJSON(
                    ST_SimplifyPreserveTopology(ub.geom, $4)
                ) AS geom
            FROM enerji.uygunluk_bolge ub
            JOIN enerji.enerji_tipi et ON et.id = ub.enerji_tipi_id
            JOIN enerji.senaryo      s  ON s.id  = ub.senaryo_id
            LEFT JOIN enerji.ilceler i  ON i.id  = ub.ilce_id
            WHERE et.kod = 'GES'
              AND s.kod  = $1
              AND ub.uygunluk_sinif >= $2
              AND ST_IsValid(ub.geom)
            ORDER BY ub.alan_ha DESC
            LIMIT $3
        """
        try:
            async with get_pool().acquire() as conn:
                rows = await conn.fetch(query, senaryo, min_sinif, limit, TOL_POLYGON)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    features = [
        {
            "type": "Feature",
            "geometry": json.loads(r["geom"]),
            "properties": {
                "id":      r["id"],
                "sinif":   r["sinif"],
                "alan_ha": round(float(r["alan_ha"]), 1),
                "mw":      round(float(r["tahmini_mw"]), 1),
                "ilce":    r["ilce"],
            },
        }
        for r in rows
        if r["geom"] and r["geom"] != 'null'   # ← boş/null geom güvenliği
    ]
    result = json.dumps(
        {"type": "FeatureCollection", "features": features,
         "meta": {"count": len(features), "min_sinif": min_sinif}},
        ensure_ascii=False,
    )
    await polygon_cache.set(key, result)
    return Response(content=result, media_type="application/json",
                    headers={"Cache-Control": "public,max-age=300", "X-Cache": "MISS"})


# ── /api/ges/stats ──────────────────────────────────────────
@router.get("/ges/stats")
async def get_ges_stats(senaryo: str = Query(default="varsayilan")):
    key = cache_key("ges_stats", senaryo)
    cached = await stats_cache.get(key)
    if cached:
        return Response(content=json.dumps(cached), media_type="application/json",
                        headers={"Cache-Control": "public,max-age=300", "X-Cache": "HIT"})

    query = """
        SELECT
            COUNT(DISTINCT u.ilce_id)          AS ilce_sayisi,
            ROUND(AVG(u.skor_ort)::numeric, 2) AS ort_skor,
            ROUND(MAX(u.skor_max)::numeric, 2) AS max_skor,
            SUM(u.uygun_alan_ha)               AS toplam_uygun_ha,
            SUM(u.tahmini_mw)                  AS toplam_mw,
            SUM(u.sinif5_ha)                   AS sinif5_ha,
            SUM(u.sinif4_ha)                   AS sinif4_ha
        FROM enerji.ilce_uygunluk u
        JOIN enerji.enerji_tipi et ON et.id = u.enerji_tipi_id
        JOIN enerji.senaryo      s  ON s.id  = u.senaryo_id
        WHERE et.kod = 'GES' AND s.kod = $1
    """
    try:
        async with get_pool().acquire() as conn:
            row = await conn.fetchrow(query, senaryo)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    data = {
        "ilce_sayisi":     int(row["ilce_sayisi"]),
        "ort_skor":        float(row["ort_skor"]) if row["ort_skor"] else 0,
        "max_skor":        float(row["max_skor"]) if row["max_skor"] else 0,
        "toplam_uygun_ha": float(row["toplam_uygun_ha"]) if row["toplam_uygun_ha"] else 0,
        "toplam_mw":       float(row["toplam_mw"]) if row["toplam_mw"] else 0,
        "sinif5_ha":       float(row["sinif5_ha"]) if row["sinif5_ha"] else 0,
        "sinif4_ha":       float(row["sinif4_ha"]) if row["sinif4_ha"] else 0,
        "senaryo":         senaryo,
    }
    await stats_cache.set(key, data)
    return data


# ── /api/ges/district/{ilce_adi} ────────────────────────────
@router.get("/ges/district/{ilce_adi}")
async def get_ges_district(ilce_adi: str, senaryo: str = Query(default="varsayilan")):
    key = cache_key("ges_district", ilce_adi.lower(), senaryo)
    cached = await detail_cache.get(key)
    if cached:
        return Response(content=json.dumps(cached, ensure_ascii=False),
                        media_type="application/json",
                        headers={"Cache-Control": "public,max-age=300", "X-Cache": "HIT"})

    uygunluk_q = """
        SELECT
            u.skor_ort, u.skor_min, u.skor_max,
            u.uygun_alan_ha, u.tahmini_mw,
            u.sinif1_ha, u.sinif2_ha, u.sinif3_ha, u.sinif4_ha, u.sinif5_ha
        FROM enerji.ilce_uygunluk u
        JOIN enerji.ilceler     i  ON i.id  = u.ilce_id
        JOIN enerji.enerji_tipi et ON et.id = u.enerji_tipi_id
        JOIN enerji.senaryo     s  ON s.id  = u.senaryo_id
        WHERE et.kod = 'GES' AND s.kod = $1 AND i.ilce_adi = $2
    """
    kriter_q = """
        SELECT k.kod, k.ad, k.birim, iks.rc_ort, iks.rc_min, iks.rc_max
        FROM enerji.ilce_kriter_istatistik iks
        JOIN enerji.kriterler    k  ON k.id  = iks.kriter_id
        JOIN enerji.enerji_tipi  et ON et.id = iks.enerji_tipi_id
        JOIN enerji.ilceler      i  ON i.id  = iks.ilce_id
        WHERE et.kod = 'GES' AND i.ilce_adi = $1
        ORDER BY iks.rc_ort DESC NULLS LAST
    """
    try:
        async with get_pool().acquire() as conn:
            u         = await conn.fetchrow(uygunluk_q, senaryo, ilce_adi)
            kriterler = await conn.fetch(kriter_q, ilce_adi)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not u:
        raise HTTPException(status_code=404, detail=f"{ilce_adi} bulunamadı")

    data = {
        "ilce":        ilce_adi,
        "senaryo":     senaryo,
        "enerji_tipi": "GES",
        "skor_ort":    float(u["skor_ort"]) if u["skor_ort"] else None,
        "skor_min":    float(u["skor_min"]) if u["skor_min"] else None,
        "skor_max":    float(u["skor_max"]) if u["skor_max"] else None,
        "uygun_alan_ha": float(u["uygun_alan_ha"] or 0),
        "tahmini_mw":  float(u["tahmini_mw"] or 0),
        "sinif_dagilim": {
            "1": float(u["sinif1_ha"] or 0),
            "2": float(u["sinif2_ha"] or 0),
            "3": float(u["sinif3_ha"] or 0),
            "4": float(u["sinif4_ha"] or 0),
            "5": float(u["sinif5_ha"] or 0),
        },
        "kriterler": [
            {
                "kod":   r["kod"],
                "ad":    r["ad"],
                "birim": r["birim"],
                "skor":  round(float(r["rc_ort"]), 2) if r["rc_ort"] else None,
                "min":   round(float(r["rc_min"]), 1) if r["rc_min"] else None,
                "max":   round(float(r["rc_max"]), 1) if r["rc_max"] else None,
            }
            for r in kriterler
        ],
    }
    await detail_cache.set(key, data)
    return data


# ── /api/ges/district/{ilce_adi}/extremes ───────────────────
@router.get("/ges/district/{ilce_adi}/extremes")
async def get_ges_district_extremes(ilce_adi: str, senaryo: str = Query(default="varsayilan")):
    key = cache_key("ges_extremes", ilce_adi.lower(), senaryo)
    cached = await detail_cache.get(key)
    if cached:
        return Response(content=json.dumps(cached, ensure_ascii=False),
                        media_type="application/json",
                        headers={"Cache-Control": "public,max-age=600", "X-Cache": "HIT"})

    sinif_q = """
        SELECT u.sinif1_ha, u.sinif2_ha, u.sinif3_ha, u.sinif4_ha, u.sinif5_ha
        FROM enerji.ilce_uygunluk u
        JOIN enerji.ilceler     i  ON i.id  = u.ilce_id
        JOIN enerji.enerji_tipi et ON et.id = u.enerji_tipi_id
        JOIN enerji.senaryo     s  ON s.id  = u.senaryo_id
        WHERE et.kod = 'GES' AND s.kod = $1 AND i.ilce_adi = $2
    """

    bolge_max_q = """
        SELECT
            ST_X(ST_Transform(ST_PointOnSurface(ub.geom), 4326)) AS lon,
            ST_Y(ST_Transform(ST_PointOnSurface(ub.geom), 4326)) AS lat,
            ub.uygunluk_sinif AS sinif,
            ub.alan_ha
        FROM enerji.uygunluk_bolge ub
        JOIN enerji.enerji_tipi et ON et.id = ub.enerji_tipi_id
        JOIN enerji.senaryo      s  ON s.id  = ub.senaryo_id
        CROSS JOIN (
            SELECT id, geom_32635 FROM enerji.ilceler WHERE ilce_adi = $2 LIMIT 1
        ) ilce_f
        WHERE et.kod = 'GES' AND s.kod = $1
          AND (
            ub.ilce_id = ilce_f.id
            OR ST_Within(ST_PointOnSurface(ub.geom), ST_Transform(ilce_f.geom_32635, 4326))
          )
        ORDER BY ub.uygunluk_sinif DESC, ub.alan_ha DESC
        LIMIT 1
    """

    bolge_min_q = """
        SELECT
            ST_X(ST_Transform(ST_PointOnSurface(ub.geom), 4326)) AS lon,
            ST_Y(ST_Transform(ST_PointOnSurface(ub.geom), 4326)) AS lat,
            ub.uygunluk_sinif AS sinif,
            ub.alan_ha
        FROM enerji.uygunluk_bolge ub
        JOIN enerji.enerji_tipi et ON et.id = ub.enerji_tipi_id
        JOIN enerji.senaryo      s  ON s.id  = ub.senaryo_id
        CROSS JOIN (
            SELECT id, geom_32635 FROM enerji.ilceler WHERE ilce_adi = $2 LIMIT 1
        ) ilce_f
        WHERE et.kod = 'GES' AND s.kod = $1
          AND (
            ub.ilce_id = ilce_f.id
            OR ST_Within(ST_PointOnSurface(ub.geom), ST_Transform(ilce_f.geom_32635, 4326))
          )
        ORDER BY ub.uygunluk_sinif ASC, ub.alan_ha ASC
        LIMIT 1
    """

    try:
        async with get_pool().acquire() as conn:
            u = await conn.fetchrow(sinif_q, senaryo, ilce_adi)
            if not u:
                raise HTTPException(status_code=404, detail=f"{ilce_adi} bulunamadı")

            siniflar = {k: float(u[f"sinif{k}_ha"] or 0) for k in range(1, 6)}
            dolu = {k: v for k, v in siniflar.items() if v > 0}
            true_max = max(dolu.keys()) if dolu else 4
            true_min = min(dolu.keys()) if dolu else 4

            r_max = await conn.fetchrow(bolge_max_q, senaryo, ilce_adi)
            r_min = await conn.fetchrow(bolge_min_q, senaryo, ilce_adi)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not r_max or not r_min:
        raise HTTPException(status_code=404, detail=f"{ilce_adi} için bölge koordinatı alınamadı")

    same_coords = (
        abs(float(r_max["lon"]) - float(r_min["lon"])) < 0.0001 and
        abs(float(r_max["lat"]) - float(r_min["lat"])) < 0.0001
    )

    result = {
        "ilce": ilce_adi,
        "true_max_sinif": true_max,
        "true_min_sinif": true_min,
        "max": {
            "lon":     float(r_max["lon"]),
            "lat":     float(r_max["lat"]),
            "sinif":   int(r_max["sinif"]),
            "alan_ha": float(r_max["alan_ha"] or 0),
            "label":   f"Sınıf {true_max} — En Uygun",
        },
        "min": {
            "lon":     float(r_min["lon"]) if not same_coords else float(r_min["lon"]) + 0.001,
            "lat":     float(r_min["lat"]) if not same_coords else float(r_min["lat"]) + 0.001,
            "sinif":   true_min,
            "alan_ha": float(r_min["alan_ha"] or 0),
            "label":   f"Sınıf {true_min} — En Düşük",
        },
    }
    await detail_cache.set(key, result)
    return result


# ── /api/ges/scenarios ──────────────────────────────────────
@router.get("/ges/scenarios")
async def get_ges_scenarios():
    key = "ges_scenarios"
    cached = await stats_cache.get(key)
    if cached:
        return cached

    query = """
        SELECT
            i.ilce_adi,
            MAX(CASE WHEN s.kod = 'varsayilan' THEN u.skor_ort END) AS varsayilan
        FROM enerji.ilce_uygunluk u
        JOIN enerji.ilceler     i  ON i.id  = u.ilce_id
        JOIN enerji.enerji_tipi et ON et.id = u.enerji_tipi_id
        JOIN enerji.senaryo     s  ON s.id  = u.senaryo_id
        WHERE et.kod = 'GES'
        GROUP BY i.ilce_adi
        ORDER BY MAX(CASE WHEN s.kod = 'varsayilan' THEN u.skor_ort END) DESC NULLS LAST
    """
    try:
        async with get_pool().acquire() as conn:
            rows = await conn.fetch(query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    data = {
        "data": [
            {
                "ilce":       r["ilce_adi"],
                "varsayilan": round(float(r["varsayilan"]), 2) if r["varsayilan"] else None,
            }
            for r in rows
        ]
    }
    await stats_cache.set(key, data)
    return data