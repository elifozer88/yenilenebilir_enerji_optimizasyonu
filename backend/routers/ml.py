"""
backend/routers/ml.py
Random Forest ile GES/RES uygunluk doğrulama ve tahmin
"""
from fastapi import APIRouter, HTTPException, Query
from database import get_pool
import json

router = APIRouter()

# sklearn lazy import — sadece endpoint çağrıldığında yükle
def _get_sklearn():
    try:
        from sklearn.ensemble import RandomForestRegressor
        from sklearn.model_selection import cross_val_score
        from sklearn.preprocessing import StandardScaler
        import numpy as np
        return RandomForestRegressor, cross_val_score, StandardScaler, np
    except ImportError:
        return None, None, None, None


# ─────────────────────────────────────────────────
#  GET /api/ml/train
#  İlçe kriter skorlarından RF modeli eğit
# ─────────────────────────────────────────────────
@router.get("/ml/train")
async def train_model(enerji: str = Query(default="GES")):
    RF, cv_score, Scaler, np = _get_sklearn()
    if RF is None:
        raise HTTPException(status_code=503,
            detail="scikit-learn kurulu değil. pip install scikit-learn")

    query = """
        SELECT
            i.ilce_adi,
            u.skor_ort AS hedef,
            MAX(CASE WHEN k.kod='solar'    THEN iks.rc_ort END) AS solar,
            MAX(CASE WHEN k.kod='ruzgar'   THEN iks.rc_ort END) AS ruzgar,
            MAX(CASE WHEN k.kod='egim'     THEN iks.rc_ort END) AS egim,
            MAX(CASE WHEN k.kod='baki'     THEN iks.rc_ort END) AS baki,
            MAX(CASE WHEN k.kod='yukseklik'THEN iks.rc_ort END) AS yukseklik,
            MAX(CASE WHEN k.kod='arazi'    THEN iks.rc_ort END) AS arazi,
            MAX(CASE WHEN k.kod='yerlesim' THEN iks.rc_ort END) AS yerlesim,
            MAX(CASE WHEN k.kod='yol'      THEN iks.rc_ort END) AS yol,
            MAX(CASE WHEN k.kod='akarsu'   THEN iks.rc_ort END) AS akarsu,
            MAX(CASE WHEN k.kod='enerji'   THEN iks.rc_ort END) AS enerji_hatti,
            MAX(CASE WHEN k.kod='fay'      THEN iks.rc_ort END) AS fay,
            u.uygun_alan_ha,
            u.tahmini_mw
        FROM enerji.ilce_uygunluk u
        JOIN enerji.ilceler       i   ON i.id = u.ilce_id
        JOIN enerji.enerji_tipi   et  ON et.id = u.enerji_tipi_id
        JOIN enerji.senaryo       s   ON s.id  = u.senaryo_id
        JOIN enerji.ilce_kriter_istatistik iks ON iks.ilce_id = u.ilce_id
                                               AND iks.enerji_tipi_id = u.enerji_tipi_id
        JOIN enerji.kriterler     k   ON k.id = iks.kriter_id
        WHERE et.kod = $1 AND s.kod = 'varsayilan'
        GROUP BY i.ilce_adi, u.skor_ort, u.uygun_alan_ha, u.tahmini_mw
        HAVING COUNT(DISTINCT k.kod) >= 5
        ORDER BY i.ilce_adi
    """

    try:
        async with get_pool().acquire() as conn:
            rows = await conn.fetch(query, enerji)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if len(rows) < 5:
        raise HTTPException(status_code=422,
            detail=f"Yeterli veri yok: {len(rows)} ilçe (min 5 gerekli)")

    # Feature matrix
    FEATURES = ['solar','ruzgar','egim','baki','yukseklik',
                'arazi','yerlesim','yol','akarsu','enerji_hatti','fay']

    # GES için rüzgar/yükseklik, RES için solar/baki irrelevant — None gelirse 0
    X_raw, y_raw, ilce_names = [], [], []
    for r in rows:
        row_vals = [float(r[f]) if r[f] is not None else 0.0 for f in FEATURES]
        if r['hedef'] is None:
            continue
        X_raw.append(row_vals)
        y_raw.append(float(r['hedef']))
        ilce_names.append(r['ilce_adi'])

    if len(X_raw) < 5:
        raise HTTPException(status_code=422, detail="Yeterli geçerli satır yok")

    X = np.array(X_raw)
    y = np.array(y_raw)

    # Model eğitimi
    rf = RF(n_estimators=200, max_depth=None, min_samples_leaf=2,
            oob_score=True, random_state=42, n_jobs=-1)
    rf.fit(X, y)

    y_pred = rf.predict(X)
    oob    = round(rf.oob_score_, 3)
    r2     = round(float(np.corrcoef(y, y_pred)[0, 1]), 3)  # Pearson r

    # Feature importance
    importance = [
        {"kriter": FEATURES[i], "onem": round(float(rf.feature_importances_[i]), 4)}
        for i in np.argsort(rf.feature_importances_)[::-1]
        if rf.feature_importances_[i] > 0.001
    ]

    # AHP ortalama vs RF tahmin karşılaştırma
    karsilastirma = [
        {
            "ilce":     ilce_names[i],
            "ahp_skor": round(float(y[i]), 3),
            "rf_skor":  round(float(y_pred[i]), 3),
            "fark":     round(float(y_pred[i] - y[i]), 3),
        }
        for i in range(len(ilce_names))
    ]

    return {
        "enerji_tipi":   enerji,
        "n_ilce":        len(ilce_names),
        "n_estimators":  200,
        "oob_score":     oob,
        "pearson_r":     r2,
        "ahp_ortalama":  round(float(np.mean(y)), 3),
        "rf_ortalama":   round(float(np.mean(y_pred)), 3),
        "feature_importance": importance,
        "karsilastirma": karsilastirma,
    }


# ─────────────────────────────────────────────────
#  GET /api/ml/district/{ilce}
#  Tek ilçe için RF tahmin + kriter detayı
# ─────────────────────────────────────────────────
@router.get("/ml/district/{ilce_adi}")
async def predict_district(
    ilce_adi: str,
    enerji: str = Query(default="GES")
):
    # Önce /ml/train ile aynı modeli kullan — basit yaklaşım
    train_result = await train_model(enerji=enerji)

    ilce_data = next(
        (r for r in train_result["karsilastirma"] if r["ilce"].lower() == ilce_adi.lower()),
        None
    )
    if not ilce_data:
        raise HTTPException(status_code=404, detail=f"{ilce_adi} model sonuçlarında bulunamadı")

    return {
        "ilce":        ilce_data["ilce"],
        "enerji_tipi": enerji,
        "ahp_skor":    ilce_data["ahp_skor"],
        "rf_skor":     ilce_data["rf_skor"],
        "fark":        ilce_data["fark"],
        "oob_score":   train_result["oob_score"],
        "pearson_r":   train_result["pearson_r"],
    }


# ─────────────────────────────────────────────────
#  GET /api/ml/mw-hesap
#  MW kapasite hesaplama — panel/türbin parametreleriyle
# ─────────────────────────────────────────────────
@router.get("/ml/mw-hesap")
async def mw_hesap(
    enerji:    str   = Query(default="GES"),
    min_sinif: int   = Query(default=4, ge=1, le=5),
    senaryo:   str   = Query(default="varsayilan"),
    # GES parametreleri
    panel_kw_per_ha: float = Query(default=1000.0,   description="kW/ha panel kapasitesi"),
    kapasite_faktoru: float = Query(default=0.18,    description="Kapasite faktörü (0-1)"),
    # RES parametreleri
    turbin_mw:       float = Query(default=2.0,      description="Türbin kapasitesi MW"),
    turbin_ha:       float = Query(default=25.0,     description="Türbin başına ha"),
):
    query = """
        SELECT
            i.ilce_adi,
            u.sinif4_ha + u.sinif5_ha AS uygun_ha,
            u.sinif5_ha,
            u.sinif4_ha,
            u.skor_ort
        FROM enerji.ilce_uygunluk u
        JOIN enerji.ilceler       i  ON i.id = u.ilce_id
        JOIN enerji.enerji_tipi   et ON et.id = u.enerji_tipi_id
        JOIN enerji.senaryo       s  ON s.id  = u.senaryo_id
        WHERE et.kod = $1 AND s.kod = $2
          AND (u.sinif4_ha + u.sinif5_ha) > 0
        ORDER BY uygun_ha DESC
    """
    try:
        async with get_pool().acquire() as conn:
            rows = await conn.fetch(query, enerji, senaryo)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    sonuclar = []
    toplam_mw = 0
    toplam_ha = 0

    for r in rows:
        ha = float(r['uygun_ha'])
        if ha <= 0:
            continue

        if enerji == 'GES':
            # Kurulu güç (MW) = ha × panel_kw_per_ha / 1000
            kurulu_mw   = ha * panel_kw_per_ha / 1000.0
            # Yıllık üretim (MWh) = kurulu_mw × 8760 × kapasite_faktoru
            yillik_mwh  = kurulu_mw * 8760 * kapasite_faktoru
        else:
            # RES: türbin sayısı = ha / turbin_ha
            turbin_sayisi = max(1, int(ha / turbin_ha))
            kurulu_mw     = turbin_sayisi * turbin_mw
            yillik_mwh    = kurulu_mw * 8760 * 0.30  # RES kapasite faktörü ~%30

        co2_ton = yillik_mwh * 0.463  # Türkiye ortalama emisyon faktörü kg/kWh → ton/MWh
        hane    = int(yillik_mwh * 1000 / 3500)  # ortalama hane tüketimi 3500 kWh/yıl

        sonuclar.append({
            "ilce":         r['ilce_adi'],
            "uygun_ha":     round(ha, 1),
            "sinif5_ha":    round(float(r['sinif5_ha']), 1),
            "sinif4_ha":    round(float(r['sinif4_ha']), 1),
            "skor_ort":     round(float(r['skor_ort']), 2) if r['skor_ort'] else None,
            "kurulu_mw":    round(kurulu_mw, 1),
            "yillik_mwh":   round(yillik_mwh, 0),
            "co2_ton_yil":  round(co2_ton, 0),
            "hane_karsiligi": hane,
        })
        toplam_mw += kurulu_mw
        toplam_ha += ha

    return {
        "enerji_tipi":    enerji,
        "senaryo":        senaryo,
        "parametreler": {
            "panel_kw_per_ha":  panel_kw_per_ha  if enerji == 'GES' else None,
            "kapasite_faktoru": kapasite_faktoru  if enerji == 'GES' else None,
            "turbin_mw":        turbin_mw         if enerji == 'RES' else None,
            "turbin_ha":        turbin_ha         if enerji == 'RES' else None,
        },
        "ozet": {
            "toplam_uygun_ha": round(toplam_ha, 1),
            "toplam_kurulu_mw": round(toplam_mw, 1),
            "toplam_kurulu_gw": round(toplam_mw / 1000, 2),
            "toplam_yillik_gwh": round(sum(r['yillik_mwh'] for r in sonuclar) / 1000, 1),
            "co2_azaltim_mt": round(sum(r['co2_ton_yil'] for r in sonuclar) / 1_000_000, 3),
        },
        "ilceler": sonuclar,
    }