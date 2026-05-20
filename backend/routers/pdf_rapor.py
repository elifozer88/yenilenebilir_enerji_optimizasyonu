"""
backend/routers/pdf_rapor.py
YE·ATLAS -- Ilce Yenilenebilir Enerji Uygunluk Analiz Raporu
Izmir Buyuksehir Belediyesi - DEU YBS Capstone 2026
"""
import io
import json
import traceback
from datetime import datetime
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
from database import get_pool

router = APIRouter()

SINIF_RENK_RGB = {
    5: (20, 128, 60),
    4: (74, 166, 53),
    3: (215, 119, 6),
    2: (220, 107, 46),
    1: (185, 28, 28),
}
SINIF_AD = {5: "Cok Uygun", 4: "Uygun", 3: "Orta", 2: "Dusuk", 1: "Uygunsuz"}


def skor_rgb(s):
    if s >= 4.5: return (20, 128, 60)
    if s >= 4.0: return (74, 166, 53)
    if s >= 3.0: return (215, 119, 6)
    if s >= 2.0: return (220, 107, 46)
    return (185, 28, 28)


def rgb01(t):
    return tuple(c / 255 for c in t)


def _make_map_png(boundary_geojson, poly_rows, ilce_adi, enerji):
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import matplotlib.patches as mpatches
        from matplotlib.patches import Polygon as MplPoly
        import numpy as np

        S_COLOR = {5: "#14803C", 4: "#4AA635", 3: "#D97706", 2: "#DC6B2E", 1: "#B91C1C"}
        fig, ax = plt.subplots(figsize=(8, 6), dpi=120)
        fig.patch.set_facecolor("#0d1117")
        ax.set_facecolor("#0d1117")
        all_lons, all_lats = [], []

        def draw_geom(geom_str, fill_color, edge_color=None, lw=0, alpha=0.85):
            try:
                g = json.loads(geom_str)
                rings = []
                if g["type"] == "Polygon":
                    rings = [g["coordinates"][0]]
                elif g["type"] == "MultiPolygon":
                    rings = [r[0] for r in g["coordinates"]]
                for ring in rings:
                    xy = np.array(ring)
                    all_lons.extend(xy[:, 0])
                    all_lats.extend(xy[:, 1])
                    p = MplPoly(xy, closed=True)
                    p.set_facecolor("none" if edge_color else fill_color)
                    p.set_edgecolor(edge_color if edge_color else "none")
                    p.set_linewidth(lw)
                    p.set_alpha(alpha)
                    ax.add_patch(p)
            except Exception:
                pass

        for sinif, geom_str in poly_rows:
            draw_geom(geom_str, S_COLOR.get(sinif, "#555"))

        if boundary_geojson:
            draw_geom(boundary_geojson, "none", edge_color="#22D3EE", lw=2.5, alpha=1.0)

        if all_lons and all_lats:
            px = (max(all_lons) - min(all_lons)) * 0.07
            py = (max(all_lats) - min(all_lats)) * 0.07
            ax.set_xlim(min(all_lons) - px, max(all_lons) + px)
            ax.set_ylim(min(all_lats) - py, max(all_lats) + py)

        ax.set_aspect("equal")
        ax.axis("off")
        ax.set_title(ilce_adi + " Ilcesi -- " + enerji + " Uygunluk Haritasi",
                     color="white", fontsize=11, fontweight="bold", pad=10)

        legend_items = [
            mpatches.Patch(facecolor=S_COLOR[s], label="Sinif " + str(s) + " -- " + SINIF_AD[s])
            for s in [5, 4, 3, 2, 1]
        ]
        legend_items.append(
            mpatches.Patch(facecolor="none", edgecolor="#22D3EE",
                           linewidth=2, label="Ilce Siniri")
        )
        ax.legend(handles=legend_items, loc="lower left",
                  framealpha=0.85, facecolor="#1a2035",
                  edgecolor="#2a3550", labelcolor="white", fontsize=8)

        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=120, bbox_inches="tight",
                    facecolor=fig.get_facecolor())
        plt.close(fig)
        buf.seek(0)
        return buf.getvalue()
    except Exception:
        return None


def _gauge_drawing(skor, renk_t, size=90):
    from reportlab.graphics.shapes import Drawing, String, Circle, Rect
    from reportlab.lib import colors as rc

    d = Drawing(size, size)
    cx, cy = size / 2, size / 2
    R      = size * 0.42
    r_in   = size * 0.28

    DARK  = rc.Color(0.1, 0.1, 0.17)
    GRAY2 = rc.Color(0.88, 0.88, 0.91)
    SKOR  = rc.Color(*rgb01(renk_t))

    # Arka plan dairesi
    d.add(Circle(cx, cy, R, fillColor=GRAY2, strokeColor=None))
    # Skor halka (renk) — ic-dis cember arasini renklendirmek icin dis daire
    d.add(Circle(cx, cy, R, fillColor=None, strokeColor=SKOR, strokeWidth=8))
    # Ic beyaz daire
    d.add(Circle(cx, cy, r_in, fillColor=rc.white, strokeColor=GRAY2, strokeWidth=0.5))
    # Skor metni
    d.add(String(cx, cy + 2, "%.2f" % skor,
                 textAnchor="middle", fontSize=size * 0.16,
                 fontName="Helvetica-Bold", fillColor=DARK))
    d.add(String(cx, cy - size * 0.13, "/ 5.00",
                 textAnchor="middle", fontSize=size * 0.09,
                 fillColor=rc.Color(0.55, 0.55, 0.6)))
    return d


def build_pdf(data, map_png=None):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm
    from reportlab.lib import colors as rc
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table,
        TableStyle, HRFlowable, PageBreak, Image as RLImage,
    )
    from reportlab.graphics.shapes import Drawing, Rect, String

    # -- Turkce destekli font kaydi (Arial, Windows) --
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    import os
    try:
        wf = "C:\\Windows\\Fonts"
        pdfmetrics.registerFont(TTFont("TR",      os.path.join(wf, "arial.ttf")))
        pdfmetrics.registerFont(TTFont("TR-Bold", os.path.join(wf, "arialbd.ttf")))
        F  = "TR"
        FB = "TR-Bold"
    except Exception:
        F  = "Helvetica"
        FB = "Helvetica-Bold"

    ilce     = data["ilce"]
    enerji   = data["enerji"]
    skor     = float(data.get("skor_ort") or 0)
    s_min    = float(data.get("skor_min") or 0)
    s_max    = float(data.get("skor_max") or 0)
    alan     = float(data.get("uygun_alan_ha") or 0)
    mw       = float(data.get("tahmini_mw") or 0)
    krits    = data.get("kriterler", [])
    sinif_d  = data.get("sinif_dagilim", {})
    senaryo  = data.get("senaryo", "varsayilan")
    mw_hesap = data.get("mw_hesap", {})
    tarih    = datetime.now().strftime("%d %B %Y")

    renk_t   = skor_rgb(skor)
    sinif_no = 5 if skor >= 4 else 4 if skor >= 3 else 3 if skor >= 2 else 1
    cf_pct   = "18" if enerji == "GES" else "30"

    if enerji == "GES":
        enerji_ad = "Gunes Enerjisi Santrali (GES)"
        enerji_k  = "gunes"
    else:
        enerji_ad = "Ruzgar Enerji Santrali (RES)"
        enerji_k  = "ruzgar"

    yillik_gwh = mw_hesap.get("yillik_mwh", mw * 8760 * (0.18 if enerji == "GES" else 0.30)) / 1000
    co2_kt     = mw_hesap.get("co2_ton_yil", yillik_gwh * 1000 * 0.463) / 1000
    hane       = int(mw_hesap.get("hane_karsiligi", yillik_gwh * 1000 * 1000 / 3500))
    co2_agac   = int(co2_kt * 1000 / 0.022)

    TEAL  = rc.Color(0.055, 0.647, 0.647)
    DARK  = rc.Color(0.08, 0.09, 0.15)
    GRAY  = rc.Color(0.96, 0.96, 0.97)
    GRAY2 = rc.Color(0.88, 0.88, 0.91)
    MUTED = rc.Color(0.50, 0.52, 0.58)
    WHITE = rc.white
    GREEN = rc.Color(0.08, 0.50, 0.20)
    sinif_cols = {s: rc.Color(*rgb01(SINIF_RENK_RGB[s])) for s in range(1, 6)}

    PW, PH = A4
    ML = MR = 2 * cm
    CW = PW - ML - MR
    buf = io.BytesIO()

    def on_page(canv, doc):
        canv.saveState()
        canv.setFillColor(DARK)
        canv.rect(0, PH - 1.4 * cm, PW, 1.4 * cm, fill=1, stroke=0)
        canv.setFillColor(TEAL)
        canv.rect(0, PH - 1.4 * cm, 5, 1.4 * cm, fill=1, stroke=0)
        canv.setFillColor(WHITE)
        canv.setFont(FB, 8)
        canv.drawString(ML + 0.2 * cm, PH - 0.88 * cm,
                        "YE-ATLAS  -  Izmir Buyuksehir Belediyesi")
        canv.setFont(F, 8)
        canv.setFillColor(rc.Color(0.7, 0.7, 0.75))
        canv.drawRightString(PW - MR, PH - 0.88 * cm,
                             enerji + " Uygunluk Analiz Raporu  -  " + ilce + "  -  " + tarih)
        canv.setFillColor(GRAY)
        canv.rect(0, 0, PW, 1.0 * cm, fill=1, stroke=0)
        canv.setFillColor(TEAL)
        canv.rect(0, 0, 5, 1.0 * cm, fill=1, stroke=0)
        canv.setFillColor(MUTED)
        canv.setFont(F, 7)
        canv.drawString(ML, 0.35 * cm,
                        "(C) 2026 Izmir Buyuksehir Belediyesi  -  DEU YBS Capstone  -  "
                        "EPSG:32635 - 100m - AHP")
        canv.drawRightString(PW - MR, 0.35 * cm, "Sayfa " + str(doc.page))
        canv.restoreState()

    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=ML, rightMargin=MR,
        topMargin=2 * cm + 1.4 * cm,
        bottomMargin=2 * cm + 1.0 * cm,
        onFirstPage=on_page, onLaterPages=on_page,
    )

    def S(name, **kw):
        return ParagraphStyle(name, **kw)

    eyebrow = S("eyebrow", fontSize=7.5, textColor=TEAL,
                fontName=FB, spaceAfter=3, letterSpacing=1.4)
    h1   = S("h1",   fontSize=22, textColor=DARK, fontName=FB,
             leading=27, spaceAfter=4)
    body = S("body", fontSize=9,  textColor=DARK, leading=14, fontName=F)
    body_j = S("body_j", fontSize=9, textColor=DARK, leading=14, alignment=4, fontName=F)
    small  = S("small",  fontSize=8, textColor=MUTED, leading=11, fontName=F)
    warn   = S("warn",   fontSize=8, textColor=rc.Color(0.55, 0.30, 0.0), leading=12, fontName=F)

    def sec(title, sub=""):
        items = [
            HRFlowable(width="100%", thickness=0.6, color=TEAL, spaceAfter=5),
            Paragraph(title.upper(), eyebrow),
        ]
        if sub:
            items.append(Paragraph(sub, small))
        items.append(Spacer(1, 4))
        return items

    def tbl_style():
        return TableStyle([
            ("BACKGROUND",     (0, 0), (-1, 0),  GRAY),
            ("FONTNAME",       (0, 0), (-1, 0),  FB),
            ("FONTSIZE",       (0, 0), (-1, 0),  8),
            ("TEXTCOLOR",      (0, 0), (-1, 0),  MUTED),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, GRAY]),
            ("GRID",           (0, 0), (-1, -1), 0.3, GRAY2),
            ("TOPPADDING",     (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING",  (0, 0), (-1, -1), 6),
            ("LEFTPADDING",    (0, 0), (-1, -1), 8),
            ("VALIGN",         (0, 0), (-1, -1), "MIDDLE"),
            ("WORDWRAP",       (0, 0), (-1, -1), "LTR"),
        ])

    def bar_d(pct, clr, w=110, h=7):
        d = Drawing(w, h)
        d.add(Rect(0, 0, w, h, fillColor=GRAY2, strokeColor=None))
        if pct > 0:
            d.add(Rect(0, 0, min(w, w * pct / 100), h, fillColor=clr, strokeColor=None))
        return d

    story = []

    # 1. BASLIK
    story.append(Spacer(1, 0.3 * cm))
    hdr_data = [[
        [
            Paragraph("YENILENEBILIR ENERJI UYGUNLUK ANALIZ RAPORU", eyebrow),
            Paragraph(ilce, h1),
            Paragraph(enerji_ad + "  -  AHP Cok Kriterli Karar Analizi<br/>"
                      "<font color='#808090'>Senaryo: " + senaryo.capitalize() +
                      "  -  " + tarih + "  -  Izmir Buyuksehir Belediyesi</font>",
                      S("sub", fontSize=9, textColor=DARK, leading=14)),
        ],
        _gauge_drawing(skor, renk_t, size=95),
    ]]
    hdr_t = Table(hdr_data, colWidths=[CW * 0.73, CW * 0.27])
    hdr_t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN",  (1, 0), (1, 0),  "CENTER"),
    ]))
    story.append(hdr_t)
    story.append(Spacer(1, 8))

    renk_hex = "#%02x%02x%02x" % renk_t
    story.append(Paragraph(
        "<font color='" + renk_hex + "'><b>Sinif " + str(sinif_no) +
        " -- " + SINIF_AD[sinif_no] + "</b></font>" +
        "   Ortalama AHP Skoru: <b>%.3f</b> / 5.000" % skor +
        "   |   Min: %.3f" % s_min +
        "   |   Maks: %.3f" % s_max,
        S("sc", fontSize=9.5, textColor=DARK, leading=14)
    ))
    story.append(Spacer(1, 14))

    # 2. YONETICI OZETI
    story += sec("Yonetici Ozeti")
    sinif_dolu = {s: float(sinif_d.get(str(s), 0)) for s in range(1, 6)}
    toplam_ha  = sum(sinif_dolu.values()) or 1
    uygun45_ha = sinif_dolu.get(4, 0) + sinif_dolu.get(5, 0)
    en_yaygin  = max(sinif_dolu, key=sinif_dolu.get)

    ozet = (
        "Bu rapor, <b>" + ilce + " Ilcesi</b>'nin " + enerji_ad +
        " kurulumuna yonelik mekansal uygunlugunu Analitik Hierarsi Sureci (AHP) "
        "tabanli cok kriterli karar destek yontemiyle degerlendirmektedir. "
        "Analizler, Izmir Buyuksehir Belediyesi Iklim Degisikligi ve Temiz Enerji "
        "Sube Mudurlugu is birligi ile DEU Yonetim Bilisim Sistemleri bolumu "
        "kapsaminda yurutulmustur.<br/><br/>"
        "Yapilan mekansal analizde " + ilce + " ilcesinin ortalama AHP uygunluk skoru "
        "<b>%.2f/5.00</b> olarak hesaplanmis; ilce " % skor +
        "'<b>" + SINIF_AD[sinif_no] + "</b>' kategorisine yerlestirilmistir. "
        "Ilce yuzeyinin <b>%.1f</b> yuzde birlik kismi" % (uygun45_ha / toplam_ha * 100) +
        " (" + "{:,.0f}".format(uygun45_ha) + " ha) yuksek uygunluk kriterlerini "
        "(Sinif 4-5) karsilamaktadir. "
        "En yaygin sinif <b>Sinif " + str(en_yaygin) + " -- " + SINIF_AD[en_yaygin] + "</b>'dir. "
        "Tahmin edilen toplam kurulum kapasitesi <b>" + "{:,.0f}".format(mw) + " MW</b> olup "
        "yilda <b>%.1f GWh</b> uretim ve " % yillik_gwh +
        "<b>%.0f kt CO2</b> azalim potansiyeli saglamaktadir." % co2_kt
    )
    story.append(Paragraph(ozet, body_j))
    story.append(Spacer(1, 14))

    # 3. TEMEL GOSTERGELER
    story += sec("Temel Gostergeler")
    kpi_vals = [
        ("{:,.0f}".format(alan),         "ha",       "UYGUN ALAN"),
        ("{:,.0f}".format(mw),           "MW",       "TAHMINI KAPASITE"),
        ("%.1f" % yillik_gwh,            "GWh/yil",  "YILLIK URETIM"),
        ("%.0f" % co2_kt,                "kt/yil",   "CO2 AZALTIMI"),
        ("{:,}".format(hane),            "hane",     "HANE ESDEGERI"),
    ]
    kpi_cells = []
    for i, (v, u, l) in enumerate(kpi_vals):
        kpi_cells.append([
            Paragraph("<font color='#0EA5A4'><b>" + v + "</b></font>",
                      S("kv" + str(i), fontSize=15, fontName=FB,
                        textColor=TEAL, leading=18, alignment=1)),
            Paragraph(u, S("ku" + str(i), fontSize=7.5, textColor=MUTED, alignment=1)),
            Paragraph(l, S("kl" + str(i), fontSize=7, textColor=MUTED,
                           fontName=FB, alignment=1, spaceBefore=2)),
        ])
    kpi_tbl = Table([kpi_cells], colWidths=[CW / 5] * 5)
    kpi_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), GRAY),
        ("BOX",           (0, 0), (-1, -1), 0.3, GRAY2),
        ("LINEAFTER",     (0, 0), (3, 0),   0.5, GRAY2),
        ("TOPPADDING",    (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING",   (0, 0), (-1, -1), 4),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 4),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(kpi_tbl)
    story.append(Paragraph(
        "* GES: 1.000 kW/ha, %18 kapasite faktoru  |  "
        "RES: 2 MW/turbin, 25 ha/turbin, %30 kapasite faktoru  |  "
        "Emisyon: 0.463 tCO2/MWh (TEIAS)  |  Hane: 3.500 kWh/yil  |  "
        "Tum degerler parametrik tahmindir.",
        S("fn", fontSize=7, textColor=MUTED, spaceBefore=4)
    ))
    story.append(Spacer(1, 14))

    # 4. HARITA
    if map_png:
        story += sec("Uygunluk Haritasi",
                     ilce + " ilcesi " + enerji + " uygunluk siniflandirmasi - "
                     "AHP agirlikli cok kriterli analiz ciktisi")
        try:
            img = RLImage(io.BytesIO(map_png), width=CW, height=CW * 0.65)
            story.append(img)
            story.append(Paragraph(
                "Sekil 1. " + ilce + " ilcesi " + enerji +
                " uygunluk haritasi. Yesil tonlar yuksek, kirmizi tonlar dusuk uygunlugu "
                "temsil etmektedir. Koordinat sistemi: EPSG:4326, Cozunurluk: 100m.",
                S("cap", fontSize=8, textColor=MUTED, alignment=1, spaceBefore=4)
            ))
        except Exception:
            story.append(Paragraph("Harita goruntusu olusturulamadi.", warn))
        story.append(Spacer(1, 14))

    # 5. SINIF DAGILIMI
    story += sec("Uygunluk Sinifi Dagilim Analizi",
                 "Toplam yuzey alaninin uygunluk siniflarına gore dagilimi")
    toplam = sum(float(sinif_d.get(str(s), 0)) for s in range(1, 6)) or 1

    stacked = Drawing(CW, 26)
    x = 0
    for s in [1, 2, 3, 4, 5]:
        ha = float(sinif_d.get(str(s), 0))
        w  = (ha / toplam) * CW
        if w > 1:
            stacked.add(Rect(x, 4, w, 18, fillColor=sinif_cols[s],
                             strokeColor=WHITE, strokeWidth=0.4))
            if w > 30:
                lbl = "S%d %.0f%%" % (s, ha / toplam * 100)
                stacked.add(String(x + w / 2, 10, lbl,
                                   textAnchor="middle", fontSize=6.5,
                                   fillColor=WHITE, fontName=FB))
        x += w
    story.append(stacked)
    story.append(Spacer(1, 6))

    sinif_rows = [["Sinif", "Tanim", "Alan (ha)", "Oran (%)", "Gorsek"]]
    for s in [5, 4, 3, 2, 1]:
        ha  = float(sinif_d.get(str(s), 0))
        pct = (ha / toplam) * 100
        sinif_rows.append([
            Paragraph("<b>Sinif " + str(s) + "</b>",
                      S("sr" + str(s), fontSize=9, fontName=FB,
                        textColor=sinif_cols[s])),
            Paragraph(SINIF_AD[s], body),
            Paragraph("{:,.1f}".format(ha),
                      S("sm" + str(s), fontSize=9, fontName="Courier", alignment=2)),
            Paragraph("%% %.2f" % pct,
                      S("sp" + str(s), fontSize=9, fontName="Courier",
                        alignment=2, textColor=MUTED)),
            bar_d(pct, sinif_cols[s], w=int(CW * 0.42), h=8),
        ])
    sinif_tbl = Table(sinif_rows,
                      colWidths=[CW * 0.10, CW * 0.16, CW * 0.15, CW * 0.10, CW * 0.49])
    sinif_tbl.setStyle(tbl_style())
    story.append(sinif_tbl)
    story.append(Spacer(1, 14))

    # 6. KRITERLER
    story.append(PageBreak())
    story += sec("AHP Kriter Analizi",
                 "Her kriter icin ilce ortalama uygunluk skoru (1=Cok Dusuk, 5=Cok Yuksek)")

    krit_rows = [["#", "Kriter", "Skor", "Degerlendirme", "Bar (0-5)"]]
    for i, k in enumerate(krits):
        s  = float(k.get("skor") or 0)
        rc_rgb = skor_rgb(s)
        sc = rc.Color(*rgb01(rc_rgb))
        lbl = ("Ustun" if s >= 4.5 else "Cok Iyi" if s >= 4 else
               "Iyi" if s >= 3.5 else "Orta" if s >= 3 else
               "Yetersiz" if s >= 2 else "Dusuk")
        krit_rows.append([
            Paragraph(str(i + 1), S("ki" + str(i), fontSize=8,
                                    textColor=MUTED, alignment=1)),
            Paragraph(k.get("ad", ""), body),
            Paragraph("<font color='#%02x%02x%02x'><b>%.3f</b></font>" % (rc_rgb + (s,)),
                      S("ks" + str(i), fontSize=10, fontName=FB, alignment=1)),
            Paragraph(lbl, S("kd" + str(i), fontSize=8.5, textColor=sc)),
            bar_d((s / 5) * 100, sc, w=int(CW * 0.36), h=8),
        ])

    krit_tbl = Table(krit_rows,
                     colWidths=[CW * 0.05, CW * 0.27, CW * 0.12, CW * 0.12, CW * 0.44])
    krit_tbl.setStyle(tbl_style())
    story.append(krit_tbl)

    if krits:
        top3 = sorted(krits, key=lambda k: float(k.get("skor", 0)), reverse=True)[:3]
        bot3 = sorted(krits, key=lambda k: float(k.get("skor", 0)))[:3]
        top3_str = ", ".join(k["ad"] + " (%.2f)" % float(k.get("skor", 0)) for k in top3)
        bot3_str = ", ".join(k["ad"] + " (%.2f)" % float(k.get("skor", 0)) for k in bot3)
        story.append(Spacer(1, 8))
        story.append(Paragraph(
            "<b>Degerlendirme:</b> En yuksek skorlu kriterler: " + top3_str + ". "
            "En dusuk skorlu kriterler: " + bot3_str + ". "
            "Dusuk skorlu kriterlerin iyilestirilmesi yatirim kararlarinda "
            "onceliklendirilmelidir.",
            body_j
        ))
    story.append(Spacer(1, 14))

    # 7. ENERJI KAPASITESI
    story += sec("Enerji Kapasitesi ve Sosyal Etki",
                 "Parametrik hesaplama -- gercek kapasite teknik fizibilite gerektirir")

    if enerji == "GES":
        param_acik = (
            "GES potansiyeli hesabinda birim alan basina 1.000 kW/ha panel kapasitesi, "
            "Izmir cografyasina uygun yuzde 18 yillik kapasite faktoru benimsenmistir. "
            "Bu degerler IRENA (2023) ve EPDK lisansli GES projelerinin "
            "Ege Bolgesi ortalamalari temel alinarak belirlenmistir."
        )
    else:
        param_acik = (
            "RES potansiyeli hesabinda 25 ha/turbin alan ihtiyaci ve turbin basina 2 MW "
            "kapasite varsayilmistir. Yuzde 30 kapasite faktoru Global Wind Atlas 100m "
            "ruzgar hizi verileriyle ortusen bolgesel ortalamay yansitmaktadir."
        )
    story.append(Paragraph(param_acik, body_j))
    story.append(Spacer(1, 8))

    def P(txt):
        return Paragraph(txt, S("pt", fontSize=8, textColor=DARK,
                                fontName=F, leading=12))
    def PB(txt):
        return Paragraph("<b>" + txt + "</b>", S("pbt", fontSize=8,
                         textColor=DARK, fontName=FB, leading=12))

    param_rows = [
        [PB("PARAMETRE"), PB("DEGER"), PB("ACIKLAMA / KAYNAK")],
        [P("Enerji Turu"), P(enerji_ad), P("Yenilenebilir enerji kategorisi")],
        [P("Uygun Alan (Sinif >=3)"), P("{:,.0f} ha".format(alan)),
         P("AHP analizi ciktisi; enerji.ilce_uygunluk tablosu")],
        [P("Tahmini Kurulu Guc"), P("{:,.0f} MW".format(mw)),
         P("1.000 kW/ha (GES)  -  2 MW / 25 ha (RES)")],
        [P("Kapasite Faktoru"), P("~%%%s" % cf_pct),
         P("Izmir bolgesi uzun donem ortalamasi  -  IRENA 2023")],
        [P("Yillik Uretim"), P("%.1f GWh/yil" % yillik_gwh),
         P("MW x 8.760 saat x kapasite faktoru")],
        [P("CO2 Azaltimi"), P("%.1f kt CO2/yil" % co2_kt),
         P("0.463 tCO2/MWh  -  TEIAS Ulusal Grid Emisyon Faktoru 2023")],
        [P("Agac Esdegeri"), P("{:,} agac/yil".format(co2_agac)),
         P("22 kg CO2/yil/agac  -  IPCC AR6")],
        [P("Hane Esdegeri"), P("{:,} hane".format(hane)),
         P("3.500 kWh/yil/hane  -  TUIK 2023")],
    ]
    par_tbl = Table(param_rows, colWidths=[CW * 0.30, CW * 0.22, CW * 0.48])
    par_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  GRAY),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, GRAY]),
        ("GRID",          (0, 0), (-1, -1), 0.3, GRAY2),
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(par_tbl)
    story.append(Spacer(1, 14))

    # 8. ONERILER
    story += sec("Stratejik Oneriler")

    if skor >= 4:
        oneri_p = (
            ilce + " ilcesi, " + enerji_k + " enerjisi yatirimi icin "
            "<b>yuksek oncelikli</b> bir bolge olarak one cikmaktadir. "
            "Sinif 4-5 kapsamindaki %.0f ha alana" % uygun45_ha +
            " kisa vadede yatirim planlamasi yapilmasi onerilmektedir."
        )
    elif skor >= 3:
        oneri_p = (
            ilce + " ilcesi <b>orta oncelikli</b> olarak degerlendirilmektedir. "
            "Kriterlerin iyilestirilmesine yonelik altyapi calismalari on planlama "
            "surecinde ele alinmalidir."
        )
    else:
        oneri_p = (
            ilce + " ilcesi mevcut kriterler cercevesinde <b>dusuk oncelikli</b> "
            "olarak siniflandirilmaktadir. Alternatif senaryolarda potansiyel artisi "
            "icin kriter agirliklarinin proje ozelinde revize edilmesi onerilir."
        )
    story.append(Paragraph(oneri_p, body_j))
    story.append(Spacer(1, 8))

    def OP(txt):
        return Paragraph(txt, S("op", fontSize=8, fontName=F,
                                textColor=DARK, leading=12))
    def OPB(txt):
        return Paragraph("<b>" + txt + "</b>",
                         S("opb", fontSize=8, fontName=FB,
                           textColor=MUTED, leading=12))

    oneri_rows = [
        [OPB("SURE"), OPB("ONERI"), OPB("HEDEF")],
        [OP("Kisa Vade\n(0-2 yil)"),
         OP("Sinif 4-5 bolgelerinde on fizibilite calismasi, "
            "EPDK lisans surecinin planlanmasi."),
         OP("2026-2027")],
        [OP("Orta Vade\n(2-5 yil)"),
         OP("TKGM kadastro verisiyle parsel dogrulamasi, "
            "sebeke baglanti kapasitesi analizi, CED sureci."),
         OP("2027-2030")],
        [OP("Uzun Vade\n(5+ yil)"),
         OP("Toplu uretim lisansi, " + ilce + " Yenilenebilir Enerji Bolgesi "
            "imar plani revizyonu, yerel enerji toplulugu modeli."),
         OP("2030+")],
        [OP("Veri\nGelistirme"),
         OP("100m cozunurlugun TKGM kadastro ile parsel duzeyine indirilmesi; "
            "kus goc rotasi ve ekolojik hassasiyet katmanlarinin eklenmesi."),
         OP("Surekli")],
    ]
    oneri_tbl = Table(oneri_rows, colWidths=[CW * 0.18, CW * 0.60, CW * 0.22], repeatRows=1)
    oneri_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  GRAY),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, GRAY]),
        ("GRID",          (0, 0), (-1, -1), 0.3, GRAY2),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(oneri_tbl)
    story.append(Spacer(1, 14))

    # 9. METODOLOJI
    story.append(PageBreak())
    story += sec("Metodoloji", "AHP tabanli Cok Kriterli Mekansal Karar Destek Sistemi")

    story.append(Paragraph(
        "<b>Analitik Hierarsi Sureci (AHP):</b> Thomas L. Saaty (1980) tarafindan "
        "gelistirilen AHP yontemi, birbiriyle celisen kriterleri ikili karsilastirmalar "
        "ile agirliklandiran bir karar destek teknigidir. Her iki enerji turu icin "
        "tutarlilik orani CR daha kucuk 0.10 kosulunu saglayan ayri agirlik matrisleri "
        "kullanilmistir.<br/><br/>"
        "<b>Raster Isleme:</b> Kriter katmanlari QGIS'te 1-5 arasinda yeniden "
        "siniflandirilmis; AHP agirliklariyla piksel bazli agirlikli toplam alinarak "
        "nihai uygunluk rasterlar uretilmistir (EPSG:32635, 100m).<br/><br/>"
        "<b>Veritabani:</b> PostgreSQL 16 + PostGIS 3.6  -  ST_DumpAsPolygons ile "
        "rasterdan vektore donusum  -  ST_Contains ile ilce atamasi  -  "
        "FastAPI + asyncpg backend.",
        body_j
    ))
    story.append(Spacer(1, 8))

    ahp_rows = [["Kriter", "Agirlik", "Kaynak"]]
    if enerji == "GES":
        ahp_rows += [
            ["Solar Radyasyon (GHI)", "%32", "Global Solar Atlas 2023"],
            ["Arazi Kullanimi",       "%25", "ESA WorldCover 2021 / CORINE 2018"],
            ["Egim",                  "%11", "SRTM 30m (NASA/USGS)"],
            ["Baki",                  "%9",  "SRTM 30m turetme (QGIS)"],
            ["ENH Yakinligi",         "%8",  "OSM / GeoFabrik TR"],
            ["Yerlesim Uzakligi",     "%7",  "OSM / GeoFabrik TR"],
            ["Yola Yakinlik",         "%4",  "OSM / GeoFabrik TR"],
            ["Fay Uzakligi",          "%3",  "MTA Diri Fay Haritasi 2024"],
            ["Akarsu Uzakligi",       "%1",  "OSM / GeoFabrik TR"],
        ]
    else:
        ahp_rows += [
            ["Ruzgar Hizi (100m)",  "%30", "Global Wind Atlas 2023"],
            ["Arazi Kullanimi",     "%27", "ESA WorldCover 2021 / CORINE 2018"],
            ["Yukseklik (DEM)",     "%13", "SRTM 30m / ALOS AW3D"],
            ["Yerlesim Uzakligi",   "%10", "OSM / GeoFabrik TR"],
            ["ENH Yakinligi",       "%6",  "OSM / GeoFabrik TR"],
            ["Egim",                "%5",  "SRTM 30m (NASA/USGS)"],
            ["Yola Yakinlik",       "%4",  "OSM / GeoFabrik TR"],
            ["Fay Uzakligi",        "%3",  "MTA Diri Fay Haritasi 2024"],
            ["Akarsu Uzakligi",     "%2",  "OSM / GeoFabrik TR"],
        ]
    # ahp_rows son sutunu Paragraph yap
    ahp_para = []
    for ri, row in enumerate(ahp_rows):
        if ri == 0:
            ahp_para.append(row)
        else:
            ahp_para.append([
                Paragraph(row[0], S("ap0", fontSize=8, fontName=F, textColor=DARK, leading=12)),
                Paragraph(row[1], S("ap1", fontSize=8, fontName=FB, textColor=TEAL, leading=12, alignment=1)),
                Paragraph(row[2], S("ap2", fontSize=8, fontName=F, textColor=MUTED, leading=12)),
            ])
    ahp_tbl = Table(ahp_para, colWidths=[CW * 0.40, CW * 0.14, CW * 0.46])
    ahp_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  GRAY),
        ("FONTNAME",      (0, 0), (-1, 0),  FB),
        ("FONTSIZE",      (0, 0), (-1, 0),  8),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  MUTED),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, GRAY]),
        ("GRID",          (0, 0), (-1, -1), 0.3, GRAY2),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(ahp_tbl)
    story.append(Spacer(1, 14))

    # 10. YASAL UYARI
    story += sec("Yasal Uyari")
    uyari_data = [[Paragraph(
        "Bu rapor YE-ATLAS sistemi tarafindan otomatik uretilmistir ve "
        "<b>baglayici teknik fizibilite raporu niteliginde degildir</b>. "
        "Yatirim kararlarinda EPDK lisans basvurusu, TKGM kadastro dogrulamasi, "
        "CED ve TEIAS sebeke kapasitesi analizlerinin yapilmasi zorunludur. "
        "CORINE 2018 arazi kullanimi ve 100m cozunurluk sinirlamasi nedeniyle "
        "sonuclar parsel duzeyinde yorumlanmamalidir.<br/><br/>"
        "<font color='#808090'>Raporu ureten: YE-ATLAS v2.0  -  "
        "Danisan: Prof. Dr. Vahap Tecim (DEU YBS)  -  "
        "Izmir Buyuksehir Belediyesi  -  " + tarih + "</font>",
        warn
    )]]
    uyari_tbl = Table(uyari_data, colWidths=[CW])
    uyari_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), rc.Color(1.0, 0.97, 0.90)),
        ("BOX",           (0, 0), (-1, -1), 0.5, rc.Color(0.8, 0.55, 0.1)),
        ("TOPPADDING",    (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING",   (0, 0), (-1, -1), 12),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 12),
    ]))
    story.append(uyari_tbl)

    doc.build(story)
    return buf.getvalue()


# ── Endpoint ──────────────────────────────────────────────────
@router.get("/rapor/pdf/{ilce_adi}")
async def pdf_rapor(
    ilce_adi: str,
    enerji:   str = Query(default="GES"),
    senaryo:  str = Query(default="varsayilan"),
):
    t = enerji.upper()
    if t not in ("GES", "RES"):
        raise HTTPException(status_code=400, detail="enerji GES veya RES olmali")

    uygunluk_q = """
        SELECT u.skor_ort, u.skor_min, u.skor_max,
               u.uygun_alan_ha, u.tahmini_mw,
               u.sinif1_ha, u.sinif2_ha, u.sinif3_ha,
               u.sinif4_ha, u.sinif5_ha
        FROM enerji.ilce_uygunluk u
        JOIN enerji.ilceler     i  ON i.id  = u.ilce_id
        JOIN enerji.enerji_tipi et ON et.id = u.enerji_tipi_id
        JOIN enerji.senaryo     s  ON s.id  = u.senaryo_id
        WHERE et.kod=$1 AND s.kod=$2 AND i.ilce_adi=$3
    """
    kriter_q = """
        SELECT k.ad, iks.rc_ort
        FROM enerji.ilce_kriter_istatistik iks
        JOIN enerji.kriterler   k  ON k.id  = iks.kriter_id
        JOIN enerji.enerji_tipi et ON et.id = iks.enerji_tipi_id
        JOIN enerji.ilceler     i  ON i.id  = iks.ilce_id
        WHERE et.kod=$1 AND i.ilce_adi=$2
        ORDER BY iks.rc_ort DESC NULLS LAST
    """
    boundary_q = """
        SELECT ST_AsGeoJSON(ST_Transform(i.geom, 4326)) AS geom
        FROM enerji.ilceler i WHERE i.ilce_adi=$1
    """
    poly_q = """
        SELECT ub.uygunluk_sinif, ST_AsGeoJSON(ub.geom) AS geom
        FROM enerji.uygunluk_bolge ub
        JOIN enerji.ilceler     i  ON i.id  = ub.ilce_id
        JOIN enerji.enerji_tipi et ON et.id = ub.enerji_tipi_id
        WHERE et.kod=$1 AND i.ilce_adi=$2
          AND ub.uygunluk_sinif >= 2
        LIMIT 3000
    """

    try:
        async with get_pool().acquire() as conn:
            u        = await conn.fetchrow(uygunluk_q, t, senaryo, ilce_adi)
            kr       = await conn.fetch(kriter_q, t, ilce_adi)
            boundary = await conn.fetchrow(boundary_q, ilce_adi)
            polys    = await conn.fetch(poly_q, t, ilce_adi)
    except Exception as e:
        raise HTTPException(status_code=500, detail="DB hatasi: " + str(e))

    if not u:
        raise HTTPException(status_code=404, detail=ilce_adi + " bulunamadi")

    mw_val     = float(u["tahmini_mw"] or 0)
    cf         = 0.18 if t == "GES" else 0.30
    yillik_mwh = mw_val * 8760 * cf

    data = {
        "ilce":          ilce_adi,
        "enerji":        t,
        "senaryo":       senaryo,
        "skor_ort":      float(u["skor_ort"] or 0),
        "skor_min":      float(u["skor_min"] or 0),
        "skor_max":      float(u["skor_max"] or 0),
        "uygun_alan_ha": float(u["uygun_alan_ha"] or 0),
        "tahmini_mw":    mw_val,
        "sinif_dagilim": {str(i): float(u["sinif%d_ha" % i] or 0) for i in range(1, 6)},
        "kriterler":     [{"ad": r["ad"], "skor": float(r["rc_ort"] or 0)} for r in kr],
        "mw_hesap": {
            "yillik_mwh":     yillik_mwh,
            "co2_ton_yil":    yillik_mwh * 0.463,
            "hane_karsiligi": int(yillik_mwh * 1000 / 3500),
        },
    }

    boundary_geojson = boundary["geom"] if boundary else None
    poly_rows = [(int(r["uygunluk_sinif"]), r["geom"]) for r in polys if r["geom"]]
    map_png = _make_map_png(boundary_geojson, poly_rows, ilce_adi, t)

    try:
        pdf_bytes = build_pdf(data, map_png=map_png)
    except Exception:
        raise HTTPException(status_code=500, detail=traceback.format_exc())

    tr_map = {"\u011f":"g","\u011e":"G","\u015f":"s","\u015e":"S",
               "\u0131":"i","\u0130":"I","\u00f6":"o","\u00d6":"O",
               "\u00fc":"u","\u00dc":"U","\u00e7":"c","\u00c7":"C"}
    safe_ilce = ilce_adi
    for k, v in tr_map.items():
        safe_ilce = safe_ilce.replace(k, v)
    fname = "YE-ATLAS_" + safe_ilce + "_" + t + "_" + datetime.now().strftime("%Y%m%d") + ".pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="' + fname + '"'},
    )