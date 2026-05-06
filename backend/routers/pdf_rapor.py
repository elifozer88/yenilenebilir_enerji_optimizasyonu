"""
backend/routers/pdf_rapor.py
İzmir Büyükşehir Belediyesi — YE·ATLAS PDF Rapor
Profesyonel A4 layout, reportlab
"""
import io
from datetime import datetime
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
from database import get_pool

router = APIRouter()

# ── Renk paleti ──────────────────────────────────────────────
SINIF_RENK = {5:(20,128,60),4:(74,166,53),3:(215,119,6),2:(220,107,46),1:(185,28,28)}
SINIF_AD   = {5:"Çok Uygun",4:"Uygun",3:"Orta",2:"Düşük",1:"Uygunsuz"}

def skor_rgb(s):
    if s>=4: return (20,128,60)
    if s>=3: return (74,166,53)
    if s>=2: return (215,119,6)
    return (185,28,28)

def rgb(t): return tuple(c/255 for c in t)

# ── PDF Builder ───────────────────────────────────────────────
def build_pdf(data: dict) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm, mm
    from reportlab.lib import colors
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,
                                    Table, TableStyle, HRFlowable,
                                    KeepTogether, PageBreak)
    from reportlab.graphics.shapes import (Drawing, Rect, String, Line,
                                           Circle, Wedge, Arc)
    from reportlab.graphics import renderPDF
    from reportlab.pdfgen import canvas as pdfcanvas

    ilce      = data["ilce"]
    enerji    = data["enerji"]
    skor      = float(data.get("skor_ort") or 0)
    s_min     = float(data.get("skor_min") or 0)
    s_max     = float(data.get("skor_max") or 0)
    alan      = float(data.get("uygun_alan_ha") or 0)
    mw        = float(data.get("tahmini_mw") or 0)
    krits     = data.get("kriterler", [])
    sinif_d   = data.get("sinif_dagilim", {})
    senaryo   = data.get("senaryo", "varsayilan")
    mw_hesap  = data.get("mw_hesap", {})
    tarih     = datetime.now().strftime("%d %B %Y")

    renk_t   = skor_rgb(skor)
    TEAL     = colors.Color(0.055, 0.647, 0.647)   # #0EA5A4
    TEAL_L   = colors.Color(0.055, 0.647, 0.647, 0.12)
    DARK     = colors.Color(0.1, 0.1, 0.17)
    GRAY     = colors.Color(0.96, 0.96, 0.97)
    GRAY2    = colors.Color(0.9, 0.9, 0.93)
    MUTED    = colors.Color(0.55, 0.55, 0.6)
    WHITE    = colors.white
    SKOR_C   = colors.Color(*rgb(renk_t))

    sinif_cols = {s: colors.Color(*rgb(SINIF_RENK[s])) for s in range(1,6)}

    PW, PH = A4
    ML = MR = 2*cm
    MT = MB = 2*cm
    CW = PW - ML - MR   # content width

    buf = io.BytesIO()

    # ── Sayfa template (header/footer) ───────────────────────
    def on_page(canv, doc):
        canv.saveState()
        # Üst şerit
        canv.setFillColor(DARK)
        canv.rect(0, PH-1.4*cm, PW, 1.4*cm, fill=1, stroke=0)
        canv.setFillColor(WHITE)
        canv.setFont("Helvetica-Bold", 8)
        canv.drawString(ML, PH-0.9*cm, "YE·ATLAS  ·  İzmir Büyükşehir Belediyesi")
        canv.setFont("Helvetica", 8)
        canv.drawRightString(PW-MR, PH-0.9*cm, f"{enerji} Uygunluk Analiz Raporu  ·  {ilce}")
        # Alt şerit
        canv.setFillColor(GRAY)
        canv.rect(0, 0, PW, 1.0*cm, fill=1, stroke=0)
        canv.setFillColor(MUTED)
        canv.setFont("Helvetica", 7)
        canv.drawString(ML, 0.35*cm, f"© {datetime.now().year} İzmir Büyükşehir Belediyesi  ·  DEÜ YBS Capstone Projesi  ·  EPSG:32635 · 100m")
        canv.drawRightString(PW-MR, 0.35*cm, f"Sayfa {doc.page}")
        # Sol kenar çizgisi teal
        canv.setFillColor(TEAL)
        canv.rect(0, 1*cm, 4, PH-2.4*cm, fill=1, stroke=0)
        canv.restoreState()

    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=ML, rightMargin=MR,
        topMargin=MT+1.4*cm, bottomMargin=MB+1.0*cm,
        onFirstPage=on_page, onLaterPages=on_page,
    )

    # ── Yardımcı stiller ─────────────────────────────────────
    def S(name, **kw):
        return ParagraphStyle(name, **kw)

    eyebrow = S("eyebrow", fontSize=8, textColor=TEAL,
                fontName="Helvetica-Bold", spaceAfter=4,
                letterSpacing=1.2)
    h1      = S("h1", fontSize=22, textColor=DARK,
                fontName="Helvetica-Bold", leading=26, spaceAfter=4)
    h2      = S("h2", fontSize=12, textColor=DARK,
                fontName="Helvetica-Bold", spaceBefore=14, spaceAfter=6)
    h3      = S("h3", fontSize=10, textColor=DARK,
                fontName="Helvetica-Bold", spaceBefore=8, spaceAfter=4)
    body    = S("body", fontSize=9, textColor=DARK, leading=13)
    small   = S("small", fontSize=8, textColor=MUTED, leading=11)
    note    = S("note", fontSize=8.5, textColor=colors.Color(0.09,0.4,0.2),
                leading=12, leftIndent=8)
    mono    = S("mono", fontSize=9, fontName="Courier",
                textColor=DARK, leading=13)

    def tbl_style(header_color=GRAY):
        return TableStyle([
            ("BACKGROUND",  (0,0),(-1,0),  header_color),
            ("FONTNAME",    (0,0),(-1,0),  "Helvetica-Bold"),
            ("FONTSIZE",    (0,0),(-1,0),  8),
            ("TEXTCOLOR",   (0,0),(-1,0),  MUTED),
            ("ROWBACKGROUNDS",(0,1),(-1,-1),[WHITE,GRAY]),
            ("GRID",        (0,0),(-1,-1), 0.25, GRAY2),
            ("TOPPADDING",  (0,0),(-1,-1), 5),
            ("BOTTOMPADDING",(0,0),(-1,-1),5),
            ("LEFTPADDING", (0,0),(-1,-1), 8),
            ("VALIGN",      (0,0),(-1,-1), "MIDDLE"),
        ])

    def bar(pct, clr, w=120, h=7):
        d = Drawing(w, h)
        d.add(Rect(0,0,w,h, fillColor=GRAY2, strokeColor=None))
        if pct>0:
            d.add(Rect(0,0,min(w,w*pct/100),h, fillColor=clr, strokeColor=None))
        return d

    def section_header(title, subtitle=""):
        items = [
            HRFlowable(width="100%", thickness=0.5, color=TEAL, spaceAfter=6),
            Paragraph(title.upper(), eyebrow),
        ]
        if subtitle:
            items.append(Paragraph(subtitle, small))
        return items

    # ── İçerik listesi ───────────────────────────────────────
    story = []

    # ═══════════════════════════════════════════════════════
    # 1. KAPAK BÖLÜMÜ
    # ═══════════════════════════════════════════════════════
    story.append(Spacer(1, 0.5*cm))

    # İlçe adı + skor yan yana
    skor_str = f"{skor:.2f}"
    hdr_data = [[
        [Paragraph(ilce, h1),
         Paragraph(
             f"{'Varsayılan (AHP)' if senaryo=='varsayilan' else senaryo}  ·  "
             f"{'Güneş Enerjisi (GES)' if enerji=='GES' else 'Rüzgâr Enerjisi (RES)'}  ·  {tarih}",
             small),
        ],
        _gauge_drawing(skor, renk_t, size=90),
    ]]
    hdr_tbl = Table(hdr_data, colWidths=[CW*0.72, CW*0.28])
    hdr_tbl.setStyle(TableStyle([
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ("ALIGN",(1,0),(1,0),"CENTER"),
    ]))
    story.append(hdr_tbl)
    story.append(Spacer(1, 10))

    # Skor açıklaması
    sinif_no = 5 if skor>=4 else 4 if skor>=3 else 3 if skor>=2 else 1
    story.append(Paragraph(
        f"<font color='#{renk_t[0]:02x}{renk_t[1]:02x}{renk_t[2]:02x}'>"
        f"<b>Sınıf {sinif_no} — {SINIF_AD[sinif_no]}</b></font>  "
        f"&nbsp;&nbsp;Skor: {skor:.3f} / 5.000  "
        f"&nbsp;&nbsp;Min: {s_min:.2f}  "
        f"&nbsp;&nbsp;Maks: {s_max:.2f}",
        S("sc", fontSize=9.5, textColor=DARK, leading=14)
    ))
    story.append(Spacer(1, 14))

    # ═══════════════════════════════════════════════════════
    # 2. ÖZET KPI KUTUSU
    # ═══════════════════════════════════════════════════════
    story += section_header("Özet Göstergeler")
    story.append(Spacer(1, 6))

    # MW hesap değerleri
    yillik_gwh = mw_hesap.get("yillik_mwh", mw*8760*0.18)/1000
    co2_kt     = mw_hesap.get("co2_ton_yil", mw*8760*0.18*0.463)/1000
    hane       = int(mw_hesap.get("hane_karsiligi", mw*8760*0.18*1000/3500))

    kpi_vals = [
        (f"{alan:,.0f}", "ha", "UYGUN ALAN"),
        (f"{mw:,.0f}",   "MW", "TAHMİNİ KAPASİTE"),
        (f"{yillik_gwh:.1f}", "GWh/yıl", "YILLIK ÜRETİM"),
        (f"{co2_kt:.0f}", "kt CO₂/yıl", "AZALTIM POTANSİYELİ"),
        (f"{hane:,}", "hane", "SOSYAL ETKİ"),
    ]
    kpi_row1 = []
    kpi_row2 = []
    for i,(v,u,l) in enumerate(kpi_vals):
        cell = [
            Paragraph(f"<font color='#0EA5A4'><b>{v}</b></font>",
                      S(f"kv{i}", fontSize=17, fontName="Helvetica-Bold",
                        textColor=TEAL, leading=20, alignment=1)),
            Paragraph(u, S(f"ku{i}", fontSize=7.5, textColor=MUTED,
                           alignment=1, spaceBefore=0)),
            Paragraph(l, S(f"kl{i}", fontSize=7, textColor=MUTED,
                           fontName="Helvetica-Bold", letterSpacing=0.8,
                           alignment=1, spaceBefore=2)),
        ]
        kpi_row1.append(cell)

    kpi_tbl = Table([kpi_row1], colWidths=[CW/5]*5)
    kpi_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0,0),(-1,-1), GRAY),
        ("BOX", (0,0),(-1,-1), 0.25, GRAY2),
        ("LINEAFTER",(0,0),(3,0), 0.5, GRAY2),
        ("TOPPADDING",(0,0),(-1,-1), 10),
        ("BOTTOMPADDING",(0,0),(-1,-1), 10),
        ("LEFTPADDING",(0,0),(-1,-1), 4),
        ("RIGHTPADDING",(0,0),(-1,-1), 4),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ]))
    story.append(kpi_tbl)
    story.append(Spacer(1, 16))

    # ═══════════════════════════════════════════════════════
    # 3. UYGUNLUK SINIF DAĞILIMI
    # ═══════════════════════════════════════════════════════
    story += section_header("Uygunluk Sınıf Dağılımı",
        "Toplam uygun alan içindeki sınıf bazlı dağılım")
    story.append(Spacer(1, 6))

    toplam = sum(float(sinif_d.get(str(s),0)) for s in range(1,6)) or 1

    # Yatay yığılmış bar
    bar_total_w = CW
    bar_h = 18
    stacked = Drawing(bar_total_w, bar_h + 20)
    x = 0
    for s in [1,2,3,4,5]:
        ha = float(sinif_d.get(str(s),0))
        w  = (ha/toplam)*bar_total_w
        if w > 1:
            stacked.add(Rect(x,10,w,bar_h,
                             fillColor=sinif_cols[s], strokeColor=WHITE, strokeWidth=0.5))
            if w > 20:
                stacked.add(String(x+w/2, 10+bar_h/2,
                                   f"{ha/toplam*100:.0f}%",
                                   textAnchor="middle", fontSize=6,
                                   fillColor=WHITE, fontName="Helvetica-Bold"))
        x += w
    story.append(stacked)

    # Tablo
    sinif_rows = [["Sınıf", "Tanım", "Alan (ha)", "Oran (%)", "Görsel"]]
    for s in [5,4,3,2,1]:
        ha  = float(sinif_d.get(str(s),0))
        pct = (ha/toplam)*100
        sinif_rows.append([
            Paragraph(f"<b>Sınıf {s}</b>",
                      S(f"sr{s}", fontSize=9, fontName="Helvetica-Bold",
                        textColor=sinif_cols[s])),
            Paragraph(SINIF_AD[s], body),
            Paragraph(f"{ha:,.0f}", S(f"sm{s}", fontSize=9,
                                      fontName="Courier", alignment=2)),
            Paragraph(f"{pct:.1f}%", S(f"sp{s}", fontSize=9,
                                        fontName="Courier", alignment=2,
                                        textColor=MUTED)),
            bar(pct, sinif_cols[s], w=100, h=7),
        ])

    sinif_tbl = Table(sinif_rows,
                      colWidths=[CW*0.12, CW*0.18, CW*0.15, CW*0.1, CW*0.45])
    sinif_tbl.setStyle(tbl_style())
    story.append(sinif_tbl)
    story.append(Spacer(1, 16))

    # ═══════════════════════════════════════════════════════
    # 4. KRİTER ANALİZİ
    # ═══════════════════════════════════════════════════════
    story += section_header("Kriter Analizi (AHP)",
        "11 kriterden her biri için ilçe ortalaması (1=düşük, 5=yüksek)")
    story.append(Spacer(1, 6))

    krit_rows = [["Sıra", "Kriter", "Skor", "Değerlendirme", "Bar (0-5)"]]
    for i, k in enumerate(krits):
        s   = float(k.get("skor") or 0)
        rc  = skor_rgb(s)
        sc  = colors.Color(*rgb(rc))
        lbl = "Mükemmel" if s>=4.5 else "Çok İyi" if s>=4 else "İyi" if s>=3 else "Orta" if s>=2 else "Düşük"
        krit_rows.append([
            Paragraph(str(i+1), S(f"ki{i}", fontSize=9, textColor=MUTED, alignment=1)),
            Paragraph(k.get("ad","—"), body),
            Paragraph(f"<font color='#{rc[0]:02x}{rc[1]:02x}{rc[2]:02x}'>"
                      f"<b>{s:.2f}</b></font>",
                      S(f"ks{i}", fontSize=10, fontName="Helvetica-Bold", alignment=1)),
            Paragraph(lbl, S(f"kd{i}", fontSize=8.5, textColor=sc)),
            bar((s/5)*100, sc, w=int(CW*0.28), h=7),
        ])

    krit_tbl = Table(krit_rows,
                     colWidths=[CW*0.07, CW*0.26, CW*0.1, CW*0.17, CW*0.40])
    krit_tbl.setStyle(tbl_style())
    story.append(krit_tbl)
    story.append(Spacer(1, 16))

    # ═══════════════════════════════════════════════════════
    # 5. ENERJİ KAPASİTE HESABI
    # ═══════════════════════════════════════════════════════
    story += section_header("Enerji Kapasitesi ve Sosyal Etki Analizi")
    story.append(Spacer(1, 6))

    enerji_tur = "Güneş" if enerji=="GES" else "Rüzgâr"
    param_rows = [
        ["PARAMETRE", "DEĞER", "AÇIKLAMA"],
        ["Enerji Türü", enerji_tur, "Yenilenebilir enerji kaynağı"],
        ["Kurulu Güç", f"{mw:,.0f} MW",
         "Uygun alanlara kurulabilecek toplam kapasite"],
        ["Kapasite Faktörü", "~%18 (GES)" if enerji=="GES" else "~%30 (RES)",
         "Yıllık ortalama çalışma oranı"],
        ["Yıllık Üretim", f"{yillik_gwh:.1f} GWh/yıl",
         "Tahmini yıllık elektrik üretimi"],
        ["CO₂ Azaltımı", f"{co2_kt:.0f} kt/yıl",
         "Türkiye grid emisyon faktörü 0.463 kg CO₂/kWh"],
        ["Hane Karşılığı", f"{hane:,} hane",
         "Ortalama 3.500 kWh/yıl tüketim varsayımı"],
        ["Uygun Alan", f"{alan:,.0f} ha",
         f"Sınıf ≥3 uygunluk skoru toplam alanı"],
    ]
    par_tbl = Table(param_rows, colWidths=[CW*0.3, CW*0.22, CW*0.48])
    par_tbl.setStyle(tbl_style())
    story.append(par_tbl)
    story.append(Spacer(1, 16))

    # ═══════════════════════════════════════════════════════
    # 6. METODOLOJİ NOTU
    # ═══════════════════════════════════════════════════════
    story += section_header("Metodoloji")
    story.append(Spacer(1, 6))

    met_data = [[
        Paragraph(
            "<b>Analitik Hiyerarşi Süreci (AHP)</b><br/>"
            "Bu rapor, Analitik Hiyerarşi Süreci (AHP) tabanlı çok kriterli mekansal karar destek "
            "analizinin sonuçlarını içermektedir. 11 kriter; solar radyasyon, rüzgâr hızı, eğim, bakı, "
            "yükseklik, arazi kullanımı, yerleşim uzaklığı, yola yakınlık, akarsu uzaklığı, enerji "
            "nakil hattı yakınlığı ve diri fay uzaklığı olarak belirlenmiştir.<br/><br/>"
            "<b>Veri Kaynakları:</b> Global Solar Atlas · Global Wind Atlas · SRTM/ALOS DEM · "
            "OpenStreetMap (Geofabrik) · MTA Diri Fay Haritası · GADM İdari Sınırlar<br/>"
            "<b>Çözünürlük:</b> 100m × 100m · <b>Koordinat Sistemi:</b> EPSG:32635 (UTM Zone 35N) · "
            "<b>Yazılım:</b> QGIS 3.40 · PostGIS 3.4 · Python 3.14",
            note)
    ]]
    met_tbl = Table(met_data, colWidths=[CW])
    met_tbl.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),colors.Color(0.94,0.99,0.96)),
        ("BOX",(0,0),(-1,-1),0.5,colors.Color(0.2,0.6,0.3)),
        ("TOPPADDING",(0,0),(-1,-1),10),("BOTTOMPADDING",(0,0),(-1,-1),10),
        ("LEFTPADDING",(0,0),(-1,-1),12),("RIGHTPADDING",(0,0),(-1,-1),12),
    ]))
    story.append(met_tbl)

    doc.build(story)
    return buf.getvalue()


def _gauge_drawing(skor, renk_t, size=90):
    """Yarım daire gauge SVG benzeri Drawing"""
    from reportlab.graphics.shapes import Drawing, Arc, Rect, String, Circle
    from reportlab.lib import colors

    d   = Drawing(size, size)
    cx  = size/2
    cy  = size/2
    R   = size*0.42
    r   = size*0.28
    pct = skor/5

    DARK  = colors.Color(0.1,0.1,0.17)
    GRAY2 = colors.Color(0.9,0.9,0.93)
    SKOR  = colors.Color(*rgb(renk_t))
    TEAL  = colors.Color(0.055,0.647,0.647)

    # Arka plan yay (tam daire segment)
    d.add(Arc(cx-R, cy-R, cx+R, cy+R,
              startAngle=0, extent=360,
              strokeColor=GRAY2, strokeWidth=6, fillColor=None))

    # Skor yayı — saat 12'den saat yönünde
    import math
    start_a = 90
    end_a   = 90 - pct*360
    if pct > 0:
        d.add(Arc(cx-R, cy-R, cx+R, cy+R,
                  startAngle=end_a, extent=pct*360,
                  strokeColor=SKOR, strokeWidth=7, fillColor=None))

    # Merkez
    d.add(Circle(cx, cy, r, fillColor=colors.white, strokeColor=GRAY2, strokeWidth=0.5))
    d.add(String(cx, cy+2, f"{skor:.2f}",
                 textAnchor="middle", fontSize=size*0.16,
                 fontName="Helvetica-Bold", fillColor=DARK))
    d.add(String(cx, cy-size*0.13, "/ 5",
                 textAnchor="middle", fontSize=size*0.09,
                 fillColor=colors.Color(0.6,0.6,0.6)))
    return d


# ── Endpoint ──────────────────────────────────────────────────
@router.get("/rapor/pdf/{ilce_adi}")
async def pdf_rapor(
    ilce_adi: str,
    enerji:   str = Query(default="GES"),
    senaryo:  str = Query(default="varsayilan"),
):
    t = enerji.upper()
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
        JOIN enerji.kriterler    k  ON k.id  = iks.kriter_id
        JOIN enerji.enerji_tipi  et ON et.id = iks.enerji_tipi_id
        JOIN enerji.ilceler      i  ON i.id  = iks.ilce_id
        WHERE et.kod=$1 AND i.ilce_adi=$2
        ORDER BY iks.rc_ort DESC NULLS LAST
    """
    mw_q = """
        SELECT u.uygun_alan_ha, u.tahmini_mw
        FROM enerji.ilce_uygunluk u
        JOIN enerji.ilceler i ON i.id=u.ilce_id
        JOIN enerji.enerji_tipi et ON et.id=u.enerji_tipi_id
        JOIN enerji.senaryo s ON s.id=u.senaryo_id
        WHERE et.kod=$1 AND s.kod=$2 AND i.ilce_adi=$3
    """
    try:
        async with get_pool().acquire() as conn:
            u  = await conn.fetchrow(uygunluk_q, t, senaryo, ilce_adi)
            kr = await conn.fetch(kriter_q, t, ilce_adi)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not u:
        raise HTTPException(status_code=404, detail=f"{ilce_adi} bulunamadı")

    mw_val = float(u["tahmini_mw"] or 0)
    cf = 0.18 if t=="GES" else 0.30
    yillik_mwh = mw_val * 8760 * cf

    data = {
        "ilce":    ilce_adi, "enerji": t, "senaryo": senaryo,
        "skor_ort": float(u["skor_ort"] or 0),
        "skor_min": float(u["skor_min"] or 0),
        "skor_max": float(u["skor_max"] or 0),
        "uygun_alan_ha": float(u["uygun_alan_ha"] or 0),
        "tahmini_mw":    mw_val,
        "sinif_dagilim": {str(i): float(u[f"sinif{i}_ha"] or 0) for i in range(1,6)},
        "kriterler": [{"ad": r["ad"], "skor": float(r["rc_ort"] or 0)} for r in kr],
        "mw_hesap": {
            "yillik_mwh":      yillik_mwh,
            "co2_ton_yil":     yillik_mwh * 0.463,
            "hane_karsiligi":  int(yillik_mwh * 1000 / 3500),
        },
    }

    try:
        pdf_bytes = build_pdf(data)
    except ImportError:
        raise HTTPException(status_code=503, detail="reportlab kurulu değil")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF hatası: {e}")

    fname = f"YE-ATLAS_{ilce_adi}_{t}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )
    