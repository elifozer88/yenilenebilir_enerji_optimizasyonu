import os
os.environ.setdefault(
    "PROJ_DATA",
    r"D:\YENİLENEBİLİR ENERJİ PROJE\.venv\Lib\site-packages\rasterio\proj_data"
)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import init_pool, close_pool
from routers import ges, res, terrain, ml, mahalle, pdf_rapor, hava, santral, auth, ahp
import tile_server

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    yield
    await close_pool()

app = FastAPI(
    title="İzmir Yenilenebilir Enerji DSS API",
    description="GES ve RES uygunluk analizi — PostGIS backend",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000",
                   "http://localhost:3001", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(ges.router,       prefix="/api")
app.include_router(res.router,       prefix="/api")
app.include_router(terrain.router,   prefix="/api")
app.include_router(ml.router,        prefix="/api")
app.include_router(mahalle.router,   prefix="/api")
app.include_router(pdf_rapor.router, prefix="/api")
app.include_router(hava.router,      prefix="/api")
app.include_router(santral.router,   prefix="/api")
app.include_router(auth.router,      prefix="/api")
app.include_router(ahp.router,       prefix="/api")
app.include_router(tile_server.router, prefix="/api")

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}