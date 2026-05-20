// components/MahallePaneli.js
import { useState, useEffect, useMemo } from 'react';
import MiniMap from './MiniMap';
import { skorRenk } from './constants';

const SANTRAL_HEX = { GES:'#F59E0B', RES:'#38BDF8' };

export default function MahallePaneli({ ilceAdi, et, color }) {
  const [data,            setData]            = useState(null);
  const [loading,         setLoading]         = useState(false);
  const [done,            setDone]            = useState('');
  const [selectedMahalle, setSelectedMahalle] = useState(null);
  const [mapCenter,       setMapCenter]       = useState(null);
  const [showSantraller,  setShowSantraller]  = useState(false);
  const [santralData,     setSantralData]     = useState(null);
  const [santralLoading,  setSantralLoading]  = useState(false);

  useEffect(() => {
    if (!ilceAdi || done === ilceAdi + et) return;
    setLoading(true);
    fetch(`/api/mahalle/${encodeURIComponent(ilceAdi)}?enerji=${et}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setDone(ilceAdi + et); })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [ilceAdi, et]);

  useEffect(() => {
    setSantralData(null);
    setShowSantraller(false);
    setSelectedMahalle(null);
    setMapCenter(null);
  }, [ilceAdi, et]);

  const toggleSantraller = () => {
    const next = !showSantraller;
    setShowSantraller(next);
    if (next && !santralData) {
      setSantralLoading(true);
      // /santral/list cek, frontend'de ilceye gore filtrele
      // (ilce endpoint N+1 DB sorunu yapiyor, list daha guvenilir)
      fetch(`/api/santral/list?enerji=${et}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!d?.features) { setSantralData(null); return; }
          const filtered = {
            ...d,
            features: d.features.filter(f =>
              f.properties?.ilce?.toLowerCase() === ilceAdi.toLowerCase()
            ),
          };
          setSantralData(filtered);
        })
        .catch(() => setSantralData(null))
        .finally(() => setSantralLoading(false));
    }
  };

  const sorted = useMemo(() => {
    if (!data?.features) return [];
    return [...data.features].sort((a,b) => (b.properties.skor_ort||0)-(a.properties.skor_ort||0));
  }, [data]);

  const handleMahalleClick = (feat, i) => {
    setSelectedMahalle(i);
    try {
      const coords=[];
      const flat=(a)=>{ if(typeof a[0]==='number'){coords.push(a);return;} a.forEach(flat); };
      flat(feat.geometry.coordinates);
      const lons=coords.map(c=>c[0]),lats=coords.map(c=>c[1]);
      const minLon=Math.min(...lons),maxLon=Math.max(...lons);
      const minLat=Math.min(...lats),maxLat=Math.max(...lats);
      const dMax=Math.max(maxLon-minLon,maxLat-minLat)||0.01;
      setMapCenter({
        lon:(minLon+maxLon)/2,lat:(minLat+maxLat)/2,
        zoom:Math.min(Math.log2(0.8/dMax)+7,15),
        sinif:Math.round(feat.properties.skor_ort||3),
        alan_ha:feat.properties.uygun_alan_ha||0,label:'mahalle',
      });
    } catch(e) {}
  };

  const santralCount = santralData?.features?.filter(
    f=>f.geometry?.type==='Point'
  ).length||0;

  return (
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

        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {/* Santral toggle */}
          <button onClick={toggleSantraller} style={{
            display:'flex',alignItems:'center',gap:6,
            padding:'5px 10px',borderRadius:8,
            border:`1px solid ${showSantraller?SANTRAL_HEX[et]+'55':'var(--border)'}`,
            background:showSantraller
              ?(et==='GES'?'rgba(245,158,11,0.1)':'rgba(56,189,248,0.1)')
              :'var(--surface-2)',
            color:showSantraller?SANTRAL_HEX[et]:'var(--muted)',
            fontFamily:'inherit',fontSize:11,fontWeight:600,
            cursor:'pointer',transition:'all 0.15s',
          }}>
            {santralLoading?(
              <div style={{width:10,height:10,
                border:`1.5px solid ${SANTRAL_HEX[et]}30`,
                borderTopColor:SANTRAL_HEX[et],
                borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
            ):(
              <div style={{width:8,height:8,borderRadius:'50%',
                background:showSantraller?SANTRAL_HEX[et]:'var(--border)',
                boxShadow:showSantraller?`0 0 5px ${SANTRAL_HEX[et]}`:'none',
                transition:'all 0.15s'}}/>
            )}
            {et==='GES'?'☀':'💨'} Santraller
            {showSantraller&&santralCount>0&&(
              <span style={{fontSize:9,padding:'1px 5px',borderRadius:999,
                background:`${SANTRAL_HEX[et]}25`,border:`1px solid ${SANTRAL_HEX[et]}40`,
                color:SANTRAL_HEX[et]}}>
                {santralCount}
              </span>
            )}
          </button>

          {loading&&(
            <div style={{width:14,height:14,border:`2px solid ${color}30`,
              borderTopColor:color,borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
          )}
        </div>
      </div>

      {/* Harita + Tablo */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',minHeight:380}}>
        <div style={{position:'relative',borderRight:'1px solid var(--border)'}}>
          {/* Kurulu Santralleri Göster Butonu (Üst Kısım Kolay Erişim) */}
          <button onClick={toggleSantraller} style={{
            position: 'absolute', top: 8, left: 10, zIndex: 10,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8,
            border: `1px solid ${showSantraller ? SANTRAL_HEX[et] : 'rgba(255,255,255,0.15)'}`,
            background: showSantraller
              ? (et==='GES'?'rgba(245,158,11,0.95)':'rgba(56,189,248,0.95)')
              : 'rgba(10,16,30,0.85)',
            backdropFilter: 'blur(8px)',
            color: showSantraller ? '#000' : '#fff',
            fontFamily: 'inherit', fontSize: 10.5, fontWeight: 800,
            cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            textTransform: 'uppercase', letterSpacing: '0.04em'
          }}>
            <span>{et === 'GES' ? '☀' : '💨'}</span>
            <span>{et} Santralleri {showSantraller ? 'Gizle' : 'Göster'}</span>
            {santralCount > 0 && (
              <span style={{
                fontSize: 9.5, padding: '1px 5px', borderRadius: 10,
                background: showSantraller ? 'rgba(0,0,0,0.2)' : `${SANTRAL_HEX[et]}30`,
                color: showSantraller ? '#000' : SANTRAL_HEX[et],
                fontWeight: 800, marginLeft: 2
              }}>
                {santralCount}
              </span>
            )}
          </button>

          <MiniMap
            ilceAdi={ilceAdi}
            energyType={et}
            color={color}
            height={380}
            highlightPoint={mapCenter}
            mahalleFeature={selectedMahalle!==null?sorted[selectedMahalle]:null}
            santralData={santralData}
            showSantraller={showSantraller}
          />

          {/* Santral yok bildirimi */}
          {showSantraller&&!santralLoading&&santralCount===0&&santralData&&(
            <div style={{
              position:'absolute',bottom:44,left:'50%',transform:'translateX(-50%)',
              zIndex:10,pointerEvents:'none',
              background:'rgba(6,10,20,0.88)',backdropFilter:'blur(8px)',
              border:`1px solid ${SANTRAL_HEX[et]}30`,
              borderRadius:7,padding:'5px 12px',
              fontSize:10,color:'var(--muted)',whiteSpace:'nowrap',
            }}>
              Bu ilçede kayıtlı {et} santrali bulunamadı
            </div>
          )}

          {/* Seçili mahalle badge */}
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

        {/* Mahalle tablosu */}
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
                  <th key={h} style={{padding:'9px 10px',
                    textAlign:h==='Mahalle'?'left':'center',
                    fontSize:9.5,fontWeight:700,letterSpacing:'0.07em',
                    color:'var(--muted)',textTransform:'uppercase',
                    borderBottom:'1px solid var(--border)'}}>{h}</th>
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
                      onMouseEnter={e=>{if(!isSel) e.currentTarget.style.background='var(--surface-2)';}}
                      onMouseLeave={e=>{e.currentTarget.style.background=isSel?`${color}15`:'transparent';}}>
                      <td style={{padding:'7px 10px',textAlign:'center',
                        color:isSel?color:'var(--dim)',fontSize:10,fontWeight:isSel?700:400}}>{i+1}</td>
                      <td style={{padding:'7px 10px',fontWeight:isSel?700:500,
                        color:isSel?color:'var(--text)'}}>{p.mahalle}</td>
                      <td style={{padding:'7px 10px',textAlign:'center'}}>
                        <span style={{fontWeight:800,color:rc,fontFamily:'JetBrains Mono,monospace'}}>
                          {s.toFixed(2)}
                        </span>
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