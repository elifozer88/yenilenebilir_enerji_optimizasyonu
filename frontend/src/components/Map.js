import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { TileLayer, TerrainLayer } from '@deck.gl/geo-layers';
import { BitmapLayer, GeoJsonLayer } from '@deck.gl/layers';
import { FlyToInterpolator } from '@deck.gl/core';
import { buildTooltip } from './MapTooltip';

const TILE_SERVER  = 'http://127.0.0.1:8001';
const MAPTILER_KEY = 'PzlgBC84G0BsOFlAoA71';
const INITIAL_VIEW = { longitude:27.05, latitude:38.42, zoom:9.2, pitch:52, bearing:-15 };
const CITY_VIEW    = { longitude:27.05, latitude:38.42, zoom:11, pitch:30, bearing:0 };

// Sınıf/skor → RGBA — sinif string veya float gelebilir, skor da fallback olarak kullanılır
function getSinifRgba(props, mode='fill') {
  // sinif önce dene (1–5 integer)
  let s = props?.sinif ?? props?.sinif_id ?? props?.class ?? null;
  if (s === null || s === undefined) {
    // skor varsa ona göre hesapla
    const skor = props?.skor ?? props?.uygunluk_skoru ?? 0;
    s = skor >= 4 ? 5 : skor >= 3 ? 4 : skor >= 2 ? 3 : skor >= 1 ? 2 : 1;
  }
  s = Math.round(Number(s));
  const FILL   = {5:[20,128,60,90], 4:[74,166,53,80], 3:[215,119,6,70], 2:[220,107,46,60], 1:[185,28,28,45]};
  const STROKE = {5:[20,128,60,180],4:[74,166,53,160],3:[215,119,6,150],2:[220,107,46,130],1:[185,28,28,110]};
  return (mode==='fill' ? FILL[s] : STROKE[s]) || [100,100,100, mode==='fill'?40:120];
}

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
      latitude:(minLat+maxLat)/2+0.015,
      zoom:Math.min(Math.log2(2.4/dMax)+7,10.5),
      pitch:40, bearing:-8,
    };
  } catch { return null; }
}

export default function MapView({
  energyType='GES', minScore=1,
  onStatsUpdate, cityFocus=false, show3D=true, showSuitability=true, showSantral=true,
  flyToIlce=null, senaryo='varsayilan', selectedIlce=null, onIlceClick=null,
}) {
  const [viewState,    setViewState]    = useState(INITIAL_VIEW);
  const [districtData, setDistrictData] = useState(null);
  const [polyData,     setPolyData]     = useState(null);
  const [loading,      setLoading]      = useState(false);
  const abortRef   = useRef(null);
  const pendingFly = useRef(null);

  useEffect(() => {
    if(cityFocus==null) return;
    setViewState(p=>({...p,...(cityFocus?CITY_VIEW:INITIAL_VIEW),
      transitionDuration:1600, transitionInterpolator:new FlyToInterpolator({speed:1.3})}));
  }, [cityFocus]);

  const doFlyTo = useCallback((ilceAdi, data) => {
    if(!ilceAdi||!data) return false;
    const feat=data.features.find(f=>f.properties?.ilce?.toLowerCase()===ilceAdi.toLowerCase());
    if(!feat?.geometry) return false;
    const v=geomToView(feat.geometry);
    if(!v) return false;
    setViewState(p=>({...p,...v,
      transitionDuration:1500, transitionInterpolator:new FlyToInterpolator({speed:1.4})}));
    return true;
  },[]);

  useEffect(()=>{
    if(!flyToIlce) return;
    const ilce=flyToIlce.split('_')[0];
    if(districtData){ doFlyTo(ilce,districtData); }
    else { pendingFly.current=ilce; }
  },[flyToIlce,districtData,doFlyTo]);

  useEffect(()=>{
    abortRef.current?.abort();
    const ctrl=new AbortController();
    abortRef.current=ctrl;
    setLoading(true);
    setDistrictData(null);
    setPolyData(null);

    const t=energyType.toLowerCase();

    fetch(`/api/${t}/stats`,{signal:ctrl.signal})
      .then(r=>r.ok?r.json():null)
      .then(d=>{ if(d&&onStatsUpdate) onStatsUpdate({
        count:d.ilce_sayisi??0, avgScore:String(d.ort_skor??'—'),
        maxScore:String(d.max_skor??'—'), totalHa:d.toplam_uygun_ha??0,
      });}).catch(()=>{});

    const p1=fetch(`/api/${t}/districts?senaryo=${senaryo}`,{signal:ctrl.signal})
      .then(r=>r.ok?r.json():null)
      .then(gj=>{
        if(!gj) return;
        setDistrictData(gj);
        if(pendingFly.current){ doFlyTo(pendingFly.current,gj); pendingFly.current=null; }
      }).catch(()=>{});

    const p2=fetch(`/api/${t}/polygons?min_sinif=4&senaryo=${senaryo}&limit=1500`,{signal:ctrl.signal})
      .then(r=>r.ok?r.json():null)
      .then(gj=>{ if(gj) setPolyData(gj); }).catch(()=>{});

    Promise.allSettled([p1,p2]).finally(()=>setLoading(false));
    return()=>ctrl.abort();
  },[energyType,senaryo,doFlyTo]);

  const zoom = viewState.zoom;

  const layers = useMemo(()=>{
    const t=energyType.toLowerCase();

    return [
      // 1. Terrain 3D + uydu texture
      new TerrainLayer({
        id:'terrain', minZoom:0, maxZoom:13, strategy:'no-overlap',
        elevationDecoder:{rScaler:6553.6,gScaler:25.6,bScaler:0.1,offset:-10000},
        elevationData:`https://api.maptiler.com/tiles/terrain-rgb/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
        texture:`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
        elevationScale:show3D?2.8:0.1, wireframe:false, parameters:{depthTest:true},
      }),

      // 2. Uydu fallback — yüksek zoom
      ...(zoom>=12 ? [
        new TileLayer({
          id:'satellite-fallback',
          data:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          minZoom:12, maxZoom:20, tileSize:256,
          renderSubLayers:p=>{
            const {west,south,east,north}=p.tile.bbox;
            return new BitmapLayer(p,{data:null,image:p.data,bounds:[west,south,east,north]});
          },
        }),
      ]:[]),

      // 3. GES/RES raster overlay (tile server port 8001)
      ...(showSuitability?[
        new TileLayer({
          id:`raster-${energyType}`,
          data:`${TILE_SERVER}/tiles/${t}/{z}/{x}/{y}.png`,
          minZoom:6, maxZoom:14, tileSize:256, opacity:0.55,
          renderSubLayers:p=>{
            const {west,south,east,north}=p.tile.bbox;
            return new BitmapLayer(p,{data:null,image:p.data,bounds:[west,south,east,north],parameters:{depthTest:false}});
          },
        }),
      ]:[]),

      // 4. Uygunluk bölgeleri — DOLU + renk kodlu — DOLU + renk kodlu
      ...(showSuitability&&polyData?[
        new GeoJsonLayer({
          id:`poly-fill-${energyType}`,
          data:{type:'FeatureCollection',features:(polyData.features||[]).filter(f=>(f.properties?.sinif??0)>=minScore)},
          pickable:true,
          filled:true,
          stroked:true,
          getFillColor:   f => getSinifRgba(f.properties, 'fill'),
          getLineColor:   f => getSinifRgba(f.properties, 'stroke'),
          lineWidthMinPixels:0.6,
          parameters:{depthTest:false},
          updateTriggers:{getFillColor:[energyType,minScore],getLineColor:[energyType,minScore]},
        }),
      ]:[]),

      // 5. Min score mask (minScore > 1 ise alttaki bölgeleri karart)
      ...(showSuitability&&polyData&&minScore>1?[
        new GeoJsonLayer({
          id:`mask-${energyType}-${minScore}`,
          data:{type:'FeatureCollection',features:(polyData.features||[]).filter(f=>(f.properties?.sinif??0)<minScore)},
          pickable:false, filled:true, stroked:false,
          getFillColor:[6,9,20,200],
          parameters:{depthTest:false},
          updateTriggers:{getFillColor:[minScore]},
        }),
      ]:[]),

      // 6. İlçe sınırları — hover pickable
      ...(districtData?[
        new GeoJsonLayer({
          id:`districts-${energyType}`,
          data:districtData, pickable:true, filled:false, stroked:true,
          getLineColor:[255,179,71,90], lineWidthMinPixels:0.9,
          parameters:{depthTest:false},
        }),
      ]:[]),

      // 7. Seçili ilçe vurgu
      ...(districtData&&selectedIlce?(()=>{
        const feat=districtData.features.find(f=>f.properties?.ilce?.toLowerCase()===selectedIlce.toLowerCase());
        if(!feat) return [];
        return [
          new GeoJsonLayer({
            id:`sel-fill-${selectedIlce}`,
            data:{type:'FeatureCollection',features:[feat]},
            pickable:false,filled:true,stroked:false,
            getFillColor:[255,255,255,18],
            parameters:{depthTest:false},
          }),
          new GeoJsonLayer({
            id:`sel-border-${selectedIlce}`,
            data:{type:'FeatureCollection',features:[feat]},
            pickable:false,filled:false,stroked:true,
            getLineColor:[255,255,255,220],lineWidthMinPixels:2.8,
            parameters:{depthTest:false},
          }),
        ];
      })():[]),
    ];
  },[districtData,polyData,energyType,minScore,show3D,showSuitability,selectedIlce,zoom,senaryo]);

  const getTooltip=useCallback(({object})=>buildTooltip(object,energyType),[energyType]);

  return(
    <>
      {loading&&(
        <div style={{
          position:'absolute',inset:0,zIndex:200,
          display:'flex',alignItems:'center',justifyContent:'center',
          background:'rgba(6,10,20,0.55)',backdropFilter:'blur(4px)',
          color:'#8892aa',fontSize:13,fontFamily:"'Manrope',sans-serif",
          gap:10,pointerEvents:'none',
        }}>
          <div style={{
            width:18,height:18,border:'2px solid #1a2035',
            borderTopColor:energyType==='GES'?'#F59E0B':'#38BDF8',
            borderRadius:'50%',animation:'spin .8s linear infinite',
          }}/>
          Yükleniyor…
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <DeckGL
        viewState={viewState}
        onViewStateChange={({viewState:vs})=>setViewState(vs)}
        controller={{inertia:500,scrollZoom:{smooth:true,speed:0.004},dragRotate:true}}
        layers={layers}
        getTooltip={getTooltip}
        onClick={({object})=>{
          if(!object?.properties) return;
          const p=object.properties;
          const ilce=p.ilce_adi||p.ilce;
          if(ilce&&onIlceClick) onIlceClick(ilce);
        }}
        style={{position:'absolute',inset:0}}
      />
    </>
  );
}