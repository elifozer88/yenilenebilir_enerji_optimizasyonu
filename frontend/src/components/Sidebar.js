const CRITERIA = {
  GES: [
    { icon: '🌞', label: 'Solar Radyasyon' },
    { icon: '📐', label: 'Eğim & Bakı' },
    { icon: '🌾', label: 'Arazi Kullanımı (CORINE)' },
    { icon: '⚡', label: 'ENH Uzaklığı' },
    { icon: '🏘️', label: 'Yerleşim Uzaklığı' },
    { icon: '〰️', label: 'Fay Hattı Uzaklığı' },
  ],
  RES: [
    { icon: '💨', label: 'Rüzgar Hızı (Global Wind Atlas)' },
    { icon: '⛰️', label: 'Yükseklik (DEM)' },
    { icon: '🌾', label: 'Arazi Kullanımı (CORINE)' },
    { icon: '⚡', label: 'ENH Uzaklığı' },
    { icon: '🏘️', label: 'Yerleşim Uzaklığı' },
    { icon: '〰️', label: 'Fay Hattı Uzaklığı' },
  ],
};

export default function Sidebar({ energyType, setEnergyType, minScore, setMinScore }) {
  const isGES = energyType === 'GES';
  const cc    = isGES ? 'ges' : 'res';

  return (
    <aside className="control-panel">

      {/* Enerji Türü */}
      <div className="panel-section">
        <div className="section-label">Enerji Türü</div>
        <div className="energy-toggle">
          {['GES', 'RES'].map(t => (
            <button
              key={t}
              className={`energy-btn ${t.toLowerCase()} ${energyType === t ? 'active' : ''}`}
              onClick={() => setEnergyType(t)}
            >
              <span className="energy-icon">{t === 'GES' ? '☀️' : '💨'}</span>
              <span className="energy-name">{t}</span>
              <span className="energy-sub">{t === 'GES' ? 'Güneş' : 'Rüzgar'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Minimum Skor */}
      <div className="panel-section">
        <div className="section-label">Minimum Uygunluk Skoru</div>
        <div className="slider-wrapper">
          <div className="slider-header">
            <span>Filtre Eşiği</span>
            <span className={`slider-value ${cc}`}>
              {minScore.toFixed(1)}<sup>/5</sup>
            </span>
          </div>
          <input
            type="range" className={cc}
            min="1" max="50" step="1"
            value={Math.round(minScore * 10)}
            onChange={e => setMinScore(parseInt(e.target.value, 10) / 10)}
          />
          <div className="slider-ticks">
            {['1.0','2.0','3.0','4.0','5.0'].map(v => <span key={v}>{v}</span>)}
          </div>
        </div>
      </div>

      {/* Uygunluk Skalası */}
      <div className="panel-section">
        <div className="section-label">Uygunluk Skalası</div>
        <div className="legend-list">
          {[
            { cls: '#10B981', label: 'Çok Uygun',  range: '4.0 – 5.0' },
            { cls: '#84CC16', label: 'Uygun',       range: '3.0 – 4.0' },
            { cls: '#EAB308', label: 'Orta',        range: '2.0 – 3.0' },
            { cls: '#F97316', label: 'Düşük',       range: '1.0 – 2.0' },
          ].map(({ cls, label, range }) => (
            <div className="legend-item" key={label}>
              <div
                className="legend-dot"
                style={{ background: cls, boxShadow: `0 0 6px ${cls}` }}
              />
              <span className="legend-label">{label}</span>
              <span className="legend-range">{range}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AHP Kriterleri */}
      <div className="panel-section">
        <div className="section-label">AHP Kriterleri · {energyType}</div>
        <div className="criteria-list">
          {CRITERIA[energyType].map(({ icon, label }) => (
            <div className="criteria-item" key={label}>
              <span className="ci-icon">{icon}</span>
              {label}
            </div>
          ))}
        </div>
      </div>

    </aside>
  );
}