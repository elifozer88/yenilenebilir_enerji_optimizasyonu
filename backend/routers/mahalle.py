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

        rows = await conn.fetch("""
            SELECT
                COALESCE("name:tr", name, '') AS mahalle_adi,
                ST_AsGeoJSON(geom) AS geom_json,
                ST_X(ST_Centroid(geom)) AS cx,
                ST_Y(ST_Centroid(geom)) AS cy
            FROM enerji.osm_mahalle
            WHERE admin_level = '8'
              AND (
                ST_Within(ST_Centroid(geom), $1::geometry)
                OR (
                    ST_Intersects(geom, $1::geometry)
                    AND ST_Area(ST_Intersection(geom, $1::geometry)) > ST_Area(geom) * 0.4
                )
              )
            ORDER BY mahalle_adi
        """, ilce_row["geom"])

        features = []
        for row in rows:
            name = row["mahalle_adi"]
            if not name:
                continue
            cx, cy = float(row["cx"]), float(row["cy"])
            pt = f"ST_SetSRID(ST_MakePoint({cx},{cy}), 4326)"

            # ── ilce_id NULL sorununu bypass et: sadece spatial + enerji_tipi filtrele ──
            # 1. Merkez noktayı içeren polygon
            skor_row = await conn.fetchrow(f"""
                SELECT ub.uygunluk_sinif, ub.alan_ha, ub.tahmini_mw
                FROM enerji.uygunluk_bolge ub
                JOIN enerji.enerji_tipi et ON et.id = ub.enerji_tipi_id
                JOIN enerji.senaryo s ON s.id = ub.senaryo_id
                WHERE et.kod = $1 AND s.kod = 'varsayilan'
                  AND ST_Contains(ub.geom, {pt})
                ORDER BY ub.uygunluk_sinif DESC
                LIMIT 1
            """, enerji)

            # 2. Yoksa ilce geometrisi içindeki en yakın polygon
            if not skor_row:
                skor_row = await conn.fetchrow(f"""
                    SELECT ub.uygunluk_sinif, ub.alan_ha, ub.tahmini_mw
                    FROM enerji.uygunluk_bolge ub
                    JOIN enerji.enerji_tipi et ON et.id = ub.enerji_tipi_id
                    JOIN enerji.senaryo s ON s.id = ub.senaryo_id
                    WHERE et.kod = $1 AND s.kod = 'varsayilan'
                      AND ST_DWithin(ub.geom, {pt}, 0.05)
                    ORDER BY ST_Distance(ub.geom, {pt}) ASC
                    LIMIT 1
                """, enerji)

            features.append({
                "type": "Feature",
                "geometry": json.loads(row["geom_json"]),
                "properties": {
                    "mahalle":       name,
                    "ilce":          ilce_adi,
                    "skor_ort":      float(skor_row["uygunluk_sinif"]) if skor_row else 0,
                    "uygun_alan_ha": float(skor_row["alan_ha"] or 0) if skor_row else 0,
                    "tahmini_mw":    float(skor_row["tahmini_mw"] or 0) if skor_row else 0,
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