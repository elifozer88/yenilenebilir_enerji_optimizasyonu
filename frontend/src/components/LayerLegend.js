// Kepler.gl tarzı sağ üst Layer Legend paneli.
// Topografik gradient + uygunluk skor barı.

const TERRAIN_STOPS = [
  { c: 'rgb(22,130,165)',  label: 'min' },
  { c: 'rgb(40,185,195)',  label: '' },
  { c: 'rgb(120,230,200)', label: '' },
  { c: 'rgb(205,240,165)', label: '' },
  { c: 'rgb(245,230,110)', label: 'max' },
];

const SCORE_BUCKETS = [
  { c: '#10B981', label: 'Çok Uygun', range: '4.0 – 5.0' },
  { c: '#84CC16', label: 'Uygun',     range: '3.0 – 4.0' },
  { c: '#EAB308', label: 'Orta',      range: '2.0 – 3.0' },
  { c: '#F97316', label: 'Düşük',     range: '1.0 – 2.0' },
];

export default function LayerLegend({ terrainStats, energyType, suitCount }) {
  const minE = terrainStats?.minE != null ? Math.round(terrainStats.minE) : '—';
  const maxE = terrainStats?.maxE != null ? Math.round(terrainStats.maxE) : '—';
  const midE = (terrainStats?.minE != null && terrainStats?.maxE != null)
    ? Math.round((terrainStats.minE + terrainStats.maxE) / 2)
    : '—';

  return (
    <div className="layer-legend">
      <div className="ll-head">
        <div className="ll-title">Layer Legend</div>
        <div className="ll-sub">İzmir DEM · {terrainStats?.count ?? 0} nokta</div>
      </div>

      {/* Topografik gradient — SF Kepler görseli paleti */}
      <div className="ll-section">
        <div className="ll-row">
          <span className="ll-pill polygon">Polygon</span>
          <span className="ll-name">elevation</span>
        </div>

        <div className="ll-ramp" aria-label="elevation gradient">
          <div
            className="ll-ramp-bar"
            style={{
              background: `linear-gradient(90deg,
                ${TERRAIN_STOPS.map(s => s.c).join(', ')})`,
            }}
          />
          <div className="ll-ramp-axis">
            <span>{minE} m</span>
            <span>{midE} m</span>
            <span>{maxE} m</span>
          </div>
        </div>

        <div className="ll-meta">
          <span>Color Scale: <b>quantile</b></span>
          <span>Opacity: <b>0.78</b></span>
        </div>
      </div>

      {/* Uygunluk bucket'ları */}
      <div className="ll-section">
        <div className="ll-row">
          <span className="ll-pill scatter">Scatter</span>
          <span className="ll-name">{energyType} uygunluk · {suitCount ?? 0}</span>
        </div>
        <div className="ll-buckets">
          {SCORE_BUCKETS.map(b => (
            <div className="ll-bucket" key={b.label}>
              <span
                className="ll-dot"
                style={{ background: b.c, boxShadow: `0 0 6px ${b.c}` }}
              />
              <span className="ll-bucket-label">{b.label}</span>
              <span className="ll-bucket-range">{b.range}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
