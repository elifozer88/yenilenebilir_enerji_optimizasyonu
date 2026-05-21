"""
backend/routers/mahalle.py - Yerel DB'den mahalle verisi
"""
import json
from fastapi import APIRouter, HTTPException, Query
from database import get_pool

router = APIRouter()
_mahalle_cache: dict = {}

@router.get("/mahalle/{ilce_adi}")
async def get_mahalleler(ilce_adi: str, enerji: str = Query(default="GES")):
    cache_key = f"{ilce_adi.lower()}_{enerji}"
    if cache_key in _mahalle_cache:
        return _mahalle_cache[cache_key]

    async with get_pool().acquire() as conn:
        ilce_row = await conn.fetchrow("""
            SELECT id, ST_Transform(geom_32635, 4326) AS geom
            FROM enerji.ilceler WHERE LOWER(ilce_adi) = LOWER($1)
        """, ilce_adi)

        if not ilce_row:
            raise HTTPException(status_code=404, detail=f"{ilce_adi} bulunamadı")

        q = """
            SELECT
                m.fid,
                COALESCE(m."name:tr", m.name, '') AS mahalle_adi,
                ST_AsGeoJSON(m.geom) AS geom_json,
                ST_X(ST_Centroid(m.geom)) AS cx,
                ST_Y(ST_Centroid(m.geom)) AS cy,
                COALESCE(SUM(ST_Area(ST_Transform(ST_Intersection(ub.geom, m.geom), 32635)) / 10000.0), 0) AS uygun_alan_ha,
                COALESCE(SUM(ub.uygunluk_sinif * ST_Area(ST_Transform(ST_Intersection(ub.geom, m.geom), 32635))) / 
                         NULLIF(SUM(ST_Area(ST_Transform(ST_Intersection(ub.geom, m.geom), 32635))), 0), 0) AS skor_ort
            FROM enerji.osm_mahalle m
            LEFT JOIN (
                SELECT ub_inner.geom, ub_inner.uygunluk_sinif
                FROM enerji.uygunluk_bolge ub_inner
                JOIN enerji.enerji_tipi et ON et.id = ub_inner.enerji_tipi_id
                JOIN enerji.senaryo s ON s.id = ub_inner.senaryo_id
                WHERE et.kod = $2 AND s.kod = 'varsayilan'
            ) ub ON ST_Intersects(ub.geom, m.geom)
            WHERE m.admin_level = '8'
              AND (
                ST_Within(ST_Centroid(m.geom), $1::geometry)
                OR (
                    ST_Intersects(m.geom, $1::geometry)
                    AND ST_Area(ST_Intersection(m.geom, $1::geometry)) > ST_Area(m.geom) * 0.4
                )
              )
            GROUP BY m.fid, m.name, m."name:tr", m.geom
            ORDER BY mahalle_adi
        """

        rows = await conn.fetch(q, ilce_row["geom"], enerji)

        mw_ratio = 1.0 if enerji == "GES" else 0.5
        features = []
        for row in rows:
            name = row["mahalle_adi"]
            if not name:
                continue
            uygun_alan = round(float(row["uygun_alan_ha"]), 2)
            tahmini_mw = round(uygun_alan * mw_ratio, 2)

            features.append({
                "type": "Feature",
                "geometry": json.loads(row["geom_json"]),
                "properties": {
                    "mahalle":       name,
                    "ilce":          ilce_adi,
                    "skor_ort":      float(row["skor_ort"]),
                    "uygun_alan_ha": uygun_alan,
                    "tahmini_mw":    tahmini_mw,
                },
            })

    result = {
        "type": "FeatureCollection",
        "features": features,
        "meta": {"ilce": ilce_adi, "enerji": enerji, "n_mahalle": len(features), "kaynak": "yerel_db"},
    }
    if features:
        _mahalle_cache[cache_key] = result
    return result