// components/IlceKart.js
import { useState, useEffect } from 'react';
import MiniMap from './MiniMap';
import PdfButton from './PdfButton';
import { S_RENK, S_AD, skorRenk } from './constants';

// ── Gauge — skor kadranı ───────────────────────────────────────────────────────
export function Gauge({ skor = 0, color, size = 72 }) {
  const circumference = 251.2;
  const p = (skor / 5) * circumference;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" fill="none"
        stroke="rgba(255,255,255,0.05)" strokeWidth="7"/>
      <circle cx="50" cy="50" r="40" fill="none"
        stroke={color} strokeWidth="7"
        strokeDasharray={`${p} ${circumference}`}
        strokeDashoffset="62.8" strokeLinecap="round"
        style={{ filter:`drop-shadow(0 0 4px ${color}60)` }}/>
      <text x="50" y="47" textAnchor="middle" fontSize="18" fontWeight="800"
        fill={color} fontFamily="Manrope,sans-serif">{skor.toFixed(2)}</text>
      <text x="50" y="61" textAnchor="middle" fontSize="8"
        fill="rgba(255,255,255,0.3)" fontFamily="Manrope,sans-serif">/5</text>
    </svg>
  );
}

// ── Donut ─────────────────────────────────────────────────────────────────────
export function Donut({ sinifD = {}, size = 130 }) {
  const cx = size / 2, cy = size / 2, R = cx * 0.72, r = cx * 0.44;
  const slices = [5, 4, 3, 2, 1].map(s => ({ s, v: Number(sinifD[String(s)] || 0), c: S_RENK[s] }));
  const total = slices.reduce((a, b) => a + b.v, 0) || 1;
  let ang = -Math.PI / 2;
  const paths = slices.map(({ v, c }, i) => {
    const a = (v / total) * 2 * Math.PI;
    if (a < 0.025) { ang += a; return null; }
    const x1 = cx + R * Math.cos(ang), y1 = cy + R * Math.sin(ang);
    const x2 = cx + R * Math.cos(ang + a), y2 = cy + R * Math.sin(ang + a);
    const xi1 = cx + r * Math.cos(ang), yi1 = cy + r * Math.sin(ang);
    const xi2 = cx + r * Math.cos(ang + a), yi2 = cy + r * Math.sin(ang + a);
    const lg = a > Math.PI ? 1 : 0;
    const path = <path key={i}
      d={`M${x1},${y1}A${R},${R},0,${lg},1,${x2},${y2}L${xi2},${yi2}A${r},${r},0,${lg},0,${xi1},${yi1}Z`}
      fill={c} stroke="rgba(0,0,0,0.3)" strokeWidth="1"/>;
    ang += a;
    return path;
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths}
      <circle cx={cx} cy={cy} r={r - 1} fill="var(--card)"/>
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={size * 0.115}
        fontWeight="800" fill="var(--text)" fontFamily="Manrope,sans-serif">
        {total.toLocaleString('tr')}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={size * 0.068}
        fill="var(--muted)" fontFamily="Manrope,sans-serif">ha toplam</text>
    </svg>
  );
}

// ── Ana kart ──────────────────────────────────────────────────────────────────
export default function IlceKart({ data, mwRow, color, showMap, et, onRemove, canRemove }) {
  const [extremes,      setExtremes]      = useState(null);
  const [extremesError, setExtremesError] = useState(false);
  const [highlightPoint, setHighlightPoint] = useState(null);

  useEffect(() => {
    if (!data?.ilce) return;
    setExtremes(null);
    setExtremesError(false);
    setHighlightPoint(null);
    fetch(`/api/${et.toLowerCase()}/district/${encodeURIComponent(data.ilce)}/extremes`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => setExtremes(d))
      .catch(() => setExtremesError(true));
  }, [data?.ilce, et]);

  const flyTo = (type) => {
    if (!extremes) return;
    const pt = extremes[type];
    setHighlightPoint({ lon: pt.lon, lat: pt.lat, sinif: pt.sinif, alan_ha: pt.alan_ha, label: type });
  };

  // ── Yükleniyor ──
  if (!data) return (
    <div style={styles.card(color)}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
        justifyContent:'center', gap:10, padding:48 }}>
        <div style={{ width:18, height:18, border:`2px solid ${color}25`,
          borderTopColor:color, borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
        <span style={{ color:'var(--muted)', fontSize:12 }}>Yükleniyor…</span>
      </div>
    </div>
  );

  const skor = data.skor_ort || 0;
  const renk = skorRenk(skor);
  const tot  = Object.values(data.sinif_dagilim || {}).reduce((a, b) => a + Number(b), 0) || 1;

  return (
    <div style={styles.card(color)}>

      {/* ── Başlık ─────────────────────────────────────────────────── */}
      <div style={styles.header(color)}>
        {/* Sol: isim + meta */}
        <div style={{ display:'flex', flexDirection:'column', gap:6, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {/* Renkli dikey çizgi — accent */}
            <div style={{ width:3, height:22, borderRadius:2, background:color,
              flexShrink:0, boxShadow:`0 0 8px ${color}80` }}/>
            <span style={{ fontSize:19, fontWeight:800, color:'var(--text)',
              letterSpacing:'-0.02em', lineHeight:1 }}>{data.ilce}</span>
          </div>

          <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center', paddingLeft:11 }}>
            {/* ET badge — sadece renk aksan */}
            <span style={{
              fontSize:10, fontWeight:700, letterSpacing:'0.06em',
              color: color, border:`1px solid ${color}35`,
              padding:'2px 7px', borderRadius:4,
              background:`${color}0d`,
            }}>{et}</span>

            {mwRow && (
              <span style={{ fontSize:11, color:'var(--muted)', fontFamily:'monospace' }}>
                {mwRow.kurulu_mw.toFixed(0)} MW · {(mwRow.yillik_mwh / 1000).toFixed(1)} GWh/yıl
              </span>
            )}
          </div>
        </div>

        {/* Sağ: gauge + kapat */}
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <Gauge skor={skor} color={renk} size={84}/>
          {canRemove && (
            <button onClick={onRemove} style={styles.closeBtn}>×</button>
          )}
        </div>
      </div>

      {/* ── Harita ─────────────────────────────────────────────────── */}
      {showMap && (
        <div style={{ position:'relative', height:300, overflow:'hidden', flexShrink:0 }}>
          <MiniMap ilceAdi={data.ilce} energyType={et} color={color}
            height={300} highlightPoint={highlightPoint}/>
        </div>
      )}

      {/* ── Sınıf dağılımı ─────────────────────────────────────────── */}
      <div style={styles.section}>
        {/* Başlık satırı */}
        <div style={{ display:'flex', justifyContent:'space-between',
          alignItems:'center', marginBottom:10 }}>
          <span style={styles.sectionLabel}>Sınıf Dağılımı</span>
          <span style={{ fontSize:9, color:'var(--dim)' }}>
            <span style={{ color:'#7f1d1d' }}>1 Düşük</span>
            {' → '}
            <span style={{ color:'#14532d' }}>5 Yüksek</span>
          </span>
        </div>

        {/* Renkli bar */}
        <div style={{ display:'flex', height:8, borderRadius:4,
          overflow:'hidden', marginBottom:10, gap:1 }}>
          {[1,2,3,4,5].map(s => {
            const ha  = Number(data.sinif_dagilim?.[String(s)] || 0);
            const pct = (ha / tot) * 100;
            if (pct < 0.3) return null;
            return <div key={s}
              title={`${S_AD[s]}: ${ha.toLocaleString('tr')} ha (%${pct.toFixed(1)})`}
              style={{ flex:`${pct} 0 0`, background: S_RENK[s], transition:'flex 0.5s' }}/>;
          })}
        </div>

        {/* 5 sınıf hücresi — sade, az renk */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:4 }}>
          {[1,2,3,4,5].map(s => {
            const ha      = Number(data.sinif_dagilim?.[String(s)] || 0);
            const pct     = tot > 0 ? (ha / tot) * 100 : 0;
            const isEmpty = ha === 0;
            return (
              <div key={s} style={{
                borderRadius:7, padding:'8px 5px', textAlign:'center',
                background: isEmpty ? 'var(--surface-2)' : 'var(--surface)',
                border:`1px solid ${isEmpty ? 'var(--border)' : 'rgba(255,255,255,0.07)'}`,
                borderTop: isEmpty ? undefined : `2px solid ${S_RENK[s]}`,
                opacity: isEmpty ? 0.3 : 1,
                transition:'opacity 0.2s',
              }}>
                <div style={{ fontSize:9, fontWeight:600, color:'var(--muted)',
                  marginBottom:4, whiteSpace:'nowrap' }}>{S_AD[s]}</div>
                <div style={{ fontSize:13, fontWeight:800,
                  color: isEmpty ? 'var(--dim)' : 'var(--text)',
                  fontFamily:'JetBrains Mono,monospace', lineHeight:1 }}>
                  {isEmpty ? '—' : pct.toFixed(1) + '%'}
                </div>
                {!isEmpty && (
                  <div style={{ fontSize:8.5, color:'var(--dim)', marginTop:3,
                    fontFamily:'JetBrains Mono,monospace' }}>
                    {ha >= 1000 ? (ha / 1000).toFixed(1) + 'k' : ha.toLocaleString('tr')} ha
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── KPI üçlü ───────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
        borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)' }}>

        {/* Uygun Arazi */}
        <KpiCell label="Uygun Arazi" accentColor={color}>
          <span style={styles.kpiVal}>
            {Number(data.uygun_alan_ha || 0).toLocaleString('tr')}
          </span>
          <span style={styles.kpiUnit}>ha</span>
        </KpiCell>

        {/* En Düşük */}
        <KpiCell
          label={extremes ? `En Düşük (S${extremes.true_min_sinif})` : 'En Düşük'}
          badge={extremes ? { text:'▼ gör', color:'#dc2626' } : null}
          clickable={!!extremes}
          active={highlightPoint?.label === 'min'}
          activeColor="rgba(220,38,38,0.07)"
          onClick={() => flyTo('min')}
          bordered
        >
          <span style={{ ...styles.kpiVal,
            color: highlightPoint?.label === 'min' ? '#dc2626' : 'var(--text)' }}>
            {(data.skor_min || 0).toFixed(2)}
          </span>
          {extremesError && (
            <span style={{ fontSize:9, color:'var(--dim)', marginLeft:4 }}>—</span>
          )}
        </KpiCell>

        {/* En Yüksek */}
        <KpiCell
          label={extremes ? `En Yüksek (S${extremes.true_max_sinif})` : 'En Yüksek'}
          badge={extremes ? { text:'▲ gör', color:'#16a34a' } : null}
          clickable={!!extremes}
          active={highlightPoint?.label === 'max'}
          activeColor="rgba(22,163,74,0.07)"
          onClick={() => flyTo('max')}
        >
          <span style={{ ...styles.kpiVal,
            color: highlightPoint?.label === 'max' ? '#16a34a' : 'var(--text)' }}>
            {(data.skor_max || 0).toFixed(2)}
          </span>
        </KpiCell>

      </div>

      {/* ── PDF ────────────────────────────────────────────────────── */}
      <div style={{ padding:'10px 14px' }}>
        <PdfButton ilceAdi={data.ilce} energyType={et}/>
      </div>
    </div>
  );
}

// ── KpiCell yardımcı bileşeni ─────────────────────────────────────────────────
function KpiCell({ label, badge, clickable, active, activeColor, onClick, bordered, accentColor, children }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={clickable ? onClick : undefined}
      onMouseEnter={() => clickable && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding:'10px 12px',
        borderRight: bordered ? '1px solid var(--border)' : undefined,
        cursor: clickable ? 'pointer' : 'default',
        background: active ? activeColor : hov && clickable ? activeColor : 'transparent',
        transition:'background 0.15s',
      }}
    >
      <div style={{ display:'flex', alignItems:'center', gap:4,
        marginBottom:4, flexWrap:'wrap' }}>
        <span style={{ fontSize:9, color:'var(--muted)', textTransform:'uppercase',
          letterSpacing:'0.06em', fontWeight:600 }}>{label}</span>
        {badge && (
          <span style={{ fontSize:8.5, color: badge.color, fontWeight:700 }}>
            {badge.text}
          </span>
        )}
      </div>
      <div style={{ display:'flex', alignItems:'baseline', gap:3 }}>
        {children}
      </div>
    </div>
  );
}

// ── Stil sabitleri ────────────────────────────────────────────────────────────
const styles = {
  // Kart — flex:1 1 0 ile parent grid/flex içinde EŞİT GENİŞLİK
  card: (color) => ({
    flex: '1 1 0',
    minWidth: 0,              // flex shrink için gerekli
    width: '100%',            // grid içinde tam genişlik
    background: 'var(--card)',
    border: `1px solid rgba(255,255,255,0.07)`,
    borderTop: `3px solid ${color}`,    // üst renk aksanı — tek canlı renk
    borderRadius: 14,
    overflow: 'hidden',
    boxShadow: '0 2px 16px rgba(0,0,0,0.28)',
    display: 'flex',
    flexDirection: 'column',
  }),

  header: (color) => ({
    padding: '16px 18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    borderBottom: '1px solid var(--border)',
    // gradient yok — sade arka plan
  }),

  section: {
    padding: '14px 18px',
    borderBottom: '1px solid var(--border)',
  },

  sectionLabel: {
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
  },

  kpiVal: {
    fontSize: 15,
    fontWeight: 800,
    color: 'var(--text)',
    fontFamily: 'JetBrains Mono, monospace',
    lineHeight: 1,
  },

  kpiUnit: {
    fontSize: 10,
    color: 'var(--muted)',
    fontWeight: 500,
  },

  closeBtn: {
    width: 24, height: 24, borderRadius: '50%',
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--muted)',
    cursor: 'pointer',
    fontSize: 15, lineHeight: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
};