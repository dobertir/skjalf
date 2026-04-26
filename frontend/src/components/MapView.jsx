import { MapContainer, TileLayer, GeoJSON, useMapEvents, useMap, ScaleControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import L from 'leaflet';
import 'leaflet.heat';
import 'leaflet.markercluster';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { RAMPS, DENSITY_RAMPS, getBreaks, valueToColor, normalizeValue } from '../utils/choropleth';

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
      const values    = res.data.features.map(f => f.properties[activeVar]).filter(v => v != null && v > 0);
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
      // Añadimos el pane para controlar la profundidad
      pane="coveragePane" 
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

// ── Hexbin helper ─────────────────────────────────────────────────────────────
function buildHexBins(points, radiusMeters) {
  if (!points.length) return [];
  const R      = 111320;
  const refLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const cosLat = Math.cos(refLat * Math.PI / 180);

  const toXY  = p => ({ x: p.lon * R * cosLat, y: p.lat * R });
  const toLng = x  => x / (R * cosLat);
  const toLat = y  => y / R;

  const dx = radiusMeters * Math.sqrt(3);
  const dy = radiusMeters * 1.5;
  const grid = new Map();

  points.forEach(p => {
    const { x, y } = toXY(p);
    const row  = Math.round(y / dy);
    const xOff = (((row % 2) + 2) % 2) * (dx / 2);
    const col  = Math.round((x - xOff) / dx);
    const cx   = col * dx + xOff;
    const cy   = row * dy;
    const key  = `${col}|${row}`;
    if (!grid.has(key)) grid.set(key, { cx, cy, n: 0 });
    grid.get(key).n += 1;
  });

  return [...grid.values()].map(({ cx, cy, n }) => {
    const vertices = [];
    for (let i = 0; i < 6; i++) {
      const a  = (i * 60 + 30) * Math.PI / 180;
      const vx = cx + radiusMeters * Math.cos(a);
      const vy = cy + radiusMeters * Math.sin(a);
      vertices.push([toLat(vy), toLng(vx)]);
    }
    return { vertices, n };
  });
}

// ── Pane bootstrap (must render before MapContent and UserPointsLayer) ────────
function MapPanesSetup() {
  const map = useMap();
  useEffect(() => {
    // leaflet default z-indices: tilePane=200, overlayPane=400, shadowPane=500,
    // markerPane=600, tooltipPane=650, popupPane=700.
    // coveragePane must be below overlayPane so leaflet.heat canvas (overlayPane)
    // sits on top even before we manually move it to heatmapPane.
    [
      { name: 'coveragePane', z: 350 },   // choropleth
      { name: 'userDataPane', z: 490 },   // hexbin / points
      { name: 'heatmapPane',  z: 620 },   // heatmap canvas
    ].forEach(({ name, z }) => {
      if (!map.getPane(name)) {
        const p = map.createPane(name);
        p.style.zIndex        = String(z);
        p.style.pointerEvents = 'none';
      }
    });
  }, [map]);
  return null;
}

// ── User points layer ─────────────────────────────────────────────────────────
function UserPointsLayer({ userPoints, tagCol, addrRamp, vizMode, addrRadius, addrIntensity, addrVisible }) {
  const map = useMap();

  // Control heatmap pane visibility / opacity (canvas is in heatmapPane after fix)
  useEffect(() => {
    const hPane = map.getPane('heatmapPane');
    if (!hPane) return;
    const active = vizMode === 'heatmap' && addrVisible;
    hPane.style.opacity = active ? String(addrIntensity) : '0';
    hPane.style.display = active ? '' : 'none';
  }, [addrIntensity, vizMode, addrVisible, map]);

  useEffect(() => {
    if (!userPoints?.length || !addrVisible) return;

    const palette = DENSITY_RAMPS[addrRamp] || DENSITY_RAMPS.violet;
    const layers  = [];

    if (vizMode === 'heatmap') {
      const gradient = {
        0.00: 'rgba(0,0,0,0)',  // transparent → map shows through in sparse areas
        0.20: palette[0],
        0.40: palette[1],
        0.60: palette[2],
        0.80: palette[3],
        1.00: palette[4],
      };
      const heat = L.heatLayer(
        userPoints.map(p => [p.lat, p.lon, 1.0]),
        { radius: addrRadius, blur: Math.round(addrRadius * 0.5), maxZoom: 17, gradient, minOpacity: 0.4 }
      ).addTo(map);

      // leaflet.heat v0.2.0 ignores the pane option and hard-codes overlayPane
      // (z-index 400) in its onAdd. Move the canvas to heatmapPane (z-index 620)
      // so it renders above coveragePane (choropleth) and userDataPane.
      const hPane = map.getPane('heatmapPane');
      if (hPane && heat._canvas) {
        hPane.appendChild(heat._canvas);
      }

      layers.push({
        remove: () => {
          try {
            // Restore canvas to overlayPane before heat.onRemove tries to
            // removeChild from there, or it will throw a NotFoundError.
            if (heat._canvas) {
              map.getPanes().overlayPane.appendChild(heat._canvas);
            }
            heat.remove();
          } catch (e) {
            console.warn('Error cleaning heatmap:', e);
          }
        },
      });

    } else if (vizMode === 'hexbin') {
      const radiusMeters = addrRadius * 30;
      const bins  = buildHexBins(userPoints, radiusMeters);
      const maxN  = Math.max(1, ...bins.map(b => b.n));
      const group = L.layerGroup();
      bins.forEach(bin => {
        const t      = Math.pow(bin.n / maxN, 0.7);
        const palIdx = Math.min(palette.length - 1, Math.floor(t * palette.length));
        L.polygon(bin.vertices, {
          fillColor:   palette[palIdx],
          fillOpacity: 0.18 + t * 0.72,
          color:       palette[Math.min(palette.length - 1, palIdx + 1)],
          opacity:     0.45,
          weight:      0.8,
          pane:        'userDataPane',
        }).addTo(group);
      });
      group.addTo(map);
      layers.push({ remove: () => map.removeLayer(group) });

    } else if (vizMode === 'cluster') {
      const cluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        spiderfyOnMaxZoom:   true,
        maxClusterRadius:    60,
        iconCreateFunction: (grp) => {
          const n      = grp.getChildCount();
          const t      = Math.min(n / 50, 1);
          const palIdx = Math.min(palette.length - 1, Math.floor(Math.pow(t, 0.6) * palette.length));
          const color  = palette[palIdx];
          const size   = n < 10 ? 32 : n < 100 ? 38 : 44;
          const fs     = n < 100 ? 12 : 10;
          const fg     = palIdx >= 3 ? '#0f172a' : '#fff';
          return L.divIcon({
            html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid rgba(255,255,255,0.5);border-radius:50%;display:flex;align-items:center;justify-content:center;color:${fg};font-weight:700;font-size:${fs}px;font-family:sans-serif;box-shadow:0 2px 10px rgba(0,0,0,0.5)">${n}</div>`,
            className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
          });
        },
      });
      const dotColor = palette[3];
      userPoints.forEach(p => {
        const tag     = tagCol && p[tagCol] != null ? String(p[tagCol]) : null;
        const addrKey = Object.keys(p).find(k => k !== 'lat' && k !== 'lon' && k !== tagCol);
        const pinIcon = L.divIcon({
          html: `<div style="width:8px;height:8px;background:${dotColor};border:1.5px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.6)"></div>`,
          className: '', iconSize: [8, 8], iconAnchor: [4, 4],
        });
        const popup = `<div style="font-family:sans-serif;min-width:120px;line-height:1.6">
          ${tag     ? `<p style="font-weight:700;font-size:13px;margin:0 0 3px;color:#1e293b">${tag}</p>` : ''}
          ${addrKey ? `<p style="font-size:11px;color:#475569;margin:0">${p[addrKey]}</p>` : ''}
          <p style="font-size:10px;color:#94a3b8;margin:4px 0 0">${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}</p>
        </div>`;
        cluster.addLayer(L.marker([p.lat, p.lon], { icon: pinIcon }).bindPopup(popup));
      });
      map.addLayer(cluster);
      layers.push({ remove: () => map.removeLayer(cluster) });

    } else { // 'points'
      const group = L.layerGroup();
      userPoints.forEach(p => {
        L.circleMarker([p.lat, p.lon], {
          radius:      3,
          fillColor:   palette[3],
          fillOpacity: 0.9,
          color:       palette[4],
          weight:      0.8,
          pane:        'userDataPane',
        }).addTo(group);
      });
      group.addTo(map);
      layers.push({ remove: () => map.removeLayer(group) });
    }

    return () => {
      layers.forEach(l => {
        if (l && typeof l.remove === 'function') {
          // Intentamos remover de forma segura
          try {
            l.remove();
          } catch (e) {
            console.warn("Error limpiando capa:", e);
          }
        }
      });
    };
  }, [userPoints, tagCol, addrRamp, vizMode, addrRadius, addrVisible, map]);

  return null;
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function MapView({
  setHoverInfo, activeVar, nivelGeo, ramp, classification, dimRange,
  userPoints, tagCol, vizMode, addrRamp, addrRadius, addrIntensity, addrVisible,
  onValuesChange,
}) {
  const [currentZoom, setCurrentZoom] = useState(11);

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer
        center={[-33.4489, -70.6693]}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <MapPanesSetup />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <ScaleControl position="bottomleft" imperial={false} />
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
        <UserPointsLayer
          userPoints={userPoints}
          tagCol={tagCol}
          addrRamp={addrRamp}
          vizMode={vizMode}
          addrRadius={addrRadius}
          addrIntensity={addrIntensity}
          addrVisible={addrVisible}
        />
      </MapContainer>

      {nivelGeo === 'manzana' && currentZoom < MANZANA_MIN_ZOOM && (
        <div className="zoom-toast">
          Acerca el mapa para ver manzanas (zoom &ge; {MANZANA_MIN_ZOOM})
        </div>
      )}
    </div>
  );
}
