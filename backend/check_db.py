import asyncio, asyncpg, os
from dotenv import load_dotenv
load_dotenv()

async def main():
    conn = await asyncpg.connect(
        host=os.getenv("DB_HOST"), port=int(os.getenv("DB_PORT")),
        database=os.getenv("DB_NAME"), user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )
    rows = await conn.fetch("""
        SELECT
            ST_AsGeoJSON(ST_Transform(pts.geom, 4326)) AS geom,
            ROUND(pts.val::numeric, 2) AS skor
        FROM uygunluk.izmir_ges_uygunluk,
        LATERAL ST_PixelAsPoints(rast, 1) AS pts
        WHERE pts.val >= 1.0
        LIMIT 5
    """)
    print(f"Satır sayısı: {len(rows)}")
    for r in rows:
        print(f"  skor={r['skor']}  geom={r['geom'][:50]}")
    await conn.close()

asyncio.run(main())