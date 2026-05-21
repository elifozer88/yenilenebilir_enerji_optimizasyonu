"""
backend/routers/ahp.py
AHP ağırlık yönetimi — okuma ve güncelleme
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
from database import get_pool
from routers.auth import get_current_user
import math

router = APIRouter()

# ── Saaty AHP tutarlılık matrisi RI değerleri ──
RI = {1:0, 2:0, 3:0.58, 4:0.90, 5:1.12,
      6:1.24, 7:1.32, 8:1.41, 9:1.45,
      10:1.49, 11:1.51}

def cr_hesapla(agirliklar: list[float]) -> float:
    """Basitleştirilmiş CR hesabı — normalize ağırlıklardan."""
    n = len(agirliklar)
    if n < 3:
        return 0.0
    # Ağırlıkları normalize et
    toplam = sum(agirliklar)
    if toplam == 0:
        return 0.0
    w = [a / toplam for a in agirliklar]
    # λmax tahmini: her w[i] için w[i]*n/w[i] = n (tam tutarlı durumda)
    # Basit yaklaşım: λmax ≈ n + CI*n*(n-1)
    # CI = (λmax - n) / (n - 1)
    # Burada yaklaşık CI hesabı
    lambda_max = sum((n * w[i]) / max(w[i], 0.001) * w[i] for i in range(n)) / n
    lambda_max = n + sum(w) * 0.1  # pratik yaklaşım
    ci = (lambda_max - n) / max(n - 1, 1)
    ri = RI.get(n, 1.49)
    if ri == 0:
        return 0.0
    return round(ci / ri, 4)


class AgirlikGuncelle(BaseModel):
    enerji_tipi: str  # 'GES' veya 'RES'
    agirliklar: List[dict]  # [{"kriter_kod": "solar", "agirlik": 0.32}, ...]


@router.get("/ahp/agirliklar")
async def get_agirliklar(enerji_tipi: str = "GES"):
    """Mevcut AHP ağırlıklarını getir."""
    async with get_pool().acquire() as conn:
        rows = await conn.fetch("""
            SELECT kriter_kod, agirlik, guncelleme, guncelleyen
            FROM enerji.ahp_agirliklar
            WHERE enerji_tipi = $1
            ORDER BY agirlik DESC
        """, enerji_tipi.upper())

    if not rows:
        raise HTTPException(status_code=404, detail="Ağırlık bulunamadı")

    agirliklar = [dict(r) for r in rows]
    degerler = [float(r["agirlik"]) for r in agirliklar]
    toplam = sum(degerler)

    return {
        "enerji_tipi": enerji_tipi,
        "agirliklar": [
            {
                "kriter_kod": a["kriter_kod"],
                "agirlik": float(a["agirlik"]),
                "yuzde": round(float(a["agirlik"]) / toplam * 100) if toplam > 0 else 0,
                "guncelleme": a["guncelleme"].isoformat() if a["guncelleme"] else None,
                "guncelleyen": a["guncelleyen"],
            }
            for a in agirliklar
        ],
        "toplam": round(toplam, 4),
        "cr_tahmini": cr_hesapla(degerler),
    }


@router.post("/ahp/agirliklar")
async def update_agirliklar(
    istek: AgirlikGuncelle,
    user=Depends(get_current_user)
):
    """AHP ağırlıklarını güncelle — sadece admin."""
    if user.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Sadece admin güncelleyebilir")

    enerji = istek.enerji_tipi.upper()
    agirliklar = istek.agirliklar

    if not agirliklar:
        raise HTTPException(status_code=422, detail="Ağırlık listesi boş")

    # Toplam 1'e normalize et
    toplam = sum(a["agirlik"] for a in agirliklar)
    if toplam <= 0:
        raise HTTPException(status_code=422, detail="Toplam ağırlık sıfır olamaz")

    # CR kontrolü
    degerler = [a["agirlik"] for a in agirliklar]
    cr = cr_hesapla(degerler)
    if cr > 0.10:
        raise HTTPException(
            status_code=422,
            detail=f"Tutarlılık oranı çok yüksek: CR={cr:.3f} (maksimum 0.10)"
        )

    async with get_pool().acquire() as conn:
        for a in agirliklar:
            normalize = round(a["agirlik"] / toplam, 4)
            await conn.execute("""
                UPDATE enerji.ahp_agirliklar
                SET agirlik = $1,
                    guncelleme = NOW(),
                    guncelleyen = $2
                WHERE enerji_tipi = $3 AND kriter_kod = $4
            """, normalize, user.get("sub"), enerji, a["kriter_kod"])

        # Otomatik yeniden hesapla
        guncellenen = await yeniden_hesapla(enerji, conn)

    return {
        "mesaj": "Ağırlıklar güncellendi ve skorlar yeniden hesaplandı",
        "enerji_tipi": enerji,
        "cr": cr,
        "guncellenen_ilce": guncellenen,
        "guncelleyen": user.get("sub"),
        "agirliklar": [
            {
                "kriter_kod": a["kriter_kod"],
                "agirlik": round(a["agirlik"] / toplam, 4),
                "yuzde": round(a["agirlik"] / toplam * 100),
            }
            for a in agirliklar
        ]
    }



async def yeniden_hesapla(enerji_tipi: str, conn):
    """AHP ağırlıklarını kullanarak ilce_uygunluk skorlarını yeniden hesapla."""
    et = enerji_tipi.upper()

    # Güncel ağırlıkları al (normalize edilmiş, toplam=1)
    agirliklar = await conn.fetch("""
        SELECT kriter_kod, agirlik
        FROM enerji.ahp_agirliklar
        WHERE enerji_tipi = $1
    """, et)

    if not agirliklar:
        return 0

    weights = {r['kriter_kod']: float(r['agirlik']) for r in agirliklar}
    toplam_agirlik = sum(weights.values())
    if toplam_agirlik <= 0:
        return 0

    # Ağırlıkları normalize et (güvenlik için)
    weights = {k: v / toplam_agirlik for k, v in weights.items()}

    # İlçe kriter istatistiklerini al (rc_ort = 1-5 arası reclassified değer)
    rows = await conn.fetch("""
        SELECT
            i.id AS ilce_id,
            k.kod AS kriter_kod,
            iks.rc_ort,
            iks.rc_min,
            iks.rc_max
        FROM enerji.ilce_kriter_istatistik iks
        JOIN enerji.ilceler i       ON i.id  = iks.ilce_id
        JOIN enerji.kriterler k     ON k.id  = iks.kriter_id
        JOIN enerji.enerji_tipi et  ON et.id = iks.enerji_tipi_id
        WHERE et.kod = $1
    """, et)

    # İlçe bazında ağırlıklı skor hesapla
    ilce_ort = {}
    ilce_min = {}
    ilce_max = {}

    for r in rows:
        ilce_id = r['ilce_id']
        kriter  = r['kriter_kod']
        agirlik = weights.get(kriter, 0.0)
        if agirlik == 0:
            continue

        ort = float(r['rc_ort']) if r['rc_ort'] else 0.0
        mn  = float(r['rc_min']) if r['rc_min'] else 0.0
        mx  = float(r['rc_max']) if r['rc_max'] else 0.0

        ilce_ort[ilce_id] = ilce_ort.get(ilce_id, 0.0) + ort * agirlik
        ilce_min[ilce_id] = ilce_min.get(ilce_id, 0.0) + mn  * agirlik
        ilce_max[ilce_id] = ilce_max.get(ilce_id, 0.0) + mx  * agirlik

    if not ilce_ort:
        return 0

    # Senaryo ve enerji tipi id'lerini al
    senaryo = await conn.fetchrow("SELECT id FROM enerji.senaryo WHERE kod = 'varsayilan'")
    et_row  = await conn.fetchrow("SELECT id FROM enerji.enerji_tipi WHERE kod = $1", et)

    if not senaryo or not et_row:
        return 0

    # ilce_uygunluk güncelle
    guncellenen = 0
    for ilce_id in ilce_ort:
        skor_ort = round(min(max(ilce_ort[ilce_id], 1.0), 5.0), 3)
        skor_min = round(min(max(ilce_min.get(ilce_id, skor_ort), 1.0), 5.0), 3)
        skor_max = round(min(max(ilce_max.get(ilce_id, skor_ort), 1.0), 5.0), 3)

        sonuc = await conn.execute("""
            UPDATE enerji.ilce_uygunluk
            SET skor_ort = $1, skor_min = $2, skor_max = $3
            WHERE ilce_id = $4
              AND enerji_tipi_id = $5
              AND senaryo_id = $6
        """, skor_ort, skor_min, skor_max, ilce_id, et_row['id'], senaryo['id'])
        if sonuc != "UPDATE 0":
            guncellenen += 1

    return guncellenen


@router.post("/ahp/hesapla")
async def hesapla(enerji_tipi: str, user=Depends(get_current_user)):
    """Mevcut ağırlıklarla skorları yeniden hesapla — sadece admin."""
    if user.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Sadece admin hesaplayabilir")

    async with get_pool().acquire() as conn:
        n = await yeniden_hesapla(enerji_tipi.upper(), conn)

    return {"mesaj": f"{enerji_tipi} skorları yeniden hesaplandı", "guncellenen_ilce": n}


@router.post("/ahp/sifirla")
async def sifirla(
    enerji_tipi: str,
    user=Depends(get_current_user)
):
    """Varsayılan ağırlıklara sıfırla — sadece admin."""
    if user.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Sadece admin sıfırlayabilir")

    varsayilan = {
        "GES": [
            ("solar", 0.32), ("arazi", 0.25), ("egim", 0.11),
            ("baki", 0.09), ("enerji", 0.08), ("yerlesim", 0.07),
            ("yol", 0.04), ("fay", 0.03), ("akarsu", 0.01),
        ],
        "RES": [
            ("ruzgar", 0.30), ("arazi", 0.27), ("yukseklik", 0.13),
            ("yerlesim", 0.10), ("enerji", 0.06), ("egim", 0.05),
            ("yol", 0.04), ("fay", 0.03), ("akarsu", 0.02),
        ],
    }

    et = enerji_tipi.upper()
    if et not in varsayilan:
        raise HTTPException(status_code=422, detail="Geçersiz enerji tipi")

    async with get_pool().acquire() as conn:
        for kriter, agirlik in varsayilan[et]:
            await conn.execute("""
                UPDATE enerji.ahp_agirliklar
                SET agirlik = $1, guncelleme = NOW(), guncelleyen = $2
                WHERE enerji_tipi = $3 AND kriter_kod = $4
            """, agirlik, user.get("sub"), et, kriter)

    return {"mesaj": f"{et} ağırlıkları varsayılana sıfırlandı"}