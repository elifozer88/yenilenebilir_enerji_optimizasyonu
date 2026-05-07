/**
 * pages/MethodPage.js
 * Analiz metodolojisi — pipeline, veri kaynakları, AHP kriterleri.
 */

const PIPELINE = [
  { n:'①', l:'Veri Hazırlık',      d:'EPSG:32635\n100m çözünürlük\nClip → İzmir sınırı' },
  { n:'②', l:'Mesafe Analizi',     d:'Rasterize\nProximity Raster\nVektör → Raster' },
  { n:'③', l:'ST_Reclass',         d:'1–4 skor bantları\n[1-2):1, [2-3):2\n[3-4):3, [4-5):4' },
  { n:'④', l:'ST_DumpAsPolygons',  d:'Bitişik piksel\nbirleştirme\nİzohips görünüm' },
  { n:'⑤', l:'ST_Simplify',        d:'50m tolerans\nPoligon yumuşatma\nPerformans opt.' },
  { n:'⑥', l:'deck.gl Render',     d:'GeoJsonLayer 3D\nTerrainLayer\nScatterplotLayer' },
];

const DATA_SOURCES = [
  { n:'Güneş Radyasyonu',      s:'Global Solar Atlas / USGS',   f:'Raster 30m',      r:'100m',  u:'ges' },
  { n:'Rüzgâr Hızı (100m)',   s:'Global Wind Atlas',           f:'Raster 250m',     r:'250m',  u:'res' },
  { n:'DEM (Yükseklik)',       s:'SRTM srtm_42_05',            f:'Raster 90m',      r:'100m',  u:'both' },
  { n:'Eğim & Bakı',          s:"DEM'den türetildi (QGIS)",    f:'Raster',          r:'100m',  u:'both' },
  { n:'Arazi Kullanımı',      s:'Copernicus CORINE / OSM',     f:'Vektör → Raster', r:'100m',  u:'both' },
  { n:'Yerleşim Yerleri',     s:'OSM / Geofabrik',             f:'Vektör → Proximity',r:'100m',u:'both' },
  { n:'Yollar & Akarsular',   s:'OSM / Geofabrik',             f:'Vektör → Proximity',r:'100m',u:'both' },
  { n:'ENH (Enerji Nakil Hattı)',s:'OSM / Geofabrik',          f:'Vektör → Proximity',r:'100m',u:'both' },
  { n:'Diri Fay Hatları',     s:'MTA Diri Fay Haritası',       f:'Vektör → Proximity',r:'100m',u:'both' },
  { n:'İl/İlçe Sınırları',   s:'GADM v4.1',                   f:'Vektör',          r:'—',     u:'both' },
];

const CRITERIA = [
  { k:'Solar Radyasyon',        gw:30,  rw:'—', t:'<3.5→1, >5.5→4 kWh/m²/gün' },
  { k:'Rüzgâr Hızı',           gw:'—', rw:30,  t:'<3→1, 3-4.5→2, 4.5-5.5→3, >5.5→4 m/s' },
  { k:'Eğim',                  gw:20,  rw:15,  t:'GES: 0-2°→4; RES: 0-5°→4; her ikisi >20°→1' },
  { k:'Yerleşim Uzaklığı',     gw:15,  rw:12,  t:'GES: >1500m→4; RES: >2000m→4' },
  { k:'Arazi Kullanımı',       gw:13,  rw:13,  t:'Marjinal alan→4; Verimli tarım→1' },
  { k:'ENH Uzaklığı',          gw:10,  rw:10,  t:'GES: <500m→4; RES: <1000m→4' },
  { k:'Fay Uzaklığı',          gw:5,   rw:8,   t:'GES: >4km; RES: >60km' },
  { k:'Yol Yakınlığı',         gw:4,   rw:4,   t:'<500m bakım/inşaat erişimi' },
  { k:'Akarsu Uzaklığı',       gw:3,   rw:3,   t:'<200m→1 (sel/zemin riski)' },
  { k:'Yükseklik (DEM)',        gw:'—', rw:5,   t:'0-500m→4 (lojistik erişim)' },
];

export default function MethodPage() {
  return (
    <div className="page-content">
      <div className="page-heading">Analiz Metodolojisi</div>
      <div className="page-subhead" style={{ marginBottom: 32 }}>
        AHP tabanlı çok kriterli mekansal karar verme — PostGIS raster pipeline ve veri kaynakları
      </div>

      {/* ── Pipeline ── */}
      <div className="method-sec-title">📊 PostGIS İşlem Pipeline</div>
      <div className="pipeline">
        {PIPELINE.map((s, i) => (
          <>
            <div className="pipe-step" key={s.n}>
              <div className="pipe-num">{s.n}</div>
              <div className="pipe-label">{s.l}</div>
              <div className="pipe-desc">{s.d}</div>
            </div>
            {i < PIPELINE.length - 1 && (
              <div className="pipe-arrow" key={`arrow-${i}`}>→</div>
            )}
          </>
        ))}
      </div>

      {/* PostGIS örnek sorgu */}
      <div style={{
        background:'rgba(10,14,26,0.95)', border:'1px solid var(--border)',
        borderRadius:12, padding:'16px 20px', marginBottom:32,
        fontFamily:'var(--font-mono)', fontSize:11.5, lineHeight:1.8, color:'var(--text-2)',
        overflow:'auto',
      }}>
        <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ibb-green-l)', marginBottom:10 }}>
          Örnek PostGIS Sorgusu — GES Polygon Bantları
        </div>
        <span style={{ color:'#60A5FA' }}>SELECT</span>
        {' '}ST_AsGeoJSON(ST_Transform(ST_SimplifyPreserveTopology(dp.geom, 50), 4326)) AS geom,
        <br />&nbsp;&nbsp;&nbsp;&nbsp;dp.val::<span style={{ color:'#F97316' }}>integer</span> AS skor
        <br /><span style={{ color:'#60A5FA' }}>FROM</span> uygunluk.izmir_ges_uygunluk,
        <br /><span style={{ color:'#60A5FA' }}>LATERAL</span> ST_DumpAsPolygons(
        <br />&nbsp;&nbsp;&nbsp;&nbsp;ST_Reclass(rast, 1, <span style={{ color:'#84CC16' }}>'[1-2):1, [2-3):2, [3-4):3, [4-5.1):4'</span>, <span style={{ color:'#F97316' }}>'8BUI'</span>, -1)
        <br />) AS dp(geom, val)
        <br /><span style={{ color:'#60A5FA' }}>WHERE</span> dp.val {'>'} 0 AND dp.val IS NOT NULL;
      </div>

      {/* ── Veri Kaynakları ── */}
      <div className="method-sec-title">🗂 Veri Kaynakları</div>
      <div className="tbl-wrap">
        <table className="mtbl">
          <thead>
            <tr>
              <th>Veri Katmanı</th>
              <th>Kaynak</th>
              <th>Format</th>
              <th>Çözünürlük</th>
              <th>Kullanım</th>
            </tr>
          </thead>
          <tbody>
            {DATA_SOURCES.map(r => (
              <tr key={r.n}>
                <td><strong style={{ fontWeight:500 }}>{r.n}</strong></td>
                <td style={{ color:'var(--text-2)' }}>{r.s}</td>
                <td style={{ fontFamily:'var(--font-mono)', fontSize:11 }}>{r.f}</td>
                <td style={{ fontFamily:'var(--font-mono)', fontSize:11 }}>{r.r}</td>
                <td>
                  {r.u === 'ges'  && <span className="badge ges">GES</span>}
                  {r.u === 'res'  && <span className="badge res">RES</span>}
                  {r.u === 'both' && <span className="badge both">GES · RES</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── AHP Kriterleri ── */}
      <div className="method-sec-title">⚖️ AHP Kriter Ağırlıkları</div>
      <div className="tbl-wrap">
        <table className="mtbl">
          <thead>
            <tr>
              <th>Kriter</th>
              <th>GES Ağırlığı</th>
              <th>RES Ağırlığı</th>
              <th>Eşik Değerleri / Notlar</th>
            </tr>
          </thead>
          <tbody>
            {CRITERIA.map(r => (
              <tr key={r.k}>
                <td style={{ fontWeight:500 }}>{r.k}</td>
                <td style={{ fontFamily:'var(--font-mono)', color:'var(--ges)' }}>
                  {r.gw === '—' ? <span style={{ color:'var(--text-3)' }}>—</span> : `${r.gw}%`}
                </td>
                <td style={{ fontFamily:'var(--font-mono)', color:'var(--res)' }}>
                  {r.rw === '—' ? <span style={{ color:'var(--text-3)' }}>—</span> : `${r.rw}%`}
                </td>
                <td style={{ color:'var(--text-2)', fontSize:11.5 }}>{r.t}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Skor açıklaması */}
      <div style={{
        marginTop:28, display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12,
      }}>
        {[
          { score:4, label:'Çok Uygun', range:'≥ 4.0', clr:'#10B981' },
          { score:3, label:'Uygun',     range:'3.0 – 4.0', clr:'#84CC16' },
          { score:2, label:'Orta',      range:'2.0 – 3.0', clr:'#EAB308' },
          { score:1, label:'Düşük',     range:'1.0 – 2.0', clr:'#F97316' },
        ].map(s => (
          <div key={s.score} style={{
            background:`${s.clr}10`, border:`1px solid ${s.clr}35`,
            borderRadius:10, padding:'14px 16px',
          }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:22, fontWeight:800, color:s.clr, lineHeight:1 }}>
              Bant {s.score}
            </div>
            <div style={{ fontSize:12, fontWeight:700, color:s.clr, marginTop:4 }}>{s.label}</div>
            <div style={{ fontSize:10.5, color:'var(--text-2)', marginTop:2 }}>{s.range}</div>
          </div>
        ))}
      </div>
    </div>
  );
}