"""
tile_server.py — GES/RES uygunluk raster tile server
Başlatma: 
  $env:PROJ_DATA = "D:\YENİLENEBİLİR ENERJİ PROJE\.venv\Lib\site-packages\rasterio\proj_data"
  python -m uvicorn tile_server:app --port 8001
"""
import os
os.environ.setdefault(
    "PROJ_DATA",
    r"D:\YENİLENEBİLİR ENERJİ PROJE\.venv\Lib\site-packages\rasterio\proj_data"
)

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from rio_tiler.io import Reader
import numpy as np

app = FastAPI(title="YE·ATLAS Tile Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

DATA_DIR = r"D:\YENİLENEBİLİR ENERJİ PROJE\data\proceed"

RASTERS = {
    "ges": os.path.join(DATA_DIR, "izmir_ges_uygunluk_v4.tif"),
    "res": os.path.join(DATA_DIR, "izmir_res_uygunluk_v4.tif"),
}

# Renk paleti: sınıf 1-5
COLORS = {
    1: (185, 28,  28,  120),   # kırmızı — düşük
    2: (220, 107, 46,  130),   # turuncu
    3: (215, 119,  6,  140),   # sarı-turuncu
    4: ( 74, 166, 53,  150),   # yeşil
    5: ( 20, 128, 60,  160),   # koyu yeşil — çok uygun
}


def sinif_to_rgba(data: np.ndarray, alpha_mask: np.ndarray) -> np.ndarray:
    """Sınıf değerlerini RGBA'ya çevir."""
    h, w = data.shape
    rgba = np.zeros((4, h, w), dtype=np.uint8)

    for cls, (r, g, b, a) in COLORS.items():
        mask = (np.abs(data - cls) < 0.5) & alpha_mask
        rgba[0][mask] = r
        rgba[1][mask] = g
        rgba[2][mask] = b
        rgba[3][mask] = a

    return rgba


@app.get("/tiles/{enerji}/{z}/{x}/{y}.png")
async def get_tile(enerji: str, z: int, x: int, y: int):
    enerji = enerji.lower()
    tif_path = RASTERS.get(enerji)

    if not tif_path or not os.path.exists(tif_path):
        raise HTTPException(status_code=404, detail=f"{enerji} raster bulunamadı")

    try:
        with Reader(tif_path) as cog:
            img = cog.tile(x, y, z, tilesize=256)

        data = img.data[0].astype(float)
        nodata = -9999
        valid = (data != nodata) & (~np.isnan(data)) & (data >= 1) & (data <= 5)

        rgba = sinif_to_rgba(data, valid)

        # PNG'ye çevir
        img.data = rgba
        img.mask = rgba[3]

        png_bytes = img.render(img_format="PNG")
        return Response(content=png_bytes, media_type="image/png",
                        headers={"Cache-Control": "public, max-age=3600"})

    except Exception as e:
        # Tile yoksa boş PNG döndür
        empty = np.zeros((256, 256, 4), dtype=np.uint8)
        import io
        from PIL import Image
        buf = io.BytesIO()
        Image.fromarray(empty, "RGBA").save(buf, format="PNG")
        return Response(content=buf.getvalue(), media_type="image/png")


@app.get("/health")
async def health():
    return {"status": "ok", "rasters": {k: os.path.exists(v) for k, v in RASTERS.items()}}