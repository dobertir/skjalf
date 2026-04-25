import { MapContainer, TileLayer, GeoJSON, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import L from 'leaflet';
import 'leaflet.heat';
import 'leaflet.markercluster';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { RAMPS, getBreaks, valueToColor, normalizeValue } from '../utils/choropleth';

const MANZANA_MIN_ZOOM = 13;
const BASE_URL = import.meta.env.VITE_API_URL ?? '';

const API_ENDPOINT = {
  distrito: `${BASE_URL}/api/geo/distritos`,
  manzana:  `${BASE_URL}/api/geo/manzanas`,
  comuna:   `${BASE_URL}/api/geo/comunas`,
};

function featureStyle(value, breaks, palette, dimRange) {
  if (value == null || value <= 0 || !breaks?.length) {
    return { fillColor: '#334155', weight: 0.4, opacity: 0.4, color: '#1e293b', fillOpacity: 0.15 };
  }
  const color  = valueToColor(value, breaks, palette);
  const t      = normalizeValue(value, breaks);
  const dimmed = dimRange && (t < dimRange[0] || t > dimRange[1]);
  return {
    fillColor:   color || palette[0],
    weight:      0.5,
    opacity:     1,
    color:       '#0f172a',
    fillOpacity: dimmed ? 0.1 : 0.72,
  };
}

// ── MapContent ────────────────────────────────────────────────────────────────
function MapContent({ setHoverInfo, activeVar, nivelGeo, ramp, classification, dimRange, onValuesChange, onZoomChange }) {
  const [geoData, setGeoData] = useState(null);
  const [breaks, setBreaks]   = useState([]);
  const palette = RAMPS[ramp] || RAMPS.indigo;

  const map = useMapEvents({
    moveend: () => { onZoomChange(map.getZoom()); fetchGeoData(); },
    zoomend: () => { onZoomChange(map.getZoom()); fetchGeoData(); },
  });

  const fetchGeoData = async () => {
    if (nivelGeo === 'manzana' && map.getZoom() < MANZANA_MIN_ZOOM) {
      setGeoData(null); return;
    }
    try {
      const b   = map.getBounds();
      const res = await axios.get(API_ENDPOINT[nivelGeo], {
        params: { minx: b.getWest(), miny: b.getSouth(), maxx: b.getEast(), maxy: b.getNorth() },
      });
      const values  = res.data.features.map(f => f.properties[activeVar]).filter(v => v != null && v > 0);
      const newBreaks = getBreaks(values, 5, classification);
      setBreaks(newBreaks);
      onValuesChange(values, newBreaks);
      setGeoData(res.data);
    } catch (err) { console.error('geodata error:', err); }
  };

  useEffect(() => { if (map) { setGeoData(null); fetchGeoData(); } }, [activeVar, nivelGeo, classification]);

  return geoData ? (
    <GeoJSON
      key={`${nivelGeo}-${activeVar}-${ramp}-${classification}-${dimRange}-${geoData.features.length}`}
      data={geoData}
      style={(f) => featureStyle(f.properties[activeVar], breaks, palette, dimRange)}
      onEachFeature={(feature, layer) => {
        layer.on({
          mouseover: () => setHoverInfo(feature.properties),
          mouseout:  () => setHoverInfo(null),
        });
      }}
    />
  ) : null;
}

// ── User points: heatmap + clustering ────────────────────────────────────────
function UserPointsLayer({ userPoints, tagCol, ramp }) {
  const map = useMap();
  const isWarm = ramp === 'ochre' || ramp === 'viridis';

  useEffect(() => {
    if (!userPoints?.length) return;

    if (!map.getPane('heatmapPane')) {
      map.createPane('heatmapPane');
      map.getPane('heatmapPane').style.zIndex       = '450';
      map.getPane('heatmapPane').style.pointerEvents = 'none';
    }

    const heatGradient = isWarm
      ? { 0.4: '#2A3C8F55', 0.7: '#2A3C8F99', 1.0: '#2A3C8F' }
      : { 0.4: '#6B4FBB55', 0.7: '#6B4FBB99', 1.0: '#6B4FBB' };

    const heat = L.heatLayer(
      userPoints.map(p => [p.lat, p.lon, 1.0]),
      { radius: 40, blur: 30, maxZoom: 17, gradient: heatGradient, pane: 'heatmapPane' }
    ).addTo(map);

    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false, zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true, maxClusterRadius: 60,
      iconCreateFunction: (grp) => {
        const n = grp.getChildCount();
        const size = n < 10 ? 32 : n < 100 ? 38 : 44;
        const fs   = n < 100 ? 12 : 10;
        return L.divIcon({
          html: `<div style="width:${size}px;height:${size}px;background:#0f172a;border:2.5px solid #f97316;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#f97316;font-weight:700;font-size:${fs}px;font-family:sans-serif;box-shadow:0 2px 10px rgba(0,0,0,0.6)">${n}</div>`,
          className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
        });
      },
    });

    userPoints.forEach(p => {
      const tag     = tagCol && p[tagCol] != null ? String(p[tagCol]) : null;
      const addrKey = Object.keys(p).find(k => k !== 'lat' && k !== 'lon' && k !== tagCol);
      const pinIcon = L.divIcon({
        html: `<div style="width:12px;height:12px;background:#f97316;border:2px solid white;border-radius:50%;box-shadow:0 1px 5px rgba(0,0,0,0.7)"></div>`,
        className: '', iconSize: [12, 12], iconAnchor: [6, 6],
      });
      const popup = `<div style="font-family:sans-serif;min-width:130px;line-height:1.6">
        ${tag     ? `<p style="font-weight:700;font-size:13px;margin:0 0 3px;color:#1e293b">${tag}</p>` : ''}
        ${addrKey ? `<p style="font-size:11px;color:#475569;margin:0">${p[addrKey]}</p>` : ''}
        <p style="font-size:10px;color:#94a3b8;margin:4px 0 0">${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}</p>
      </div>`;
      cluster.addLayer(L.marker([p.lat, p.lon], { icon: pinIcon }).bindPopup(popup));
    });

    map.addLayer(cluster);
    return () => { heat.remove(); map.removeLayer(cluster); };
  }, [userPoints, tagCol, isWarm, map]);

  return null;
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function MapView({ setHoverInfo, activeVar, nivelGeo, ramp, classification, dimRange, userPoints, tagCol, onValuesChange }) {
  const [currentZoom, setCurrentZoom] = useState(11);

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer
        center={[-33.4489, -70.6693]}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <MapContent
          setHoverInfo={setHoverInfo}
          activeVar={activeVar}
          nivelGeo={nivelGeo}
          ramp={ramp}
          classification={classification}
          dimRange={dimRange}
          onValuesChange={onValuesChange}
          onZoomChange={setCurrentZoom}
        />
        <UserPointsLayer userPoints={userPoints} tagCol={tagCol} ramp={ramp} />
      </MapContainer>

      {nivelGeo === 'manzana' && currentZoom < MANZANA_MIN_ZOOM && (
        <div className="zoom-toast">
          Acerca el mapa para ver manzanas (zoom &ge; {MANZANA_MIN_ZOOM})
        </div>
      )}
    </div>
  );
}
