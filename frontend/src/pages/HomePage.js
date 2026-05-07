/**
 * pages/HomePage.js
 * Ana sayfa — hero, KPI strip, modül kartları, veri kaynakları.
 */
export default function HomePage({ onNavigate }) {
  return (
    <div style={{ minHeight: '100%' }}>

      {/* ── Hero ── */}
      <div className="hero-section">
        <div className="hero-left">
          <div className="hero-eyebrow">Mekansal Karar Destek Sistemi · İzmir 2026</div>
          <div className="hero-title">
            İzmir İli<br />
            <span className="accent-ges">Güneş</span> &{' '}
            <span className="accent-res">Rüzgar</span><br />
            Uygunluk Analizi
          </div>
          <div className="hero-desc">
            AHP tabanlı çok kriterli mekansal karar verme. PostGIS raster analizi,
            izohips polygon bantları ve deck.gl 3D görselleştirme ile GES ve RES
            kurulum alanlarının bilimsel tespiti.
          </div>
          <div className="hero-actions">
            <button className="btn-primary ges-btn" onClick={() => onNavigate('ges')}>
              ☀️ GES Analizine Başla
            </button>
            <button className="btn-primary res-btn" onClick={() => onNavigate('res')}>
              💨 RES Analizine Başla
            </button>
            <button className="btn-ghost" onClick={() => onNavigate('method')}>
              📐 Metodoloji
            </button>
          </div>
        </div>

        {/* Sağ — özet istatistik kutusu */}
        <div style={{
          width: 300, flexShrink: 0,
          background: 'rgba(10,14,26,0.9)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16, padding: 24,
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 4 }}>
            Analiz Özeti
          </div>
          {[
            { label: 'Analiz Alanı',  val: '11.891', unit: 'km²',  clr: 'var(--ibb-green-l)' },
            { label: 'GES Uygun Alan', val: '2.341', unit: 'km²',  clr: 'var(--ges)' },
            { label: 'GES Kapasite',  val: '11.705', unit: 'MW',   clr: 'var(--ges)' },
            { label: 'RES Uygun Alan', val: '1.719', unit: 'km²',  clr: 'var(--res)' },
            { label: 'RES Kapasite',  val: '8.595',  unit: 'MW',   clr: 'var(--res)' },
            { label: 'AHP Kriteri',   val: '8 + 9',  unit: 'adet', clr: 'var(--text-2)' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 11.5, color: 'var(--text-2)', fontWeight: 400 }}>{item.label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: item.clr, whiteSpace: 'nowrap' }}>
                {item.val} <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.6 }}>{item.unit}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi-val g">11.891</div>
          <div className="kpi-label">km² · Analiz Alanı</div>
          <div className="kpi-sub">İzmir il sınırı · EPSG:32635</div>
        </div>
        <div className="kpi">
          <div className="kpi-val ges">8 + 9</div>
          <div className="kpi-label">AHP Kriteri</div>
          <div className="kpi-sub">GES 8 · RES 9 kriter</div>
        </div>
        <div className="kpi">
          <div className="kpi-val res">100</div>
          <div className="kpi-label">m · Çözünürlük</div>
          <div className="kpi-sub">Raster piksel boyutu</div>
        </div>
        <div className="kpi">
          <div className="kpi-val" style={{ color: 'var(--ibb-green-l)' }}>
            ST_Reclass
          </div>
          <div className="kpi-label">PostGIS · İzohips Bantlar</div>
          <div className="kpi-sub">4 uygunluk sınıfı</div>
        </div>
      </div>

      {/* ── Modül kartları ── */}
      <div className="module-grid">
        {/* GES */}
        <div className="mod-card ges-card" onClick={() => onNavigate('ges')}>
          <div className="mod-icon ges">☀️</div>
          <div>
            <div className="mod-title">Güneş Enerjisi Santrali</div>
            <div className="mod-desc">
              Solar radyasyon, eğim, arazi kullanımı, ENH uzaklığı ve çevresel
              mesafe kriterleriyle GES kurulum uygunluk analizi.
            </div>
          </div>
          <div className="mod-stats">
            <div className="mod-stat">
              <div className="mod-stat-val ges">2.341 km²</div>
              <div className="mod-stat-label">Uygun Alan</div>
            </div>
            <div className="mod-stat">
              <div className="mod-stat-val ges">11.705 MW</div>
              <div className="mod-stat-label">Potansiyel</div>
            </div>
          </div>
          <div className="mod-arrow">Analize Git →</div>
        </div>

        {/* RES */}
        <div className="mod-card res-card" onClick={() => onNavigate('res')}>
          <div className="mod-icon res">💨</div>
          <div>
            <div className="mod-title">Rüzgâr Enerjisi Santrali</div>
            <div className="mod-desc">
              Rüzgâr hızı (Global Wind Atlas), yükseklik, açık arazi ve güvenlik
              tampon bölgesi kriterleriyle RES uygunluk analizi.
            </div>
          </div>
          <div className="mod-stats">
            <div className="mod-stat">
              <div className="mod-stat-val res">1.719 km²</div>
              <div className="mod-stat-label">Uygun Alan</div>
            </div>
            <div className="mod-stat">
              <div className="mod-stat-val res">8.595 MW</div>
              <div className="mod-stat-label">Potansiyel</div>
            </div>
          </div>
          <div className="mod-arrow">Analize Git →</div>
        </div>

        {/* Metodoloji */}
        <div className="mod-card" onClick={() => onNavigate('method')} style={{ cursor: 'pointer' }}>
          <div className="mod-icon" style={{ background: 'rgba(108,181,147,0.1)', fontSize: 20 }}>📐</div>
          <div>
            <div className="mod-title">Analiz Metodolojisi</div>
            <div className="mod-desc">
              AHP tabanlı çok kriterli karar verme süreci, PostGIS raster pipeline,
              veri kaynakları ve kriter ağırlıkları.
            </div>
          </div>
          <div className="mod-stats">
            <div className="mod-stat">
              <div className="mod-stat-val" style={{ color: 'var(--ibb-green-l)' }}>6 Adım</div>
              <div className="mod-stat-label">Pipeline</div>
            </div>
            <div className="mod-stat">
              <div className="mod-stat-val" style={{ color: 'var(--ibb-green-l)' }}>10 Kaynak</div>
              <div className="mod-stat-label">Veri</div>
            </div>
          </div>
          <div className="mod-arrow">İncele →</div>
        </div>
      </div>

      {/* ── Veri kaynakları ── */}
      <div className="sources-row">
        <div className="src-label">Veri Kaynakları</div>
        {['Global Solar Atlas','Global Wind Atlas','SRTM DEM','OSM / Geofabrik',
          'MTA Diri Fay','Copernicus CORINE','DSİ Havza','GADM'].map(s => (
          <div className="src-chip" key={s}>{s}</div>
        ))}
      </div>
    </div>
  );
}