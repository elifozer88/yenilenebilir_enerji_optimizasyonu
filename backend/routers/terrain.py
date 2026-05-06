import json
from fastapi import APIRouter, HTTPException
from database import get_pool

router = APIRouter()

@router.get("/terrain")
async def get_terrain():
    """
    Her tile'dan 30 piksel alır → tüm İzmir'e yayılmış ~5250 nokta.
    LATERAL subquery ile per-tile LIMIT uygulanır.
    """
    query = """
        SELECT
            ST_AsGeoJSON(ST_Transform(pts.geom, 4326)) AS geom,
            ROUND(pts.val::numeric, 1)                  AS yukseklik
        FROM rasterlar.izmir_dem,
        LATERAL (
            SELECT (px).geom, (px).val
            FROM ST_PixelAsPoints(rast, 1) AS px
            WHERE (px).val > 0 AND (px).val < 9000
            LIMIT 30
        ) AS pts
    """
    try:
        async with get_pool().acquire() as conn:
            rows = await conn.fetch(query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    features = [
        {
            "type": "Feature",
            "geometry": json.loads(r["geom"]),
            "properties": {"yukseklik": float(r["yukseklik"])},
        }
        for r in rows
    ]
    return {
        "type": "FeatureCollection",
        "features": features,
        "meta": {"count": len(features)},
    }