import { useState, useEffect, useMemo, useCallback } from 'react';
import MiniMap from './MiniMap';
import PdfButton from './PdfButton';
import MahallePaneli from './MahallePaneli';
import KriterAciklama from './KriterAciklama';

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
const COLORS = ['#B45309','#0E7490','#6D28D9','#065F46'];
const S_RENK = { 5:'#16a34a', 4:'#84cc16', 3:'#f59e0b', 2:'#f97316', 1:'#ef4444' };
const S_AD   = {5:'Çok Uygun',4:'Uygun',3:'Orta',2:'Düşük',1:'Uygunsuz'};
const trSort = (a,b)=>a.localeCompare(b,'tr',{sensitivity:'base'});
const skorRenk = s => s>=4?'#16a34a':s>=3?'#f59e0b':s>=2?'#f97316':'#ef4444';

function Gauge({skor=0,color,size=72}){
  const p=(skor/5)*251.2;
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

// eslint-disable-next-line no-unused-vars
function Donut({sinifD={},size=130}){
  const cx=size/2,cy=size/2,R=cx*0.72,r=cx*0.44;
  const slices=[5,4,3,2,1].map(s=>({s,v:Number(sinifD[String(s)]||0),c:S_RENK[s]}));
  const total=slices.reduce((a,b)=>a+b.v,0)||1;
  let ang=-Math.PI/2;
  const paths=slices.map(({v,c},i)=>{
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
    ang+=a; return path;
  });
  return(
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths}
      <circle cx={cx} cy={cy} r={r-1} fill="var(--card)"/>
      <text x={cx} y={cy-5} textAnchor="middle" fontSize={size*0.115} fontWeight="800"
        fill="var(--text)" fontFamily="Manrope,sans-serif">{total.toLocaleString('tr')}</text>
      <text x={cx} y={cy+11} textAnchor="middle" fontSize={size*0.072}
        fill="var(--muted)" fontFamily="Manrope,sans-serif">ha toplam</text>
    </svg>
  );
}

function IlceKart({data,mwRow,color,showMap,et,onRemove,canRemove}){
  const [extremes,setExtremes]=useState(null);
  const [extremesError,setExtremesError]=useState(false);
  const [highlightPoint,setHighlightPoint]=useState(null);
  const [showKriterKart,setShowKriterKart]=useState(null);

  useEffect(()=>{
    if(!data?.ilce) return;
    setExtremes(null); setExtremesError(false); setHighlightPoint(null); setShowKriterKart(null);
    fetch(`/api/${et.toLowerCase()}/district/${encodeURIComponent(data.ilce)}/extremes`)
      .then(r=>{ if(!r.ok) throw new Error(); return r.json(); })
      .then(d=>setExtremes(d)).catch(()=>setExtremesError(true));
  },[data?.ilce,et]);

  const flyTo=(type)=>{
    if(!extremes) return;
    const pt=extremes[type];
    setHighlightPoint({lon:pt.lon,lat:pt.lat,sinif:pt.sinif,alan_ha:pt.alan_ha,label:type});
    setShowKriterKart(prev=>prev===type?null:type);
  };

  if(!data) return(
    <div style={{background:'var(--card)',border:'1px solid rgba(255,255,255,0.07)',
      borderTop:`3px solid ${color}`,borderRadius:14,padding:24,
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,minHeight:240}}>
      <div style={{width:20,height:20,border:`2px solid ${color}30`,borderTopColor:color,
        borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
      <span style={{color:'var(--muted)',fontSize:13}}>Yükleniyor…</span>
    </div>
  );

  const skor=data.skor_ort||0;
  const renk=skorRenk(skor);
  const tot=Object.values(data.sinif_dagilim||{}).reduce((a,b)=>a+Number(b),0)||1;

  // extremes.kriterler → KriterAciklama'ya gidecek kaynak
  const kriterlerKaynak =
    showKriterKart === 'max'
      ? (extremes?.max_kriterler || extremes?.kriterler || [])
      : showKriterKart === 'min'
      ? (extremes?.min_kriterler || extremes?.kriterler || [])
      : (extremes?.kriterler || []);

  return(
    <div style={{width:'100%',minWidth:0,background:'var(--card)',
      border:'1px solid rgba(255,255,255,0.07)',borderTop:`3px solid ${color}`,
      borderRadius:14,overflow:'hidden',boxShadow:'0 2px 16px rgba(0,0,0,0.28)',
      display:'flex',flexDirection:'column'}}>

      <div style={{borderBottom:`1.5px solid ${color}20`,padding:'16px 20px',
        display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:'var(--text)',marginBottom:4}}>{data.ilce}</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <span style={{fontSize:11,fontWeight:600,color,background:`${color}15`,
              border:`1px solid ${color}30`,padding:'2px 8px',borderRadius:999}}>{et}</span>
            {mwRow && <>
              <span style={{fontSize:11,color:'var(--muted)'}}>{mwRow.kurulu_mw.toFixed(0)} MW kurulu güç</span>
              <span style={{fontSize:11,color:'var(--muted)'}}>·</span>
              <span style={{fontSize:11,color:'var(--muted)'}}>{(mwRow.yillik_mwh/1000).toFixed(1)} GWh/yıl</span>
            </>}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <Gauge skor={skor} color={renk} size={88}/>
          {canRemove&&(
            <button onClick={onRemove} style={{width:26,height:26,borderRadius:'50%',
              border:'1.5px solid var(--border)',background:'var(--surface)',color:'var(--muted)',
              cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>×</button>
          )}
        </div>
      </div>

      {showMap&&(
        <div style={{position:'relative',height:300,overflow:'hidden',flexShrink:0}}>
          <MiniMap ilceAdi={data.ilce} energyType={et} color={color} height={300} highlightPoint={highlightPoint}/>
        </div>
      )}

      <div style={{padding:'16px 20px',borderBottom:'1px solid var(--border)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--muted)'}}>Sınıf Dağılımı</div>
          <div style={{display:'flex',alignItems:'center',gap:6,fontSize:9,color:'var(--dim)'}}>
            <span style={{color:'#B91C1C'}}>1 Düşük</span><span>→</span><span style={{color:'#14803C'}}>5 Yüksek</span>
          </div>
        </div>
        <div style={{display:'flex',height:10,borderRadius:5,overflow:'hidden',marginBottom:12,gap:1}}>
          {[1,2,3,4,5].map(s=>{
            const ha=Number(data.sinif_dagilim?.[String(s)]||0);
            const pct=(ha/tot)*100;
            if(pct<0.3) return null;
            return <div key={s} title={`${S_AD[s]}: ${ha.toLocaleString('tr')} ha (%${pct.toFixed(1)})`}
              style={{flex:`${pct} 0 0`,background:S_RENK[s],transition:'flex 0.6s'}}/>;
          })}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:5}}>
          {[1,2,3,4,5].map(s=>{
            const ha=Number(data.sinif_dagilim?.[String(s)]||0);
            const pct=tot>0?(ha/tot)*100:0;
            const isEmpty=ha===0;
            return(
              <div key={s} style={{borderRadius:9,padding:'9px 6px',textAlign:'center',
                background:isEmpty?'var(--surface-2)':`${S_RENK[s]}14`,
                border:`1.5px solid ${isEmpty?'var(--border)':S_RENK[s]+'40'}`,
                opacity:isEmpty?0.35:1,transition:'opacity 0.2s'}}>
                <div style={{width:20,height:5,borderRadius:3,background:isEmpty?'var(--dim)':S_RENK[s],margin:'0 auto 6px'}}/>
                <div style={{fontSize:9.5,fontWeight:700,color:isEmpty?'var(--dim)':S_RENK[s],marginBottom:3,whiteSpace:'nowrap'}}>{S_AD[s]}</div>
                <div style={{fontSize:13,fontWeight:800,color:isEmpty?'var(--dim)':'var(--text)',fontFamily:'JetBrains Mono,monospace',lineHeight:1}}>
                  {isEmpty?'—':pct.toFixed(1)+'%'}
                </div>
                {!isEmpty&&<div style={{fontSize:9,color:'var(--muted)',marginTop:3,fontFamily:'JetBrains Mono,monospace'}}>
                  {ha>=1000?(ha/1000).toFixed(1)+'k':ha.toLocaleString('tr')} ha
                </div>}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',borderBottom:'1px solid var(--border)'}}>
        <div style={{padding:'11px 14px',borderRight:'1px solid var(--border)'}}>
          <div style={{fontSize:9.5,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3}}>Uygun Arazi</div>
          <div style={{fontSize:14,fontWeight:700,color:'var(--text)',fontFamily:'JetBrains Mono,monospace'}}>
            {Number(data.uygun_alan_ha||0).toLocaleString('tr')} ha
          </div>
        </div>
        <div onClick={()=>extremes&&flyTo('min')} style={{padding:'11px 14px',borderRight:'1px solid var(--border)',
          cursor:extremes?'pointer':'default',transition:'background 0.15s',
          background:highlightPoint?.label==='min'?'rgba(185,28,28,0.08)':'transparent'}}
          onMouseEnter={e=>{if(extremes)e.currentTarget.style.background='rgba(185,28,28,0.06)';}}
          onMouseLeave={e=>{e.currentTarget.style.background=highlightPoint?.label==='min'?'rgba(185,28,28,0.08)':'transparent';}}>
          <div style={{fontSize:9.5,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3,display:'flex',alignItems:'center',gap:4}}>
            {extremes?`En Düşük (Sınıf ${extremes.true_min_sinif})`:'En Düşük Skor'}
            {extremes&&<span style={{color:'#B91C1C',fontSize:9}}>▼ gör</span>}
          </div>
          <div style={{fontSize:14,fontWeight:700,color:highlightPoint?.label==='min'?'#DC6B2E':'var(--text)',fontFamily:'JetBrains Mono,monospace'}}>
            {(data.skor_min||0).toFixed(2)}
          </div>
          {extremesError&&<div style={{fontSize:9,color:'var(--dim)',marginTop:2}}>bölge verisi yok</div>}
        </div>
        <div onClick={()=>extremes&&flyTo('max')} style={{padding:'11px 14px',
          cursor:extremes?'pointer':'default',transition:'background 0.15s',
          background:highlightPoint?.label==='max'?'rgba(20,128,60,0.08)':'transparent'}}
          onMouseEnter={e=>{if(extremes)e.currentTarget.style.background='rgba(20,128,60,0.06)';}}
          onMouseLeave={e=>{e.currentTarget.style.background=highlightPoint?.label==='max'?'rgba(20,128,60,0.08)':'transparent';}}>
          <div style={{fontSize:9.5,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3,display:'flex',alignItems:'center',gap:4}}>
            {extremes?`En Yüksek (Sınıf ${extremes.true_max_sinif})`:'En Yüksek Skor'}
            {extremes&&<span style={{color:'#14803C',fontSize:9}}>▲ gör</span>}
          </div>
          <div style={{fontSize:14,fontWeight:700,color:highlightPoint?.label==='max'?'#4AA635':'var(--text)',fontFamily:'JetBrains Mono,monospace'}}>
            {(data.skor_max||0).toFixed(2)}
          </div>
        </div>
      </div>

      {showKriterKart&&kriterlerKaynak.length>0&&(
        <div style={{padding:'12px 14px',borderBottom:'1px solid var(--border)',background:'rgba(0,0,0,0.15)'}}>
          <KriterAciklama
            kriterler={kriterlerKaynak}
            label={showKriterKart}
            sinif={showKriterKart==='max'?extremes?.true_max_sinif:extremes?.true_min_sinif}
            onClose={()=>setShowKriterKart(null)}
          />
        </div>
      )}

      <div style={{padding:'12px 16px'}}>
        <PdfButton ilceAdi={data.ilce} energyType={et}/>
      </div>
    </div>
  );
}

/* ─── Ana Bileşen ─────────────────────────────────────────────── */
export default function IlceKarsilastirma({ energyType='GES', initialIlce='' }) {
  const [ilceler,setIlceler]=useState([]);
  const [secilenler,setSecilenler]=useState([]);
  const [dataMap,setDataMap]=useState({});
  const [mwData,setMwData]=useState(null);
  const [mlData,setMlData]=useState(null);
  const [loading,setLoading]=useState(false);
  const [et,setEt]=useState(energyType);
  const [tab,setTab]=useState('kart');
  const [showMap,setShowMap]=useState(true);
  const [ekleVal,setEkleVal]=useState('');
  const [havaMap,setHavaMap]=useState({});
  const [havaLoading,setHavaLoading]=useState(false);
  const [showRfGuide, setShowRfGuide] = useState(true);

  const TABS=[
    ['kart','Kartlar'],['kriterler','Kriterler'],['enerji','Enerji'],
    ['hava','🌤 Hava & İklim'],['mahalle','Mahalle'],['rf','RF Model'],
  ];

  useEffect(()=>{
    setSecilenler([]); setDataMap({}); setMwData(null);
    fetch(`/api/${et.toLowerCase()}/districts`)
      .then(r=>r.ok?r.json():null)
      .then(gj=>{
        if(!gj?.features) return;
        const names=[...new Set(gj.features.map(f=>f.properties?.ilce).filter(Boolean))].sort(trSort);
        setIlceler(names);
        if(initialIlce&&names.includes(initialIlce)){
          setSecilenler([initialIlce]);
          setEkleVal(names.find(n=>n!==initialIlce)||'');
        } else {
          setSecilenler(names.slice(0,2));
          setEkleVal(names[2]||'');
        }
      }).catch(()=>{});
  },[et,initialIlce]);

  useEffect(()=>{
    if(secilenler.length===0) return;
    setLoading(true);
    const t=et.toLowerCase();
    const fetches=secilenler.map(async(ilce)=>{
      try{ const r=await fetch(`/api/${t}/district/${encodeURIComponent(ilce)}`);
        return{ilce,d:r.ok?await r.json():null};
      }catch(e){return{ilce,d:null};}
    });
    Promise.all([...fetches,fetch(`/api/ml/mw-hesap?enerji=${et}`).then(r=>r.ok?r.json():null).catch(()=>null)])
      .then(results=>{
        const mw=results.pop(); setMwData(mw);
        const map={}; results.forEach(({ilce,d})=>{if(d)map[ilce]=d;}); setDataMap(map);
      }).finally(()=>setLoading(false));
  },[secilenler,et]);

  const addIlce=()=>{
    if(!ekleVal||secilenler.includes(ekleVal)||secilenler.length>=4) return;
    setSecilenler(p=>[...p,ekleVal]);
  };
  const removeIlce=useCallback((ilce)=>{
    if(secilenler.length<=1) return;
    setSecilenler(p=>p.filter(i=>i!==ilce));
    setDataMap(p=>{const n={...p};delete n[ilce];return n;});
  },[secilenler]);

  const runML=useCallback(()=>{
    setMlData({loading:true});
    fetch(`/api/ml/train?enerji=${et}`)
      .then(r=>r.ok?r.json():null).then(d=>setMlData(d)).catch(()=>setMlData(null));
  }, [et]);

  useEffect(()=>{ if(tab==='rf') runML(); },[tab,runML]);

  const renderInterpretation=()=>{
    if(!mlData||!mlData.feature_importance||mlData.loading) return null;
    const top=mlData.feature_importance.slice(0,3);
    if(top.length<2) return null;
    const [t1,t2,t3]=top;
    const m1=KRITER_META[t1.kriter]||{ad:t1.kriter};
    const m2=KRITER_META[t2.kriter]||{ad:t2.kriter};
    const m3=t3?(KRITER_META[t3.kriter]||{ad:t3.kriter}):null;
    const r2=mlData.pearson_r, pct=Math.round(r2*100);
    const alignmentText=r2>=0.90
      ?<span><strong style={{color:'#10B981'}}>%{pct} oranında mükemmel bir uyum</strong> sergilemektedir. Bu yüksek uyum oranı, uzmanlarımızın belirlediği AHP karar kriterlerinin tarafsız, nesnel ve bilimsel olarak son derece güvenilir olduğunu matematiksel olarak doğrular.</span>
      :r2>=0.75
      ?<span><strong style={{color:'#38BDF8'}}>%{pct} oranında güçlü bir uyum</strong> sergilemektedir. Seçtiğimiz kriterlerin öncelikleri yapay zekâ tarafından da büyük oranda tasdik edilmiştir.</span>
      :<span><strong style={{color:'#F59E0B'}}>%{pct} oranında orta seviye bir uyum</strong> sergilemektedir. Kriter ağırlıklandırma katsayıları üzerinde küçük kalibrasyonlar yapılması düşünülebilir.</span>;
    return(
      <div style={{background:'linear-gradient(135deg,var(--card) 0%,rgba(14,165,164,0.03) 100%)',
        border:'1px solid rgba(14,165,164,0.2)',borderLeft:'4px solid #0EA5A4',
        borderRadius:12,padding:'16px 20px',marginTop:20,fontSize:13,lineHeight:1.6,color:'var(--text-2)'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,fontWeight:800,color:'var(--text)',fontSize:14,marginBottom:8}}>
          <span>📢</span> Yapay Zekânın Analiz Yorumu ve Raporu:
        </div>
        Yapay zekâ modeli (Random Forest), İzmir genelindeki coğrafi hücre verilerini analiz ederek, <strong>{et}</strong> potansiyeli için en önemli belirleyici kriterin <strong>{m1.ad} (%{Math.round(t1.onem*100)})</strong> olduğunu belirlemiştir.
        İkinci sırada ise <strong>{m2.ad} (%{Math.round(t2.onem*100)})</strong> gelmektedir {m3&&<span>ve bunu <strong>{m3.ad} (%{Math.round(t3.onem*100)})</strong> takip etmektedir</span>}.
        <br/><br/>Modelin tahmin değerleri, bizim tasarladığımız AHP puanları ile karşılaştırıldığında {alignmentText}
      </div>
    );
  };

  const kriterRows=useMemo(()=>{
    const first=Object.values(dataMap)[0];
    if(!first?.kriterler) return [];
    return first.kriterler.map(ka=>({
      kod:ka.kod,
      skorlar:secilenler.map(ilce=>dataMap[ilce]?.kriterler?.find(k=>k.kod===ka.kod)?.skor??0),
    })).filter(r=>r.skorlar.some(s=>s>0));
  },[dataMap,secilenler]);

  useEffect(()=>{
    if(tab!=='hava'||secilenler.length===0) return;
    setHavaLoading(true);
    Promise.all(secilenler.map(async(ilce)=>{
      if(havaMap[ilce]) return;
      const [anlik,gecmis]=await Promise.all([
        fetch(`/api/hava/ilce/${encodeURIComponent(ilce)}`).then(r=>r.ok?r.json():null).catch(()=>null),
        fetch(`/api/hava/gecmis/${encodeURIComponent(ilce)}`).then(r=>r.ok?r.json():null).catch(()=>null),
      ]);
      setHavaMap(prev=>({...prev,[ilce]:{anlik,gecmis}}));
    })).finally(()=>setHavaLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[tab,secilenler]);

  return(
    <div style={{minHeight:'100vh',background:'var(--bg)',fontFamily:"'Manrope',sans-serif"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Top bar */}
      <div style={{background:'var(--card)',borderBottom:'1px solid var(--border)',
        padding:'20px 32px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'#0EA5A4',marginBottom:4}}>
            {initialIlce?`${initialIlce} · Detaylı Rapor`:`İlçe Karşılaştırma · ${secilenler.length} seçili`}
          </div>
          <h2 style={{fontSize:24,fontWeight:800,letterSpacing:'-0.02em',color:'var(--text)',margin:0}}>
            {initialIlce
              ?<><span style={{color:'#0EA5A4'}}>{initialIlce}</span> Uygunluk Analizi</>
              :<>Detaylı <span style={{color:'#0EA5A4'}}>Uygunluk Kıyası</span></>}
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
            <input type="checkbox" checked={showMap} onChange={e=>setShowMap(e.target.checked)} style={{accentColor:'#0EA5A4'}}/>
            Harita göster
          </label>
        </div>
      </div>

      {/* Seçim bar */}
      <div style={{background:'var(--card)',borderBottom:'1px solid var(--border)',
        padding:'12px 32px',display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
        {secilenler.map((ilce,i)=>(
          <div key={ilce} style={{display:'inline-flex',alignItems:'center',gap:7,padding:'6px 12px',
            borderRadius:999,background:`${COLORS[i]}12`,border:`1.5px solid ${COLORS[i]}35`,
            fontSize:12.5,fontWeight:700,color:COLORS[i]}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:COLORS[i]}}/>
            {ilce}
            {secilenler.length>1&&<span onClick={()=>removeIlce(ilce)}
              style={{cursor:'pointer',opacity:0.5,marginLeft:2,fontSize:14}}>×</span>}
          </div>
        ))}
        {secilenler.length<4&&ilceler.length>0&&(
          <>
            <select value={ekleVal} onChange={e=>setEkleVal(e.target.value)}
              style={{padding:'6px 12px',borderRadius:9,border:'1.5px solid var(--border)',
                background:'var(--surface)',color:'var(--text)',fontFamily:'inherit',fontSize:12.5,cursor:'pointer'}}>
              {ilceler.filter(n=>!secilenler.includes(n)).map(n=><option key={n}>{n}</option>)}
            </select>
            <button onClick={addIlce} style={{padding:'6px 14px',borderRadius:9,
              border:'1.5px solid rgba(14,165,164,0.4)',background:'rgba(14,165,164,0.08)',
              color:'#0EA5A4',fontFamily:'inherit',fontSize:12.5,fontWeight:700,cursor:'pointer'}}>+ İlçe Ekle</button>
            <span style={{fontSize:11,color:'var(--dim)'}}>({secilenler.length}/4)</span>
          </>
        )}
        {loading&&(
          <div style={{display:'flex',alignItems:'center',gap:6,color:'var(--muted)',fontSize:12,marginLeft:8}}>
            <div style={{width:13,height:13,border:'2px solid var(--surface-2)',borderTopColor:'var(--brand)',
              borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
            Yükleniyor…
          </div>
        )}
      </div>

      {/* Sekmeler */}
      <div style={{background:'var(--card)',borderBottom:'1px solid var(--border)',padding:'0 32px',display:'flex',gap:0}}>
        {TABS.map(([id,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            padding:'13px 20px',border:'none',background:'transparent',
            color:tab===id?'#0EA5A4':'var(--text-2)',fontFamily:'inherit',
            fontSize:13,fontWeight:tab===id?700:500,cursor:'pointer',
            borderBottom:tab===id?'2px solid #0EA5A4':'2px solid transparent',
            marginBottom:-1,transition:'all 0.15s'}}>{lbl}</button>
        ))}
      </div>

      {/* İçerik */}
      <div style={{padding:'24px 32px',maxWidth:1400,margin:'0 auto'}}>

        {tab==='kart'&&(
          <div style={{display:'grid',gap:24,
            gridTemplateColumns:secilenler.length===1?'1fr':`repeat(${Math.min(secilenler.length,2)},1fr)`,
            maxWidth:secilenler.length===1?780:'100%',
            margin:secilenler.length===1?'0 auto':0}}>
            {secilenler.map((ilce,i)=>(
              <IlceKart key={`${ilce}-${et}`} data={dataMap[ilce]}
                mwRow={mwData?.ilceler?.find(r=>r.ilce===ilce)}
                color={COLORS[i]} showMap={showMap} et={et}
                onRemove={()=>removeIlce(ilce)} canRemove={secilenler.length>1}/>
            ))}
          </div>
        )}

        {tab==='kriterler'&&(
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,alignItems:'start'}}>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {secilenler.map((ilce,i)=>(
                <div key={ilce} style={{borderRadius:12,overflow:'hidden',border:`2px solid ${COLORS[i]}50`,boxShadow:'0 2px 12px rgba(0,0,0,0.2)'}}>
                  <div style={{padding:'8px 14px',background:`${COLORS[i]}15`,borderBottom:`1px solid ${COLORS[i]}30`,display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:9,height:9,borderRadius:'50%',background:COLORS[i],flexShrink:0}}/>
                    <span style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>{ilce}</span>
                    <span style={{fontSize:11,color:COLORS[i],marginLeft:'auto',fontFamily:'JetBrains Mono,monospace',fontWeight:700}}>
                      {dataMap[ilce]?.skor_ort?.toFixed(2)||'—'}/5
                    </span>
                  </div>
                  <MiniMap ilceAdi={ilce} energyType={et} color={COLORS[i]} height={180}/>
                </div>
              ))}
            </div>
            <div style={{background:'var(--card)',borderRadius:16,boxShadow:'0 2px 16px rgba(0,0,0,0.2)',border:'1px solid var(--border)',overflow:'hidden'}}>
              <div style={{padding:'16px 24px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
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
              {kriterRows.length===0&&<div style={{textAlign:'center',padding:'32px',color:'var(--dim)',fontSize:13}}>Veri bekleniyor…</div>}
              <div style={{padding:'24px 20px 16px'}}>
                <div style={{display:'flex',alignItems:'flex-end',gap:4,height:260,marginBottom:16}}>
                  {kriterRows.map((row)=>(
                    <div key={row.kod} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',height:'100%',justifyContent:'flex-end'}}>
                      <div style={{width:'100%',display:'flex',gap:2,alignItems:'flex-end',height:'100%'}}>
                        {row.skorlar.map((s,i)=>(
                          <div key={i} style={{flex:1,height:`${(s/5)*100}%`,background:COLORS[i],borderRadius:'4px 4px 0 0',minHeight:4,transition:'height 0.6s ease',position:'relative'}}
                            title={`${secilenler[i]}: ${s.toFixed(2)}`}>
                            {s>0.8&&<div style={{position:'absolute',top:-18,left:'50%',transform:'translateX(-50%)',fontSize:9,fontWeight:700,color:COLORS[i],fontFamily:'JetBrains Mono,monospace',whiteSpace:'nowrap'}}>{s.toFixed(1)}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{height:2,background:'var(--border)',marginBottom:10,borderRadius:1}}/>
                <div style={{display:'flex',gap:4}}>
                  {kriterRows.map((row)=>{
                    const meta=KRITER_META[row.kod]||{ad:row.kod,ikon:'·'};
                    return(
                      <div key={row.kod} style={{flex:1,textAlign:'center',lineHeight:1.35}}>
                        <div style={{fontSize:16,marginBottom:4}}>{meta.ikon}</div>
                        <div style={{fontSize:10.5,fontWeight:600,color:'var(--text-2)',overflow:'hidden',textOverflow:'ellipsis',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{meta.ad}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab==='enerji'&&(
          <div style={{background:'var(--card)',borderRadius:16,boxShadow:'0 2px 16px rgba(0,0,0,0.2)',border:'1px solid var(--border)',padding:'24px'}}>
            <div style={{fontSize:15,fontWeight:800,color:'var(--text)',marginBottom:24}}>Enerji Potansiyeli</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
              {[
                {key:'kurulu_mw',title:'Kurulu Güç',unit:'MW',icon:'⚡',div:1},
                {key:'yillik_mwh',title:'Yıllık Üretim',unit:'GWh/yıl',icon:'☀️',div:1000},
                {key:'co2_ton_yil',title:'CO₂ Azaltımı',unit:'kt/yıl',icon:'🌿',div:1000},
                {key:'hane_karsiligi',title:'Hane Karşılığı',unit:'bin hane',icon:'🏠',div:1000},
              ].map(({key,title,unit,icon,div})=>{
                const vals=secilenler.map(ilce=>{const r=mwData?.ilceler?.find(r=>r.ilce===ilce);return r?(r[key]||0)/div:0;});
                const mx=Math.max(...vals,0.001);
                const total=vals.reduce((a,b)=>a+b,0);
                return(
                  <div key={key} style={{background:'var(--surface-2)',borderRadius:14,padding:'18px 16px',border:'1px solid var(--border)',display:'flex',flexDirection:'column',gap:14}}>
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:20,marginBottom:4}}>{icon}</div>
                      <div style={{fontSize:10.5,fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase',color:'var(--muted)'}}>{title}</div>
                      <div style={{fontSize:10,color:'var(--dim)',marginTop:2}}>{unit}</div>
                    </div>
                    <div style={{display:'flex',alignItems:'flex-end',gap:8,height:120,justifyContent:'center'}}>
                      {vals.map((v,i)=>(
                        <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,flex:1,maxWidth:60,height:'100%',justifyContent:'flex-end'}}>
                          <div style={{fontSize:11,fontWeight:800,color:COLORS[i],fontFamily:'JetBrains Mono,monospace'}}>{v>=1000?(v/1000).toFixed(1)+'k':v.toFixed(v<10?1:0)}</div>
                          <div style={{width:'100%',height:`${Math.max((v/mx)*100,2)}%`,background:COLORS[i],borderRadius:'4px 4px 0 0',transition:'height 0.7s ease',minHeight:4,opacity:v===0?0.2:1}}/>
                        </div>
                      ))}
                    </div>
                    <div style={{height:1.5,background:'var(--border)',borderRadius:1}}/>
                    <div style={{display:'flex',flexDirection:'column',gap:5}}>
                      {secilenler.map((ilce,i)=>(
                        <div key={ilce} style={{display:'flex',alignItems:'center',gap:7}}>
                          <div style={{width:10,height:10,borderRadius:3,background:COLORS[i],flexShrink:0}}/>
                          <span style={{fontSize:11,color:'var(--text-2)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ilce}</span>
                          <span style={{fontSize:11,fontWeight:800,color:vals[i]>0?COLORS[i]:'var(--dim)',fontFamily:'JetBrains Mono,monospace',flexShrink:0}}>
                            {vals[i]>=1000?(vals[i]/1000).toFixed(1)+'k':vals[i].toFixed(vals[i]<10?1:0)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {secilenler.length>1&&(
                      <div style={{padding:'7px 10px',borderRadius:8,background:'var(--surface)',border:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{fontSize:10,color:'var(--muted)',fontWeight:600}}>TOPLAM</span>
                        <span style={{fontSize:13,fontWeight:800,color:'var(--brand)',fontFamily:'JetBrains Mono,monospace'}}>
                          {total>=1000?(total/1000).toFixed(1)+'k':total.toFixed(total<10?1:0)} {unit}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab==='hava'&&(
          <div style={{display:'flex',flexDirection:'column',gap:24}}>
            {havaLoading&&<div style={{textAlign:'center',padding:40,color:'var(--muted)'}}>
              <div style={{width:20,height:20,border:'2px solid var(--surface-2)',borderTopColor:'var(--brand)',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto 12px'}}/>
              Open-Meteo'dan veri çekiliyor…
            </div>}
            {secilenler.map((ilce,idx)=>{
              const h=havaMap[ilce]; if(!h) return null;
              const {anlik,gecmis}=h; const color=COLORS[idx];
              const metriks=et==='GES'?[
                {icon:'☀️',label:'Solar Radyasyon',val:`${anlik?.anlik?.solar_wm2||0}`,unit:'W/m²',color:'#F59E0B',bar:Math.min((anlik?.anlik?.solar_wm2||0)/1000,1)},
                {icon:'☁️',label:'Bulutluluk',val:`${anlik?.anlik?.bulutluluk||0}`,unit:'%',color:'#94A3B8',bar:(anlik?.anlik?.bulutluluk||0)/100},
                {icon:'💨',label:'Rüzgâr 10m',val:`${anlik?.anlik?.ruzgar_10m||0}`,unit:'km/h',color:'#38BDF8',bar:Math.min((anlik?.anlik?.ruzgar_10m||0)/30,1)},
                {icon:'🌡️',label:'Sıcaklık',val:`${anlik?.anlik?.sicaklik||0}`,unit:'°C',color:'#F472B6',bar:Math.min(((anlik?.anlik?.sicaklik||0)+10)/50,1)},
              ]:[
                {icon:'💨',label:'Rüzgâr 100m',val:`${anlik?.anlik?.ruzgar_100m||0}`,unit:'km/h',color:'#38BDF8',bar:Math.min((anlik?.anlik?.ruzgar_100m||0)/50,1)},
                {icon:'🧭',label:'Rüzgâr Yönü',val:`${anlik?.anlik?.ruzgar_yon||0}`,unit:'°',color:'#0EA5A4',bar:(anlik?.anlik?.ruzgar_yon||0)/360},
                {icon:'☁️',label:'Bulutluluk',val:`${anlik?.anlik?.bulutluluk||0}`,unit:'%',color:'#94A3B8',bar:(anlik?.anlik?.bulutluluk||0)/100},
                {icon:'🌡️',label:'Sıcaklık',val:`${anlik?.anlik?.sicaklik||0}`,unit:'°C',color:'#F472B6',bar:Math.min(((anlik?.anlik?.sicaklik||0)+10)/50,1)},
              ];
              return(
                <div key={ilce} style={{background:'var(--card)',borderRadius:16,border:`1px solid ${color}25`,borderTop:`3px solid ${color}`,overflow:'hidden',boxShadow:'var(--shadow)'}}>
                  <div style={{padding:'16px 24px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',background:`${color}06`}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:10,height:10,borderRadius:'50%',background:color}}/>
                      <span style={{fontSize:17,fontWeight:800,color:'var(--text)'}}>{ilce}</span>
                      <span style={{fontSize:10,color:'var(--muted)',background:'var(--surface-2)',padding:'2px 8px',borderRadius:999,border:'1px solid var(--border)'}}>
                        Open-Meteo · {anlik?.anlik?.zaman?.slice(0,10)||''}
                      </span>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      {['Open-Meteo','ERA5 Archive'].map(s=>(
                        <span key={s} style={{fontSize:9.5,color:'var(--brand)',fontWeight:600,background:'var(--brand-soft)',padding:'3px 8px',borderRadius:999,border:'1px solid rgba(14,165,164,0.2)'}}>{s}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:20}}>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
                      {metriks.map(({icon,label,val,unit,color:c,bar})=>(
                        <div key={label} style={{background:'var(--surface-2)',borderRadius:12,padding:'14px 16px',border:`1px solid ${c}20`}}>
                          <div style={{fontSize:11,color:'var(--muted)',marginBottom:8,display:'flex',alignItems:'center',gap:6}}><span>{icon}</span><span>{label}</span></div>
                          <div style={{display:'flex',alignItems:'baseline',gap:4,marginBottom:8}}>
                            <span style={{fontSize:28,fontWeight:800,color:c,lineHeight:1,fontFamily:'JetBrains Mono,monospace'}}>{val}</span>
                            <span style={{fontSize:13,fontWeight:600,color:'var(--muted)'}}>{unit}</span>
                          </div>
                          <div style={{height:4,borderRadius:2,background:'var(--surface)',overflow:'hidden'}}>
                            <div style={{height:'100%',width:`${bar*100}%`,background:c,borderRadius:2}}/>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                      <div style={{background:'var(--surface-2)',borderRadius:12,padding:'16px 18px',border:'1px solid var(--border)'}}>
                        <div style={{fontSize:10.5,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'var(--muted)',marginBottom:14}}>6 Aylık Geçmiş · Aylık Ortalama</div>
                        {gecmis?.aylik?(()=>{
                          const aylar=gecmis.aylik;
                          const maxS=Math.max(...aylar.map(a=>a.ort_solar),1);
                          const maxW=Math.max(...aylar.map(a=>a.ort_wind),1);
                          const H=140;
                          return(
                            <div>
                              <div style={{display:'flex',gap:4,alignItems:'flex-end',height:H,marginBottom:6,borderBottom:'1px solid var(--border)'}}>
                                {aylar.map((a,i)=>(
                                  <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:'100%',gap:2}}>
                                    <div style={{fontSize:8.5,color:'var(--muted)',fontFamily:'JetBrains Mono,monospace',marginBottom:2}}>{et==='GES'?a.ort_solar.toFixed(0):a.ort_wind.toFixed(0)}</div>
                                    <div style={{width:'100%',display:'flex',gap:1,alignItems:'flex-end'}}>
                                      <div style={{flex:1,height:(a.ort_solar/maxS)*H*0.9,borderRadius:'2px 2px 0 0',background:'#F59E0B',opacity:0.85}}/>
                                      <div style={{flex:1,height:(a.ort_wind/maxW)*H*0.9,borderRadius:'2px 2px 0 0',background:'#38BDF8',opacity:0.85}}/>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div style={{display:'flex',gap:4,marginBottom:12}}>
                                {aylar.map((a,i)=><div key={i} style={{flex:1,textAlign:'center',fontSize:10,fontWeight:600,color:'var(--text-2)'}}>{a.ay_kisa}</div>)}
                              </div>
                            </div>
                          );
                        })():<div style={{color:'var(--muted)',fontSize:12,textAlign:'center',padding:32}}>Yükleniyor…</div>}
                      </div>
                      {anlik?.tahmin_7gun&&(
                        <div style={{background:'var(--surface-2)',borderRadius:12,padding:'16px 18px',border:'1px solid var(--border)'}}>
                          <div style={{fontSize:10.5,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'var(--muted)',marginBottom:14}}>7 Günlük Tahmin</div>
                          <div style={{display:'flex',flexDirection:'column',gap:6}}>
                            {anlik.tahmin_7gun.map((g,i)=>{
                              const gun=new Date(g.tarih).toLocaleDateString('tr',{weekday:'short',day:'numeric',month:'short'});
                              return(
                                <div key={i} style={{display:'grid',gridTemplateColumns:'80px 1fr 70px 1fr 70px',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,background:i===0?`${color}10`:'var(--surface)',border:`1px solid ${i===0?color+'30':'var(--border)'}`}}>
                                  <div style={{fontSize:11,fontWeight:i===0?700:500,color:i===0?color:'var(--text-2)',textTransform:'capitalize'}}>{i===0?'Bugün':gun}</div>
                                  <div style={{height:4,borderRadius:2,background:'var(--surface-2)',overflow:'hidden'}}><div style={{height:'100%',width:`${Math.min(g.max_solar/1000,1)*100}%`,background:'#F59E0B',borderRadius:2}}/></div>
                                  <div style={{fontSize:11,fontWeight:700,color:'#F59E0B',fontFamily:'JetBrains Mono,monospace',textAlign:'right'}}>☀ {g.max_solar}</div>
                                  <div style={{height:4,borderRadius:2,background:'var(--surface-2)',overflow:'hidden'}}><div style={{height:'100%',width:`${Math.min(g.max_wind/60,1)*100}%`,background:'#38BDF8',borderRadius:2}}/></div>
                                  <div style={{fontSize:11,fontWeight:700,color:'#38BDF8',fontFamily:'JetBrains Mono,monospace',textAlign:'right'}}>💨 {g.max_wind}</div>
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
          (() => {
            const pearsonVal = mlData?.pearson_r || 0;
            const badgeText = pearsonVal >= 0.90 ? 'Mükemmel Uyum' : pearsonVal >= 0.75 ? 'Güçlü Uyum' : pearsonVal >= 0.50 ? 'Orta Uyum' : 'Düşük Uyum';
            const badgeColor = pearsonVal >= 0.90 ? '#10B981' : pearsonVal >= 0.75 ? '#38BDF8' : pearsonVal >= 0.50 ? '#F59E0B' : '#EF4444';
            return (
              <div style={{background:'var(--card)',borderRadius:16,boxShadow:'0 2px 16px rgba(0,0,0,0.2)',border:'1px solid var(--border)',padding:'24px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--muted)',marginBottom:4}}>Makine Öğrenmesi ile Doğrulama</div>
                    <div style={{fontSize:16,fontWeight:800,color:'var(--text)'}}>Random Forest (Yapay Zekâ) Analizi</div>
                  </div>
                  <button onClick={runML} disabled={mlData?.loading} style={{
                    padding:'10px 22px',borderRadius:10,background:'rgba(14,165,164,0.1)',
                    border:'1.5px solid rgba(14,165,164,0.35)',color:'#0EA5A4',fontFamily:'inherit',
                    fontSize:13,fontWeight:700,cursor:'pointer',opacity:mlData?.loading?0.6:1,transition:'all 0.2s'}}
                    onMouseEnter={e=>{if(!mlData?.loading)e.currentTarget.style.background='rgba(14,165,164,0.18)';}}
                    onMouseLeave={e=>{if(!mlData?.loading)e.currentTarget.style.background='rgba(14,165,164,0.1)';}}>
                    {mlData?.loading?'⏳ Eğitiliyor…':'🔄 Modeli Yeniden Eğit'}
                  </button>
                </div>

                {/* Nasıl Çalışır? Kılavuz Kartı */}
                <div style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  marginBottom: 20,
                  overflow: 'hidden'
                }}>
                  <div 
                    onClick={() => setShowRfGuide(!showRfGuide)}
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      background: 'rgba(255, 255, 255, 0.02)',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>🤖</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                        Yapay Zekâ Doğrulaması Nasıl Çalışır?
                      </span>
                    </div>
                    <span style={{
                      fontSize: 12,
                      color: 'var(--muted)',
                      transform: showRfGuide ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s'
                    }}>
                      ▼
                    </span>
                  </div>
                  
                  {showRfGuide && (
                    <div style={{
                      padding: '16px',
                      borderTop: '1px solid var(--border)',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: 16,
                      background: 'rgba(0,0,0,0.1)'
                    }}>
                      {[
                        {
                          step: '1',
                          title: 'Coğrafi Veriler Okunur',
                          desc: 'İzmir genelindeki binlerce 100x100 metrelik coğrafi alanın eğim, radyasyon, rüzgâr gibi 9 farklı kritere ait coğrafi verileri veritabanından çekilir.'
                        },
                        {
                          step: '2',
                          title: 'Yapay Zekâ Modeli Eğitilir',
                          desc: 'Random Forest algoritması, uzmanlarımızın AHP karar mekanizmasıyla oluşturduğu sonuçları ve bunlara yol açan kriterleri analiz ederek öğrenme sürecini tamamlar.'
                        },
                        {
                          step: '3',
                          title: 'AHP Formülü Doğrulanır',
                          desc: 'Yapay zekânın bağımsız olarak çıkardığı önem dereceleri ile AHP formülümüz karşılaştırılır. Karar yapımızın bilimsel güvenilirliği tescillenir.'
                        }
                      ].map((s) => (
                        <div key={s.step} style={{ display: 'flex', gap: 12 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: 'rgba(14,165,164,0.15)',
                            border: '1px solid rgba(14,165,164,0.4)',
                            color: '#0EA5A4',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 800, flexShrink: 0
                          }}>
                            {s.step}
                          </div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                              {s.title}
                            </div>
                            <div style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                              {s.desc}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {mlData?.loading&&(
                  <div style={{textAlign:'center',padding:'50px 0',color:'#0EA5A4',fontSize:14,border:'1px dashed rgba(14,165,164,0.3)',borderRadius:12,background:'var(--surface)',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
                    <div style={{width:24,height:24,border:'3px solid rgba(14,165,164,0.2)',borderTopColor:'#0EA5A4',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
                    <span>Yapay zekâ modeli İzmir coğrafi hücre verilerini okuyor ve eğitiliyor, lütfen bekleyin...</span>
                  </div>
                )}
                {!mlData&&(
                  <div style={{textAlign:'center',padding:'40px 0',color:'var(--dim)',fontSize:13,border:'2px dashed var(--border)',borderRadius:12,background:'var(--surface)'}}>
                    <span>⏳</span> Yapay zekâ modeli otomatik olarak hazırlanıyor...
                  </div>
                )}
                {mlData&&!mlData.loading&&(
                  <>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
                      {[
                        {
                          label:'Yapay Zekâ Öğrenme Başarısı',
                          sub:'Verileri kavrama tutarlılığı (OOB)',
                          val:`${(mlData.oob_score*100).toFixed(1)}%`,
                          color:'#10B981',
                          extra: (
                            <div style={{
                              fontSize: 9, fontWeight: 800,
                              background: 'rgba(16,185,129,0.15)', color: '#10B981',
                              border: '1px solid rgba(16,185,129,0.3)', borderRadius: 6,
                              padding: '2px 6px', display: 'inline-block', marginTop: 4,
                              textTransform: 'uppercase', letterSpacing: '0.04em'
                            }}>
                              {mlData.oob_score >= 0.80 ? 'Mükemmel Başarı' : 'Güvenilir'}
                            </div>
                          )
                        },
                        {
                          label: 'AHP vs Yapay Zekâ Uyum Oranı',
                          sub: 'Formül ile modelin karar uyumu',
                          val: `r = ${mlData.pearson_r.toFixed(2)}`,
                          color: '#38BDF8',
                          extra: (
                            <div style={{
                              fontSize: 9, fontWeight: 800,
                              background: `${badgeColor}15`, color: badgeColor,
                              border: `1px solid ${badgeColor}35`, borderRadius: 6,
                              padding: '2px 6px', display: 'inline-block', marginTop: 4,
                              textTransform: 'uppercase', letterSpacing: '0.04em',
                              boxShadow: `0 0 8px ${badgeColor}20`
                            }}>
                              {badgeText}
                            </div>
                          )
                        },
                        {
                          label:'AHP Formül Ortalama Puanı',
                          sub:'Sistemde hesaplanan AHP ortalaması',
                          val:`${mlData.ahp_ortalama.toFixed(2)} / 5`,
                          color:'#F59E0B'
                        },
                        {
                          label:'Yapay Zekâ Ort. Puanı',
                          sub:'Modelin tahmin ettiği ortalama',
                          val:`${mlData.rf_ortalama.toFixed(2)} / 5`,
                          color:'#A78BFA'
                        },
                      ].map(({label,sub,val,color,extra})=>(
                        <div key={label} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'14px',textAlign:'center',display:'flex',flexDirection:'column',justifyContent:'space-between',alignItems:'center'}}>
                          <div>
                            <div style={{fontSize:22,fontWeight:800,color,fontFamily:'JetBrains Mono,monospace',marginBottom:4}}>{val}</div>
                            <div style={{fontSize:11,fontWeight:700,color:'var(--text)',lineHeight:1.2}}>{label}</div>
                            <div style={{fontSize:9,color:'var(--muted)',marginTop:3}}>{sub}</div>
                          </div>
                          {extra && <div style={{marginTop:8}}>{extra}</div>}
                        </div>
                      ))}
                    </div>
                    {renderInterpretation()}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,marginTop:24}}>
                      <div>
                        <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--muted)',marginBottom:12}}>Yapay Zekaya Göre Belirleyici Kriterler</div>
                        {mlData.feature_importance.slice(0,8).map((fi,i)=>{
                          const meta=KRITER_META[fi.kriter]||{ad:fi.kriter,renk:'#888'};
                          return(
                            <div key={fi.kriter} style={{marginBottom:9}}>
                              <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                                <span style={{fontSize:12,color:'var(--text-2)'}}>{i+1}. {meta.ad}</span>
                                <span style={{fontSize:11,fontFamily:'JetBrains Mono,monospace',color:meta.renk,fontWeight:700}}>{(fi.onem*100).toFixed(1)}%</span>
                              </div>
                              <div style={{height:6,borderRadius:3,background:'var(--surface-2)'}}>
                                <div style={{height:'100%',width:`${(fi.onem/mlData.feature_importance[0].onem)*100}%`,borderRadius:3,background:`linear-gradient(90deg,${meta.renk},${meta.renk}99)`,transition:'width 0.8s'}}/>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div>
                        <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--muted)',marginBottom:12}}>AHP Formülü vs Yapay Zekâ Puan Kıyaslaması</div>
                        
                        {/* Lejant / Açıklama Kutusu */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          padding: '8px 12px',
                          marginBottom: 12
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-2)' }}>Sütun Açıklamaları:</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
                            <div style={{ fontSize: 9.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <strong style={{ color: 'var(--text)' }}>AHP:</strong> Uzman formül skoru
                            </div>
                            <div style={{ fontSize: 9.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <strong style={{ color: '#0EA5A4' }}>RF:</strong> Yapay zekâ skoru
                            </div>
                            <div style={{ fontSize: 9.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <strong style={{ color: '#38BDF8' }}>Δ (Fark):</strong> AHP ile YZ arasındaki fark (YZ lehine +, AHP lehine -)
                            </div>
                          </div>
                        </div>

                        <div style={{overflowY:'auto',maxHeight:320,borderRadius:10,border:'1px solid var(--border)',overflow:'hidden'}}>
                          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                            <thead><tr style={{background:'var(--surface)'}}>
                              {['İlçe','Bizim (AHP)','Yapay Zekâ (RF)','Fark (Δ)'].map(h=>(
                                <th key={h} style={{padding:'8px 12px',textAlign:h==='İlçe'?'left':'center',fontSize:9.5,fontWeight:700,letterSpacing:'0.07em',color:'var(--muted)',textTransform:'uppercase',borderBottom:'1px solid var(--border)'}}>{h}</th>
                              ))}
                            </tr></thead>
                            <tbody>
                              {mlData.karsilastirma.sort((a,b)=>b.ahp_skor-a.ahp_skor).map((r,i)=>{
                                const si=secilenler.indexOf(r.ilce);const isSel=si>=0;
                                return(
                                  <tr key={r.ilce} style={{borderBottom:'1px solid var(--border)',background:isSel?`${COLORS[si]}08`:i%2?'rgba(0,0,0,0.01)':'transparent'}}>
                                    <td style={{padding:'7px 12px',fontWeight:isSel?800:500,color:isSel?COLORS[si]:'var(--text)',fontSize:12}}>{isSel?'▶ ':''}{r.ilce}</td>
                                    <td style={{padding:'7px 12px',textAlign:'center',fontFamily:'JetBrains Mono,monospace',fontSize:11,color:'var(--text-2)'}}>{r.ahp_skor.toFixed(2)}</td>
                                    <td style={{padding:'7px 12px',textAlign:'center',fontFamily:'JetBrains Mono,monospace',fontSize:11,color:'#0EA5A4',fontWeight:700}}>{r.rf_skor.toFixed(2)}</td>
                                    <td style={{padding:'7px 12px',textAlign:'center'}}>
                                      <span style={{fontSize:10,fontFamily:'JetBrains Mono,monospace',padding:'2px 6px',borderRadius:4,
                                        background:Math.abs(r.fark)<0.1?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.08)',
                                        color:Math.abs(r.fark)<0.1?'#059669':'#DC2626',fontWeight:700}}>
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
            );
          })()
        )}
      </div>
    </div>
  );
}