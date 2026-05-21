import { useState, useEffect, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer, GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers';
import { FlyToInterpolator } from '@deck.gl/core';
import { MaskExtension } from '@deck.gl/extensions';


const S_FILL = {
  5:[34,85,55,195], 4:[71,107,45,180], 3:[140,90,20,170], 2:[160,65,30,160], 1:[130,35,35,150],
};
const S_RGB = {
  5:[34,85,55], 4:[71,107,45], 3:[140,90,20], 2:[160,65,30], 1:[130,35,35],
};
const S_HEX = { 5:'#225537', 4:'#476B2D', 3:'#8C5A14', 2:'#A0411E', 1:'#822323' };
const S_AD  = { 5:'Çok Uygun', 4:'Uygun', 3:'Orta', 2:'Düşük', 1:'Uygunsuz' };

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
      longitude:(minLon+maxLon)/2, latitude:(minLat+maxLat)/2,
      zoom:Math.min(Math.log2(2.4/dMax)+7,11), pitch:0, bearing:0,
    };
  } catch { return null; }
}

const hexRgb = (hex) => {
  const h=hex.replace('#','');
  return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
};

export default function MiniMap({
  ilceAdi, energyType='GES', color='#0EA5A4',
  height=320, highlightPoint=null, mahalleFeature=null,
  santralData=null, showSantraller=false,
  selectedSantral=null, onSelectSantral=null,
}) {
  const [viewState, setViewState] = useState({longitude:27.05,latitude:38.42,zoom:9,pitch:0,bearing:0});
  const [ilceFeat,  setIlceFeat]  = useState(null);
  const [polyData,  setPolyData]  = useState(null);
  const [ready,     setReady]     = useState(false);
  const [activePin, setActivePin] = useState(null);

  useEffect(() => {
    if (!ilceAdi) return;
    setReady(false); setIlceFeat(null); setPolyData(null); setActivePin(null);
    const t = energyType.toLowerCase();
    Promise.all([
      fetch(`/api/${t}/districts`).then(r=>r.ok?r.json():null),
      fetch(`/api/${t}/polygons?min_sinif=2&limit=10000&ilce=${encodeURIComponent(ilceAdi)}`).then(r=>r.ok?r.json():null),
    ])
    .then(([distGj, polyGj]) => {
      if (distGj?.features) {
        const feat = distGj.features.find(f=>f.properties?.ilce?.toLowerCase()===ilceAdi.toLowerCase());
        if (feat?.geometry) {
          setIlceFeat(feat);
          const v = geomToView(feat.geometry);
          if (v) setViewState(v);
        }
      }
      if (polyGj?.features) setPolyData(polyGj);
    })
    .catch(()=>{})
    .finally(()=>setReady(true));
  }, [ilceAdi, energyType]);

  useEffect(() => {
    if (!highlightPoint) { setActivePin(null); return; }
    setActivePin(highlightPoint);
    setViewState(prev=>({
      ...prev,
      longitude:highlightPoint.lon, latitude:highlightPoint.lat,
      zoom:highlightPoint.zoom||13,
      transitionDuration:900,
      transitionInterpolator:new FlyToInterpolator({speed:1.6}),
    }));
  }, [highlightPoint]);

  const rgb     = useMemo(()=>hexRgb(color),[color]);
  const MASK_ID = `mask-${ilceAdi}`;

  const layers = useMemo(()=>{
    const t = energyType.toLowerCase();
    return [

      // 1. Uydu — tüm viewport, diğer ilçeler uydu olarak görünür
      new TileLayer({
        id:`mm-sat-${ilceAdi}`,
        data:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        minZoom:0, maxZoom:19, tileSize:256,
        renderSubLayers:p=>{
          const {west,south,east,north}=p.tile.bbox;
          return new BitmapLayer(p,{data:null,image:p.data,bounds:[west,south,east,north]});
        },
      }),

      // 2. Mask tanımı — ilçe geometrisi (render edilmez, sadece clip için)
      new GeoJsonLayer({
        id: MASK_ID,
        data:{type:'FeatureCollection', features: ilceFeat ? [ilceFeat] : []},
        operation:'mask',
      }),

      // 3. Raster — MaskExtension ile SADECE seçili ilçede görünür
      new TileLayer({
        id:`mm-raster-${ilceAdi}-${t}`,
        data:`/api/tiles/${t}/{z}/{x}/{y}.png`,
        minZoom:6, maxZoom:14, tileSize:256, opacity:0.85,
        extensions:[new MaskExtension()],
        maskId: MASK_ID,
        maskByInstance: false,
        renderSubLayers:p=>{
          const {west,south,east,north}=p.tile.bbox;
          return new BitmapLayer(p,{data:null,image:p.data,bounds:[west,south,east,north],parameters:{depthTest:false}});
        },
      }),

      // 4. Sınıf polygon'ları — zaten ilçeye göre filtrelenmiş
      ...(polyData?.features?.length ? [
        new GeoJsonLayer({
          id:`mm-poly-${ilceAdi}-${t}`,
          data:polyData,
          pickable:true, filled:true, stroked:false,
          getFillColor:f=>S_FILL[Math.round(f.properties?.sinif??3)]||[100,100,100,120],
          parameters:{depthTest:false},
          updateTriggers:{getFillColor:[energyType]},
        }),
      ]:[]),

      // 5. İlçe sınır çizgisi
      ...(ilceFeat ? [
        new GeoJsonLayer({
          id:`mm-sinir-${ilceAdi}`,
          data:{type:'FeatureCollection',features:[ilceFeat]},
          pickable:false, filled:false, stroked:true,
          getLineColor:[...rgb,230],
          lineWidthMinPixels:2.2,
          parameters:{depthTest:false},
        }),
      ]:[]),

      // 6. Aktif pin
      ...(activePin && !mahalleFeature ? [
        new ScatterplotLayer({
          id:`mm-pin-outer-${activePin.lon}`,
          data:[activePin],
          getPosition:d=>[d.lon,d.lat], getRadius:600,
          getFillColor:[...(S_RGB[activePin.sinif]||[14,165,164]),50],
          stroked:false, parameters:{depthTest:false},
        }),
        new ScatterplotLayer({
          id:`mm-pin-inner-${activePin.lon}`,
          data:[activePin],
          getPosition:d=>[d.lon,d.lat], getRadius:250,
          getFillColor:[...(S_RGB[activePin.sinif]||[14,165,164]),255],
          stroked:true, getLineColor:[255,255,255,220],
          lineWidthMinPixels:2, parameters:{depthTest:false},
        }),
      ]:[]),

      // 7. Seçili mahalle
      ...(mahalleFeature ? [
        new GeoJsonLayer({
          id:`mm-mahalle`,
          data:{type:'FeatureCollection',features:[mahalleFeature]},
          pickable:false, filled:true, stroked:true,
          getFillColor:[14,165,164,35], getLineColor:[255,255,255,250],
          lineWidthMinPixels:3, parameters:{depthTest:false},
        }),
      ]:[]),

      // 8. Santraller
      ...(showSantraller && santralData?.features ? [
        new ScatterplotLayer({
          id:`mm-santraller-${ilceAdi}-${t}`,
          data:santralData.features,
          getPosition:d=>d.geometry.coordinates,
          getRadius:160, radiusMinPixels:5.5, radiusMaxPixels:14,
          getFillColor:d=>d===selectedSantral?[255,255,255,255]:(t==='ges'?[251,191,36,230]:[56,189,248,230]),
          getLineColor:d=>d===selectedSantral?(t==='ges'?[251,191,36,255]:[56,189,248,255]):[255,255,255,200],
          lineWidthMinPixels:1.2, stroked:true, pickable:true,
          onClick:({object})=>{ if(onSelectSantral) onSelectSantral(object||null); },
          updateTriggers:{getFillColor:[selectedSantral],getLineColor:[selectedSantral]},
          parameters:{depthTest:false},
        }),
      ]:[]),

      // 9. Etiketler
      new TileLayer({
        id:`mm-labels-${ilceAdi}`,
        data:'https://a.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png',
        minZoom:0, maxZoom:14, tileSize:256,
        renderSubLayers:p=>{
          const {west,south,east,north}=p.tile.bbox;
          return new BitmapLayer(p,{data:null,image:p.data,bounds:[west,south,east,north],opacity:0.9});
        },
      }),
    ];
  },[ilceAdi,energyType,ilceFeat,polyData,rgb,activePin,mahalleFeature,santralData,showSantraller,selectedSantral,onSelectSantral,MASK_ID]);

  const getTooltip = ({object}) => {
    if (!object?.properties) return null;
    const p = object.properties;
    if (p.santral_adi !== undefined) {
      const tipRenk = energyType==='GES'?'#F59E0B':'#38BDF8';
      const ad = p.santral_adi.startsWith('OSM-')
        ?(energyType==='GES'?'Güneş Enerji Santrali':'Rüzgâr Enerji Santrali')
        :p.santral_adi;
      return {
        html:`<div style="background:rgba(10,16,30,0.97);border:1px solid rgba(255,255,255,0.1);border-top:3px solid ${tipRenk};border-radius:10px;padding:10px 14px;font-family:'Manrope',sans-serif;min-width:180px">
          <div style="font-size:12px;font-weight:800;color:#fff;margin-bottom:6px">${ad}</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.5)">Kapasite: <span style="color:${tipRenk};font-weight:700">${p.kapasite_mw?p.kapasite_mw+' MW':'Bilinmiyor'}</span></div>
          <div style="font-size:10px;color:rgba(255,255,255,0.5);margin-top:3px">Operatör: <span style="color:#fff">${p.operator==='—'?'Bilinmiyor':p.operator}</span></div>
        </div>`,
        style:{background:'none',border:'none',padding:'0'},
      };
    }
    if (p.sinif !== undefined) {
      const s = Math.round(p.sinif);
      return {
        html:`<div style="background:rgba(10,16,30,0.97);border:1px solid rgba(255,255,255,0.1);border-left:3px solid ${S_HEX[s]||'#888'};border-radius:10px;padding:10px 14px;font-family:'Manrope',sans-serif;min-width:150px">
          <div style="font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${S_HEX[s]||'#888'};margin-bottom:4px">${energyType} Uygunluk</div>
          <div style="font-size:15px;font-weight:800;color:${S_HEX[s]||'#888'}">Sınıf ${s} (${S_AD[s]||''})</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.5);margin-top:6px">Alan: <span style="color:#fff;font-weight:700">${Number(p.alan_ha||0).toFixed(1)} ha</span></div>
          <div style="font-size:10px;color:rgba(255,255,255,0.5)">~Kapasite: <span style="color:#0EA5A4;font-weight:700">${Number(p.tahmini_mw||p.mw||0).toFixed(1)} MW</span></div>
        </div>`,
        style:{background:'none',border:'none',padding:'0'},
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

      <div style={{position:'absolute',bottom:8,left:10,zIndex:5,
        background:'rgba(6,10,20,0.88)',backdropFilter:'blur(8px)',
        border:`1px solid ${color}50`,borderRadius:6,padding:'4px 10px',
        fontSize:11,fontWeight:700,color,letterSpacing:'0.05em',
        display:'flex',gap:6,alignItems:'center'}}>
        <div style={{width:6,height:6,borderRadius:'50%',background:color}}/>
        {ilceAdi} · {energyType}
      </div>

      {activePin && !mahalleFeature && (
        <div style={{position:'absolute',top:8,right:8,zIndex:5,
          background:'rgba(6,10,20,0.92)',backdropFilter:'blur(8px)',
          border:`1px solid ${activePin.label==='max'?S_HEX[5]:S_HEX[1]}50`,
          borderRadius:8,padding:'6px 10px',fontSize:11,color:'#fff',
          display:'flex',flexDirection:'column',gap:2}}>
          <div style={{fontWeight:700,color:activePin.label==='max'?S_HEX[4]:S_HEX[2],
            fontSize:10,textTransform:'uppercase',letterSpacing:'0.06em'}}>
            {activePin.label==='max'?'▲ En Uygun Bölge':'▼ En Küçük Bölge'}
          </div>
          <div style={{fontWeight:800,fontSize:13}}>Sınıf {activePin.sinif}</div>
          <div style={{color:'#8892aa',fontSize:10}}>{activePin.alan_ha?.toLocaleString('tr')} ha</div>
          <button onClick={()=>{
            setActivePin(null);
            if (ilceFeat?.geometry) {
              const v=geomToView(ilceFeat.geometry);
              if (v) setViewState({...v,transitionDuration:700,
                transitionInterpolator:new FlyToInterpolator({speed:1.4})});
            }
          }} style={{marginTop:3,padding:'2px 6px',borderRadius:4,
            border:'1px solid rgba(255,255,255,0.15)',background:'transparent',
            color:'#8892aa',fontFamily:'inherit',fontSize:10,cursor:'pointer'}}>
            ✕ Geri dön
          </button>
        </div>
      )}

      {selectedSantral && (
        <div style={{position:'absolute',top:8,right:8,zIndex:15,width:220,
          background:'rgba(6,10,20,0.95)',backdropFilter:'blur(8px)',
          borderRadius:10,border:`1px solid ${energyType==='GES'?'#F59E0B':'#38BDF8'}50`,
          borderTop:`3px solid ${energyType==='GES'?'#F59E0B':'#38BDF8'}`,
          padding:'10px 12px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
            <div style={{fontSize:11,fontWeight:800,color:'#fff',overflow:'hidden',
              textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:170}}>
              {selectedSantral.properties.santral_adi?.startsWith('OSM-')
                ?(energyType==='GES'?'Güneş Enerji Santrali':'Rüzgâr Enerji Santrali')
                :selectedSantral.properties.santral_adi}
            </div>
            <button onClick={()=>onSelectSantral&&onSelectSantral(null)}
              style={{background:'rgba(255,255,255,0.1)',border:'none',color:'#fff',
                width:18,height:18,borderRadius:4,cursor:'pointer',fontSize:11,
                display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:10}}>
              <span style={{color:'#8892aa'}}>Kapasite:</span>
              <span style={{color:energyType==='GES'?'#F59E0B':'#38BDF8',fontWeight:700}}>
                {selectedSantral.properties.kapasite_mw
                  ?`${selectedSantral.properties.kapasite_mw.toFixed(1)} MW`:'Bilinmiyor'}
              </span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:10}}>
              <span style={{color:'#8892aa'}}>Operatör:</span>
              <span style={{color:'#fff',overflow:'hidden',textOverflow:'ellipsis',
                whiteSpace:'nowrap',maxWidth:120,textAlign:'right'}}>
                {selectedSantral.properties.operator==='—'?'Bilinmiyor':selectedSantral.properties.operator}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}