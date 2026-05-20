import { useState, useEffect, useMemo, useCallback } from 'react';
import MiniMap from './MiniMap';
import PdfButton from './PdfButton';

/* ─── sabitler ──────────────────────────────────────────────── */
const KRITER_META = {
  solar:    {ad:'Solar Radyasyon',  renk:'#F59E0B', ikon:'☀'},
  ruzgar:   {ad:'Rüzgâr Hızı',      renk:'#38BDF8', ikon:'💨'},
  egim:     {ad:'Eğim & Bakı',      renk:'#10B981', ikon:'⛰'},
  baki:     {ad:'Bakı',             renk:'#A78BFA', ikon:'🧭'},
  yukseklik:{ad:'Yükseklik',        renk:'#FDE68A', ikon:'📏'},
  arazi:    {ad:'Arazi Kullanımı',  renk:'#60A5FA', ikon:'🌿'},
  yerlesim: {ad:'Yerleşim Uzaklık', renk:'#F472B6', ikon:'🏘'},
  yol:      {ad:'Yola Yakınlık',    renk:'#34D399', ikon:'🛣'},
  akarsu:   {ad:'Akarsu Uzaklığı',  renk:'#67E8F9', ikon:'💧'},
  enerji:   {ad:'ENH Yakınlığı',    renk:'#FB923C', ikon:'⚡'},
  fay:      {ad:'Fay Uzaklığı',     renk:'#94A3B8', ikon:'🏔'},
};
const COLORS = ['#F59E0B','#22D3EE','#A78BFA','#34D399'];
const S_RENK = {
  5: '#1B5E20',  // koyu yeşil — Çok Uygun
  4: '#66BB6A',  // orta yeşil — Uygun
  3: '#FFB300',  // koyu sarı  — Orta
  2: '#FF6600',  // saf turuncu — Düşük
  1: '#CC0000',  // koyu kırmızı — Uygunsuz
};
const S_AD   = {5:'Çok Uygun',4:'Uygun',3:'Orta',2:'Düşük',1:'Uygunsuz'};
const trSort = (a,b)=>a.localeCompare(b,'tr',{sensitivity:'base'});

const skorRenk = s => s>=4?'#1B5E20':s>=3?'#66BB6A':s>=2?'#FFB300':'#CC0000';

function Gauge({skor=0,color,size=72}){
  const p=((skor)/5)*251.2;
  return(
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="8"/>
      <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${p} 251.2`} strokeDashoffset="62.8" strokeLinecap="round"/>
      <text x="50" y="47" textAnchor="middle" fontSize="17" fontWeight="800"
        fill={color} fontFamily="Manrope,sans-serif">{skor.toFixed(2)}</text>
      <text x="50" y="62" textAnchor="middle" fontSize="8" fill="#999"
        fontFamily="Manrope,sans-serif">/5</text>
    </svg>
  );
}

function Donut({sinifD={},size=130}){
  const cx=size/2,cy=size/2,R=cx*0.72,r=cx*0.44;
  const slices=[5,4,3,2,1].map(s=>({s,v:Number(sinifD[String(s)]||0),c:S_RENK[s]}));
  const total=slices.reduce((a,b)=>a+b.v,0)||1;
  let ang=-Math.PI/2;
  const paths=slices.map(({s,v,c},i)=>{
    const a=(v/total)*2*Math.PI;
    if(a<0.025){ang+=a;return null;}
    const x1=cx+R*Math.cos(ang),y1=cy+R*Math.sin(ang);
    const x2=cx+R*Math.cos(ang+a),y2=cy+R*Math.sin(ang+a);
    const xi1=cx+r*Math.cos(ang),yi1=cy+r*Math.sin(ang);
    const xi2=cx+r*Math.cos(ang+a),yi2=cy+r*Math.sin(ang+a);
    const lg=a>Math.PI?1:0;
    const path=<path key={i}
      d={`M${x1},${y1}A${R},${R},0,${lg},1,${x2},${y2}L${xi2},${yi2}A${r},${r},0,${lg},0,${xi1},${yi1}Z`}
      fill={c} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"/>;
    ang+=a;
    return path;
  });
  return(
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths}
      <circle cx={cx} cy={cy} r={r-1} fill="var(--card)"/>
      <text x={cx} y={cy-5} textAnchor="middle" fontSize={size*0.115}
        fontWeight="800" fill="var(--text)" fontFamily="Manrope,sans-serif">
        {total.toLocaleString('tr')}
      </text>
      <text x={cx} y={cy+11} textAnchor="middle" fontSize={size*0.072}
        fill="var(--muted)" fontFamily="Manrope,sans-serif">ha toplam</text>
    </svg>
  );
}

function IlceKart({data,mwRow,color,showMap,et,onRemove,canRemove}){
  const [extremes,      setExtremes]      = useState(null);
  const [extremesError, setExtremesError] = useState(false);
  const [highlightPoint,setHighlightPoint]= useState(null);

  useEffect(()=>{
    if(!data?.ilce) return;
    setExtremes(null);
    setExtremesError(false);
    setHighlightPoint(null);
    fetch(`/api/${et.toLowerCase()}/district/${encodeURIComponent(data.ilce)}/extremes`)
      .then(r=>{ if(!r.ok) throw new Error('not found'); return r.json(); })
      .then(d=>setExtremes(d))
      .catch(()=>setExtremesError(true));
  },[data?.ilce, et]);

  const flyTo = (type) => {
    if(!extremes) return;
    const pt = extremes[type];
    setHighlightPoint({ lon:pt.lon, lat:pt.lat, sinif:pt.sinif, alan_ha:pt.alan_ha, label:type });
  };
  if(!data) return(
    <div style={{background:'var(--card)',border:`1.5px solid ${color}25`,borderRadius:16,
      padding:24,display:'flex',flexDirection:'column',alignItems:'center',
      justifyContent:'center',gap:10,minHeight:240}}>
      <div style={{width:20,height:20,border:`2px solid ${color}30`,
        borderTopColor:color,borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
      <span style={{color:'var(--muted)',fontSize:13}}>Yükleniyor…</span>
    </div>
  );
  const skor=data.skor_ort||0;
  const renk=skorRenk(skor);
  const tot=Object.values(data.sinif_dagilim||{}).reduce((a,b)=>a+Number(b),0)||1;

  return(
    <div style={{
      background:'var(--card)',
      border:`1.5px solid ${color}30`,
      borderRadius:16,overflow:'hidden',
      boxShadow:'0 4px 24px rgba(0,0,0,0.22)',
      display:'flex',flexDirection:'column',
    }}>
      {/* ── Başlık ── */}
      <div style={{
        background:`linear-gradient(135deg,${color}20,${color}08)`,
        borderBottom:`1.5px solid ${color}20`,
        padding:'16px 20px',
        display:'flex',justifyContent:'space-between',alignItems:'center',
      }}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:'var(--text)',marginBottom:4}}>{data.ilce}</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <span style={{
              fontSize:11,fontWeight:600,color,
              background:`${color}15`,border:`1px solid ${color}30`,
              padding:'2px 8px',borderRadius:999,
            }}>{et}</span>
            {mwRow && <>
              <span style={{fontSize:11,color:'var(--muted)'}}>
                {mwRow.kurulu_mw.toFixed(0)} MW kurulu güç
              </span>
              <span style={{fontSize:11,color:'var(--muted)'}}>·</span>
              <span style={{fontSize:11,color:'var(--muted)'}}>
                {(mwRow.yillik_mwh/1000).toFixed(1)} GWh/yıl
              </span>
            </>}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <Gauge skor={skor} color={renk} size={88}/>
          {canRemove&&(
            <button onClick={onRemove} style={{
              width:26,height:26,borderRadius:'50%',
              border:'1.5px solid var(--border)',background:'var(--surface)',
              color:'var(--muted)',cursor:'pointer',fontSize:14,
              display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
            }}>×</button>
          )}
        </div>
      </div>

      {/* ── Harita ── */}
      {showMap && (
        <div style={{position:'relative',height:300,overflow:'hidden',flexShrink:0}}>
          <MiniMap ilceAdi={data.ilce} energyType={et} color={color} height={300} highlightPoint={highlightPoint}/>
        </div>
      )}

      {/* ── Sınıf dağılımı ── */}
      <div style={{padding:'16px 20px',borderBottom:'1px solid var(--border)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.08em',
            textTransform:'uppercase',color:'var(--muted)'}}>Sınıf Dağılımı</div>
          <div style={{display:'flex',alignItems:'center',gap:6,fontSize:9,color:'var(--dim)'}}>
            <span style={{color:'#B91C1C'}}>1 Düşük</span>
            <span>→</span>
            <span style={{color:'#14803C'}}>5 Yüksek</span>
          </div>
        </div>

        {/* Stacked bar — soldan sağa 1→5 */}
        <div style={{display:'flex',height:10,borderRadius:5,overflow:'hidden',marginBottom:12,gap:1}}>
          {[1,2,3,4,5].map(s=>{
            const ha=Number(data.sinif_dagilim?.[String(s)]||0);
            const pct=(ha/tot)*100;
            if(pct<0.3) return null;
            return(
              <div key={s} title={`${S_AD[s]}: ${ha.toLocaleString('tr')} ha (%${pct.toFixed(1)})`}
                style={{flex:`${pct} 0 0`,background:S_RENK[s],transition:'flex 0.6s'}}/>
            );
          })}
        </div>

        {/* Sınıf kartları — 1→5 soldan sağa */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:5}}>
          {[1,2,3,4,5].map(s=>{
            const ha=Number(data.sinif_dagilim?.[String(s)]||0);
            const pct=tot>0?(ha/tot)*100:0;
            const isEmpty=ha===0;
            return(
              <div key={s} style={{
                borderRadius:9,padding:'9px 6px',textAlign:'center',
                background:isEmpty?'var(--surface-2)':`${S_RENK[s]}14`,
                border:`1.5px solid ${isEmpty?'var(--border)':S_RENK[s]+'40'}`,
                opacity:isEmpty?0.35:1,
                transition:'opacity 0.2s',
              }}>
                {/* Renk göstergesi */}
                <div style={{
                  width:20,height:5,borderRadius:3,
                  background:isEmpty?'var(--dim)':S_RENK[s],
                  margin:'0 auto 6px',
                }}/>
                <div style={{fontSize:9.5,fontWeight:700,color:isEmpty?'var(--dim)':S_RENK[s],
                  marginBottom:3,whiteSpace:'nowrap'}}>{S_AD[s]}</div>
                <div style={{fontSize:13,fontWeight:800,
                  color:isEmpty?'var(--dim)':'var(--text)',
                  fontFamily:'JetBrains Mono,monospace',lineHeight:1}}>
                  {isEmpty?'—':pct.toFixed(1)+'%'}
                </div>
                {!isEmpty&&(
                  <div style={{fontSize:9,color:'var(--muted)',marginTop:3,
                    fontFamily:'JetBrains Mono,monospace'}}>
                    {ha>=1000?(ha/1000).toFixed(1)+'k':ha.toLocaleString('tr')} ha
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── KPI grid ── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',
        borderBottom:'1px solid var(--border)'}}>
        <div style={{padding:'11px 14px',borderRight:'1px solid var(--border)'}}>
          <div style={{fontSize:9.5,color:'var(--muted)',textTransform:'uppercase',
            letterSpacing:'0.06em',marginBottom:3}}>Uygun Arazi</div>
          <div style={{fontSize:14,fontWeight:700,color:'var(--text)',
            fontFamily:'JetBrains Mono,monospace'}}>
            {Number(data.uygun_alan_ha||0).toLocaleString('tr')} ha
          </div>
        </div>
        {/* En Düşük — tıklanınca haritada göster */}
        <div onClick={()=>extremes && flyTo('min')} style={{
          padding:'11px 14px',borderRight:'1px solid var(--border)',
          cursor: extremes?'pointer':'default',
          transition:'background 0.15s',
          background: highlightPoint?.label==='min'?'rgba(185,28,28,0.08)':'transparent',
        }}
          onMouseEnter={e=>{ if(extremes) e.currentTarget.style.background='rgba(185,28,28,0.06)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.background=highlightPoint?.label==='min'?'rgba(185,28,28,0.08)':'transparent'; }}
        >
          <div style={{fontSize:9.5,color:'var(--muted)',textTransform:'uppercase',
            letterSpacing:'0.06em',marginBottom:3,display:'flex',alignItems:'center',gap:4}}>
            {extremes ? `En Düşük (Sınıf ${extremes.true_min_sinif})` : 'En Düşük Skor'}
            {extremes && <span style={{color:'#B91C1C',fontSize:9}}>▼ gör</span>}
          </div>
          <div style={{fontSize:14,fontWeight:700,
            color: highlightPoint?.label==='min'?'#DC6B2E':'var(--text)',
            fontFamily:'JetBrains Mono,monospace'}}>
            {(data.skor_min||0).toFixed(2)}
          </div>
          {extremesError && (
            <div style={{fontSize:9,color:'var(--dim)',marginTop:2}}>bölge verisi yok</div>
          )}
        </div>
        {/* En Yüksek — tıklanınca haritada göster */}
        <div onClick={()=>extremes && flyTo('max')} style={{
          padding:'11px 14px',
          cursor: extremes?'pointer':'default',
          transition:'background 0.15s',
          background: highlightPoint?.label==='max'?'rgba(20,128,60,0.08)':'transparent',
        }}
          onMouseEnter={e=>{ if(extremes) e.currentTarget.style.background='rgba(20,128,60,0.06)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.background=highlightPoint?.label==='max'?'rgba(20,128,60,0.08)':'transparent'; }}
        >
          <div style={{fontSize:9.5,color:'var(--muted)',textTransform:'uppercase',
            letterSpacing:'0.06em',marginBottom:3,display:'flex',alignItems:'center',gap:4}}>
            {extremes ? `En Yüksek (Sınıf ${extremes.true_max_sinif})` : 'En Yüksek Skor'}
            {extremes && <span style={{color:'#14803C',fontSize:9}}>▲ gör</span>}
          </div>
          <div style={{fontSize:14,fontWeight:700,
            color: highlightPoint?.label==='max'?'#4AA635':'var(--text)',
            fontFamily:'JetBrains Mono,monospace'}}>
            {(data.skor_max||0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* ── PDF ── */}
      <div style={{padding:'12px 16px'}}>
        <PdfButton ilceAdi={data.ilce} energyType={et}/>
      </div>
    </div>
  );
}

function MahallePaneli({ilceAdi,et,color}){
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(false);
  const [done,setDone]=useState('');
  const [selectedMahalle,setSelectedMahalle]=useState(null);
  const [mapCenter,setMapCenter]=useState(null);

  const load=()=>{
    if(!ilceAdi||done===ilceAdi+et) return;
    setLoading(true);
    fetch(`/api/mahalle/${encodeURIComponent(ilceAdi)}?enerji=${et}`)
      .then(r=>r.ok?r.json():null).then(d=>{setData(d);setDone(ilceAdi+et);})
      .catch(()=>setData(null)).finally(()=>setLoading(false));
  };

  useEffect(()=>{ load(); },[ilceAdi,et]);

  const sorted=useMemo(()=>{
    if(!data?.features) return [];
    return [...data.features].sort((a,b)=>(b.properties.skor_ort||0)-(a.properties.skor_ort||0));
  },[data]);

  const handleMahalleClick=(feat,i)=>{
    setSelectedMahalle(i);
    try{
      const coords=[];
      const flat=(a)=>{ if(typeof a[0]==='number'){coords.push(a);return;} a.forEach(flat); };
      flat(feat.geometry.coordinates);
      const lons=coords.map(c=>c[0]),lats=coords.map(c=>c[1]);
      const minLon=Math.min(...lons),maxLon=Math.max(...lons);
      const minLat=Math.min(...lats),maxLat=Math.max(...lats);
      const dMax=Math.max(maxLon-minLon,maxLat-minLat)||0.01;
      const zoom=Math.min(Math.log2(0.8/dMax)+7,15);
      setMapCenter({
        lon:(minLon+maxLon)/2,
        lat:(minLat+maxLat)/2,
        zoom,
        sinif:Math.round(feat.properties.skor_ort||3),
        alan_ha:feat.properties.uygun_alan_ha||0,
        label:'mahalle',
      });
    }catch(e){}
  };

  return(
    <div style={{background:'var(--card)',border:`1.5px solid ${color}25`,
      borderRadius:14,overflow:'hidden',boxShadow:'var(--shadow)'}}>
      {/* Başlık */}
      <div style={{background:`${color}10`,borderBottom:`1px solid ${color}20`,
        padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>{ilceAdi}</div>
          <div style={{fontSize:10,color:'var(--muted)',marginTop:1}}>
            {loading?'Yükleniyor…':data?`${data.meta?.n_mahalle||0} mahalle`:'OSM · mahalle bazlı'}
          </div>
        </div>
        {loading&&<div style={{width:14,height:14,border:`2px solid ${color}30`,
          borderTopColor:color,borderRadius:'50%',animation:'spin .8s linear infinite'}}/>}
      </div>

      {/* Sol harita + Sağ tablo */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',minHeight:380}}>
        {/* Harita */}
        <div style={{position:'relative',borderRight:`1px solid var(--border)`}}>
          <MiniMap ilceAdi={ilceAdi} energyType={et} color={color}
            height={380} highlightPoint={mapCenter}
            mahalleFeature={selectedMahalle!==null ? sorted[selectedMahalle] : null}/>
          {selectedMahalle!==null&&sorted[selectedMahalle]&&(
            <div style={{position:'absolute',bottom:8,left:8,zIndex:10,
              background:'rgba(6,10,20,0.92)',backdropFilter:'blur(8px)',
              border:`1px solid ${color}50`,borderRadius:8,padding:'7px 11px',maxWidth:170}}>
              <div style={{fontSize:9.5,fontWeight:700,color,textTransform:'uppercase',
                letterSpacing:'0.05em',marginBottom:2}}>Seçili</div>
              <div style={{fontSize:12,fontWeight:700,color:'var(--text)',marginBottom:2,
                overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {sorted[selectedMahalle].properties.mahalle}
              </div>
              <div style={{fontSize:12,fontWeight:800,fontFamily:'JetBrains Mono,monospace',
                color:skorRenk(sorted[selectedMahalle].properties.skor_ort||0)}}>
                {(sorted[selectedMahalle].properties.skor_ort||0).toFixed(2)} / 5
              </div>
            </div>
          )}
        </div>

        {/* Tablo */}
        <div style={{overflowY:'auto',maxHeight:380}}>
          {sorted.length===0&&!loading&&(
            <div style={{textAlign:'center',padding:'32px',color:'var(--muted)',fontSize:12}}>
              {done?'OSM mahalle verisi bulunamadı.':'Yükleniyor…'}
            </div>
          )}
          {sorted.length>0&&(
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr style={{background:'var(--surface)',position:'sticky',top:0}}>
                {['#','Mahalle','Skor','Ha','MW'].map(h=>(
                  <th key={h} style={{padding:'9px 10px',textAlign:h==='Mahalle'?'left':'center',
                    fontSize:9.5,fontWeight:700,letterSpacing:'0.07em',color:'var(--muted)',
                    textTransform:'uppercase',borderBottom:'1px solid var(--border)'}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {sorted.slice(0,30).map((f,i)=>{
                  const p=f.properties,s=p.skor_ort||0;
                  const rc=skorRenk(s);
                  const isSel=selectedMahalle===i;
                  return(
                    <tr key={i} onClick={()=>handleMahalleClick(f,i)}
                      style={{borderBottom:'1px solid var(--border)',
                        background:isSel?`${color}15`:'transparent',
                        cursor:'pointer',transition:'background 0.12s'}}
                      onMouseEnter={e=>{ if(!isSel) e.currentTarget.style.background='var(--surface-2)'; }}
                      onMouseLeave={e=>{ e.currentTarget.style.background=isSel?`${color}15`:'transparent'; }}>
                      <td style={{padding:'7px 10px',textAlign:'center',
                        color:isSel?color:'var(--dim)',fontSize:10,fontWeight:isSel?700:400}}>{i+1}</td>
                      <td style={{padding:'7px 10px',fontWeight:isSel?700:500,
                        color:isSel?color:'var(--text)'}}>{p.mahalle}</td>
                      <td style={{padding:'7px 10px',textAlign:'center'}}>
                        <span style={{fontWeight:800,color:rc,
                          fontFamily:'JetBrains Mono,monospace'}}>{s.toFixed(2)}</span>
                      </td>
                      <td style={{padding:'7px 10px',textAlign:'center',
                        color:'var(--text-2)',fontFamily:'JetBrains Mono,monospace',fontSize:11}}>
                        {(p.uygun_alan_ha||0).toLocaleString('tr')}
                      </td>
                      <td style={{padding:'7px 10px',textAlign:'center',
                        color:'#0EA5A4',fontFamily:'JetBrains Mono,monospace',fontSize:11}}>
                        {(p.tahmini_mw||0).toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Ana Bileşen ─────────────────────────────────────────────── */
export default function IlceKarsilastirma({ energyType='GES', initialIlce='' }) {
  const [ilceler,    setIlceler]    = useState([]);
  const [secilenler, setSecilenler] = useState([]);
  const [dataMap,    setDataMap]    = useState({});
  const [mwData,     setMwData]     = useState(null);
  const [mlData,     setMlData]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [et,         setEt]         = useState(energyType);
  const [tab,        setTab]        = useState('kart');
  const [showMap,    setShowMap]    = useState(true);
  const [ekleVal,    setEkleVal]    = useState('');
  const [havaMap,    setHavaMap]    = useState({});   // ilce -> {anlik, gecmis}
  const [havaLoading,setHavaLoading]= useState(false);

  const TABS = [
    ['kart','Kartlar'],
    ['kriterler','Kriterler'],
    ['enerji','Enerji'],
    ['hava','🌤 Hava & İklim'],
    ['mahalle','Mahalle'],
    ['rf','RF Model'],
  ];

  useEffect(()=>{
    setSecilenler([]);
    setDataMap({});
    setMwData(null);
    fetch(`/api/${et.toLowerCase()}/districts`)
      .then(r=>r.ok?r.json():null)
      .then(gj=>{
        if(!gj?.features) return;
        const names=[...new Set(
          gj.features.map(f=>f.properties?.ilce).filter(Boolean)
        )].sort(trSort);
        setIlceler(names);

        // ── initialIlce geldiyse sadece onu seç, yoksa ilk 2'yi al ──
        if(initialIlce && names.includes(initialIlce)){
          setSecilenler([initialIlce]);
          setEkleVal(names.find(n=>n!==initialIlce)||'');
        } else {
          const init = names.slice(0,2);
          setSecilenler(init);
          setEkleVal(names[2]||'');
        }
      }).catch(()=>{});
  },[et, initialIlce]);

  useEffect(()=>{
    if(secilenler.length===0) return;
    setLoading(true);
    const t=et.toLowerCase();
    const fetches=secilenler.map(async(ilce)=>{
      try{
        const r=await fetch(`/api/${t}/district/${encodeURIComponent(ilce)}`);
        const d=r.ok?await r.json():null;
        return{ilce,d};
      }catch(e){ return{ilce,d:null}; }
    });
    const mwFetch=fetch(`/api/ml/mw-hesap?enerji=${et}`)
      .then(r=>r.ok?r.json():null).catch(()=>null);

    Promise.all([...fetches,mwFetch]).then(results=>{
      const mw=results.pop();
      setMwData(mw);
      const map={};
      results.forEach(({ilce,d})=>{ if(d) map[ilce]=d; });
      setDataMap(map);
    }).finally(()=>setLoading(false));
  },[secilenler,et]);

  const addIlce=()=>{
    if(!ekleVal||secilenler.includes(ekleVal)||secilenler.length>=4) return;
    setSecilenler(p=>[...p,ekleVal]);
  };
  const removeIlce=useCallback((ilce)=>{
    if(secilenler.length<=1) return; // tek ilçe kalıyorsa silme
    setSecilenler(p=>p.filter(i=>i!==ilce));
    setDataMap(p=>{const n={...p};delete n[ilce];return n;});
  },[secilenler]);

  const runML=()=>{
    setMlData({loading:true});
    fetch(`/api/ml/train?enerji=${et}`)
      .then(r=>r.ok?r.json():null).then(d=>setMlData(d)).catch(()=>setMlData(null));
  };

  const kriterRows=useMemo(()=>{
    const first=Object.values(dataMap)[0];
    if(!first?.kriterler) return [];
    return first.kriterler.map(ka=>({
      kod:ka.kod,
      skorlar:secilenler.map(ilce=>dataMap[ilce]?.kriterler?.find(k=>k.kod===ka.kod)?.skor??0),
    })).filter(r=>r.skorlar.some(s=>s>0));
  },[dataMap,secilenler]);

  // Hava sekmesine geçince veri çek
  useEffect(()=>{
    if(tab!=='hava'||secilenler.length===0) return;
    setHavaLoading(true);
    Promise.all(secilenler.map(async(ilce)=>{
      if(havaMap[ilce]) return;
      const [anlik, gecmis] = await Promise.all([
        fetch(`/api/hava/ilce/${encodeURIComponent(ilce)}`).then(r=>r.ok?r.json():null).catch(()=>null),
        fetch(`/api/hava/gecmis/${encodeURIComponent(ilce)}`).then(r=>r.ok?r.json():null).catch(()=>null),
      ]);
      setHavaMap(prev=>({...prev,[ilce]:{anlik,gecmis}}));
    })).finally(()=>setHavaLoading(false));
  },[tab, secilenler]);

  return(
    <div style={{minHeight:'100vh',background:'var(--bg)',fontFamily:"'Manrope',sans-serif"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Top bar ── */}
      <div style={{background:'var(--card)',borderBottom:'1px solid var(--border)',
        padding:'20px 32px',display:'flex',justifyContent:'space-between',
        alignItems:'center',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.1em',
            textTransform:'uppercase',color:'#0EA5A4',marginBottom:4}}>
            {initialIlce
              ? `${initialIlce} · Detaylı Rapor`
              : `İlçe Karşılaştırma · ${secilenler.length} seçili`}
          </div>
          <h2 style={{fontSize:24,fontWeight:800,letterSpacing:'-0.02em',color:'var(--text)',margin:0}}>
            {initialIlce
              ? <><span style={{color:'#0EA5A4'}}>{initialIlce}</span> Uygunluk Analizi</>
              : <>Detaylı <span style={{color:'#0EA5A4'}}>Uygunluk Kıyası</span></>
            }
          </h2>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{display:'flex',background:'var(--bg)',borderRadius:10,padding:3,gap:2}}>
            {['GES','RES'].map(t=>(
              <button key={t} onClick={()=>setEt(t)} style={{
                padding:'6px 18px',borderRadius:8,border:'none',
                background:et===t?'#0EA5A4':'transparent',
                color:et===t?'#fff':'var(--text-2)',
                fontFamily:'inherit',fontSize:13,fontWeight:700,cursor:'pointer',transition:'all 0.15s',
              }}>{t==='GES'?'☀ GES':'💨 RES'}</button>
            ))}
          </div>
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12.5,color:'var(--text-2)',cursor:'pointer'}}>
            <input type="checkbox" checked={showMap} onChange={e=>setShowMap(e.target.checked)}
              style={{accentColor:'#0EA5A4'}}/>
            Harita göster
          </label>
        </div>
      </div>

      {/* ── Seçim bar ── */}
      <div style={{background:'var(--card)',borderBottom:'1px solid var(--border)',
        padding:'12px 32px',display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
        {secilenler.map((ilce,i)=>(
          <div key={ilce} style={{display:'inline-flex',alignItems:'center',gap:7,
            padding:'6px 12px',borderRadius:999,
            background:`${COLORS[i]}12`,border:`1.5px solid ${COLORS[i]}35`,
            fontSize:12.5,fontWeight:700,color:COLORS[i]}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:COLORS[i]}}/>
            {ilce}
            {secilenler.length>1&&(
              <span onClick={()=>removeIlce(ilce)}
                style={{cursor:'pointer',opacity:0.5,marginLeft:2,fontSize:14}}>×</span>
            )}
          </div>
        ))}

        {secilenler.length<4&&ilceler.length>0&&(
          <>
            <select value={ekleVal} onChange={e=>setEkleVal(e.target.value)}
              style={{padding:'6px 12px',borderRadius:9,border:'1.5px solid var(--border)',
                background:'var(--surface)',color:'var(--text)',fontFamily:'inherit',fontSize:12.5,cursor:'pointer'}}>
              {ilceler.filter(n=>!secilenler.includes(n)).map(n=><option key={n}>{n}</option>)}
            </select>
            <button onClick={addIlce} style={{
              padding:'6px 14px',borderRadius:9,border:'1.5px solid rgba(14,165,164,0.4)',
              background:'rgba(14,165,164,0.08)',color:'#0EA5A4',
              fontFamily:'inherit',fontSize:12.5,fontWeight:700,cursor:'pointer',
            }}>+ İlçe Ekle</button>
            <span style={{fontSize:11,color:'var(--dim)'}}>({secilenler.length}/4)</span>
          </>
        )}

        {loading&&(
          <div style={{display:'flex',alignItems:'center',gap:6,color:'var(--muted)',fontSize:12,marginLeft:8}}>
            <div style={{width:13,height:13,border:'2px solid var(--surface-2)',
              borderTopColor:'var(--brand)',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
            Yükleniyor…
          </div>
        )}
      </div>

      {/* ── Sekmeler ── */}
      <div style={{background:'var(--card)',borderBottom:'1px solid var(--border)',
        padding:'0 32px',display:'flex',gap:0}}>
        {TABS.map(([id,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            padding:'13px 20px',border:'none',background:'transparent',
            color:tab===id?'#0EA5A4':'var(--text-2)',
            fontFamily:'inherit',fontSize:13,fontWeight:tab===id?700:500,
            cursor:'pointer',borderBottom:tab===id?'2px solid #0EA5A4':'2px solid transparent',
            marginBottom:-1,transition:'all 0.15s',
          }}>{lbl}</button>
        ))}
      </div>

      {/* ── İçerik ── */}
      <div style={{padding:'24px 32px',maxWidth:1400,margin:'0 auto'}}>

        {tab==='kart'&&(
          <div style={{display:'grid',gap:24,
            gridTemplateColumns: secilenler.length === 1 ? '1fr' : `repeat(${Math.min(secilenler.length,2)},1fr)`,
            maxWidth: secilenler.length === 1 ? 780 : '100%',
            margin: secilenler.length === 1 ? '0 auto' : 0,
          }}>
            {secilenler.map((ilce,i)=>(
              <IlceKart key={`${ilce}-${et}`}
                data={dataMap[ilce]}
                mwRow={mwData?.ilceler?.find(r=>r.ilce===ilce)}
                color={COLORS[i]} showMap={showMap} et={et}
                onRemove={()=>removeIlce(ilce)} canRemove={secilenler.length>1}/>
            ))}
          </div>
        )}

        {tab==='kriterler'&&(
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,alignItems:'start'}}>

            {/* Sol: Mini haritalar alt alta */}
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {secilenler.map((ilce,i)=>(
                <div key={ilce} style={{
                  borderRadius:12,overflow:'hidden',
                  border:`2px solid ${COLORS[i]}50`,
                  boxShadow:'0 2px 12px rgba(0,0,0,0.2)',
                }}>
                  <div style={{
                    padding:'8px 14px',
                    background:`${COLORS[i]}15`,
                    borderBottom:`1px solid ${COLORS[i]}30`,
                    display:'flex',alignItems:'center',gap:8,
                  }}>
                    <div style={{width:9,height:9,borderRadius:'50%',background:COLORS[i],flexShrink:0}}/>
                    <span style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>{ilce}</span>
                    <span style={{fontSize:11,color:COLORS[i],marginLeft:'auto',
                      fontFamily:'JetBrains Mono,monospace',fontWeight:700}}>
                      {dataMap[ilce]?.skor_ort?.toFixed(2)||'—'}/5
                    </span>
                  </div>
                  <MiniMap ilceAdi={ilce} energyType={et} color={COLORS[i]} height={180}/>
                </div>
              ))}
            </div>

            {/* Sağ: Dikey bar chart */}
            <div style={{background:'var(--card)',borderRadius:16,
              boxShadow:'0 2px 16px rgba(0,0,0,0.2)',
              border:'1px solid var(--border)',overflow:'hidden'}}>
              <div style={{padding:'16px 24px',borderBottom:'1px solid var(--border)',
                display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>Kriter Karşılaştırması</div>
                <div style={{display:'flex',gap:14}}>
                  {secilenler.map((ilce,i)=>(
                    <div key={ilce} style={{display:'flex',alignItems:'center',gap:6,fontSize:12}}>
                      <div style={{width:10,height:10,borderRadius:3,background:COLORS[i]}}/>
                      <span style={{color:'var(--text-2)'}}>{ilce}</span>
                    </div>
                  ))}
                </div>
              </div>

              {kriterRows.length===0&&(
                <div style={{textAlign:'center',padding:'32px',color:'var(--dim)',fontSize:13}}>Veri bekleniyor…</div>
              )}

              <div style={{padding:'24px 20px 16px'}}>
                {/* Bar chart */}
                <div style={{display:'flex',alignItems:'flex-end',gap:4,height:260,marginBottom:16}}>
                  {kriterRows.map((row)=>{
                    const maxVal=5;
                    return(
                      <div key={row.kod} style={{
                        flex:1,display:'flex',flexDirection:'column',
                        alignItems:'center',height:'100%',justifyContent:'flex-end',
                      }}>
                        <div style={{width:'100%',display:'flex',gap:2,alignItems:'flex-end',height:'100%'}}>
                          {row.skorlar.map((s,i)=>(
                            <div key={i} style={{
                              flex:1,
                              height:`${(s/maxVal)*100}%`,
                              background:COLORS[i],
                              borderRadius:'4px 4px 0 0',
                              minHeight:4,
                              transition:'height 0.6s ease',
                              position:'relative',
                            }}
                              title={`${secilenler[i]}: ${s.toFixed(2)}`}
                            >
                              {s > 0.8 && (
                                <div style={{
                                  position:'absolute',top:-18,left:'50%',
                                  transform:'translateX(-50%)',
                                  fontSize:9,fontWeight:700,color:COLORS[i],
                                  fontFamily:'JetBrains Mono,monospace',
                                  whiteSpace:'nowrap',
                                }}>{s.toFixed(1)}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* X ekseni */}
                <div style={{height:2,background:'var(--border)',marginBottom:10,borderRadius:1}}/>

                {/* Kriter etiketleri — daha büyük */}
                <div style={{display:'flex',gap:4}}>
                  {kriterRows.map((row)=>{
                    const meta=KRITER_META[row.kod]||{ad:row.kod,ikon:'·'};
                    return(
                      <div key={row.kod} style={{
                        flex:1,textAlign:'center',lineHeight:1.35,
                      }}>
                        <div style={{fontSize:16,marginBottom:4}}>{meta.ikon}</div>
                        <div style={{
                          fontSize:10.5,fontWeight:600,color:'var(--text-2)',
                          overflow:'hidden',textOverflow:'ellipsis',
                          display:'-webkit-box',WebkitLineClamp:2,
                          WebkitBoxOrient:'vertical',
                        }}>{meta.ad}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        )}

        {tab==='enerji'&&(
          <div style={{background:'var(--card)',borderRadius:16,
            boxShadow:'0 2px 16px rgba(0,0,0,0.2)',
            border:'1px solid var(--border)',padding:'24px'}}>
            <div style={{fontSize:15,fontWeight:800,color:'var(--text)',marginBottom:24}}>Enerji Potansiyeli</div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
              {[
                {key:'kurulu_mw',   title:'Kurulu Güç',     unit:'MW',      icon:'⚡', div:1},
                {key:'yillik_mwh',  title:'Yıllık Üretim',  unit:'GWh/yıl', icon:'☀️', div:1000},
                {key:'co2_ton_yil', title:'CO₂ Azaltımı',   unit:'kt/yıl',  icon:'🌿', div:1000},
                {key:'hane_karsiligi',title:'Hane Karşılığı',unit:'bin hane',icon:'🏠', div:1000},
              ].map(({key,title,unit,icon,div})=>{
                const vals=secilenler.map(ilce=>{
                  const r=mwData?.ilceler?.find(r=>r.ilce===ilce);
                  return r?(r[key]||0)/div:0;
                });
                const mx=Math.max(...vals,0.001);
                const total=vals.reduce((a,b)=>a+b,0);

                return(
                  <div key={key} style={{
                    background:'var(--surface-2)',borderRadius:14,
                    padding:'18px 16px',border:'1px solid var(--border)',
                    display:'flex',flexDirection:'column',gap:14,
                  }}>
                    {/* Başlık */}
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:20,marginBottom:4}}>{icon}</div>
                      <div style={{fontSize:10.5,fontWeight:700,letterSpacing:'0.07em',
                        textTransform:'uppercase',color:'var(--muted)'}}>{title}</div>
                      <div style={{fontSize:10,color:'var(--dim)',marginTop:2}}>{unit}</div>
                    </div>

                    {/* Dikey bar chart */}
                    <div style={{display:'flex',alignItems:'flex-end',gap:8,height:120,justifyContent:'center'}}>
                      {vals.map((v,i)=>(
                        <div key={i} style={{
                          display:'flex',flexDirection:'column',alignItems:'center',
                          gap:4,flex:1,maxWidth:60,height:'100%',justifyContent:'flex-end',
                        }}>
                          <div style={{
                            fontSize:11,fontWeight:800,color:COLORS[i],
                            fontFamily:'JetBrains Mono,monospace',
                          }}>{v>=1000?(v/1000).toFixed(1)+'k':v.toFixed(v<10?1:0)}</div>
                          <div style={{
                            width:'100%',
                            height:`${Math.max((v/mx)*100,2)}%`,
                            background:COLORS[i],
                            borderRadius:'4px 4px 0 0',
                            transition:'height 0.7s ease',
                            minHeight:4,
                            opacity:v===0?0.2:1,
                          }}/>
                        </div>
                      ))}
                    </div>

                    {/* X ekseni */}
                    <div style={{height:1.5,background:'var(--border)',borderRadius:1}}/>

                    {/* Legend */}
                    <div style={{display:'flex',flexDirection:'column',gap:5}}>
                      {secilenler.map((ilce,i)=>(
                        <div key={ilce} style={{display:'flex',alignItems:'center',gap:7}}>
                          <div style={{width:10,height:10,borderRadius:3,
                            background:COLORS[i],flexShrink:0}}/>
                          <span style={{fontSize:11,color:'var(--text-2)',flex:1,
                            overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ilce}</span>
                          <span style={{
                            fontSize:11,fontWeight:800,color:vals[i]>0?COLORS[i]:'var(--dim)',
                            fontFamily:'JetBrains Mono,monospace',flexShrink:0,
                          }}>
                            {vals[i]>=1000?(vals[i]/1000).toFixed(1)+'k':vals[i].toFixed(vals[i]<10?1:0)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Toplam */}
                    {secilenler.length>1&&(
                      <div style={{
                        padding:'7px 10px',borderRadius:8,
                        background:'var(--surface)',border:'1px solid var(--border)',
                        display:'flex',justifyContent:'space-between',alignItems:'center',
                      }}>
                        <span style={{fontSize:10,color:'var(--muted)',fontWeight:600}}>TOPLAM</span>
                        <span style={{fontSize:13,fontWeight:800,color:'var(--brand)',
                          fontFamily:'JetBrains Mono,monospace'}}>
                          {total>=1000?(total/1000).toFixed(1)+'k':total.toFixed(total<10?1:0)} {unit}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bilgi Kartı */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(14,165,164,0.07) 0%, rgba(14,165,164,0.01) 100%)',
              border: '1px solid rgba(14,165,164,0.25)',
              borderRadius: 12,
              padding: '16px 20px',
              marginTop: 24,
              display: 'flex',
              gap: 16,
              alignItems: 'flex-start'
            }}>
              <div style={{fontSize: 22, color: 'var(--brand)', marginTop: 2}}>ℹ️</div>
              <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
                <div style={{fontSize: 13, fontWeight: 700, color: 'var(--brand)', letterSpacing: '0.04em'}}>
                  Potansiyel Hesaplama Metodolojisi
                </div>
                <div style={{fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.6}}>
                  {et === 'GES' ? (
                    <span>
                      <strong>Güneş Enerjisi (GES) Potansiyeli</strong>: Analiz edilen uygun bölgelerin (Sınıf 4 ve Sınıf 5 alanlar) toplam yüzölçümü (hektar) esas alınarak hesaplanır. Hesaplamalarda, metrekare başına düşen yıllık ortalama global güneş radyasyonu (GHI) verileri, panel verimliliği (%20) ve performans oranı (%75) baz alınmıştır. Yıllık elektrik üretimi ve CO₂ azaltımı değerleri bu kabullere göre optimize edilmiştir.
                    </span>
                  ) : (
                    <span>
                      <strong>Rüzgâr Enerjisi (RES) Potansiyeli</strong>: 100 metre yükseklikteki yıllık ortalama rüzgâr hızı, topografik pürüzlülük ve eğim sınırlamaları göz önünde bulundurularak hesaplanmıştır. Kurulu güç kapasite tahmini (MW), uygun alan yoğunluğuna göre standart 3 MW gücündeki modern rüzgâr türbinlerinin yerleşim mesafeleri (türbinler arası 5D x 3D boşluk) dikkate alınarak simüle edilmiştir.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab==='hava'&&(
          <div style={{display:'flex',flexDirection:'column',gap:24}}>
            {havaLoading&&(
              <div style={{textAlign:'center',padding:40,color:'var(--muted)'}}>
                <div style={{width:20,height:20,border:'2px solid var(--surface-2)',borderTopColor:'var(--brand)',
                  borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto 12px'}}/>
                Open-Meteo'dan veri çekiliyor…
              </div>
            )}
            {secilenler.map((ilce,idx)=>{
              const h=havaMap[ilce];
              if(!h) return null;
              const {anlik,gecmis}=h;
              const color=COLORS[idx];

              const metriks = et==='GES' ? [
                {icon:'☀️',label:'Solar Radyasyon',val:`${anlik?.anlik?.solar_wm2||0}`,unit:'W/m²',color:'#F59E0B',bar:Math.min((anlik?.anlik?.solar_wm2||0)/1000,1)},
                {icon:'☁️',label:'Bulutluluk',val:`${anlik?.anlik?.bulutluluk||0}`,unit:'%',color:'#94A3B8',bar:(anlik?.anlik?.bulutluluk||0)/100},
                {icon:'💨',label:'Rüzgâr 10m',val:`${anlik?.anlik?.ruzgar_10m||0}`,unit:'km/h',color:'#38BDF8',bar:Math.min((anlik?.anlik?.ruzgar_10m||0)/30,1)},
                {icon:'🌡️',label:'Sıcaklık',val:`${anlik?.anlik?.sicaklik||0}`,unit:'°C',color:'#F472B6',bar:Math.min(((anlik?.anlik?.sicaklik||0)+10)/50,1)},
              ] : [
                {icon:'💨',label:'Rüzgâr 100m',val:`${anlik?.anlik?.ruzgar_100m||0}`,unit:'km/h',color:'#38BDF8',bar:Math.min((anlik?.anlik?.ruzgar_100m||0)/50,1)},
                {icon:'🧭',label:'Rüzgâr Yönü',val:`${anlik?.anlik?.ruzgar_yon||0}`,unit:'°',color:'#0EA5A4',bar:(anlik?.anlik?.ruzgar_yon||0)/360},
                {icon:'☁️',label:'Bulutluluk',val:`${anlik?.anlik?.bulutluluk||0}`,unit:'%',color:'#94A3B8',bar:(anlik?.anlik?.bulutluluk||0)/100},
                {icon:'🌡️',label:'Sıcaklık',val:`${anlik?.anlik?.sicaklik||0}`,unit:'°C',color:'#F472B6',bar:Math.min(((anlik?.anlik?.sicaklik||0)+10)/50,1)},
              ];

              return(
                <div key={ilce} style={{
                  background:'var(--card)',borderRadius:16,
                  border:`1px solid ${color}25`,borderTop:`3px solid ${color}`,
                  overflow:'hidden',boxShadow:'var(--shadow)',
                }}>
                  {/* Başlık */}
                  <div style={{
                    padding:'16px 24px',borderBottom:'1px solid var(--border)',
                    display:'flex',justifyContent:'space-between',alignItems:'center',
                    background:`${color}06`,
                  }}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:10,height:10,borderRadius:'50%',background:color}}/>
                      <span style={{fontSize:17,fontWeight:800,color:'var(--text)'}}>{ilce}</span>
                      <span style={{fontSize:10,color:'var(--muted)',background:'var(--surface-2)',
                        padding:'2px 8px',borderRadius:999,border:'1px solid var(--border)'}}>
                        Open-Meteo · {anlik?.anlik?.zaman?.slice(0,10)||''}
                      </span>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      {['Open-Meteo','ERA5 Archive'].map(s=>(
                        <span key={s} style={{fontSize:9.5,color:'var(--brand)',fontWeight:600,
                          background:'var(--brand-soft)',padding:'3px 8px',borderRadius:999,
                          border:'1px solid rgba(14,165,164,0.2)'}}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:20}}>

                    {/* Üst: 4 metrik kart */}
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
                      {metriks.map(({icon,label,val,unit,color:c,bar})=>(
                        <div key={label} style={{
                          background:'var(--surface-2)',borderRadius:12,padding:'14px 16px',
                          border:`1px solid ${c}20`,
                        }}>
                          <div style={{fontSize:11,color:'var(--muted)',marginBottom:8,
                            display:'flex',alignItems:'center',gap:6}}>
                            <span>{icon}</span><span>{label}</span>
                          </div>
                          <div style={{display:'flex',alignItems:'baseline',gap:4,marginBottom:8}}>
                            <span style={{fontSize:28,fontWeight:800,color:c,lineHeight:1,
                              fontFamily:'JetBrains Mono,monospace'}}>{val}</span>
                            <span style={{fontSize:13,fontWeight:600,color:'var(--muted)'}}>{unit}</span>
                          </div>
                          <div style={{height:4,borderRadius:2,background:'var(--surface)',overflow:'hidden'}}>
                            <div style={{height:'100%',width:`${bar*100}%`,background:c,borderRadius:2}}/>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 6 aylık grafik + 7 günlük alt alta */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>

                      {/* Sol: 6 aylık */}
                      <div style={{background:'var(--surface-2)',borderRadius:12,padding:'16px 18px',border:'1px solid var(--border)'}}>
                        <div style={{fontSize:10.5,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'var(--muted)',marginBottom:14}}>
                          6 Aylık Geçmiş · Aylık Ortalama
                        </div>
                        {gecmis?.aylik?(()=>{
                          const aylar=gecmis.aylik;
                          const maxS=Math.max(...aylar.map(a=>a.ort_solar),1);
                          const maxW=Math.max(...aylar.map(a=>a.ort_wind),1);
                          const H=140;
                          return(
                            <div>
                              <div style={{display:'flex',gap:4,alignItems:'flex-end',height:H,marginBottom:6,borderBottom:'1px solid var(--border)'}}>
                                {aylar.map((a,i)=>{
                                  const sH=(a.ort_solar/maxS)*H*0.9;
                                  const wH=(a.ort_wind/maxW)*H*0.9;
                                  return(
                                    <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:'100%',gap:2}}>
                                      <div style={{fontSize:8.5,color:'var(--muted)',fontFamily:'JetBrains Mono,monospace',marginBottom:2}}>
                                        {et==='GES'?a.ort_solar.toFixed(0):a.ort_wind.toFixed(0)}
                                      </div>
                                      <div style={{width:'100%',display:'flex',gap:1,alignItems:'flex-end'}}>
                                        <div style={{flex:1,height:sH,borderRadius:'2px 2px 0 0',background:'#F59E0B',opacity:0.85}} title={`Solar: ${a.ort_solar}`}/>
                                        <div style={{flex:1,height:wH,borderRadius:'2px 2px 0 0',background:'#38BDF8',opacity:0.85}} title={`Rüzgâr: ${a.ort_wind}`}/>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div style={{display:'flex',gap:4,marginBottom:12}}>
                                {aylar.map((a,i)=>(
                                  <div key={i} style={{flex:1,textAlign:'center',fontSize:10,fontWeight:600,color:'var(--text-2)'}}>
                                    {a.ay_kisa}
                                  </div>
                                ))}
                              </div>
                              <div style={{borderRadius:8,overflow:'hidden',border:'1px solid var(--border)'}}>
                                {[
                                  {label:'☀ Solar (MJ/m²)',key:'ort_solar',c:'#F59E0B'},
                                  {label:'💨 Rüzgâr (km/h)',key:'ort_wind',c:'#38BDF8'},
                                ].map(({label,key,c},ri)=>(
                                  <div key={key} style={{display:'grid',gridTemplateColumns:`110px repeat(${aylar.length},1fr)`,borderTop:ri>0?'1px solid var(--border)':'none',background:ri%2?'var(--surface-2)':'var(--surface)',padding:'6px 10px'}}>
                                    <div style={{fontSize:9.5,color:c,fontWeight:600}}>{label}</div>
                                    {aylar.map(a=>(
                                      <div key={a.ay} style={{textAlign:'center',fontSize:10.5,fontWeight:700,color:c,fontFamily:'JetBrains Mono,monospace'}}>{a[key]}</div>
                                    ))}
                                  </div>
                                ))}
                              </div>
                              <div style={{marginTop:10,padding:'8px 12px',background:`${color}08`,borderRadius:8,border:`1px solid ${color}18`,fontSize:11,color:'var(--text-2)',lineHeight:1.5}}>
                                {et==='GES'?(()=>{
                                  const mx=aylar.reduce((a,b)=>a.ort_solar>b.ort_solar?a:b);
                                  const mn=aylar.reduce((a,b)=>a.ort_solar<b.ort_solar?a:b);
                                  return `☀ En yüksek solar ${mx.ay_kisa} (${mx.ort_solar} MJ/m²), en düşük ${mn.ay_kisa} (${mn.ort_solar} MJ/m²).`;
                                })():(()=>{
                                  const mx=aylar.reduce((a,b)=>a.ort_wind>b.ort_wind?a:b);
                                  const mn=aylar.reduce((a,b)=>a.ort_wind<b.ort_wind?a:b);
                                  return `💨 En yüksek rüzgâr ${mx.ay_kisa} (${mx.ort_wind} km/h), en düşük ${mn.ay_kisa} (${mn.ort_wind} km/h).`;
                                })()}
                              </div>
                            </div>
                          );
                        })():<div style={{color:'var(--muted)',fontSize:12,textAlign:'center',padding:32}}>Yükleniyor…</div>}
                      </div>
                      {anlik?.tahmin_7gun&&(
                        <div style={{background:'var(--surface-2)',borderRadius:12,padding:'16px 18px',border:'1px solid var(--border)'}}>
                          <div style={{fontSize:10.5,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'var(--muted)',marginBottom:14}}>
                            7 Günlük Tahmin
                          </div>
                          <div style={{display:'flex',flexDirection:'column',gap:6}}>
                            {anlik.tahmin_7gun.map((g,i)=>{
                              const gun=new Date(g.tarih).toLocaleDateString('tr',{weekday:'short',day:'numeric',month:'short'});
                              const sBar=Math.min(g.max_solar/1000,1);
                              const wBar=Math.min(g.max_wind/60,1);
                              return(
                                <div key={i} style={{display:'grid',gridTemplateColumns:'80px 1fr 70px 1fr 70px',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,background:i===0?`${color}10`:'var(--surface)',border:`1px solid ${i===0?color+'30':'var(--border)'}`}}>
                                  <div style={{fontSize:11,fontWeight:i===0?700:500,color:i===0?color:'var(--text-2)',textTransform:'capitalize'}}>
                                    {i===0?'Bugün':gun}
                                  </div>
                                  <div style={{height:4,borderRadius:2,background:'var(--surface-2)',overflow:'hidden'}}>
                                    <div style={{height:'100%',width:`${sBar*100}%`,background:'#F59E0B',borderRadius:2}}/>
                                  </div>
                                  <div style={{fontSize:11,fontWeight:700,color:'#F59E0B',fontFamily:'JetBrains Mono,monospace',textAlign:'right'}}>
                                    ☀ {g.max_solar}
                                  </div>
                                  <div style={{height:4,borderRadius:2,background:'var(--surface-2)',overflow:'hidden'}}>
                                    <div style={{height:'100%',width:`${wBar*100}%`,background:'#38BDF8',borderRadius:2}}/>
                                  </div>
                                  <div style={{fontSize:11,fontWeight:700,color:'#38BDF8',fontFamily:'JetBrains Mono,monospace',textAlign:'right'}}>
                                    💨 {g.max_wind}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {tab==='mahalle'&&(
          <div style={{display:'flex',flexDirection:'column',gap:20}}>
            <div style={{fontSize:12,color:'var(--muted)',lineHeight:1.6}}>
              OpenStreetMap mahalle verileri — satıra tıklayınca haritada konumlanır.
            </div>
            {secilenler.map((ilce,i)=>(
              <MahallePaneli key={`${ilce}-${et}-${i}`} ilceAdi={ilce} et={et} color={COLORS[i]}/>
            ))}
          </div>
        )}

        {(tab==='rf'||tab==='ml')&&(
          <div style={{background:'var(--card)',borderRadius:16,
            boxShadow:'0 2px 16px rgba(0,0,0,0.2)',
            border:'1px solid var(--border)',padding:'24px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.1em',
                  textTransform:'uppercase',color:'var(--muted)',marginBottom:4}}>Makine Öğrenmesi ile Doğrulama</div>
                <div style={{fontSize:16,fontWeight:800,color:'var(--text)'}}>Random Forest (Yapay Zekâ) Analizi</div>
              </div>
              <button onClick={runML} disabled={mlData?.loading} style={{
                padding:'10px 22px',borderRadius:10,
                background:'rgba(14,165,164,0.1)',border:'1.5px solid rgba(14,165,164,0.35)',
                color:'#0EA5A4',fontFamily:'inherit',fontSize:13,fontWeight:700,
                cursor:'pointer',opacity:mlData?.loading?0.6:1,
                transition:'all 0.2s',
              }}
              onMouseEnter={e => { if(!mlData?.loading) e.currentTarget.style.background = 'rgba(14,165,164,0.18)'; }}
              onMouseLeave={e => { if(!mlData?.loading) e.currentTarget.style.background = 'rgba(14,165,164,0.1)'; }}
              >{mlData?.loading?'⏳ Eğitiliyor…':'▶ RF Modelini Çalıştır'}</button>
            </div>

            {/* Başlangıç Rehberi (Hiç bilmeyen biri için açıklama kartı) */}
            <div style={{
              background:'var(--surface-2)',
              border:'1px solid var(--border)',
              borderRadius:12,
              padding:20,
              marginBottom:24,
              display:'flex',
              flexDirection:'column',
              gap:12,
            }}>
              <div style={{display:'flex',alignItems:'center',gap:10,fontSize:14,fontWeight:700,color:'var(--brand)'}}>
                <span>🤖</span> Yapay Zekâ Doğrulaması Nedir ve Nasıl Çalışır?
              </div>
              <div style={{fontSize:12,color:'var(--text-2)',lineHeight:1.6,display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
                <div>
                  Bu sayfa, Coğrafi Bilgi Sistemleri (CBS) kriterleriyle kurduğumuz <strong>AHP (Karar Analizi)</strong> modelini doğrulamak için bir <strong>Random Forest (Makine Öğrenmesi)</strong> modeli eğitir. Yapay zekâ, ilçelerdeki binlerce pikseli inceleyerek kriterlerin önem derecesini kendisi hesaplar ve bizim modelimizle karşılaştırır.
                </div>
                <div>
                  <strong>Adımlar:</strong><br/>
                  1. Sağ üstteki <strong>RF Modelini Çalıştır</strong> butonuna basın.<br/>
                  2. Yapay zekanın kriterlerinize verdiği <strong>Özellik Önemi</strong> yüzdelerini inceleyin.<br/>
                  3. <strong>AHP vs RF</strong> tablosunda bizim verdiğimiz puanlar ile yapay zekanın verdiği puanlar arasındaki <strong>Farkı (Δ)</strong> analiz edin. Farkın sıfıra yakın olması modelimizin güvenilirliğini kanıtlar.
                </div>
              </div>
            </div>

            {!mlData&&(
              <div style={{textAlign:'center',padding:'40px 0',color:'var(--dim)',fontSize:13,
                border:'2px dashed var(--border)',borderRadius:12,background:'var(--surface)'}}>
                <span>👉</span> Üstteki butona basarak {et} için Random Forest yapay zekâ modelini hemen eğitebilirsiniz.
              </div>
            )}

            {mlData&&!mlData.loading&&(
              <>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
                  {[
                    { label: 'Tahmin Başarısı', sub: 'OOB Score (>0.80 idealdir)', val: mlData.oob_score },
                    { label: 'Uyum Korelasyonu', sub: 'Pearson r (1.00\'e yakınlık)', val: mlData.pearson_r },
                    { label: 'Formül Ortalaması', sub: 'AHP Skoru (/5)', val: mlData.ahp_ortalama + '/5' },
                    { label: 'Yapay Zekâ Ort.', sub: 'RF Skoru (/5)', val: mlData.rf_ortalama + '/5' }
                  ].map(({ label, sub, val }) => (
                    <div key={label} style={{background:'var(--surface)',border:'1px solid var(--border)',
                      borderRadius:12,padding:'14px',textAlign:'center'}}>
                      <div style={{fontSize:22,fontWeight:800,color:'#0EA5A4',
                        fontFamily:'JetBrains Mono,monospace',marginBottom:4}}>{val}</div>
                      <div style={{fontSize:11,fontWeight:700,color:'var(--text)'}}>{label}</div>
                      <div style={{fontSize:9,color:'var(--muted)',marginTop:2}}>{sub}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',
                      textTransform:'uppercase',color:'var(--muted)',marginBottom:12}}>Yapay Zekaya Göre Belirleyici Kriterler</div>
                    {mlData.feature_importance.slice(0,8).map((fi,i)=>{
                      const meta=KRITER_META[fi.kriter]||{ad:fi.kriter,renk:'#888'};
                      return(
                        <div key={fi.kriter} style={{marginBottom:9}}>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                            <span style={{fontSize:12,color:'var(--text-2)'}}>{i+1}. {meta.ad}</span>
                            <span style={{fontSize:11,fontFamily:'JetBrains Mono,monospace',
                              color:meta.renk,fontWeight:700}}>{(fi.onem*100).toFixed(1)}%</span>
                          </div>
                          <div style={{height:6,borderRadius:3,background:'var(--surface-2)'}}>
                            <div style={{height:'100%',
                              width:`${(fi.onem/mlData.feature_importance[0].onem)*100}%`,
                              borderRadius:3,
                              background:`linear-gradient(90deg,${meta.renk},${meta.renk}99)`,
                              transition:'width 0.8s'}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',
                      textTransform:'uppercase',color:'var(--muted)',marginBottom:12}}>AHP Formülü vs Yapay Zekâ Puan Kıyaslaması</div>
                    <div style={{overflowY:'auto',maxHeight:320,borderRadius:10,
                      border:'1px solid var(--border)',overflow:'hidden'}}>
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                        <thead><tr style={{background:'var(--surface)'}}>
                          {['İlçe', 'Bizim (AHP)', 'Yapay Zekâ (RF)', 'Fark (Δ)'].map(h=>(
                            <th key={h} style={{padding:'8px 12px',
                              textAlign:h==='İlçe'?'left':'center',
                              fontSize:9.5,fontWeight:700,letterSpacing:'0.07em',
                              color:'var(--muted)',textTransform:'uppercase',
                              borderBottom:'1px solid var(--border)'}}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {mlData.karsilastirma.sort((a,b)=>b.ahp_skor-a.ahp_skor).map((r,i)=>{
                            const si=secilenler.indexOf(r.ilce);const isSel=si>=0;
                            return(
                              <tr key={r.ilce} style={{borderBottom:'1px solid var(--border)',
                                background:isSel?`${COLORS[si]}08`:i%2?'rgba(0,0,0,0.01)':'transparent'}}>
                                <td style={{padding:'7px 12px',fontWeight:isSel?800:500,
                                  color:isSel?COLORS[si]:'var(--text)',fontSize:12}}>
                                  {isSel?'▶ ':''}{r.ilce}
                                </td>
                                <td style={{padding:'7px 12px',textAlign:'center',
                                  fontFamily:'JetBrains Mono,monospace',fontSize:11,
                                  color:'var(--text-2)'}}>{r.ahp_skor.toFixed(2)}</td>
                                <td style={{padding:'7px 12px',textAlign:'center',
                                  fontFamily:'JetBrains Mono,monospace',fontSize:11,
                                  color:'#0EA5A4',fontWeight:700}}>{r.rf_skor.toFixed(2)}</td>
                                <td style={{padding:'7px 12px',textAlign:'center'}}>
                                  <span style={{fontSize:10,fontFamily:'JetBrains Mono,monospace',
                                    padding:'2px 6px',borderRadius:4,
                                    background:Math.abs(r.fark)<0.1
                                      ?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.08)',
                                    color:Math.abs(r.fark)<0.1?'#059669':'#DC2626',
                                    fontWeight:700}}>
                                    {r.fark>0?'+':''}{r.fark.toFixed(2)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}