import os
import numpy as np
import rasterio
from rasterio.mask import mask as rio_mask
from rasterio.features import shapes
import geopandas as gpd
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
from shapely.geometry import shape, mapping
import json
from datetime import date

DB_CONFIG = {
    "host":     "localhost",
    "port":     5432,
    "dbname":   "yenilenebilir",
    "user":     "postgres",
    "password": "1234"
}

DATA_DIR    = r"D:\YENİLENEBİLİR ENERJİ PROJE\data\proceed"
SCHEMA      = "enerji"
SINIR_SHP   = r"D:\YENİLENEBİLİR ENERJİ PROJE\gadm41_TUR_2.json"
ILCE_AD_COL = "NAME_2"

FINAL_RASTER = {
    "GES": os.path.join(DATA_DIR, "izmir_ges_uygunluk_v4.tif"),
    "RES": os.path.join(DATA_DIR, "izmir_res_uygunluk_v4.tif"),
}

KRITER_RASTER = {
    "solar":     (os.path.join(DATA_DIR, "izmir_solar_rc.tif"),           None),
    "ruzgar":    (None,                                                    os.path.join(DATA_DIR, "izmir_ruzgar_rc_final.tif")),
    "egim":      (os.path.join(DATA_DIR, "izmir_egim_ges_rc.tif"),        os.path.join(DATA_DIR, "izmir_egim_res_rc.tif")),
    "baki":      (os.path.join(DATA_DIR, "izmir_baki_rc.tif"),            None),
    "yukseklik": (None,                                                    os.path.join(DATA_DIR, "izmir_yukseklik_rc.tif")),
    "arazi":     (os.path.join(DATA_DIR, "izmir_arazi_ges_rc_v3.tif"),    os.path.join(DATA_DIR, "izmir_arazi_final4.tif")),
    "yerlesim":  (os.path.join(DATA_DIR, "izmir_yerlesim_ges_rc.tif"),    os.path.join(DATA_DIR, "izmir_yerlesim_res_rc.tif")),
    "yol":       (os.path.join(DATA_DIR, "izmir_yol_rc.tif"),             os.path.join(DATA_DIR, "izmir_yol_rc.tif")),
    "akarsu":    (os.path.join(DATA_DIR, "izmir_akarsu_ges_rc.tif"),      os.path.join(DATA_DIR, "izmir_akarsu_res_rc.tif")),
    "enerji":    (os.path.join(DATA_DIR, "izmir_enerji_ges_rc.tif"),      os.path.join(DATA_DIR, "izmir_enerji_res_rc.tif")),
    "fay":       (os.path.join(DATA_DIR, "izmir_fay_ges_rc.tif"),         os.path.join(DATA_DIR, "izmir_fay_res_rc.tif")),
}

MW_PER_HA    = {"GES": 1.0, "RES": 0.5}
MIN_BOLGE_HA = 1.0


def get_conn():
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    return conn


def raster_meta(path):
    with rasterio.open(path) as src:
        data  = src.read(1).astype(float)
        nd    = src.nodata if src.nodata is not None else -9999
        valid = data[data != nd]
        valid = valid[~np.isnan(valid)]
        return {
            "min":       float(valid.min()) if valid.size > 0 else None,
            "max":       float(valid.max()) if valid.size > 0 else None,
            "pixelsize": abs(src.transform.a),
            "epsg":      src.crs.to_epsg() if src.crs else 32635,
        }


def zonal_stats_manual(gdf_utm, tif_path):
    results = []
    with rasterio.open(tif_path) as src:
        nd = src.nodata if src.nodata is not None else -9999
        for _, row in gdf_utm.iterrows():
            geom = [mapping(row.geometry)]
            try:
                out, _ = rio_mask(src, geom, crop=True, nodata=nd, filled=True)
                arr   = out[0].astype(float)
                valid = arr[(arr != nd) & ~np.isnan(arr)]
                if valid.size == 0:
                    results.append({"min": None, "max": None, "mean": None, "std": None, "count": 0})
                else:
                    results.append({
                        "min":   float(valid.min()),
                        "max":   float(valid.max()),
                        "mean":  float(valid.mean()),
                        "std":   float(valid.std()),
                        "count": int(valid.size),
                    })
            except Exception:
                results.append({"min": None, "max": None, "mean": None, "std": None, "count": 0})
    return results


def sinif_dagilimi(gdf_utm, tif_path):
    results = []
    with rasterio.open(tif_path) as src:
        nd = src.nodata if src.nodata is not None else -9999
        for _, row in gdf_utm.iterrows():
            geom  = [mapping(row.geometry)]
            sinif = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            vals  = np.array([])
            try:
                out, _ = rio_mask(src, geom, crop=True, nodata=nd, filled=True)
                arr   = out[0].astype(float)
                valid = arr[(arr != nd) & ~np.isnan(arr)]
                for v in valid:
                    cls = int(round(v))
                    if 1 <= cls <= 5:
                        sinif[cls] += 1
                vals = valid
            except Exception:
                pass
            results.append({
                "sinif":  sinif,
                "mean":   float(np.mean(vals))   if vals.size > 0 else None,
                "median": float(np.median(vals)) if vals.size > 0 else None,
                "min":    float(np.min(vals))    if vals.size > 0 else None,
                "max":    float(np.max(vals))    if vals.size > 0 else None,
            })
    return results


def load_ilceler(conn):
    print("\n[1/6] Ilce sinirlari yukleniyor...")
    if not os.path.exists(SINIR_SHP):
        print(f"  HATA: {SINIR_SHP} bulunamadi!")
        return
    gdf = gpd.read_file(SINIR_SHP)
    gdf = gdf[gdf["NAME_1"] == "Izmir"].copy()
    gdf = gdf.reset_index(drop=True)
    gdf_utm = gdf.to_crs("EPSG:32635")
    print(f"  Sutunlar   : {list(gdf.columns)}")
    print(f"  CRS        : {gdf.crs}")
    print(f"  Satir sayisi: {len(gdf)}")
    if gdf.crs is None or gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs("EPSG:4326")
    gdf_utm = gdf.to_crs("EPSG:32635")
    if ILCE_AD_COL not in gdf.columns:
        print(f"  HATA: '{ILCE_AD_COL}' sutunu yok! Mevcut: {list(gdf.columns)}")
        return
    with conn.cursor() as cur:
        cur.execute(f"SET search_path TO {SCHEMA}, public")
        cur.execute("TRUNCATE TABLE ilceler CASCADE")
        count = 0
        for i, row in gdf.iterrows():
            cur.execute("""
                INSERT INTO ilceler (ilce_adi, toplam_alan_km2, geom, geom_32635)
                VALUES (%s, %s,
                    ST_SetSRID(ST_GeomFromText(%s), 4326),
                    ST_SetSRID(ST_GeomFromText(%s), 32635))
            """, (
                str(row[ILCE_AD_COL]),
                round(gdf_utm.iloc[i].geometry.area / 1_000_000, 2),
                row.geometry.wkt,
                gdf_utm.iloc[i].geometry.wkt
            ))
            count += 1
        conn.commit()
    print(f"  OK {count} ilce eklendi.")


def register_rasters(conn):
    print("\n[2/6] Raster kayit defteri guncelleniyor...")
    catalog = []
    for et, path in FINAL_RASTER.items():
        if os.path.exists(path):
            m = raster_meta(path)
            catalog.append((
                f"final_{et.lower()}",
                f"Izmir {et} Nihai Uygunluk (v4)",
                os.path.basename(path), et, "final",
                int(m["pixelsize"]), m["epsg"], m["min"], m["max"]
            ))
        else:
            print(f"  UYARI: {os.path.basename(path)} bulunamadi")
    for kod, (gp, rp) in KRITER_RASTER.items():
        for et, path in [("GES", gp), ("RES", rp)]:
            if path and os.path.exists(path):
                m = raster_meta(path)
                catalog.append((
                    f"{kod}_{et.lower()}_rc",
                    f"{kod} RC - {et}",
                    os.path.basename(path), et, "rc",
                    int(m["pixelsize"]), m["epsg"], m["min"], m["max"]
                ))
    with conn.cursor() as cur:
        cur.execute(f"SET search_path TO {SCHEMA}, public")
        execute_values(cur, """
            INSERT INTO raster_katman
                (kod, aciklama, kaynak_dosya, enerji_tipi, katman_tipi,
                 piksel_m, epsg, min_deger, max_deger)
            VALUES %s
            ON CONFLICT (kod) DO UPDATE SET
                min_deger = EXCLUDED.min_deger,
                max_deger = EXCLUDED.max_deger,
                yukleme_tarihi = NOW()
        """, catalog)
        conn.commit()
    print(f"  OK {len(catalog)} raster kaydedildi.")


def compute_zonal_stats(conn):
    print("\n[3/6] Zonal istatistikler hesaplaniyor (5-10 dk surebilir)...")
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(f"SET search_path TO {SCHEMA}, public")
        cur.execute("SELECT id, ST_AsText(geom_32635) AS wkt FROM ilceler")
        ilceler = cur.fetchall()
        cur.execute("SELECT id, kod FROM kriterler")
        kriter_map = {r["kod"]: r["id"] for r in cur.fetchall()}
        cur.execute("SELECT id, kod FROM enerji_tipi")
        et_map = {r["kod"]: r["id"] for r in cur.fetchall()}
    if not ilceler:
        print("  UYARI: ilceler tablosu bos.")
        return
    from shapely import wkt as swkt
    ilce_ids = [r["id"] for r in ilceler]
    gdf_utm  = gpd.GeoDataFrame(
        {"id": ilce_ids, "geometry": [swkt.loads(r["wkt"]) for r in ilceler]},
        crs="EPSG:32635"
    )
    rows  = []
    today = date.today()
    for kriter_kod, (gp, rp) in KRITER_RASTER.items():
        kriter_id = kriter_map.get(kriter_kod)
        if not kriter_id:
            continue
        for et_kod, tif_path in [("GES", gp), ("RES", rp)]:
            if not tif_path or not os.path.exists(tif_path):
                continue
            print(f"  {kriter_kod}/{et_kod}...")
            stats = zonal_stats_manual(gdf_utm, tif_path)
            for i, s in enumerate(stats):
                if s["count"] == 0:
                    continue
                rows.append((
                    ilce_ids[i], kriter_id, et_map[et_kod],
                    s["min"], s["max"], s["mean"], s["std"],
                    round(s["min"], 1) if s["min"] else None,
                    round(s["max"], 1) if s["max"] else None,
                    round(s["mean"], 2) if s["mean"] else None,
                    round(s["std"], 2) if s["std"] else None,
                    s["count"], today
                ))
    if rows:
        with conn.cursor() as cur:
            cur.execute(f"SET search_path TO {SCHEMA}, public")
            cur.execute("TRUNCATE TABLE ilce_kriter_istatistik")
            execute_values(cur, """
                INSERT INTO ilce_kriter_istatistik
                    (ilce_id, kriter_id, enerji_tipi_id,
                     ham_min, ham_max, ham_ort, ham_std,
                     rc_min, rc_max, rc_ort, rc_std,
                     piksel_sayisi, analiz_tarihi)
                VALUES %s
            """, rows)
            conn.commit()
        print(f"  OK {len(rows)} satir eklendi.")


def compute_ilce_uygunluk(conn):
    print("\n[4/6] Ilce uygunluk skorlari hesaplaniyor...")
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(f"SET search_path TO {SCHEMA}, public")
        cur.execute("SELECT id, ST_AsText(geom_32635) AS wkt FROM ilceler")
        ilceler = cur.fetchall()
        cur.execute("SELECT id, kod FROM enerji_tipi")
        et_map = {r["kod"]: r["id"] for r in cur.fetchall()}
        cur.execute("SELECT id FROM senaryo WHERE kod='varsayilan'")
        senaryo_id = cur.fetchone()["id"]
    if not ilceler:
        print("  UYARI: ilceler tablosu bos.")
        return
    from shapely import wkt as swkt
    ilce_ids = [r["id"] for r in ilceler]
    gdf_utm  = gpd.GeoDataFrame(
        {"id": ilce_ids, "geometry": [swkt.loads(r["wkt"]) for r in ilceler]},
        crs="EPSG:32635"
    )
    rows  = []
    today = date.today()
    for et_kod, tif_path in FINAL_RASTER.items():
        if not os.path.exists(tif_path):
            print(f"  ATLA: {tif_path}")
            continue
        print(f"  {et_kod}...")
        stats = sinif_dagilimi(gdf_utm, tif_path)
        for i, s in enumerate(stats):
            sinif    = s["sinif"]
            uygun_ha = (sinif[4] + sinif[5]) * 1.0
            rows.append((
                ilce_ids[i], et_map[et_kod], senaryo_id,
                round(s["min"],    2) if s["min"]    else None,
                round(s["max"],    2) if s["max"]    else None,
                round(s["mean"],   2) if s["mean"]   else None,
                round(s["median"], 2) if s["median"] else None,
                sinif[1], sinif[2], sinif[3], sinif[4], sinif[5],
                round(uygun_ha * MW_PER_HA[et_kod], 2),
                today
            ))
    if rows:
        with conn.cursor() as cur:
            cur.execute(f"SET search_path TO {SCHEMA}, public")
            execute_values(cur, """
                INSERT INTO ilce_uygunluk
                    (ilce_id, enerji_tipi_id, senaryo_id,
                     skor_min, skor_max, skor_ort, skor_medyan,
                     sinif1_piksel, sinif2_piksel, sinif3_piksel,
                     sinif4_piksel, sinif5_piksel,
                     tahmini_mw, analiz_tarihi)
                VALUES %s
                ON CONFLICT (ilce_id, enerji_tipi_id, senaryo_id)
                DO UPDATE SET skor_ort = EXCLUDED.skor_ort,
                              tahmini_mw = EXCLUDED.tahmini_mw
            """, rows)
            conn.commit()
        print(f"  OK {len(rows)} satir eklendi.")


def polygonize_suitability(conn):
    print("\n[5/6] Uygunluk bolgeleri vektorize ediliyor...")
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(f"SET search_path TO {SCHEMA}, public")
        cur.execute("SELECT id, kod FROM enerji_tipi")
        et_map = {r["kod"]: r["id"] for r in cur.fetchall()}
        cur.execute("SELECT id FROM senaryo WHERE kod='varsayilan'")
        senaryo_id = cur.fetchone()["id"]
    all_rows = []
    for et_kod, tif_path in FINAL_RASTER.items():
        if not os.path.exists(tif_path):
            continue
        print(f"  {et_kod}...")
        with rasterio.open(tif_path) as src:
            data      = src.read(1)
            transform = src.transform
            src_crs   = src.crs
            nd        = src.nodata if src.nodata is not None else -9999
            for target_cls in [1, 2, 3, 4, 5]:
                mask_arr = (
                    (data >= target_cls - 0.5) &
                    (data <  target_cls + 0.5) &
                    (data != nd)
                ).astype("uint8")
                if not mask_arr.any():
                    continue
                count = 0
                for geom_dict, val in shapes(mask_arr, mask=mask_arr, transform=transform):
                    geom_utm = shape(geom_dict)
                    alan_ha  = geom_utm.area / 10000.0
                    if alan_ha < MIN_BOLGE_HA:
                        continue
                    gs    = gpd.GeoSeries([geom_utm], crs=src_crs)
                    g4326 = gs.to_crs("EPSG:4326").iloc[0]
                    all_rows.append((
                        et_map[et_kod], senaryo_id, None,
                        target_cls,
                        round(geom_utm.area, 2),
                        round(alan_ha * MW_PER_HA[et_kod], 2),
                        f"SRID=4326;{g4326.wkt}"
                    ))
                    count += 1
                print(f"    Sinif {target_cls}: {count} bolge")
    if all_rows:
        with conn.cursor() as cur:
            cur.execute(f"SET search_path TO {SCHEMA}, public")
            cur.execute("TRUNCATE TABLE uygunluk_bolge")
            for row in all_rows:
                cur.execute("""
                    INSERT INTO uygunluk_bolge
                        (enerji_tipi_id, senaryo_id, ilce_id,
                         uygunluk_sinif, alan_m2, tahmini_mw, geom)
                    VALUES (%s, %s, %s, %s, %s, %s, ST_GeomFromEWKT(%s))
                """, row)
            conn.commit()
        print(f"  OK {len(all_rows)} bolge eklendi.")


def update_api_cache(conn):
    print("\n[6/6] API cache guncelleniyor...")
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(f"SET search_path TO {SCHEMA}, public")
        for et in ["GES", "RES"]:
            cur.execute("""
                SELECT ilce_adi, enerji_tipi, senaryo,
                       skor_ort, uygun_alan_ha, tahmini_mw
                FROM v_ilce_uygunluk_ozet
                WHERE enerji_tipi = %s AND senaryo = 'varsayilan'
                ORDER BY skor_ort DESC
            """, (et,))
            rows = cur.fetchall()
            cur.execute("""
                INSERT INTO api_cache (endpoint, payload)
                VALUES (%s, %s)
                ON CONFLICT (endpoint) DO UPDATE SET
                    payload = EXCLUDED.payload, guncelleme = NOW()
            """, (f"/api/ilce-uygunluk/{et}",
                  json.dumps([dict(r) for r in rows], default=str)))
        conn.commit()
    print("  OK Cache tamamlandi.")


def main():
    print("=" * 50)
    print("  Izmir GES/RES - Veritabani Doldurma")
    print("=" * 50)
    print("\n-- Dosya Kontrolu --")
    for et, path in FINAL_RASTER.items():
        ok = "OK" if os.path.exists(path) else "YOK"
        print(f"  {ok}  {et}: {os.path.basename(path)}")
    ok = "OK" if os.path.exists(SINIR_SHP) else "YOK"
    print(f"  {ok}  SINIR: {os.path.basename(SINIR_SHP)}")
    conn = get_conn()
    try:
        load_ilceler(conn)
        register_rasters(conn)
        compute_zonal_stats(conn)
        compute_ilce_uygunluk(conn)
        polygonize_suitability(conn)
        update_api_cache(conn)
    except Exception as e:
        conn.rollback()
        print(f"\n  !! HATA: {e}")
        import traceback; traceback.print_exc()
    finally:
        conn.close()
    print("\n" + "=" * 50)
    print("  Bitti! pgAdmin kontrol:")
    print("  SET search_path TO enerji;")
    print("  SELECT * FROM v_ilce_uygunluk_ozet LIMIT 5;")
    print("=" * 50)


if __name__ == "__main__":
    main()