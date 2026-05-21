"""
tile_server.py — GES/RES uygunluk raster tile server
Başlatma:
  $env:PROJ_DATA = "D:\YENİLENEBİLİR ENERJİ PROJE\.venv\Lib\site-packages\rasterio\proj_data"
  python -m uvicorn tile_server:app --port 8001
"""
import os
import io
import numpy as np

os.environ.setdefault(
    "PROJ_DATA",
    r"D:\YENİLENEBİLİR ENERJİ PROJE\.venv\Lib\site-packages\rasterio\proj_data"
)

from fastapi import APIRouter, FastAPI, HTTPException, Query
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from rio_tiler.io import Reader
from PIL import Image

# APIRouter'ı tanımla (ana main.py'ye entegre etmek için)
router = APIRouter()

DATA_DIR = r"D:\YENİLENEBİLİR ENERJİ PROJE\data\proceed"

RASTERS = {
    "ges": os.path.join(DATA_DIR, "izmir_ges_uygunluk_v4.tif"),
    "res": os.path.join(DATA_DIR, "izmir_res_uygunluk_v5.tif"),  # ← v4→v5 düzeltildi
}

# Renk paleti: sınıf 1-5 — alpha artırıldı (eskiden 120-160, şimdi 180-210)
COLORS = {
    1: (185,  28,  28, 120),   # koyu kırmızı
    2: (220, 107,  46, 130),   # koyu turuncu
    3: (215, 119,   6, 140),   # koyu amber
    4: ( 74, 166,  53, 150),   # zeytun yeşil
    5: ( 20, 128,  60, 160),   # koyu yeşil
}

# Boş 1×1 şeffaf PNG — tile dışı için
_EMPTY_PNG: bytes = None

def _empty_png() -> bytes:
    global _EMPTY_PNG
    if _EMPTY_PNG is None:
        buf = io.BytesIO()
        Image.new("RGBA", (256, 256), (0, 0, 0, 0)).save(buf, format="PNG")
        _EMPTY_PNG = buf.getvalue()
    return _EMPTY_PNG


def sinif_to_rgba(data: np.ndarray, valid: np.ndarray, min_score: int = 1) -> np.ndarray:
    """Sınıf değerlerini RGBA array'e çevir. Shape: (h, w, 4)"""
    h, w = data.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    for cls, (r, g, b, a) in COLORS.items():
        if cls < min_score:
            continue
        mask = (np.abs(data - cls) < 0.5) & valid
        rgba[mask, 0] = r
        rgba[mask, 1] = g
        rgba[mask, 2] = b
        rgba[mask, 3] = a
    return rgba


@router.get("/tiles/{enerji}/{z}/{x}/{y}.png")
async def get_tile(enerji: str, z: int, x: int, y: int, min_score: int = Query(default=1, ge=1, le=5)):
    enerji = enerji.lower()
    tif_path = RASTERS.get(enerji)

    if not tif_path or not os.path.exists(tif_path):
        raise HTTPException(status_code=404, detail=f"{enerji} raster bulunamadı: {tif_path}")

    try:
        with Reader(tif_path) as cog:
            img = cog.tile(x, y, z, tilesize=256)

        data  = img.data[0].astype(float)
        valid = (data > 0.5) & (data <= 5.5) & (img.mask > 0)

        # Hiç veri yoksa şeffaf PNG döndür
        if not valid.any():
            return Response(content=_empty_png(), media_type="image/png",
                            headers={"Cache-Control": "public, max-age=3600"})

        rgba = sinif_to_rgba(data, valid, min_score)  # (h, w, 4)

        # PIL ile PNG üret — rio_tiler render yerine (daha güvenilir)
        buf = io.BytesIO()
        Image.fromarray(rgba, "RGBA").save(buf, format="PNG", optimize=False)
        buf.seek(0)

        return Response(content=buf.getvalue(), media_type="image/png",
                        headers={"Cache-Control": "public, max-age=3600"})

    except Exception:
        # Tile sınır dışı veya okuma hatası → şeffaf döndür, hata verme
        return Response(content=_empty_png(), media_type="image/png",
                        headers={"Cache-Control": "public, max-age=60"})


@router.get("/tiles-health")
async def health():
    status = {}
    for k, v in RASTERS.items():
        exists = os.path.exists(v)
        status[k] = {"path": v, "exists": exists}
    return {"status": "ok", "rasters": status}


# Standalone uvicorn için FastAPI instance
app = FastAPI(title="YE·ATLAS Tile Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(router)