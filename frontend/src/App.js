import { useState, useEffect, useCallback, useMemo } from 'react';
import MapView from './components/Map';
import Santraller from './components/Santraller';
import IlceKarsilastirma from './components/IlceKarsilastirma';
import './Atlas.css';

// ── SVG İllüstrasyonları ──────────────────────────────────────
const GESIllustration = () => (
  <svg width="100%" viewBox="0 0 280 160" style={{display:'block',marginBottom:12}}>
    <ellipse cx="140" cy="150" rx="140" ry="18" fill="currentColor" opacity="0.08"/>
    <circle cx="230" cy="36" r="18" fill="#F59E0B" opacity="0.85"/>
    {[0,45,90,135,180,225,270,315].map((deg,i)=>{
      const r=Math.PI*deg/180;
      return <line key={i} x1={230+Math.cos(r)*21} y1={36+Math.sin(r)*21}
        x2={230+Math.cos(r)*28} y2={36+Math.sin(r)*28}
        stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" opacity="0.6"/>;
    })}
    <g transform="translate(22,82) rotate(-16)">
      <rect x="0" y="0" width="76" height="50" rx="2" fill="#1e3a5f" stroke="#2d5a8e" strokeWidth="0.8"/>
      <rect x="2" y="2" width="72" height="46" rx="1" fill="#1a4a8a"/>
      <line x1="2" y1="17" x2="74" y2="17" stroke="#2a6abf" strokeWidth="0.5"/>
      <line x1="2" y1="33" x2="74" y2="33" stroke="#2a6abf" strokeWidth="0.5"/>
      <line x1="27" y1="2" x2="27" y2="48" stroke="#2a6abf" strokeWidth="0.5"/>
      <line x1="52" y1="2" x2="52" y2="48" stroke="#2a6abf" strokeWidth="0.5"/>
      <rect x="2" y="2" width="25" height="15" fill="#3a8adf" opacity="0.18" rx="1"/>
    </g>
    <rect x="50" y="132" width="4" height="20" rx="1" fill="#4a5568"/>
    <g transform="translate(112,76) rotate(-16)">
      <rect x="0" y="0" width="76" height="50" rx="2" fill="#1e3a5f" stroke="#2d5a8e" strokeWidth="0.8"/>
      <rect x="2" y="2" width="72" height="46" rx="1" fill="#1a4a8a"/>
      <line x1="2" y1="17" x2="74" y2="17" stroke="#2a6abf" strokeWidth="0.5"/>
      <line x1="2" y1="33" x2="74" y2="33" stroke="#2a6abf" strokeWidth="0.5"/>
      <line x1="27" y1="2" x2="27" y2="48" stroke="#2a6abf" strokeWidth="0.5"/>
      <line x1="52" y1="2" x2="52" y2="48" stroke="#2a6abf" strokeWidth="0.5"/>
      <rect x="2" y="2" width="25" height="15" fill="#3a8adf" opacity="0.18" rx="1"/>
    </g>
    <rect x="138" y="126" width="4" height="26" rx="1" fill="#4a5568"/>
    <g transform="translate(196,88) rotate(-16)">
      <rect x="0" y="0" width="55" height="36" rx="2" fill="#1e3a5f" stroke="#2d5a8e" strokeWidth="0.8"/>
      <rect x="2" y="2" width="51" height="32" rx="1" fill="#1a4a8a"/>
      <line x1="2" y1="13" x2="53" y2="13" stroke="#2a6abf" strokeWidth="0.5"/>
      <line x1="2" y1="24" x2="53" y2="24" stroke="#2a6abf" strokeWidth="0.5"/>
      <line x1="19" y1="2" x2="19" y2="34" stroke="#2a6abf" strokeWidth="0.5"/>
      <line x1="37" y1="2" x2="37" y2="34" stroke="#2a6abf" strokeWidth="0.5"/>
    </g>
    <rect x="216" y="124" width="3" height="28" rx="1" fill="#4a5568"/>
  </svg>
);

const RESIllustration = () => (
  <svg width="100%" viewBox="0 0 280 160" style={{display:'block',marginBottom:12}}>
    <ellipse cx="140" cy="150" rx="140" ry="18" fill="currentColor" opacity="0.08"/>
    {[0,1,2].map(i=>(
      <path key={i} d={`M10 ${42+i*16} Q60 ${37+i*16} 110 ${42+i*16}`}
        stroke="#38BDF8" strokeWidth="1.2" fill="none" opacity={0.22-i*0.05}
        strokeLinecap="round" strokeDasharray="5 4"/>
    ))}
    <rect x="84" y="50" width="7" height="100" rx="2" fill="#475569"/>
    <circle cx="87" cy="54" r="6" fill="#64748b"/>
    <path d="M87 54 Q94 34 87 16 Q82 34 87 54" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8"/>
    <path d="M87 54 Q106 64 120 58 Q104 50 87 54" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8"/>
    <path d="M87 54 Q68 64 59 78 Q71 62 87 54" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8"/>
    <circle cx="87" cy="54" r="3.5" fill="#64748b"/>
    <circle cx="87" cy="54" r="1.8" fill="#334155"/>
    <polygon points="80,150 94,150 91,138 83,138" fill="#374151"/>
    <rect x="158" y="66" width="6" height="84" rx="2" fill="#475569"/>
    <circle cx="161" cy="69" r="5" fill="#64748b"/>
    <path d="M161 69 Q167 52 161 37 Q157 52 161 69" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.7"/>
    <path d="M161 69 Q177 77 189 72 Q175 65 161 69" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.7"/>
    <path d="M161 69 Q145 77 137 89 Q148 74 161 69" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.7"/>
    <circle cx="161" cy="69" r="3" fill="#64748b"/>
    <circle cx="161" cy="69" r="1.5" fill="#334155"/>
    <polygon points="155,150 167,150 165,141 157,141" fill="#374151"/>
    <rect x="224" y="80" width="5" height="70" rx="1.5" fill="#475569"/>
    <circle cx="226" cy="83" r="4" fill="#64748b"/>
    <path d="M226 83 Q231 69 226 57 Q222 69 226 83" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.7"/>
    <path d="M226 83 Q239 90 249 86 Q237 80 226 83" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.7"/>
    <path d="M226 83 Q213 90 206 100 Q216 86 226 83" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.7"/>
    <circle cx="226" cy="83" r="2.5" fill="#64748b"/>
    <polygon points="221,150 231,150 230,143 222,143" fill="#374151"/>
  </svg>
);

const SunIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="4.5" fill="currentColor" fillOpacity="0.18"/>
    <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8l1.8-1.8M18 6l1.8-1.8"/>
  </svg>
);
const WindIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
    <path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
    <path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/>
  </svg>
);
const MapIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <path d="M3 6l3 12 6-3 6 3 3-12-9 3z"/>
  </svg>
);
const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
    <path d="M5 12h14M13 5l7 7-7 7"/>
  </svg>
);
const SolarPanelIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="3" y="7" width="26" height="18" rx="2" strokeOpacity="0.6"/>
    <line x1="3" y1="12" x2="29" y2="12" strokeOpacity="0.5"/>
    <line x1="3" y1="17" x2="29" y2="17" strokeOpacity="0.5"/>
    <line x1="3" y1="22" x2="29" y2="22" strokeOpacity="0.5"/>
    <line x1="10" y1="7" x2="10" y2="25" strokeOpacity="0.5"/>
    <line x1="18" y1="7" x2="18" y2="25" strokeOpacity="0.5"/>
    <line x1="26" y1="7" x2="26" y2="25" strokeOpacity="0.5"/>
    <path d="M13 25v3M19 25v3M10 28h12" strokeLinecap="round"/>
    <circle cx="26" cy="5" r="2.5" fill="currentColor" fillOpacity="0.5" strokeOpacity="0"/>
    <path d="M26 1.5v1M26 8v1M22.5 5h1M29.5 5h1M23.7 2.7l0.7 0.7M28.6 7.6l0.7 0.7M23.7 7.3l0.7-0.7M28.6 2.4l0.7-0.7" strokeWidth="1" strokeLinecap="round"/>
  </svg>
);
const TurbineIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6">
    <line x1="16" y1="14" x2="16" y2="30" strokeLinecap="round"/>
    <circle cx="16" cy="14" r="2" fill="currentColor" fillOpacity="0.4"/>
    <path d="M16 12 C16 8 13 4 10 3 C11 6 13 10 16 12" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 12 C20 11 24 8 25 5 C22 6 19 9 16 12" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 12 C13 14 11 18 12 22 C14 19 15 15 16 12" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="13" y1="30" x2="19" y2="30" strokeLinecap="round"/>
  </svg>
);

export default function App() {
  const [page, setPage]           = useState('home');
  const [theme, setTheme]         = useState('dark');
  const [energyType, setEnergy]   = useState('GES');
  const minScore = 1;
  // eslint-disable-next-line no-unused-vars
  const [stats, setStats]         = useState({ count:0, avgScore:'—', maxScore:'—', totalHa:0, totalMw:0 });
  const [apiStats, setApiStats]   = useState({ ges:null, res:null });
  const [cityFocus, setCityFocus] = useState(false);
  const [show3D]                  = useState(true);
  const [flyToIlce, setFlyToIlce] = useState(null);
  const [selectedIlce, setSelectedIlce] = useState('');
  const [senaryo]                 = useState('varsayilan');
  const [ilceDetay, setIlceDetay]     = useState(null);
  const [ilceLoading, setIlceLoading] = useState(false);
  const [ilceler, setIlceler]     = useState([]);
  const [havaDetay, setHavaDetay] = useState(null);
  const [rankedDistricts, setRankedDistricts] = useState([]);

  const WEIGHTS_GES = useMemo(() => ({
    solar:32, arazi:25, egim:11, baki:9, enerji:8, yerlesim:7, yol:4, fay:3, akarsu:1
  }), []);
  const WEIGHTS_RES = useMemo(() => ({
    ruzgar:30, arazi:27, yukseklik:13, yerlesim:10, enerji:6, egim:5, yol:4, fay:3, akarsu:2
  }), []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if(!selectedIlce){ setIlceDetay(null); setHavaDetay(null); return; }
    setIlceLoading(true);
    fetch(`/api/${energyType.toLowerCase()}/district/${encodeURIComponent(selectedIlce)}`)
      .then(r=>r.ok?r.json():null)
      .then(d=>setIlceDetay(d))
      .catch(()=>setIlceDetay(null))
      .finally(()=>setIlceLoading(false));
    fetch(`/api/hava/ilce/${encodeURIComponent(selectedIlce)}`)
      .then(r=>r.ok?r.json():null)
      .then(d=>setHavaDetay(d))
      .catch(()=>setHavaDetay(null));
  }, [selectedIlce, energyType]);

  useEffect(() => {
    const t = energyType.toLowerCase();
    fetch(`/api/${t}/districts?senaryo=${senaryo}`)
      .then(r=>r.ok?r.json():null)
      .then(gj=>{
        if(!gj?.features) return;
        const list = gj.features.map(f=>({
          ilce: f.properties.ilce,
          skor: f.properties.skor_ort || 0
        })).sort((a,b)=>b.skor-a.skor);
        setRankedDistricts(list);
        const names = list.map(item=>item.ilce).sort((a,b)=>a.localeCompare(b,'tr',{sensitivity:'base'}));
        setIlceler(names);
      }).catch(()=>{});
  }, [energyType, senaryo]);

  useEffect(() => {
    ['ges','res'].forEach(t => {
      fetch(`/api/${t}/stats`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setApiStats(prev => ({ ...prev, [t]: d })); })
        .catch(() => {});
    });
  }, []);

  const handleStatsUpdate = useCallback((s) => setStats(s), []);

  const goAtlas = (et) => {
    if (et) setEnergy(et);
    setPage('atlas');
  };

  const gs = apiStats.ges;
  const rs = apiStats.res;

  const GES_CRITERIA = [
    {id:'solar',  k:'Solar Radyasyon', c:'#F59E0B'},
    {id:'arazi',  k:'Arazi Kullanımı', c:'#60A5FA'},
    {id:'egim',   k:'Eğim & Bakı',     c:'#10B981'},
    {id:'baki',   k:'Bakı',            c:'#A78BFA'},
    {id:'enerji', k:'ENH Yakınlığı',   c:'#FB923C'},
    {id:'yerlesim',k:'Yerleşim',       c:'#F472B6'},
    {id:'yol',    k:'Yola Yakınlık',   c:'#34D399'},
    {id:'fay',    k:'Fay Uzaklığı',    c:'#94A3B8'},
    {id:'akarsu', k:'Akarsu',          c:'#67E8F9'},
  ];
  const RES_CRITERIA = [
    {id:'ruzgar',    k:'Rüzgâr Hızı',    c:'#38BDF8'},
    {id:'arazi',     k:'Arazi Kullanımı', c:'#60A5FA'},
    {id:'yukseklik', k:'Yükseklik',       c:'#FDE68A'},
    {id:'yerlesim',  k:'Yerleşim',        c:'#F472B6'},
    {id:'enerji',    k:'ENH Yakınlığı',   c:'#FB923C'},
    {id:'egim',      k:'Eğim',            c:'#10B981'},
    {id:'yol',       k:'Yola Yakınlık',   c:'#34D399'},
    {id:'fay',       k:'Fay Uzaklığı',    c:'#94A3B8'},
    {id:'akarsu',    k:'Akarsu',          c:'#67E8F9'},
  ];

  // ── Tema bazlı hero overlay renkleri ──
  const heroOverlayLeft = theme === 'light'
    ? 'linear-gradient(100deg, rgba(248,250,252,0.65) 0%, rgba(248,250,252,0.45) 38%, rgba(248,250,252,0.10) 65%, rgba(248,250,252,0.0) 100%)'
    : 'linear-gradient(100deg, rgba(4,8,18,0.78) 0%, rgba(4,8,18,0.62) 38%, rgba(4,8,18,0.28) 65%, rgba(4,8,18,0.0) 100%)';
  const heroOverlayBottom = theme === 'light'
    ? 'linear-gradient(180deg, transparent 50%, rgba(248,250,252,0.6) 100%)'
    : 'linear-gradient(180deg, transparent 50%, rgba(4,8,18,0.6) 100%)';
  const heroTextColor = theme === 'light' ? '#0f172a' : undefined;
  const heroSubColor  = theme === 'light' ? '#334155' : undefined;

  return (
    <div className="atlas-root">
      {/* ── TOPBAR ── */}
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-mark">
              <svg viewBox="0 0 44 44" fill="none">
                <circle cx="22" cy="22" r="20" stroke="var(--brand)" strokeWidth="1.5" strokeDasharray="2 3"/>
                <path d="M22 8 C30 12 32 22 22 36 C12 22 14 12 22 8 Z" fill="var(--brand)" opacity="0.9"/>
                <path d="M22 8 C22 18 22 28 22 36" stroke="#fff" strokeWidth="1.2" opacity="0.8"/>
                <circle cx="22" cy="22" r="3" fill="var(--accent)"/>
              </svg>
            </div>
            <div>
              <div className="brand-name">YE<span style={{color:'var(--brand)'}}>·</span>ATLAS</div>
              <div className="brand-sub">Yenilenebilir Enerji Atlası</div>
            </div>
            <div className="divider-v"/>
            <div className="dept-text">
              <strong>İklim Değişikliği ve</strong><br/>
              Temiz Enerji Şube Müdürlüğü
            </div>
          </div>

          <nav className="nav">
            {[['home','Ana Sayfa'],['atlas','Atlas'],['raporlar','Raporlar'],['santraller','Santraller']].map(([id,label]) => (
              <div key={id}
                className={`nav-link${page===id?' active':''}`}
                onClick={() => id==='atlas' ? setPage('atlas') : setPage(id)}>
                {label}
              </div>
            ))}
          </nav>

          <div className="controls">
            <div className="theme-pill">
              {['dark','light'].map(t => (
                <button key={t} className={`theme-opt${theme===t?' active':''}`} onClick={() => setTheme(t)}>
                  {t === 'dark'
                    ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> Koyu</>
                    : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2"/></svg> Açık</>
                  }
                </button>
              ))}
            </div>
            <button className="cta-btn" onClick={() => setPage('atlas')}>
              <MapIcon/> Atlası Aç
            </button>
          </div>
        </div>
      </header>

      {/* ── HOME ── */}
      {page === 'home' && (
        <div className="page-content" style={{flex:1,overflowY:'auto'}}>
          <section style={{position:'relative',minHeight:'calc(100vh - var(--nav-h))',overflow:'hidden',display:'flex',alignItems:'center'}}>
            {/* Arka plan görsel */}
            <div style={{
              position:'absolute',inset:0,
              backgroundImage:'url(/izmir_hero.png)',
              backgroundSize:'cover',
              backgroundPosition:'center 22%',
              backgroundRepeat:'no-repeat',
            }}/>
            {/* ── FİX 1: Tema bazlı sol overlay ── */}
            <div style={{
              position:'absolute',inset:0,
              background: heroOverlayLeft,
            }}/>
            {/* ── FİX 2: Tema bazlı alt overlay ── */}
            <div style={{
              position:'absolute',inset:0,
              background: heroOverlayBottom,
            }}/>
            {/* ── FİX 3: Hero içerik — tema bazlı metin rengi ── */}
            <div style={{
              position:'absolute',top:0,left:0,right:0,zIndex:2,
              maxWidth:1280,margin:'0 auto',padding:'80px 56px 0',
              width:'100%',
              color: heroTextColor,
            }}>
              <div style={{maxWidth:620}}>
                <div className="hero-eyebrow" style={{marginBottom:20, color: theme === 'light' ? 'var(--brand)' : undefined}}>
                  <span className="dot"/>
                  İklim Değişikliği · Temiz Enerji · DEÜ YBS 2026
                </div>
                <h1 className="hero-title" style={{fontSize:'clamp(2.2rem,3.8vw,3.4rem)',marginBottom:20, color: heroTextColor}}>
                  İzmir'in <em>yenilenebilir<br/>enerji potansiyeli</em><br/>tek harita üzerinde
                </h1>
                <p className="hero-sub" style={{fontSize:16,maxWidth:500,marginBottom:32, color: heroSubColor}}>
                  GES ve RES uygunluk analizleri; AHP çok kriterli karar destek ve PostGIS tabanlı mekânsal veri tabanı üzerinden tüm ilçeler için sunulmaktadır.
                </p>
                <div className="hero-actions" style={{marginBottom:36}}>
                  <button className="btn-primary" onClick={() => setPage('atlas')} style={{padding:'12px 24px',fontSize:14}}>
                    Atlası İncele <ArrowIcon/>
                  </button>
                </div>
              </div>
            </div>
            {/* Sağ alt — teknik badge'ler */}
            <div style={{position:'absolute',bottom:20,right:28,zIndex:2,display:'flex',gap:6}}>
              {['AHP','PostGIS','100m','EPSG:32635'].map(t=>(
                <span key={t} style={{
                  fontSize:9.5,fontWeight:700,
                  background: theme === 'light' ? 'rgba(248,250,252,0.82)' : 'rgba(6,10,20,0.75)',
                  backdropFilter:'blur(8px)',
                  color:'var(--brand)',padding:'5px 10px',borderRadius:999,
                  border:'1px solid rgba(14,165,164,0.25)',letterSpacing:'0.04em',
                }}>{t}</span>
              ))}
            </div>
          </section>

          {/* Stats ribbon */}
          <div className="ribbon">
            <div className="ribbon-grid">
              <div className="ribbon-card" onClick={() => goAtlas('GES')}>
                <div className="ic" style={{background:'rgba(245,158,11,0.14)',color:'var(--solar)'}}>
                  <SunIcon/>
                </div>
                <div className="label">GES Potansiyeli</div>
                <div className="val">
                  {gs ? (gs.toplam_mw/1000).toFixed(1) : '—'}<small>GW</small>
                </div>
                <div className="delta" style={{color:'var(--solar)'}}>
                  ↑ {gs ? gs.toplam_uygun_ha.toLocaleString('tr') : '—'} ha uygun alan
                </div>
              </div>
              <div className="ribbon-card" onClick={() => goAtlas('RES')}>
                <div className="ic" style={{background:'rgba(56,189,248,0.14)',color:'var(--wind)'}}>
                  <WindIcon/>
                </div>
                <div className="label">RES Potansiyeli</div>
                <div className="val">
                  {rs ? (rs.toplam_mw/1000).toFixed(1) : '—'}<small>GW</small>
                </div>
                <div className="delta" style={{color:'var(--wind)'}}>
                  ↑ {rs ? rs.toplam_uygun_ha.toLocaleString('tr') : '—'} ha uygun alan
                </div>
              </div>
              <div className="ribbon-card">
                <div className="ic" style={{background:'var(--brand-soft)',color:'var(--brand)'}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18M7 14l4-4 4 4 5-5"/></svg>
                </div>
                <div className="label">Analiz Edilen İlçe</div>
                <div className="val">28<small>ilçe</small></div>
                <div className="delta">↑ Tüm İzmir ili kapsandı</div>
              </div>
              <div className="ribbon-card">
                <div className="ic" style={{background:'var(--brand-soft)',color:'var(--brand)'}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
                </div>
                <div className="label">Kriter Sayısı</div>
                <div className="val">11<small>kriter</small></div>
                <div className="delta">↑ AHP ağırlıklı analiz</div>
              </div>
            </div>
          </div>

          {/* Categories */}
          <section className="section">
            <div className="section-head">
              <div>
                <div className="section-eyebrow">Analiz Kategorileri</div>
                <h2 className="section-title">Yenilenebilir kaynaklara göre uygunluk</h2>
                <p className="section-desc">AHP tabanlı çok kriterli mekânsal karar destek modeli; QGIS ve PostGIS altyapısı ile üretilmiş skorlar.</p>
              </div>
              <span className="section-link" onClick={() => setPage('atlas')}>Tüm atlasa git →</span>
            </div>
            <div className="cats">
              <div className="cat" style={{'--cat-color':'var(--solar)'}} onClick={() => goAtlas('GES')}>
                <div className="cat-arrow">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M7 17 17 7M9 7h8v8"/></svg>
                </div>
                <GESIllustration/>
                <div className="cat-icon" style={{background:'rgba(245,158,11,0.14)',color:'var(--solar)'}}><SolarPanelIcon/></div>
                <div className="cat-tag">Güneş Enerjisi</div>
                <div className="cat-name">GES Uygunluk Analizi</div>
                <div className="cat-desc">Solar radyasyon, eğim, bakı ve çevresel mesafe kriterleriyle güneş enerjisi kurulum alanları.</div>
                <div className="cat-stats">
                  <div className="cat-stat">
                    <div className="v">{gs ? gs.toplam_uygun_ha.toLocaleString('tr') : '…'} ha</div>
                    <div className="l">Uygun Alan</div>
                  </div>
                  <div className="cat-stat">
                    <div className="v">{gs ? gs.ort_skor : '…'}/5</div>
                    <div className="l">Ort. Skor</div>
                  </div>
                </div>
              </div>
              <div className="cat" style={{'--cat-color':'var(--wind)'}} onClick={() => goAtlas('RES')}>
                <div className="cat-arrow">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M7 17 17 7M9 7h8v8"/></svg>
                </div>
                <RESIllustration/>
                <div className="cat-icon" style={{background:'rgba(56,189,248,0.14)',color:'var(--wind)'}}><TurbineIcon/></div>
                <div className="cat-tag">Rüzgâr Enerjisi</div>
                <div className="cat-name">RES Uygunluk Analizi</div>
                <div className="cat-desc">Rüzgâr hızı (100m), yükseklik ve açık arazi kriterleriyle rüzgâr enerjisi kurulum alanları.</div>
                <div className="cat-stats">
                  <div className="cat-stat">
                    <div className="v">{rs ? rs.toplam_uygun_ha.toLocaleString('tr') : '…'} ha</div>
                    <div className="l">Uygun Alan</div>
                  </div>
                  <div className="cat-stat">
                    <div className="v">{rs ? rs.ort_skor : '…'}/5</div>
                    <div className="l">Ort. Skor</div>
                  </div>
                </div>
              </div>
              <div className="cat" style={{'--cat-color':'var(--brand)'}}>
                <svg width="100%" viewBox="0 0 280 160" style={{display:'block',marginBottom:12}}>
                  <ellipse cx="140" cy="152" rx="140" ry="16" fill="currentColor" opacity="0.06"/>
                  <rect x="100" y="8" width="80" height="28" rx="6" fill="none" stroke="var(--brand,#0EA5A4)" strokeWidth="1.2" opacity="0.7"/>
                  <text x="140" y="27" textAnchor="middle" fontSize="11" fontWeight="500" fill="var(--brand,#0EA5A4)" fontFamily="Manrope,sans-serif">Yer Seçimi</text>
                  {[
                    {x:20, label:'Solar', color:'#F59E0B'},
                    {x:78, label:'Eğim', color:'#10B981'},
                    {x:136, label:'Yerleşim', color:'#F472B6'},
                    {x:194, label:'ENH', color:'#FB923C'},
                  ].map((item,i) => (
                    <g key={i}>
                      <line x1="140" y1="36" x2={item.x+30} y2="68" stroke={item.color} strokeWidth="0.8" opacity="0.35"/>
                      <rect x={item.x} y="68" width="60" height="24" rx="5" fill={item.color} opacity="0.15" stroke={item.color} strokeWidth="1" opacity2="0.5"/>
                      <text x={item.x+30} y="84" textAnchor="middle" fontSize="10" fontWeight="500" fill={item.color} fontFamily="Manrope,sans-serif">{item.label}</text>
                    </g>
                  ))}
                  {[30, 100, 170, 230].map((x,i) => (
                    <g key={i}>
                      <rect x={x} y="112" width="42" height="20" rx="4" fill="none" stroke="var(--brand,#0EA5A4)" strokeWidth="0.8" opacity="0.4"/>
                      <text x={x+21} y="126" textAnchor="middle" fontSize="9" fill="var(--brand,#0EA5A4)" fontFamily="Manrope,sans-serif" opacity="0.7">Alan {i+1}</text>
                    </g>
                  ))}
                  {[
                    {x:20+30, w:0.32, color:'#F59E0B'},
                    {x:78+30, w:0.25, color:'#10B981'},
                    {x:136+30, w:0.20, color:'#F472B6'},
                    {x:194+30, w:0.15, color:'#FB923C'},
                  ].map((item,i) => (
                    <rect key={i} x={item.x-20} y="96" width={item.w*60} height="4" rx="2" fill={item.color} opacity="0.7"/>
                  ))}
                </svg>
                <div className="cat-icon" style={{background:'var(--brand-soft)'}}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.8"><path d="M3 3v18h18M7 14l4-4 4 4 5-5"/></svg>
                </div>
                <div className="cat-tag">Metodoloji</div>
                <div className="cat-name">AHP Çok Kriterli Analiz</div>
                <div className="cat-desc">Analitik Hiyerarşi Süreci (AHP) ile ağırlıklandırılmış 11 kriter, 100m çözünürlük, EPSG:32635.</div>
                <div className="cat-stats">
                  <div className="cat-stat"><div className="v">11</div><div className="l">Kriter</div></div>
                  <div className="cat-stat"><div className="v">100m</div><div className="l">Çözünürlük</div></div>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="footer">
            <div className="footer-inner">
              <div className="footer-brand">
                <div className="brand">
                  <div className="brand-mark" style={{width:32,height:32}}>
                    <svg viewBox="0 0 44 44" fill="none">
                      <circle cx="22" cy="22" r="20" stroke="var(--brand)" strokeWidth="1.5" strokeDasharray="2 3"/>
                      <path d="M22 8 C30 12 32 22 22 36 C12 22 14 12 22 8 Z" fill="var(--brand)" opacity="0.9"/>
                      <circle cx="22" cy="22" r="3" fill="var(--accent)"/>
                    </svg>
                  </div>
                  <div>
                    <div className="brand-name">YE·ATLAS</div>
                    <div className="brand-sub">Yenilenebilir Enerji Atlası</div>
                  </div>
                </div>
                <p className="footer-desc">İzmir Büyükşehir Belediyesi İklim Değişikliği ve Temiz Enerji Şube Müdürlüğü — DEÜ YBS Capstone Projesi 2026.</p>
                <div className="footer-copy">© 2026 İzmir Büyükşehir Belediyesi</div>
              </div>

              {/* ── FİX 4: Footer — tüm linkler navigasyon ile ── */}
              <div className="footer-col">
                <h4>Analizler</h4>
                <span className="footer-link" style={{cursor:'pointer'}} onClick={() => goAtlas('GES')}>GES Analizi</span>
                <span className="footer-link" style={{cursor:'pointer'}} onClick={() => goAtlas('RES')}>RES Analizi</span>
                <span className="footer-link" style={{cursor:'pointer'}} onClick={() => setPage('atlas')}>Birleşik Atlas</span>
                <span className="footer-link" style={{cursor:'pointer'}} onClick={() => setPage('raporlar')}>İlçe Karşılaştırma</span>
              </div>
              <div className="footer-col">
                <h4>Teknik</h4>
                <span className="footer-link" style={{cursor:'pointer'}}
                  onClick={() => window.open('https://qgis.org', '_blank')}>QGIS / PostGIS</span>
                <span className="footer-link" style={{cursor:'pointer'}}
                  onClick={() => window.open('https://www.sciencedirect.com/topics/engineering/analytic-hierarchy-process', '_blank')}>AHP Metodoloji</span>
                <span className="footer-link" style={{cursor:'pointer'}}
                  onClick={() => window.open('http://localhost:8003/docs', '_blank')}>API Dokümantasyonu</span>
              </div>
              <div className="footer-col">
                <h4>Veri</h4>
                <span className="footer-link" style={{cursor:'pointer'}}
                  onClick={() => window.open('https://globalsolaratlas.info', '_blank')}>Global Solar Atlas</span>
                <span className="footer-link" style={{cursor:'pointer'}}
                  onClick={() => window.open('https://globalwindatlas.info', '_blank')}>Global Wind Atlas</span>
                <span className="footer-link" style={{cursor:'pointer'}}
                  onClick={() => window.open('https://www.openstreetmap.org', '_blank')}>OSM / MTA / SRTM</span>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* ── ATLAS ── */}
      {(page === 'atlas' || page === 'ges' || page === 'res') && (
        <div style={{display:'flex',flexDirection:'column',minHeight:'calc(100vh - var(--nav-h))'}}>
          <div style={{display:'grid',gridTemplateColumns:'272px 1fr 272px',height:'calc(100vh - var(--nav-h))'}}>

            {/* ── SOL PANEL ── */}
            <aside className="analysis-sidebar" style={{borderRight:'1px solid var(--border)',overflowY:'auto'}}>
              <div className="sidebar-section">
                <div className="energy-toggle">
                  <button
                    className={`energy-btn${energyType==='GES'?' active':''}`}
                    onClick={() => setEnergy('GES')}
                    style={energyType==='GES'?{borderColor:'var(--solar)',background:'rgba(245,158,11,0.1)'}:{}}
                  >
                    <span className="icon" style={{color: energyType==='GES'?'var(--solar)':'var(--text-2)'}}>
                      <SolarPanelIcon size={28}/>
                    </span>
                    <span className="label">GES</span>
                    <span className="sub">Güneş</span>
                  </button>
                  <button
                    className={`energy-btn${energyType==='RES'?' active':''}`}
                    onClick={() => setEnergy('RES')}
                    style={energyType==='RES'?{borderColor:'var(--wind)',background:'rgba(56,189,248,0.1)'}:{}}
                  >
                    <span className="icon" style={{color: energyType==='RES'?'var(--wind)':'var(--text-2)'}}>
                      <TurbineIcon size={28}/>
                    </span>
                    <span className="label">RES</span>
                    <span className="sub">Rüzgâr</span>
                  </button>
                </div>
              </div>

              <div className="sidebar-section">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                  <div className="sidebar-label">AHP Ağırlıkları</div>
                  <div style={{
                    fontSize:9.5,fontWeight:600,padding:'3px 8px',borderRadius:999,
                    background:'var(--brand-soft)',color:'var(--brand)',
                    border:'1px solid rgba(14,165,164,0.25)',letterSpacing:'0.04em'
                  }}>
                    CR &lt; 0.10 ✓
                  </div>
                </div>
                <div style={{
                  fontSize:11,color:'var(--muted)',marginBottom:10,lineHeight:1.5,
                  padding:'7px 10px',background:'var(--surface-2)',borderRadius:8,
                  border:'1px solid var(--border)'
                }}>
                  Ağırlıklar Saaty AHP metodolojisiyle belirlendi, tutarlılık oranı doğrulandı.
                </div>

                {(energyType === 'GES' ? GES_CRITERIA : RES_CRITERIA).map(item => {
                  const weights = energyType==='GES' ? WEIGHTS_GES : WEIGHTS_RES;
                  const val = weights[item.id] ?? 0;
                  const total = Object.values(weights).reduce((a,b)=>a+b,0);
                  const pct = total > 0 ? Math.round((val/total)*100) : 0;
                  return (
                    <div key={item.id} style={{marginBottom:9}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <div style={{width:7,height:7,borderRadius:'50%',background:item.c,flexShrink:0}}/>
                          <span style={{fontSize:11.5,color:'var(--text-2)'}}>{item.k}</span>
                        </div>
                        <span style={{fontSize:11,fontWeight:700,color:item.c,fontFamily:'JetBrains Mono,monospace'}}>{pct}%</span>
                      </div>
                      <div style={{height:4,borderRadius:2,background:'var(--surface-2)',overflow:'hidden',position:'relative'}}>
                        <div style={{
                          height:'100%',width:`${pct}%`,
                          background:`linear-gradient(90deg, ${item.c}cc, ${item.c})`,
                          borderRadius:2,
                          transition:'width 0.4s ease',
                        }}/>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="sidebar-section">
                <div className="sidebar-label">Görünüm</div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <button className="tag" style={{cursor:'pointer'}} onClick={() => setCityFocus(f=>!f)}>
                    {cityFocus?'Uzaklaş':'Şehir Zoom'}
                  </button>
                </div>
              </div>

              <div className="sidebar-section">
                <div className="sidebar-label">Uygunluk Skalası</div>
                {[
                  {label:'Çok Uygun', range:'4.0–5.0', color:'#14803C'},
                  {label:'Uygun',     range:'3.0–4.0', color:'#4AA635'},
                  {label:'Orta',      range:'2.0–3.0', color:'#D97706'},
                  {label:'Düşük',     range:'1.0–2.0', color:'#B91C1C'},
                ].map(item => (
                  <div key={item.label} className="legend-item">
                    <div className="legend-dot" style={{background:item.color}}/>
                    <span className="legend-text">{item.label}</span>
                    <span className="legend-range">{item.range}</span>
                  </div>
                ))}
              </div>
            </aside>

            {/* ── ORTA: Harita ── */}
            <div style={{position:'relative',background:'var(--bg-2)',overflow:'hidden'}}>
              <div style={{
                position:'absolute',top:0,left:0,right:0,zIndex:10,
                background:'color-mix(in oklab, var(--surface) 90%, transparent)',
                backdropFilter:'blur(10px)',
                borderBottom:'1px solid var(--border)',
                padding:'8px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',
                fontSize:11,color:'var(--muted)',fontFamily:"'Manrope',sans-serif",
              }}>
                <span style={{fontWeight:600,color:'var(--text-2)'}}>Uygunluk Atlası — İzmir</span>
                <span>EPSG:32635 · 100m · AHP</span>
              </div>
              <MapView
                energyType={energyType}
                minScore={minScore}
                onStatsUpdate={handleStatsUpdate}
                onTerrainStats={() => {}}
                cityFocus={cityFocus}
                show3D={show3D}
                showSuitability={true}
                showSantral={false}
                flyToIlce={flyToIlce}
                senaryo={senaryo}
                selectedIlce={selectedIlce}
                onIlceClick={(ilce) => {
                  setSelectedIlce(ilce);
                  setFlyToIlce(null);
                  setTimeout(()=>setFlyToIlce(ilce+'_'+Date.now()),80);
                }}
              />
              <div style={{
                position:'absolute',bottom:16,left:16,zIndex:10,
                background:'color-mix(in oklab, var(--surface) 92%, transparent)',
                backdropFilter:'blur(8px)',
                border:'1px solid var(--border)',borderRadius:10,
                padding:'10px 14px',fontFamily:"'Manrope',sans-serif",
              }}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--muted)',marginBottom:7}}>
                  UYGUNLUK SKORU · {energyType}
                </div>
                <div style={{display:'flex',height:8,borderRadius:4,overflow:'hidden',width:160,marginBottom:5}}>
                  {['#B91C1C','#DC6B2E','#D97706','#4AA635','#14803C'].map((c,i) => (
                    <div key={i} style={{flex:1,height:'100%',background:c}}/>
                  ))}
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'var(--dim)'}}>
                  {['Düşük','','Orta','','Yüksek'].map((n,i) => <span key={i}>{n}</span>)}
                </div>
              </div>
            </div>

            {/* ── SAĞ PANEL ── */}
            <aside className="analysis-sidebar" style={{borderLeft:'1px solid var(--border)',overflowY:'auto'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:800,color:'var(--text)'}}>Sonuçlar</div>
                <div style={{fontSize:11,fontWeight:600,color:'var(--brand)'}}>İZMİR</div>
              </div>

              <div style={{
                background:'var(--surface-2)',
                border:'1px solid var(--border)',
                borderTop:`3px solid ${energyType==='GES'?'var(--solar)':'var(--wind)'}`,
                borderRadius:12,padding:14,marginBottom:14,
              }}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                  <div style={{color:energyType==='GES'?'var(--solar)':'var(--wind)'}}>
                    {energyType==='GES'?<SolarPanelIcon size={18}/>:<TurbineIcon size={18}/>}
                  </div>
                  <div style={{fontSize:12,fontWeight:700,color:'var(--text)'}}>İzmir Geneli</div>
                  <div style={{
                    fontSize:9.5,fontWeight:600,color:energyType==='GES'?'var(--solar)':'var(--wind)',
                    padding:'2px 7px',borderRadius:999,
                    background:energyType==='GES'?'rgba(245,158,11,0.12)':'rgba(56,189,248,0.12)',
                    marginLeft:'auto',
                  }}>{energyType}</div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {[
                    {
                      val: (((energyType==='GES'?gs?.toplam_uygun_ha:rs?.toplam_uygun_ha)||0)/100).toFixed(0),
                      unit: 'km²',
                      label: energyType==='GES'?'Güneşe Uygun Arazi':'Rüzgâra Uygun Arazi',
                    },
                    {
                      val: (((energyType==='GES'?gs?.toplam_mw:rs?.toplam_mw)||0)/1000).toFixed(1),
                      unit: 'GW',
                      label: 'Tahmini Kurulu Güç',
                    },
                    {
                      val: (energyType==='GES'?gs?.ort_skor:rs?.ort_skor)||'—',
                      unit: '/5',
                      label: 'AHP Ort. Uygunluk Skoru',
                    },
                    {
                      val: '28',
                      unit: 'ilçe',
                      label: 'Analiz Edilen İlçe',
                    },
                  ].map(({val,unit,label},i) => (
                    <div key={i} style={{background:'rgba(0,0,0,0.18)',borderRadius:9,padding:'10px 12px'}}>
                      <div style={{display:'flex',alignItems:'baseline',gap:3,marginBottom:4}}>
                        <div style={{fontSize:20,fontWeight:800,color:'var(--text)',lineHeight:1}}>{val}</div>
                        <div style={{fontSize:11,fontWeight:600,color:'var(--muted)'}}>{unit}</div>
                      </div>
                      <div style={{fontSize:10,color:'var(--text-2)',lineHeight:1.35}}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sidebar-section">
                <div className="sidebar-label">İlçeye Git</div>
                <div style={{display:'flex',gap:6}}>
                  <select value={selectedIlce} onChange={e=>{
                    const v=e.target.value; setSelectedIlce(v);
                    if(v){ setFlyToIlce(null); setTimeout(()=>setFlyToIlce(v+'_'+Date.now()),80); }
                  }} style={{
                    flex:1,padding:'8px 10px',borderRadius:9,
                    border:'1px solid var(--border)',background:'var(--card)',color:'var(--text)',
                    fontFamily:'inherit',fontSize:12.5,cursor:'pointer',
                  }}>
                    <option value="">— İlçe seç —</option>
                    {ilceler.map(n=><option key={n} value={n}>{n}</option>)}
                  </select>
                  <button onClick={()=>{ if(selectedIlce){ setFlyToIlce(null); setTimeout(()=>setFlyToIlce(selectedIlce+'_'+Date.now()),100); }}} style={{
                    padding:'8px 12px',borderRadius:9,
                    background:'var(--brand-soft)',border:'1px solid rgba(14,165,164,0.3)',
                    color:'var(--brand)',fontFamily:'inherit',fontSize:12,fontWeight:700,cursor:'pointer',
                  }}>↗</button>
                </div>
                {selectedIlce && (
                  <button onClick={()=>{setSelectedIlce('');setIlceDetay(null);setFlyToIlce(null);}} style={{
                    marginTop:5,width:'100%',padding:'5px',borderRadius:7,
                    border:'1px solid var(--border)',background:'transparent',
                    color:'var(--muted)',fontFamily:'inherit',fontSize:11,cursor:'pointer',
                  }}>✕ Seçimi temizle</button>
                )}
              </div>

              {ilceLoading && (
                <div style={{textAlign:'center',padding:'16px',color:'var(--muted)',fontSize:12}}>
                  <div style={{width:16,height:16,border:'2px solid var(--surface-2)',borderTopColor:'var(--brand)',
                    borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto 8px'}}/>
                  Yükleniyor…
                </div>
              )}
              {ilceDetay && !ilceLoading && (() => {
                const d = ilceDetay;
                const skor = d.skor_ort || 0;
                const renk = skor>=4?'#14803C':skor>=3?'#4AA635':skor>=2?'#D97706':'#B91C1C';
                const pct = (skor/5)*100;
                return (
                  <div style={{
                    background:'var(--surface-2)',
                    border:`1px solid ${renk}40`,
                    borderTop:`3px solid ${renk}`,
                    borderRadius:12,padding:14,
                    display:'flex',flexDirection:'column',gap:10,
                    animation:'fadeIn 0.25s ease',
                  }}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'start'}}>
                      <div>
                        <div style={{fontSize:16,fontWeight:800,color:renk}}>{d.ilce}</div>
                        <div style={{fontSize:10,color:'var(--muted)',marginTop:1}}>{energyType} · Varsayılan AHP</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:26,fontWeight:800,color:renk,lineHeight:1}}>{skor.toFixed(2)}</div>
                        <div style={{fontSize:9,color:'var(--muted)'}}>/5.00</div>
                      </div>
                    </div>
                    <div style={{height:5,borderRadius:3,background:'rgba(255,255,255,0.06)',overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${pct}%`,background:renk,borderRadius:3,transition:'width 0.6s ease'}}/>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                      {[
                        {label:'Uygun Arazi',   val: `${Number(d.uygun_alan_ha||0).toLocaleString('tr')} ha`},
                        {label:'Kurulu Güç',     val: `${Number(d.tahmini_mw||0).toFixed(0)} MW`},
                        {label:'En Düşük Skor', val: d.skor_min?.toFixed(2)||'—'},
                        {label:'En Yüksek Skor',val: d.skor_max?.toFixed(2)||'—'},
                      ].map(({label,val})=>(
                        <div key={label} style={{background:'rgba(0,0,0,0.2)',borderRadius:7,padding:'8px 10px'}}>
                          <div style={{fontSize:10,color:'var(--text-2)',marginBottom:3,lineHeight:1.3}}>{label}</div>
                          <div style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>{val}</div>
                        </div>
                      ))}
                    </div>
                    <button onClick={()=>setPage('raporlar')} style={{
                      padding:'9px',borderRadius:8,border:'1px solid rgba(14,165,164,0.3)',
                      background:'var(--brand-soft)',color:'var(--brand)',
                      fontFamily:'inherit',fontSize:12,fontWeight:700,cursor:'pointer',
                      display:'flex',alignItems:'center',justifyContent:'center',gap:6,
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M7 17 17 7M9 7h8v8"/></svg>
                      Detaylı Raporu Aç
                    </button>
                  </div>
                );
              })()}

              {havaDetay && !ilceLoading && (
                <div style={{
                  background:'var(--surface-2)',
                  border:'1px solid var(--border)',
                  borderRadius:12,padding:14,
                  animation:'fadeIn 0.3s ease',
                }}>
                  <div style={{display:'flex',justifyContent:'space-between',
                    alignItems:'center',marginBottom:12}}>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--text)'}}>
                      Anlık Hava · Open-Meteo
                    </div>
                    <div style={{fontSize:9,color:'var(--muted)',
                      background:'var(--surface)',padding:'2px 7px',
                      borderRadius:999,border:'1px solid var(--border)'}}>
                      {havaDetay.anlik.zaman.slice(11,16)}
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:12}}>
                    {(energyType==='GES' ? [
                      {icon:'☀',label:'Solar Radyasyon',val:`${havaDetay.anlik.solar_wm2} W/m²`,color:'#F59E0B',bar:Math.min(havaDetay.anlik.solar_wm2/1000,1)},
                      {icon:'☁',label:'Bulutluluk',val:`%${havaDetay.anlik.bulutluluk}`,color:'#94A3B8',bar:havaDetay.anlik.bulutluluk/100},
                      {icon:'🌡',label:'Sıcaklık',val:`${havaDetay.anlik.sicaklik}°C`,color:'#F472B6',bar:Math.min((havaDetay.anlik.sicaklik+10)/50,1)},
                      {icon:'💨',label:'Rüzgâr (10m)',val:`${havaDetay.anlik.ruzgar_10m} km/h`,color:'#38BDF8',bar:Math.min(havaDetay.anlik.ruzgar_10m/30,1)},
                    ] : [
                      {icon:'💨',label:'Rüzgâr (100m)',val:`${havaDetay.anlik.ruzgar_100m} km/h`,color:'#38BDF8',bar:Math.min(havaDetay.anlik.ruzgar_100m/50,1)},
                      {icon:'🧭',label:'Rüzgâr Yönü',val:`${havaDetay.anlik.ruzgar_yon}°`,color:'#0EA5A4',bar:havaDetay.anlik.ruzgar_yon/360},
                      {icon:'🌡',label:'Sıcaklık',val:`${havaDetay.anlik.sicaklik}°C`,color:'#F472B6',bar:Math.min((havaDetay.anlik.sicaklik+10)/50,1)},
                      {icon:'☁',label:'Bulutluluk',val:`%${havaDetay.anlik.bulutluluk}`,color:'#94A3B8',bar:havaDetay.anlik.bulutluluk/100},
                    ]).map(({icon,label,val,color,bar})=>(
                      <div key={label} style={{background:'var(--surface)',borderRadius:8,padding:'8px 10px'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                          <span style={{fontSize:10,color:'var(--muted)'}}>{icon} {label}</span>
                        </div>
                        <div style={{fontSize:13,fontWeight:700,color,fontFamily:'JetBrains Mono,monospace',marginBottom:4}}>{val}</div>
                        <div style={{height:3,borderRadius:2,background:'var(--surface-2)',overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${bar*100}%`,background:color,borderRadius:2,transition:'width 0.6s'}}/>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:9.5,fontWeight:700,color:'var(--muted)',
                    marginBottom:7,textTransform:'uppercase',letterSpacing:'0.06em'}}>
                    7 Günlük Tahmin
                  </div>
                  <div style={{display:'flex',gap:3,alignItems:'flex-end',height:52}}>
                    {havaDetay.tahmin_7gun.map((g,i)=>{
                      const solarH = Math.max((g.max_solar/1000)*40,2);
                      const windH  = Math.max((g.max_wind/50)*40,2);
                      const gun = new Date(g.tarih).toLocaleDateString('tr',{weekday:'short'});
                      return(
                        <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                          <div style={{display:'flex',gap:1,alignItems:'flex-end',height:40}}>
                            <div style={{width:6,height:solarH,borderRadius:'2px 2px 0 0',background:'#F59E0B',opacity:0.8}} title={`Solar: ${g.max_solar} W/m²`}/>
                            <div style={{width:6,height:windH,borderRadius:'2px 2px 0 0',background:'#38BDF8',opacity:0.8}} title={`Rüzgâr: ${g.max_wind} km/h`}/>
                          </div>
                          <div style={{fontSize:8,color:'var(--dim)',textTransform:'capitalize'}}>{gun}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{display:'flex',gap:10,marginTop:7}}>
                    <div style={{display:'flex',alignItems:'center',gap:4,fontSize:9,color:'var(--muted)'}}>
                      <div style={{width:8,height:8,borderRadius:1,background:'#F59E0B'}}/>Solar max
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:4,fontSize:9,color:'var(--muted)'}}>
                      <div style={{width:8,height:8,borderRadius:1,background:'#38BDF8'}}/>Rüzgâr max
                    </div>
                  </div>
                </div>
              )}

              <div className="sidebar-section" style={{ display:'flex', flexDirection:'column', flex:1, minHeight: 0 }}>
                <div className="sidebar-label" style={{ marginBottom: 8 }}>İlçe Sıralaması ({rankedDistricts.length})</div>
                <div className="scroll-styled" style={{ overflowY: 'auto', maxHeight: '420px', paddingRight: '4px' }}>
                  {rankedDistricts.map((item, i) => {
                    const ilce = item.ilce;
                    const skor = item.skor;
                    const renk = skor >= 4.0 ? '#16a34a' : skor >= 3.0 ? '#84cc16' : skor >= 2.0 ? '#f59e0b' : '#ef4444';
                    const isSelected = selectedIlce === ilce;
                    return (
                      <div key={ilce}
                        style={{
                          display:'flex',alignItems:'center',gap:10,
                          padding:'6px 8px',borderRadius:8,
                          borderBottom:'1px solid rgba(255,255,255,0.04)',
                          cursor:'pointer',
                          background:isSelected?'var(--brand-soft)':'transparent',
                          transition:'background 0.15s',
                        }}
                        onClick={()=>{
                          setSelectedIlce(ilce);
                          setFlyToIlce(null);
                          setTimeout(()=>setFlyToIlce(ilce+'_'+Date.now()),80);
                        }}>
                        <span style={{fontSize:10,fontWeight:700,color:'var(--muted)',width:16,textAlign:'right'}}>
                          {String(i+1).padStart(2,'0')}
                        </span>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                            <span style={{fontSize:12.5,fontWeight:600,color:isSelected?'var(--brand)':'var(--text)'}}>{ilce}</span>
                            <span style={{fontSize:12,fontWeight:800,color:renk}}>{skor.toFixed(2)}</span>
                          </div>
                          <div style={{height:3,borderRadius:2,background:'rgba(255,255,255,0.05)',overflow:'hidden'}}>
                            <div style={{height:'100%',width:`${(skor/5)*100}%`,background:renk,borderRadius:2}}/>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* ── RAPORLAR ── */}
      {page === 'raporlar' && (
        <div className="page-content" style={{flex:1,overflowY:'auto'}}>
          <IlceKarsilastirma energyType={energyType} initialIlce={selectedIlce}/>
        </div>
      )}

      {page === 'santraller' && (
        <Santraller/>
      )}
    </div>
  );
}