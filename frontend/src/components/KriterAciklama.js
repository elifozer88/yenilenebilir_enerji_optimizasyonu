// components/KriterAciklama.js

const KRITER_IKON = {
  solar:'☀', ruzgar:'💨', egim:'⛰', baki:'🧭', yukseklik:'📏',
  arazi:'🌿', yerlesim:'🏘', yol:'🛣', akarsu:'💧', enerji:'⚡', fay:'🏔',
};

function SkorBar({ skor, color }) {
  const pct = Math.min((skor / 5) * 100, 100);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, flex:1 }}>
      <div style={{ flex:1, height:4, borderRadius:2,
        background:'var(--border)', overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, borderRadius:2,
          background:color, transition:'width 0.5s ease' }}/>
      </div>
      <span style={{ fontSize:11, fontWeight:700, color,
        fontFamily:'JetBrains Mono,monospace', minWidth:26, textAlign:'right' }}>
        {skor?.toFixed(1)}
      </span>
    </div>
  );
}

function KriterSatir({ kriter, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0' }}>
      <span style={{ fontSize:14, width:20, flexShrink:0, textAlign:'center' }}>
        {KRITER_IKON[kriter.kod] || '•'}
      </span>
      <span style={{ fontSize:11, color:'var(--text-2)', flex:'0 0 130px',
        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {kriter.ad}
      </span>
      <SkorBar skor={kriter.skor} color={color}/>
    </div>
  );
}

export default function KriterAciklama({ kriterler = [], label, sinif, onClose }) {
  if (!kriterler?.length) return null;

  const isMax  = label === 'max';
  const accent = isMax ? '#16a34a' : '#dc2626';

  const sorted = [...kriterler].sort((a,b) => (b.skor||0) - (a.skor||0));
  const guclu  = sorted.filter(k => (k.skor||0) >= 3.5);
  const orta   = sorted.filter(k => (k.skor||0) >= 2.5 && (k.skor||0) < 3.5);
  const zayif  = sorted.filter(k => (k.skor||0) < 2.5);

  const ozet = isMax
    ? guclu.length ? `${guclu.slice(0,2).map(k=>k.ad).join(', ')} yüksek` : 'Dengeli profil'
    : zayif.length ? `${zayif.slice(0,2).map(k=>k.ad).join(', ')} kısıtlayıcı` : 'Genel uygunluk sınırlı';

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid var(--border)`,
      borderLeft: `3px solid ${accent}`,
      borderRadius: 10,
      overflow: 'hidden',
      fontSize: 12,
    }}>
      {/* Başlık */}
      <div style={{
        display:'flex', justifyContent:'space-between', alignItems:'center',
        padding:'10px 14px',
        background: isMax ? 'rgba(22,163,74,0.06)' : 'rgba(220,38,38,0.06)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div>
          <div style={{ fontWeight:800, fontSize:12, color: accent, marginBottom:2 }}>
            {isMax ? '▲' : '▼'} Sınıf {sinif} — {isMax ? 'Neden Yüksek?' : 'Neden Düşük?'}
          </div>
          <div style={{ fontSize:10, color:'var(--muted)' }}>{ozet}</div>
        </div>
        <button onClick={onClose} style={{
          background:'var(--surface-2)', border:'1px solid var(--border)',
          color:'var(--muted)', width:22, height:22, borderRadius:6,
          cursor:'pointer', fontSize:13, display:'flex',
          alignItems:'center', justifyContent:'center', flexShrink:0,
        }}>×</button>
      </div>

      {/* Kriter listesi */}
      <div style={{ padding:'8px 14px', display:'flex', flexDirection:'column' }}>

        {guclu.length > 0 && (
          <div style={{ marginBottom:6 }}>
            <div style={{ fontSize:9, fontWeight:700, color:'#16a34a',
              textTransform:'uppercase', letterSpacing:'0.07em',
              marginBottom:2, display:'flex', alignItems:'center', gap:4 }}>
              ✅ Güçlü
            </div>
            {guclu.map(k => <KriterSatir key={k.kod} kriter={k} color='#16a34a'/>)}
          </div>
        )}

        {orta.length > 0 && (
          <div style={{ marginBottom:6 }}>
            <div style={{ fontSize:9, fontWeight:700, color:'#d97706',
              textTransform:'uppercase', letterSpacing:'0.07em',
              marginBottom:2, display:'flex', alignItems:'center', gap:4 }}>
              ➖ Orta
            </div>
            {orta.map(k => <KriterSatir key={k.kod} kriter={k} color='#d97706'/>)}
          </div>
        )}

        {zayif.length > 0 && (
          <div>
            <div style={{ fontSize:9, fontWeight:700, color:'#dc2626',
              textTransform:'uppercase', letterSpacing:'0.07em',
              marginBottom:2, display:'flex', alignItems:'center', gap:4 }}>
              ⚠️ Kısıtlayıcı
            </div>
            {zayif.map(k => (
              <div key={k.kod}>
                <KriterSatir kriter={k} color='#dc2626'/>
                {k.skor <= 1.5 && (
                  <div style={{ fontSize:9, color:'var(--dim)',
                    paddingLeft:28, marginTop:-2, marginBottom:2 }}>
                    Kritik eşikte — yatırım planlamasında öncelikli kısıt
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding:'6px 14px 8px',
        borderTop:'1px solid var(--border)',
        fontSize:9, color:'var(--dim)' }}>
        {label === 'max' || label === 'min'
          ? '* Seçilen pikselin gerçek kriter değerleri (1-5 puan arası)'
          : '* İlçe geneli ortalama kriter değerleri — piksel bazlı farklılık olabilir'}
      </div>
    </div>
  );
}