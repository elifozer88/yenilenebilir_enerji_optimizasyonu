import { useState, useEffect, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { TileLayer } from '@deck.gl/geo-layers';
import { ScatterplotLayer, GeoJsonLayer, BitmapLayer } from '@deck.gl/layers';

const INITIAL_VIEW = {
  longitude: 27.5, latitude: 38.5,
  zoom: 8.5, pitch: 0, bearing: 0,
};

const RENK = {
  GES:  [251, 191, 36],
  RES:  [56, 189, 248],
  IKISI:[167, 139, 250],
};

const RENK_HEX = {
  GES:  '#F59E0B',
  RES:  '#38BDF8',
  IKISI:'#A78BFA',
};

const ILCE_MERKEZ = {
  'Aliağa':[38.80,26.97],'Balçova':[38.39,27.05],'Bayındır':[38.22,27.65],
  'Bayraklı':[38.46,27.17],'Bergama':[39.12,27.18],'Beydağ':[38.09,28.21],
  'Bornova':[38.47,27.22],'Buca':[38.38,27.18],'Çeşme':[38.32,26.30],
  'Çiğli':[38.52,27.05],'Dikili':[39.07,26.89],'Foça':[38.67,26.76],
  'Gaziemir':[38.32,27.13],'Güzelbahçe':[38.38,26.90],'Karabağlar':[38.37,27.12],
  'Karaburun':[38.64,26.51],'Karşıyaka':[38.46,27.11],'Kemalpaşa':[38.43,27.42],
  'Kınık':[39.09,27.38],'Kiraz':[38.23,28.19],'Konak':[38.42,27.14],
  'Menderes':[38.25,27.13],'Menemen':[38.61,27.06],'Narlıdere':[38.39,26.98],
  'Ödemiş':[38.22,27.97],'Seferihisar':[38.20,26.84],'Selçuk':[37.95,27.37],
  'Tire':[38.09,27.73],'Torbalı':[38.16,27.37],'Urla':[38.32,26.76],
};

export default function Santraller() {
  const [mod, setMod]             = useState('GES');
  const [dataGes, setDataGes]     = useState(null);
  const [dataRes, setDataRes]     = useState(null);
  const [sinirlar, setSinirlar]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [secili, setSecili]       = useState(null);
  const [kartPos, setKartPos]     = useState({});
  const [ilceFiltre, setIlceFiltre] = useState('Tümü');
  const [viewState, setViewState] = useState(INITIAL_VIEW);

  useEffect(() => {
    setLoading(true);
    setSecili(null);
    Promise.all([
      fetch('/api/santral/list?enerji=GES').then(r => r.ok ? r.json() : null),
      fetch('/api/santral/list?enerji=RES').then(r => r.ok ? r.json() : null),
    ]).then(([g, r]) => {
      setDataGes(g);
      setDataRes(r);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch('/izmir_sinir.geojson')
      .then(r => r.ok ? r.json() : null)
      .then(d => setSinirlar(d))
      .catch(() => {});
  }, []);

  const aktifFeatures = useMemo(() => {
    if (mod === 'GES')   return (dataGes?.features || []).map(f => ({...f, _tip:'GES'}));
    if (mod === 'RES')   return (dataRes?.features || []).map(f => ({...f, _tip:'RES'}));
    return [
      ...(dataGes?.features || []).map(f => ({...f, _tip:'GES'})),
      ...(dataRes?.features || []).map(f => ({...f, _tip:'RES'})),
    ];
  }, [mod, dataGes, dataRes]);

  const ilceler = useMemo(() => {
    const set = new Set(aktifFeatures.map(f => f.properties.ilce).filter(i => i && i !== 'Diğer'));
    return ['Tümü', ...Array.from(set).sort()];
  }, [aktifFeatures]);

  const filtrelenmis = useMemo(() => {
    if (ilceFiltre === 'Tümü') return aktifFeatures;
    return aktifFeatures.filter(f => f.properties.ilce === ilceFiltre);
  }, [aktifFeatures, ilceFiltre]);

  const ilceOzet = useMemo(() => {
    const map = {};
    aktifFeatures.forEach(f => {
      const ilce = f.properties.ilce || 'Diğer';
      if (!map[ilce]) map[ilce] = { adet:0, kapasite:0, gesAdet:0, resAdet:0 };
      map[ilce].adet++;
      if (f.properties.kapasite_mw) map[ilce].kapasite += f.properties.kapasite_mw;
      if (f._tip === 'GES') map[ilce].gesAdet++;
      if (f._tip === 'RES') map[ilce].resAdet++;
    });
    return map;
  }, [aktifFeatures]);

  const color    = RENK_HEX[mod];
  const toplam   = filtrelenmis.length;
  const toplamMw = filtrelenmis.reduce((s, f) => s + (f.properties.kapasite_mw || 0), 0);

  const layers = useMemo(() => [
    new TileLayer({
      id: 'satellite',
      data: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      minZoom: 0, maxZoom: 19, tileSize: 256,
      renderSubLayers: p => {
        const { west, south, east, north } = p.tile.bbox;
        return new BitmapLayer(p, { data:null, image:p.data, bounds:[west,south,east,north] });
      },
    }),
    sinirlar && new GeoJsonLayer({
      id: 'sinir', data: sinirlar,
      stroked: true, filled: false,
      getLineColor: [255,255,255,40], lineWidthMinPixels: 0.8,
    }),
    new ScatterplotLayer({
      id: 'santral', data: filtrelenmis,
      getPosition: d => d.geometry.coordinates,
      getRadius: 1200, radiusMinPixels: 5, radiusMaxPixels: 20,
      getFillColor: d => d === secili ? [255,255,255,255] : [...RENK[d._tip], 200],
      getLineColor: d => d === secili ? [...RENK[d._tip],255] : [255,255,255,80],
      lineWidthMinPixels: 1.5, stroked: true, pickable: true,
      onClick: ({ object, x, y }) => {
        if (object) {
          const mapEl = document.getElementById('santral-harita');
          const mapH  = mapEl ? mapEl.offsetHeight : window.innerHeight;
          const mapW  = mapEl ? mapEl.offsetWidth  : window.innerWidth;
          const KART_H = 280, KART_W = 310, OFFSET = 16;
          setKartPos({
            left:   x + KART_W + OFFSET < mapW ? x + OFFSET   : undefined,
            right:  x + KART_W + OFFSET < mapW ? undefined     : mapW - x + OFFSET,
            top:    y + KART_H + OFFSET < mapH ? y + OFFSET    : undefined,
            bottom: y + KART_H + OFFSET < mapH ? undefined      : mapH - y + OFFSET,
          });
          setSecili(object);
        } else {
          setSecili(null);
        }
      },
      updateTriggers: {
        getFillColor: [secili, mod],
        getLineColor: [secili],
      },
    }),
  ].filter(Boolean), [filtrelenmis, sinirlar, secili, mod]);

  useEffect(() => {
    if (ilceFiltre === 'Tümü') {
      setViewState(v => ({...v, longitude:27.5, latitude:38.5, zoom:8.5, transitionDuration:800}));
      return;
    }
    const pts = filtrelenmis.filter(f => f.properties.ilce === ilceFiltre);
    if (pts.length > 0) {
      const lons = pts.map(f => f.geometry.coordinates[0]);
      const lats = pts.map(f => f.geometry.coordinates[1]);
      setViewState(v => ({
        ...v,
        longitude: (Math.min(...lons) + Math.max(...lons)) / 2,
        latitude:  (Math.min(...lats) + Math.max(...lats)) / 2,
        zoom: 11, transitionDuration: 900,
      }));
    } else if (ILCE_MERKEZ[ilceFiltre]) {
      const [lat, lon] = ILCE_MERKEZ[ilceFiltre];
      setViewState(v => ({...v, longitude:lon, latitude:lat, zoom:11, transitionDuration:900}));
    }
  }, [ilceFiltre, filtrelenmis]);

  const MOD_CFG = [
    { id:'GES',   label:'☀ Güneş',     color:'#F59E0B' },
    { id:'RES',   label:'💨 Rüzgâr',    color:'#38BDF8' },
    { id:'IKISI', label:'⚡ Her İkisi', color:'#A78BFA' },
  ];

  return (
    <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - var(--nav-h))',background:'var(--bg)',fontFamily:"'Manrope',sans-serif"}}>

      {/* ── Üst başlık ── */}
      <div style={{
        background:'color-mix(in oklab, var(--surface) 90%, transparent)',
        backdropFilter:'blur(10px)',
        borderBottom:'1px solid var(--border)',
        padding:'0 20px', height:44, flexShrink:0,
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:12,fontWeight:700,color:'var(--text-2)'}}>Mevcut Santraller — İzmir</span>
          <span style={{fontSize:9.5,color:'var(--muted)',background:'var(--surface-2)',padding:'2px 8px',borderRadius:999,border:'1px solid var(--border)'}}>
            OpenStreetMap · Canlı Veri
          </span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {mod === 'IKISI' && (
            <div style={{display:'flex',gap:10}}>
              {[{c:'#F59E0B',l:'GES'},{c:'#38BDF8',l:'RES'}].map(({c,l}) => (
                <div key={l} style={{display:'flex',alignItems:'center',gap:5,fontSize:10,color:'var(--muted)'}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:c}}/>
                  {l}
                </div>
              ))}
            </div>
          )}
          <span style={{fontSize:11,fontWeight:600,color:'var(--muted)'}}>
            {loading ? 'Yükleniyor…' : `${toplam} santral · ${toplamMw.toFixed(1)} MW`}
          </span>
        </div>
      </div>

      {/* ── Gövde ── */}
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>

        {/* Sol panel */}
        <div style={{
          width:280, flexShrink:0,
          background:'var(--card)', borderRight:'1px solid var(--border)',
          display:'flex', flexDirection:'column', overflow:'hidden',
        }}>
          {/* Mod seçici */}
          <div style={{padding:'16px 16px 12px',borderBottom:'1px solid var(--border)'}}>
            <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--muted)',marginBottom:10}}>
              Santral Tipi
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              {MOD_CFG.map(({id,label,color:c}) => (
                <button key={id} onClick={() => {setMod(id);setSecili(null);setIlceFiltre('Tümü');}} style={{
                  display:'flex', alignItems:'center', gap:8,
                  padding:'9px 12px', borderRadius:9, border:'none',
                  background: mod===id ? `${c}18` : 'var(--surface-2)',
                  borderLeft:`3px solid ${mod===id ? c : 'transparent'}`,
                  cursor:'pointer', fontFamily:'inherit',
                  fontSize:12, fontWeight:700,
                  color: mod===id ? c : 'var(--muted)',
                  transition:'all 0.15s', textAlign:'left',
                }}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:mod===id?c:'var(--border)',flexShrink:0}}/>
                  {label}
                  {mod===id && (
                    <span style={{marginLeft:'auto',fontSize:10,fontWeight:600,background:`${c}25`,color:c,padding:'1px 7px',borderRadius:999}}>
                      Aktif
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Özet */}
          <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:mod==='IKISI'?8:0}}>
              {[
                {label:'Santral', val:loading?'…':toplam,             unit:'adet'},
                {label:'Toplam',  val:loading?'…':toplamMw.toFixed(1), unit:'MW'},
              ].map(({label,val,unit}) => (
                <div key={label} style={{background:'var(--surface-2)',borderRadius:8,padding:'10px',borderTop:`2px solid ${color}`}}>
                  <div style={{fontSize:9,color:'var(--muted)',fontWeight:600,textTransform:'uppercase',marginBottom:4}}>{label}</div>
                  <div style={{display:'flex',alignItems:'baseline',gap:3}}>
                    <span style={{fontSize:20,fontWeight:800,color,fontFamily:'JetBrains Mono,monospace'}}>{val}</span>
                    <span style={{fontSize:10,color:'var(--muted)'}}>{unit}</span>
                  </div>
                </div>
              ))}
            </div>
            {mod==='IKISI' && (
              <div style={{display:'flex',gap:8}}>
                {[{c:'#F59E0B',l:'GES ☀',n:(dataGes?.features||[]).length},{c:'#38BDF8',l:'RES 💨',n:(dataRes?.features||[]).length}].map(({c,l,n}) => (
                  <div key={l} style={{flex:1,background:`${c}12`,border:`1px solid ${c}30`,borderRadius:8,padding:'7px 10px',textAlign:'center'}}>
                    <div style={{fontSize:9,color:c,fontWeight:700,marginBottom:2}}>{l}</div>
                    <div style={{fontSize:16,fontWeight:800,color:c}}>{n}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* İlçe filtresi */}
          <div style={{padding:'10px 16px 8px',borderBottom:'1px solid var(--border)'}}>
            <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'var(--muted)',marginBottom:8}}>
              İlçe Filtresi
            </div>
            <select value={ilceFiltre} onChange={e=>{setIlceFiltre(e.target.value);setSecili(null);}} style={{
              width:'100%',background:'var(--surface-2)',color:'var(--text)',
              border:'1px solid var(--border)',borderRadius:8,padding:'7px 10px',fontSize:12,
            }}>
              {ilceler.map(i=><option key={i} value={i}>{i}{ilceOzet[i]?` (${ilceOzet[i].adet})`:''}</option>)}
            </select>
          </div>

          {/* İlçe dağılımı */}
          <div style={{flex:1,overflowY:'auto',padding:'10px 0'}}>
            <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'var(--muted)',padding:'0 16px 8px'}}>
              İlçe Dağılımı
            </div>
            {Object.entries(ilceOzet)
              .filter(([k]) => k !== 'Diğer')
              .sort((a,b) => b[1].adet - a[1].adet)
              .slice(0,20)
              .map(([ilce,{adet,kapasite,gesAdet,resAdet}]) => (
                <div key={ilce} onClick={() => setIlceFiltre(ilce===ilceFiltre?'Tümü':ilce)}
                  style={{
                    padding:'8px 16px', cursor:'pointer',
                    background: ilceFiltre===ilce ? `${color}15` : 'transparent',
                    borderLeft:`3px solid ${ilceFiltre===ilce ? color : 'transparent'}`,
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                    transition:'background 0.15s',
                  }}>
                  <div>
                    <span style={{fontSize:12,fontWeight:600,color:ilceFiltre===ilce?color:'var(--text-2)'}}>{ilce}</span>
                    {mod==='IKISI' && (
                      <div style={{display:'flex',gap:5,marginTop:2}}>
                        {gesAdet>0&&<span style={{fontSize:9,color:'#F59E0B'}}>☀ {gesAdet}</span>}
                        {resAdet>0&&<span style={{fontSize:9,color:'#38BDF8'}}>💨 {resAdet}</span>}
                      </div>
                    )}
                  </div>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    {kapasite>0&&<span style={{fontSize:10,color:'var(--muted)'}}>{kapasite.toFixed(1)} MW</span>}
                    <span style={{fontSize:11,fontWeight:700,color,background:`${color}20`,padding:'1px 7px',borderRadius:999}}>{adet}</span>
                  </div>
                </div>
              ))}
          </div>

          {/* Kaynak */}
          <div style={{padding:'10px 16px',borderTop:'1px solid var(--border)',fontSize:9.5,color:'var(--dim)'}}>
            📡 Veri kaynağı: OpenStreetMap · 1 saatlik önbellek
          </div>
        </div>

        {/* Harita */}
        <div id="santral-harita" style={{flex:1,position:'relative'}}>
          {loading && (
            <div style={{
              position:'absolute',inset:0,zIndex:10,
              display:'flex',alignItems:'center',justifyContent:'center',
              background:'rgba(6,10,20,0.6)',backdropFilter:'blur(4px)',
              color:'var(--muted)',fontSize:13,gap:10,
            }}>
              <div style={{width:18,height:18,border:'2px solid var(--surface-2)',borderTopColor:color,borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
              Santraller yükleniyor…
            </div>
          )}

          <DeckGL
            viewState={viewState}
            onViewStateChange={({viewState:vs}) => setViewState(vs)}
            controller={true} layers={layers}
            style={{width:'100%',height:'100%'}}
            getCursor={({isHovering}) => isHovering?'pointer':'grab'}
            onClick={({object}) => {if(!object) setSecili(null);}}
          />

          {/* Harita üstü badge — renk moda göre */}
          <div style={{position:'absolute',top:14,right:14,display:'flex',gap:6,zIndex:5}}>
            {['OSM','PostGIS'].map(t => (
              <span key={t} style={{
                fontSize:9.5, fontWeight:700, color,
                background:'rgba(6,10,20,0.75)', backdropFilter:'blur(8px)',
                padding:'4px 10px', borderRadius:999,
                border:`1px solid ${color}40`,
                transition:'color 0.2s, border-color 0.2s',
              }}>{t}</span>
            ))}
          </div>

          {/* Seçili santral bilgi kartı — tıklanan yere yakın */}
          {secili && (() => {
            const tipRenk = RENK_HEX[secili._tip] || color;
            return (
              <div style={{
                position:'absolute',
                left:   kartPos.left   != null ? kartPos.left   : undefined,
                right:  kartPos.right  != null ? kartPos.right  : undefined,
                top:    kartPos.top    != null ? kartPos.top    : undefined,
                bottom: kartPos.bottom != null ? kartPos.bottom : undefined,
                zIndex:10,
                width:300, background:'var(--card)',
                borderRadius:14, border:`1px solid ${tipRenk}40`,
                borderTop:`3px solid ${tipRenk}`,
                boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
                animation:'fadeIn .2s ease',
                padding:'16px 18px',
              }}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:'var(--text)',marginBottom:2,lineHeight:1.3}}>
                      {secili.properties.santral_adi?.startsWith('OSM-')
                        ? (secili._tip==='GES'?'Güneş Enerji Santrali':'Rüzgâr Enerji Santrali')
                        : secili.properties.santral_adi}
                    </div>
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      <div style={{fontSize:10,color:tipRenk,fontWeight:600}}>{secili.properties.ilce}</div>
                      <span style={{fontSize:9.5,fontWeight:700,padding:'1px 6px',borderRadius:999,background:`${tipRenk}20`,color:tipRenk,border:`1px solid ${tipRenk}40`}}>
                        {secili._tip}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setSecili(null)} style={{
                    background:'var(--surface-2)',border:'none',color:'var(--muted)',
                    width:24,height:24,borderRadius:6,cursor:'pointer',fontSize:14,lineHeight:1,
                  }}>×</button>
                </div>

                <div style={{display:'flex',flexDirection:'column',gap:7}}>
                  {[
                    {label:'Operatör',    val:secili.properties.operator==='—'?'Bilinmiyor':secili.properties.operator},
                    {label:'Kapasite',    val:secili.properties.kapasite_mw?`${secili.properties.kapasite_mw} MW`:'Bilinmiyor'},
                    {label:'Enerji Tipi', val:secili._tip==='GES'?'☀ Güneş (Fotovoltaik)':'💨 Rüzgâr'},
                    {label:'Koordinat',   val:`${secili.geometry.coordinates[1].toFixed(4)}, ${secili.geometry.coordinates[0].toFixed(4)}`},
                    {label:'Kaynak',      val:'OpenStreetMap'},
                  ].map(({label,val}) => (
                    <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:10,color:'var(--muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</span>
                      <span style={{fontSize:11,fontWeight:600,color:'var(--text-2)',textAlign:'right',maxWidth:160}}>{val}</span>
                    </div>
                  ))}
                </div>

                <div style={{
                  marginTop:12,padding:'8px 10px',borderRadius:8,
                  background:`${tipRenk}10`,border:`1px solid ${tipRenk}20`,
                  fontSize:10.5,color:'var(--muted)',lineHeight:1.5,
                }}>
                  💡 OSM ID: {secili.properties.osm_id} · OpenStreetMap katkıcıları tarafından sağlanmıştır.
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}