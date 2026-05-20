/**
 * frontend/src/components/Login.js
 * YE·ATLAS Giriş Ekranı — izmir_hero.png arka plan
 */
import { useState } from 'react';

const ROL_ETIKET = {
  admin:   { label: 'Admin',   color: '#F59E0B' },
  mudur:   { label: 'Müdür',   color: '#A78BFA' },
  analist: { label: 'Analist', color: '#38BDF8' },
};

export default function Login({ onLogin }) {
  const [form, setForm]       = useState({ kullanici_adi: '', sifre: '' });
  const [loading, setLoading] = useState(false);
  const [hata, setHata]       = useState('');

  const handleSubmit = async () => {
    if (!form.kullanici_adi || !form.sifre) { setHata('Kullanıcı adı ve şifre zorunlu.'); return; }
    setLoading(true); setHata('');
    try {
      const res = await fetch('/api/auth/giris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setHata(data.detail || 'Giriş başarısız.'); return; }
      localStorage.setItem('yeatlas_token', data.token);
      localStorage.setItem('yeatlas_user', JSON.stringify(data.kullanici));
      onLogin(data.token, data.kullanici);
    } catch {
      setHata('Sunucuya bağlanılamadı. Backend çalışıyor mu?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', position:'relative', display:'flex',
      alignItems:'center', justifyContent:'center',
      fontFamily:"'Manrope', sans-serif", overflow:'hidden' }}>

      {/* Hero arka plan */}
      <div style={{ position:'absolute', inset:0,
        backgroundImage:'url(/izmir_hero.png)',
        backgroundSize:'cover', backgroundPosition:'center 22%' }}/>

      {/* Koyu overlay */}
      <div style={{ position:'absolute', inset:0,
        background:'linear-gradient(135deg, rgba(4,8,18,0.93) 0%, rgba(4,8,18,0.72) 50%, rgba(4,8,18,0.88) 100%)' }}/>

      {/* Sol alt badge'ler */}
      <div style={{ position:'absolute', bottom:24, left:28, zIndex:2, display:'flex', gap:6 }}>
        {['AHP','PostGIS','100m','EPSG:32635'].map(t => (
          <span key={t} style={{ fontSize:9.5, fontWeight:700,
            background:'rgba(6,10,20,0.75)', backdropFilter:'blur(8px)',
            color:'var(--brand)', padding:'5px 10px', borderRadius:999,
            border:'1px solid rgba(14,165,164,0.25)', letterSpacing:'0.04em' }}>{t}</span>
        ))}
      </div>

      {/* Sağ alt kurum */}
      <div style={{ position:'absolute', bottom:24, right:28, zIndex:2,
        fontSize:11, color:'rgba(255,255,255,0.3)', textAlign:'right', lineHeight:1.6 }}>
        DEÜ YBS Capstone 2026<br/>İzmir Büyükşehir Belediyesi
      </div>

      {/* Kart */}
      <div style={{ position:'relative', zIndex:2, width:'100%', maxWidth:400, margin:'0 24px',
        background:'rgba(8,14,28,0.82)', backdropFilter:'blur(24px)',
        WebkitBackdropFilter:'blur(24px)',
        border:'1px solid rgba(255,255,255,0.08)', borderRadius:20,
        padding:'36px 32px', boxShadow:'0 32px 80px rgba(0,0,0,0.55)' }}>

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:28 }}>
          <svg viewBox="0 0 44 44" fill="none" width={44} height={44} style={{flexShrink:0}}>
            <circle cx="22" cy="22" r="20" stroke="var(--brand)" strokeWidth="1.5" strokeDasharray="2 3"/>
            <path d="M22 8 C30 12 32 22 22 36 C12 22 14 12 22 8 Z" fill="var(--brand)" opacity="0.9"/>
            <path d="M22 8 C22 18 22 28 22 36" stroke="#fff" strokeWidth="1.2" opacity="0.8"/>
            <circle cx="22" cy="22" r="3" fill="var(--accent)"/>
          </svg>
          <div>
            <div style={{ fontSize:22, fontWeight:900, color:'#fff', letterSpacing:'-0.02em' }}>
              YE<span style={{color:'var(--brand)'}}>·</span>ATLAS
            </div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:2 }}>
              İklim Değişikliği ve Temiz Enerji Şube Müdürlüğü
            </div>
          </div>
        </div>

        <div style={{ fontSize:16, fontWeight:800, color:'#fff', marginBottom:4 }}>Sisteme Giriş</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.38)', marginBottom:22 }}>
          Yetkili kullanıcı bilgilerinizle devam edin
        </div>

        {hata && (
          <div style={{ background:'rgba(185,28,28,0.18)', border:'1px solid rgba(185,28,28,0.35)',
            borderRadius:10, padding:'10px 14px', fontSize:12, color:'#FCA5A5', marginBottom:16 }}>
            {hata}
          </div>
        )}

        {/* Input: Kullanıcı Adı */}
        {[
          { key:'kullanici_adi', label:'Kullanıcı Adı', type:'text', ph:'kullanici_adi', ac:'username' },
          { key:'sifre',         label:'Şifre',          type:'password', ph:'••••••••',     ac:'current-password' },
        ].map(({ key, label, type, ph, ac }) => (
          <div key={key} style={{ marginBottom: key==='sifre' ? 24 : 12 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.45)',
              textTransform:'uppercase', letterSpacing:'0.07em', display:'block', marginBottom:7 }}>
              {label}
            </label>
            <input
              type={type} autoComplete={ac} placeholder={ph}
              value={form[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              onFocus={e => e.target.style.borderColor = 'var(--brand)'}
              onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              style={{ width:'100%', padding:'11px 14px', borderRadius:10,
                border:'1px solid rgba(255,255,255,0.1)',
                background:'rgba(255,255,255,0.06)', color:'#fff',
                fontFamily:'inherit', fontSize:13, outline:'none',
                boxSizing:'border-box', transition:'border-color 0.2s' }}
            />
          </div>
        ))}

        <button onClick={handleSubmit} disabled={loading} style={{
          width:'100%', padding:'12px', borderRadius:10, border:'none',
          background: loading ? 'rgba(255,255,255,0.08)'
            : 'linear-gradient(135deg, var(--brand) 0%, #0c8a8a 100%)',
          color: loading ? 'rgba(255,255,255,0.35)' : '#fff',
          fontFamily:'inherit', fontSize:14, fontWeight:700,
          cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: loading ? 'none' : '0 4px 20px rgba(14,165,164,0.35)',
          transition:'all 0.2s',
        }}>
          {loading ? 'Giriş yapılıyor…' : 'Giriş Yap →'}
        </button>

        {/* Hızlı Giriş Paneli */}
        <div style={{ marginTop: 22, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, textAlign: 'center' }}>
            Hızlı Giriş Seçenekleri
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { u: 'admin', p: 'admin123', label: 'Admin', color: '#F59E0B' },
              { u: 'mudur', p: 'mudur123', label: 'Müdür', color: '#A78BFA' },
              { u: 'analist1', p: 'analist123', label: 'Analist', color: '#38BDF8' },
            ].map(user => (
              <button
                key={user.u}
                onClick={() => setForm({ kullanici_adi: user.u, sifre: user.p })}
                style={{
                  padding: '8px 4px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.04)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = user.color + '40';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                }}
              >
                <span style={{ color: user.color, fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
                  {user.label}
                </span>
                <span style={{ fontSize: 9, opacity: 0.5 }}>{user.u}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RolBadge({ rol }) {
  const cfg = ROL_ETIKET[rol] || { label: rol, color: '#94A3B8' };
  return (
    <span style={{ fontSize:9.5, fontWeight:700, padding:'3px 8px', borderRadius:999,
      background:`${cfg.color}20`, color:cfg.color,
      border:`1px solid ${cfg.color}40`, letterSpacing:'0.05em', textTransform:'uppercase' }}>
      {cfg.label}
    </span>
  );
}