import { useState, useEffect, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer, GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers';
import { FlyToInterpolator } from '@deck.gl/core';
import { MaskExtension } from '@deck.gl/extensions';

function geomToView(geom) {
  try {
    const coords = [];
    const flat = (a) => { if(typeof a[0]==='number'){coords.push(a);return;} a.forEach(flat); };
    flat(geom.coordinates);
    const lons=coords.map(c=>c[0]), lats=coords.map(c=>c[1]);
    const minLon=Math.min(...lons), maxLon=Math.max(...lons);
    const minLat=Math.min(...lats), maxLat=Math.max(...lats);
    const dMax=Math.max(maxLon-minLon,maxLat-minLat)||0.1;
    return {
      longitude:(minLon+maxLon)/2,
      latitude:(minLat+maxLat)/2,
      zoom:Math.min(Math.log2(2.4/dMax)+7,11),
      pitch:0, bearing:0,
    };
  } catch { return null; }
}

const hexRgb = (hex) => {
  const h = hex.replace('#','');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
};

const S_RENK_RGB = {
  5:[20,128,60], 4:[74,166,53], 3:[215,119,6], 2:[220,107,46], 1:[185,28,28]
};

// ── MiniMap ────────────────────────────────────────────────────
export default function MiniMap({
  ilceAdi,
  energyType='GES',
  color='#0EA5A4',
  height=320,
  highlightPoint=null,
  mahalleFeature=null,
  santralData=null,
  showSantraller=false
}) {
  const [viewState, setViewState] = useState({longitude:27.05,latitude:38.42,zoom:9,pitch:0,bearing:0});
  const [ilceFeat,  setIlceFeat]  = useState(null);
  const [polyData,  setPolyData]  = useState(null);
  const [ready,     setReady]     = useState(false);
  const [activePin, setActivePin] = useState(null); // {lon, lat, sinif, label}

  // İlçe geometrisini ve uygunluk poligonlarını yükle
  useEffect(() => {
    if(!ilceAdi) return;
    setReady(false);
    setIlceFeat(null);
    setPolyData(null);
    setActivePin(null);

    const t = energyType.toLowerCase();

    Promise.all([
      fetch(`/api/${t}/districts`)
        .then(r => r.ok ? r.json() : null),
      fetch(`/api/${t}/polygons?min_sinif=1&limit=3000&ilce=${encodeURIComponent(ilceAdi)}`)
        .then(r => r.ok ? r.json() : null)
    ])
    .then(([districtsGj, polyGj]) => {
      if(districtsGj?.features) {
        const feat = districtsGj.features.find(f =>
          f.properties?.ilce?.toLowerCase() === ilceAdi.toLowerCase()
        );
        if(feat?.geometry) {
          setIlceFeat(feat);
          const v = geomToView(feat.geometry);
          if(v) setViewState(v);
        }
      }
      if(polyGj) {
        setPolyData(polyGj);
      }
    })
    .catch(() => {})
    .finally(() => setReady(true));
  }, [ilceAdi, energyType]);

  // highlightPoint değişince haritayı o noktaya uçur
  useEffect(() => {
    if(!highlightPoint) return;
    setActivePin(highlightPoint);
    setViewState(prev => ({
      ...prev,
      longitude: highlightPoint.lon,
      latitude:  highlightPoint.lat,
      zoom: highlightPoint.zoom || 13,
      transitionDuration: 900,
      transitionInterpolator: new FlyToInterpolator({ speed: 1.6 }),
    }));
  }, [highlightPoint]);

  const rgb = useMemo(() => hexRgb(color), [color]);

  const layers = useMemo(() => {
    const t = energyType.toLowerCase();
    return [
      // Uydu
      new TileLayer({
        id:`mm-sat-${ilceAdi}`,
        data:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        minZoom:0, maxZoom:19, tileSize:256,
        renderSubLayers: p => {
          const {west,south,east,north}=p.tile.bbox;
          return new BitmapLayer(p,{data:null,image:p.data,bounds:[west,south,east,north]});
        },
      }),

      // 1. Mask Layer (Sadece maskeleme amacıyla kullanılır, ekrana çizilmez)
      ...(ilceFeat ? [
        new GeoJsonLayer({
          id: `mm-mask-${ilceAdi}`,
          data: {type: 'FeatureCollection', features: [ilceFeat]},
          operation: 'mask',
        })
      ] : []),

      // 2. Maskelenmiş Raster Uygunluk Katmanı (Tüm ilçe sınırını taşmadan renklendirir)
      new TileLayer({
        id:`mm-raster-${ilceAdi}-${t}`,
        data:`http://127.0.0.1:8001/tiles/${t}/{z}/{x}/{y}.png`,
        minZoom:6, maxZoom:14, tileSize:256, opacity:0.7,
        ...(ilceFeat ? {
          extensions: [new MaskExtension()],
          maskId: `mm-mask-${ilceAdi}`,
        } : {}),
        renderSubLayers: p => {
          const {west,south,east,north}=p.tile.bbox;
          return new BitmapLayer(p,{
            data:null,
            image:p.data,
            bounds:[west,south,east,north],
            parameters:{depthTest:false},
            extensions: p.extensions,
            maskId: p.maskId
          });
        },
      }),

      // 3. Görünmez Etkileşimli Vektör Katmanı (Sadece hover/tooltip verisi için)
      ...(polyData ? [
        new GeoJsonLayer({
          id:`mm-poly-hover-${ilceAdi}-${t}`,
          data:polyData,
          pickable:true,
          filled:true,
          stroked:false,
          getFillColor: [0, 0, 0, 0], // Şeffaf
          parameters:{depthTest:false},
        })
      ] : []),

      // İlçe sınırı (mahalle seçimlerinde kaybolmaz)
      ...(ilceFeat ? [
        new GeoJsonLayer({
          id:`mm-sinir-${ilceAdi}`,
          data:{type:'FeatureCollection',features:[ilceFeat]},
          pickable:false, filled:false, stroked:true,
          getLineColor:[...rgb, 230],
          lineWidthMinPixels:2.2,
          parameters:{depthTest:false},
        }),
      ] : []),

      // Mevcut kurulu santraller
      ...(showSantraller && santralData?.features ? [
        new ScatterplotLayer({
          id:`mm-santraller-${ilceAdi}-${t}`,
          data:santralData.features,
          getPosition: d => d.geometry.coordinates,
          getRadius: 160,
          radiusMinPixels: 5.5,
          radiusMaxPixels: 14,
          getFillColor: t === 'ges' ? [251, 191, 36, 230] : [56, 189, 248, 230],
          getLineColor: [255, 255, 255, 200],
          lineWidthMinPixels: 1.2,
          stroked: true,
          pickable: true,
          parameters:{depthTest:false},
        })
      ] : []),

      // Aktif pin (max veya min nokta) — mahalle modunda gösterme
      ...(activePin && !mahalleFeature ? [
        // Dış halka — pulse efekti için büyük çember
        new ScatterplotLayer({
          id:`mm-pin-outer-${activePin.lon}`,
          data:[activePin],
          getPosition: d => [d.lon, d.lat],
          getRadius: 600,
          getFillColor: [...(S_RENK_RGB[activePin.sinif]||[14,165,164]), 50],
          stroked:false,
          parameters:{depthTest:false},
        }),
        // İç nokta
        new ScatterplotLayer({
          id:`mm-pin-inner-${activePin.lon}`,
          data:[activePin],
          getPosition: d => [d.lon, d.lat],
          getRadius: 250,
          getFillColor: [...(S_RENK_RGB[activePin.sinif]||[14,165,164]), 255],
          stroked:true,
          getLineColor:[255,255,255,220],
          lineWidthMinPixels:2,
          parameters:{depthTest:false},
        }),
      ] : []),

      // Seçili mahalle sınırı — ilçeden farklı beyaz/cyan renk
      ...(mahalleFeature ? [
        new GeoJsonLayer({
          id:`mm-mahalle-fill`,
          data:{type:'FeatureCollection',features:[mahalleFeature]},
          pickable:false,
          filled:true,
          stroked:true,
          getFillColor:[14,165,164,35],
          getLineColor:[255,255,255,250],
          lineWidthMinPixels:3,
          parameters:{depthTest:false},
        }),
      ] : []),

      // Etiketler
      new TileLayer({
        id:`mm-labels-${ilceAdi}`,
        data:'https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png',
        minZoom:0, maxZoom:14, tileSize:256,
        renderSubLayers: p => {
          const {west,south,east,north}=p.tile.bbox;
          return new BitmapLayer(p,{data:null,image:p.data,bounds:[west,south,east,north],opacity:0.85});
        },
      }),
    ];
  }, [ilceAdi, energyType, ilceFeat, polyData, rgb, activePin, mahalleFeature, santralData, showSantraller]);

  const getTooltip = ({ object }) => {
    if (!object?.properties) return null;
    const p = object.properties;

    // Eğer elektrik santraliyse
    if (p.santral_adi !== undefined) {
      const tipRenk = energyType === 'GES' ? '#F59E0B' : '#38BDF8';
      const ad = p.santral_adi.startsWith('OSM-')
        ? (energyType === 'GES' ? 'Güneş Enerji Santrali' : 'Rüzgâr Enerji Santrali')
        : p.santral_adi;
      return {
        html: `<div style="background:rgba(10,16,30,0.97);border:1px solid rgba(255,255,255,0.1);border-top:3px solid ${tipRenk};border-radius:10px;padding:10px 14px;font-family:'Manrope',sans-serif;min-width:180px;box-shadow:0 8px 24px rgba(0,0,0,0.5)">
          <div style="font-size:12px;font-weight:800;color:#fff;margin-bottom:6px">${ad}</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.5);margin-bottom:3px">Kapasite: <span style="color:${tipRenk};font-weight:700">${p.kapasite_mw ? p.kapasite_mw + ' MW' : 'Bilinmiyor'}</span></div>
          <div style="font-size:10px;color:rgba(255,255,255,0.5)">Operatör: <span style="color:#fff">${p.operator === '—' ? 'Bilinmiyor' : p.operator}</span></div>
        </div>`,
        style: { background: 'none', border: 'none', padding: '0' }
      };
    }

    // Eğer uygunluk bölgesi poligonuysa
    if (p.sinif !== undefined) {
      const sinifRenk = { 5: '#14803C', 4: '#4AA635', 3: '#D97706', 2: '#DC6B2E', 1: '#B91C1C' };
      const sinifAd = { 5: 'Çok Uygun', 4: 'Uygun', 3: 'Orta', 2: 'Düşük', 1: 'Uygunsuz' };
      const renk = sinifRenk[Math.round(p.sinif)] || '#888';
      const ad = sinifAd[Math.round(p.sinif)] || '';
      return {
        html: `<div style="background:rgba(10,16,30,0.97);border:1px solid rgba(255,255,255,0.1);border-left:3px solid ${renk};border-radius:10px;padding:10px 14px;font-family:'Manrope',sans-serif;min-width:150px;box-shadow:0 8px 24px rgba(0,0,0,0.5)">
          <div style="font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${renk};margin-bottom:4px">${energyType} Uygunluk</div>
          <div style="font-size:15px;font-weight:800;color:${renk}">Sınıf ${Math.round(p.sinif)} (${ad})</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.5);margin-top:6px">Alan: <span style="color:#fff;font-weight:700">${Number(p.alan_ha || 0).toFixed(1)} ha</span></div>
          <div style="font-size:10px;color:rgba(255,255,255,0.5)">~Kapasite: <span style="color:#0EA5A4;font-weight:700">${Number(p.tahmini_mw || p.mw || 0).toFixed(1)} MW</span></div>
        </div>`,
        style: { background: 'none', border: 'none', padding: '0' }
      };
    }

    return null;
  };

  return (
    <div style={{position:'relative',width:'100%',height,background:'#06090f'}}>
      {!ready && (
        <div style={{position:'absolute',inset:0,zIndex:10,display:'flex',alignItems:'center',
          justifyContent:'center',background:'rgba(6,10,20,0.85)',color:'#8892aa',fontSize:12,gap:8}}>
          <div style={{width:14,height:14,border:'2px solid #1a2035',borderTopColor:color,
            borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
          {ilceAdi}…
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <DeckGL
        viewState={viewState}
        onViewStateChange={({viewState:vs})=>setViewState(vs)}
        controller={{inertia:200,scrollZoom:{smooth:true,speed:0.003}}}
        layers={layers}
        getTooltip={getTooltip}
        style={{position:'absolute',inset:0}}
      />

      {/* Alt bilgi badge */}
      <div style={{position:'absolute',bottom:8,left:10,zIndex:5,
        background:'rgba(6,10,20,0.88)',backdropFilter:'blur(8px)',
        border:`1px solid ${color}50`,borderRadius:6,padding:'4px 10px',
        fontSize:11,fontWeight:700,color,letterSpacing:'0.05em',
        display:'flex',gap:6,alignItems:'center'}}>
        <div style={{width:6,height:6,borderRadius:'50%',background:color}}/>
        {ilceAdi} · {energyType}
      </div>

      {/* Aktif pin bilgisi */}
      {activePin && !mahalleFeature && (
        <div style={{
          position:'absolute',top:8,right:8,zIndex:5,
          background:'rgba(6,10,20,0.92)',backdropFilter:'blur(8px)',
          border:`1px solid ${activePin.label==='max'?'#14803C':'#B91C1C'}50`,
          borderRadius:8,padding:'6px 10px',
          fontSize:11,color:'#fff',
          display:'flex',flexDirection:'column',gap:2,
        }}>
          <div style={{fontWeight:700,color:activePin.label==='max'?'#4AA635':'#DC6B2E',fontSize:10,
            textTransform:'uppercase',letterSpacing:'0.06em'}}>
            {activePin.label==='max'?'▲ En Uygun Bölge':'▼ En Küçük Bölge'}
          </div>
          <div style={{fontWeight:800,fontSize:13}}>Sınıf {activePin.sinif}</div>
          <div style={{color:'#8892aa',fontSize:10}}>{activePin.alan_ha?.toLocaleString('tr')} ha</div>
          <button onClick={()=>{
            setActivePin(null);
            if(ilceFeat?.geometry){
              const v=geomToView(ilceFeat.geometry);
              if(v) setViewState({...v,transitionDuration:700,transitionInterpolator:new FlyToInterpolator({speed:1.4})});
            }
          }} style={{
            marginTop:3,padding:'2px 6px',borderRadius:4,
            border:'1px solid rgba(255,255,255,0.15)',
            background:'transparent',color:'#8892aa',
            fontFamily:'inherit',fontSize:10,cursor:'pointer',
          }}>✕ Geri dön</button>
        </div>
      )}
    </div>
  );
}