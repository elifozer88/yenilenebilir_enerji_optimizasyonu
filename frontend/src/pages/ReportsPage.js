import { useState, useEffect } from 'react';

const SORT_OPTIONS = [
  { val:'ges',  label:'GES Skoru' },
  { val:'res',  label:'RES Skoru' },
  { val:'avg',  label:'Ortalama'  },
  { val:'area', label:'Alan'      },
];

function ScoreBar({ score, color }) {
  return (
    <div className="dc-bar">
      <div
        className="dc-bar-fill"
        style={{ width: `${(score / 5) * 100}%`, background: color }}
      />
    </div>
  );
}

export default function ReportsPage({ onNavigate }) {
  const [sortBy,   setSortBy]   = useState('ges');
  const [gesStats, setGesStats] = useState(null);
  const [resStats, setResStats] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [loading,   setLoading]   = useState(true);

  // API'den gerçek istatistikleri ve ilçe listesini çek
  useEffect(() => {
    // İstatistikler
    fetch('/api/ges/stats').then(r => r.ok ? r.json() : null).then(d => d && setGesStats(d)).catch(() => {});
    fetch('/api/res/stats').then(r => r.ok ? r.json() : null).then(d => d && setResStats(d)).catch(() => {});

    // İlçeler ve Skorlar
    Promise.all([
      fetch('/api/ges/districts').then(r => r.ok ? r.json() : null),
      fetch('/api/res/districts').then(r => r.ok ? r.json() : null)
    ])
    .then(([gesData, resData]) => {
      if (!gesData || !resData) return;
      const merged = {};

      gesData.features.forEach(f => {
        const name = f.properties.ilce;
        merged[name] = {
          name,
          ges: f.properties.skor_ort || 0,
          // uygun_alan_ha'ı km2'ye çevir (1 km2 = 100 ha)
          area: (f.properties.uygun_alan_ha || 0) / 100,
          res: 0
        };
      });

      resData.features.forEach(f => {
        const name = f.properties.ilce;
        if (merged[name]) {
          merged[name].res = f.properties.skor_ort || 0;
          // İki enerji tipi için uygun alanların max'ını veya toplamını alabiliriz. 
          // Burada maksimumu almak (uygun coğrafi alanı temsil etmek için) daha makuldür.
          merged[name].area = Math.max(merged[name].area, (f.properties.uygun_alan_ha || 0) / 100);
        } else {
          merged[name] = {
            name,
            ges: 0,
            area: (f.properties.uygun_alan_ha || 0) / 100,
            res: f.properties.skor_ort || 0
          };
        }
      });

      setDistricts(Object.values(merged));
    })
    .catch(() => {})
    .finally(() => setLoading(false));
  }, []);

  const sorted = [...districts].sort((a, b) => {
    if (sortBy === 'avg') return ((b.ges + b.res) / 2) - ((a.ges + a.res) / 2);
    if (sortBy === 'area') return b.area - a.area;
    return b[sortBy] - a[sortBy];
  });

  return (
    <div className="page-content">

      {/* Başlık */}
      <div className="page-heading">İlçe Bazlı Uygunluk Raporu</div>
      <div className="page-subhead">
        İzmir ilçelerinin GES ve RES uygunluk skorları · AHP çok kriterli analiz sonuçları
      </div>

      {/* Yükleniyor Uyarısı */}
      {loading && (
        <div style={{ padding: '24px 0', color: 'var(--text-2)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 14, height: 14, border: '2px solid #1a2035', borderTopColor: 'var(--ibb-green-l)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
          Veriler yükleniyor…
        </div>
      )}

      {/* API istatistikleri (yüklendiyse) */}
      {!loading && (gesStats || resStats) && (
        <div style={{ display:'flex', gap:14, marginBottom:24, flexWrap:'wrap' }}>
          {gesStats && (
            <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:10, padding:'12px 18px' }}>
              <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ges)', marginBottom:8 }}>
                ☀️ GES · API Verileri
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0 24px' }}>
                {[['Min', gesStats.min ?? gesStats.min_skor],['Maks', gesStats.max ?? gesStats.max_skor],['Ort', gesStats.mean ?? gesStats.ort_skor]].map(([l,v]) => (
                  <div key={l}>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:15, fontWeight:700, color:'var(--ges)' }}>{v?.toFixed(2)}</div>
                    <div style={{ fontSize:9.5, color:'var(--text-2)' }}>{l} skor</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {resStats && (
            <div style={{ background:'rgba(34,211,238,0.08)', border:'1px solid rgba(34,211,238,0.25)', borderRadius:10, padding:'12px 18px' }}>
              <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--res)', marginBottom:8 }}>
                💨 RES · API Verileri
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0 24px' }}>
                {[['Min', resStats.min ?? resStats.min_skor],['Maks', resStats.max ?? resStats.max_skor],['Ort', resStats.mean ?? resStats.ort_skor]].map(([l,v]) => (
                  <div key={l}>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:15, fontWeight:700, color:'var(--res)' }}>{v?.toFixed(2)}</div>
                    <div style={{ fontSize:9.5, color:'var(--text-2)' }}>{l} skor</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sıralama kontrolü */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
        <span style={{ fontSize:10.5, color:'var(--text-2)', fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase' }}>
          Sırala:
        </span>
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.val}
            onClick={() => setSortBy(opt.val)}
            style={{
              padding:'5px 12px', borderRadius:20,
              fontSize:11, fontWeight:600, letterSpacing:'0.04em',
              border:'1px solid',
              cursor:'pointer', transition:'all 0.15s',
              borderColor: sortBy === opt.val ? 'var(--ibb-green-l)' : 'var(--border)',
              background:  sortBy === opt.val ? 'rgba(108,181,147,0.12)' : 'transparent',
              color:       sortBy === opt.val ? 'var(--ibb-green-l)' : 'var(--text-2)',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* İlçe grid */}
      <div className="district-grid">
        {sorted.map((d, i) => {
          const avg = ((d.ges + d.res) / 2).toFixed(1);
          return (
            <div className="dc-card" key={d.name}>
              <div>
                <div className="dc-rank">Sıra {String(i+1).padStart(2,'0')} · {d.area.toLocaleString()} km²</div>
                <div className="dc-name">{d.name}</div>
                <div className="dc-area">Ort. Skor: {avg} / 5.0</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <div className="dc-score-row">
                  <div className="dc-score-key" style={{ color:'var(--ges)' }}>GES</div>
                  <ScoreBar score={d.ges} color="var(--ges)" />
                  <div className="dc-score-num" style={{ color:'var(--ges)' }}>{d.ges.toFixed(1)}</div>
                </div>
                <div className="dc-score-row">
                  <div className="dc-score-key" style={{ color:'var(--res)' }}>RES</div>
                  <ScoreBar score={d.res} color="var(--res)" />
                  <div className="dc-score-num" style={{ color:'var(--res)' }}>{d.res.toFixed(1)}</div>
                </div>
              </div>

              {/* En uygun rozeti */}
              {i === 0 && (
                <div style={{
                  position:'absolute', top:12, right:12,
                  fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase',
                  padding:'3px 8px', borderRadius:20,
                  background: sortBy==='res' ? 'var(--res-a)' : 'var(--ges-a)',
                  color: sortBy==='res' ? 'var(--res)' : 'var(--ges)',
                  border:`1px solid ${sortBy==='res' ? 'rgba(34,211,238,0.3)' : 'rgba(245,158,11,0.3)'}`,
                }}>
                  ★ En İyi
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Alt not */}
      <div style={{ marginTop:32, padding:'16px 20px', background:'rgba(255,255,255,0.02)', border:'1px solid var(--border)', borderRadius:10, fontSize:11.5, color:'var(--text-2)', lineHeight:1.7 }}>
        <strong style={{ color:'var(--text-1)', display:'block', marginBottom:4 }}>📌 Metodoloji Notu</strong>
        Skor değerleri AHP tabanlı çok kriterli analiz ile hesaplanmış olup
        <strong> 1 = Uygunsuz</strong>, <strong>5 = Çok Uygun</strong> ölçeğini kullanmaktadır.
        Gösterilen sonuçlar, PostGIS raster analizi (<code>ST_Reclass + ST_DumpAsPolygons</code>)
        çıktılarının ilçe bazlı ortalamasından türetilmiştir.
      </div>
    </div>
  );
}