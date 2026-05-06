import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const layerState = { ges: false, res: false };

const map = new maplibregl.Map({
  container: 'app',
  style: {
    version: 8,
    sources: {
      'satellite': {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '© Esri'
      },
      'terrain-source': {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        tileSize: 256,
        encoding: 'terrarium',
        maxzoom: 15
      }
    },
    layers: [
      { id: 'satellite', type: 'raster', source: 'satellite' }
    ],
    terrain: { source: 'terrain-source', exaggeration: 2.5 },
    sky: {
      'sky-color': '#0a0a2e',
      'horizon-color': '#0d1b2a',
      'fog-color': '#0a0a1a',
      'fog-ground-blend': 0.9
    }
  },
  center: [27.4, 38.65],
  zoom: 7.5,
  pitch: 55,
  bearing: -20,
  antialias: true
});

map.addControl(new maplibregl.NavigationControl(), 'top-right');

map.on('load', async () => {
  const sinirRes = await fetch('/izmir_sinir.geojson');
  const sinirData = await sinirRes.json();
  const izmir = sinirData.features[0].geometry.coordinates;

  const worldMask = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [[-180,-90],[180,-90],[180,90],[-180,90],[-180,-90]],
          ...izmir
        ]
      }
    }]
  };

  map.addSource('mask', { type: 'geojson', data: worldMask });
  map.addLayer({
    id: 'outside-mask',
    type: 'fill',
    source: 'mask',
    paint: { 'fill-color': '#000000', 'fill-opacity': 1 }
  }, 'satellite');

  map.addSource('ges-img', {
    type: 'raster',
    tiles: ['http://127.0.0.1:8001/tiles/ges/{z}/{x}/{y}.png'],
    tileSize: 256,
    minzoom: 6,
    maxzoom: 14
  });
  map.addLayer({
    id: 'ges-layer',
    type: 'raster',
    source: 'ges-img',
    layout: { visibility: 'none' },
    paint: { 'raster-opacity': 0.85 }
  });

  map.addSource('res-img', {
    type: 'raster',
    tiles: ['http://127.0.0.1:8001/tiles/res/{z}/{x}/{y}.png'],
    tileSize: 256,
    minzoom: 6,
    maxzoom: 14
  });
  map.addLayer({
    id: 'res-layer',
    type: 'raster',
    source: 'res-img',
    layout: { visibility: 'none' },
    paint: { 'raster-opacity': 0.85 }
  });

  map.addSource('sinir', { type: 'geojson', data: sinirData });
  map.addLayer({
    id: 'sinir-outline',
    type: 'line',
    source: 'sinir',
    paint: {
      'line-color': '#ffb347',
      'line-width': 1.5,
      'line-opacity': 0.85,
      'line-dasharray': [3, 3]
    }
  });

  document.getElementById('btn-ges').addEventListener('click', () => toggleLayer('ges'));
  document.getElementById('btn-res').addEventListener('click', () => toggleLayer('res'));
});

function toggleLayer(name) {
  layerState[name] = !layerState[name];
  const visible = layerState[name] ? 'visible' : 'none';
  const btn = document.getElementById('btn-' + name);
  map.setLayoutProperty(name + '-layer', 'visibility', visible);
  btn.classList.toggle('active', layerState[name]);
  const legend = document.getElementById('legend');
  if (layerState[name]) {
    document.getElementById('legend-title').textContent =
      name === 'ges' ? 'GES Uygunluk Skoru' : 'RES Uygunluk Skoru';
    legend.classList.add('visible');
  } else if (!layerState.ges && !layerState.res) {
    legend.classList.remove('visible');
  }
}