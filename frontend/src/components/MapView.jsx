import { MapContainer, TileLayer, GeoJSON, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import L from 'leaflet';
import 'leaflet.heat';
import 'leaflet.markercluster';
import { useState, useEffect } from 'react';
import axios from 'axios';

const COLORS = ['#E7EAF7', '#A8B4E0', '#3B4FB8', '#2A3C8F', '#1B2766'];
const MANZANA_MIN_ZOOM = 13;

// Detecta la URL del backend en Railway o usa localhost para desarrollo local
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const API_ENDPOINT = {
  distrito: `${BASE_URL}/api/geo/distritos`,
  manzana:  `${BASE_URL}/api/geo/manzanas`,
  comuna:   `${BASE_URL}/api/geo/comunas`,
};

// ── Choropleth ──────────────────────────────────────────────────────────────

const getFeatureStyle = (value, min, max) => {
  const range      = max - min;
  const normalized = range === 0 ? 0 : (value - min) / range;
  const color      = normalized > 0.8 ? COLORS[4]
    : normalized > 0.6 ? COLORS[3]
    : normalized > 0.4 ? COLORS[2]
    : normalized > 0.2 ? COLORS[1]
    : COLORS[0];
  return { fillColor: value > 0 ? color : 'transparent', weight: 0.5, opacity: 1, color: '#334155', fillOpacity: 0.7 };
};

function MapContent({ setHoverInfo, activeVar, nivelGeo, onStatsChange, onZoomChange }) {
  const [geoData, setGeoData] = useState(null);
  const [stats, setStats]     = useState({ min: 0, max: 1 });

  const map = useMapEvents({
    moveend: () => { onZoomChange(map.getZoom()); fetchGeoData(); },
    zoomend: () => { onZoomChange(map.getZoom()); fetchGeoData(); },
  });

  const fetchGeoData = async () => {
    if (nivelGeo === 'manzana' && map.getZoom() < MANZANA_MIN_ZOOM) { setGeoData(null); return; }
    try {
      const b   = map.getBounds();
      const res = await axios.get(API_ENDPOINT[nivelGeo], {
        params: { minx: b.getWest(), miny: b.getSouth(), maxx: b.getEast(), maxy: b.getNorth() },
      });
      const values = res.data.features.map(f => f.properties[activeVar]).filter(v => v != null && v > 0);
      if (values.length > 0) {
        const s = { min: Math.min(...values), max: Math.max(...values) };
        setStats(s);
        onStatsChange(s);
      }
      setGeoData(res.data);
    } catch (err) { console.error('geodata error:', err); }
  };

  useEffect(() => { if (map) { setGeoData(null); fetchGeoData(); } }, [activeVar, nivelGeo]);

  return geoData ? (
    <GeoJSON
      key={`${nivelGeo}-${activeVar}-${geoData.features.length}`}
      data={geoData}
      style={(f) => getFeatureStyle(f.properties[activeVar], stats.min, stats.max)}
      onEachFeature={(feature, layer) => {
        layer.on({ mouseover: () => setHoverInfo(feature.properties), mouseout: () => setHoverInfo(null) });
      }}
    />
  ) : null;
}

// ── Puntos del usuario: heatmap + clustering (todo imperativo) ───────────────

function UserPointsLayer({ userPoints, tagCol }) {
  const map = useMap();

  useEffect(() => {
    if (!userPoints?.length) return;

    // ── Pane personalizado para el heatmap (encima del choropleth, debajo de los pins) ──
    if (!map.getPane('heatmapPane')) {
      map.createPane('heatmapPane');
      map.getPane('heatmapPane').style.zIndex    = '450';
      map.getPane('heatmapPane').style.pointerEvents = 'none';
    }

    // ── 1. Heatmap ───────────────────────────────────────────────────────────
    const heat = L.heatLayer(
      userPoints.map(p => [p.lat, p.lon, 1.0]),
      {
        radius: 40, blur: 30, maxZoom: 17,
        gradient: { 0.25: '#3b82f6', 0.55: '#f97316', 1.0: '#ef4444' },
        pane: 'heatmapPane',
      }
    ).addTo(map);

    // ── 2. Cluster de pins (usa L.Marker con divIcon para poder agruparse) ───
    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom:   true,
      maxClusterRadius:    60,
      iconCreateFunction: (grp) => {
        const n    = grp.getChildCount();
        const size = n < 10 ? 32 : n < 100 ? 38 : 44;
        const fs   = n < 100 ? 12 : 10;
        return L.divIcon({
          html: `<div style="
            width:${size}px;height:${size}px;
            background:#0f172a;
            border:2.5px solid #f97316;
            border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            color:#f97316;font-weight:700;font-size:${fs}px;font-family:sans-serif;
            box-shadow:0 2px 10px rgba(0,0,0,0.6)
          ">${n}</div>`,
          className: '',
          iconSize:   [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      },
    });

    userPoints.forEach(p => {
      const tag     = tagCol && p[tagCol] != null ? String(p[tagCol]) : null;
      const addrKey = Object.keys(p).find(k => k !== 'lat' && k !== 'lon' && k !== tagCol);

      const pinIcon = L.divIcon({
        html: `<div style="
          width:12px;height:12px;
          background:#f97316;
          border:2px solid white;
          border-radius:50%;
          box-shadow:0 1px 5px rgba(0,0,0,0.7)
        "></div>`,
        className:  '',
        iconSize:   [12, 12],
        iconAnchor: [6, 6],
      });

      const popup = `
        <div style="font-family:sans-serif;min-width:130px;line-height:1.6">
          ${tag     ? `<p style="font-weight:700;font-size:13px;margin:0 0 3px;color:#1e293b">${tag}</p>` : ''}
          ${addrKey ? `<p style="font-size:11px;color:#475569;margin:0">${p[addrKey]}</p>` : ''}
          <p style="font-size:10px;color:#94a3b8;margin:4px 0 0">${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}</p>
        </div>`;

      cluster.addLayer(L.marker([p.lat, p.lon], { icon: pinIcon }).bindPopup(popup));
    });

    map.addLayer(cluster);

    return () => {
      heat.remove();
      map.removeLayer(cluster);
    };
  }, [userPoints, tagCol, map]);

  return null;
}

// ── Leyenda choropleth ───────────────────────────────────────────────────────

function ChoroplethLegend({ min, max, label }) {
  const fmt   = (n) => n >= 1000 ? Math.round(n).toLocaleString('es-CL') : Number.isInteger(n) ? n : n.toFixed(1);
  const steps = [0, 0.25, 0.5, 0.75, 1].map(t => min + (max - min) * t);
  return (
    <div style={{
      position: 'absolute', bottom: 32, right: 24, zIndex: 1000,
      background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
      border: '1px solid #DCDFE4',
      padding: '12px 14px', borderRadius: 8,
      boxShadow: '0 8px 24px rgba(18,21,26,.12)',
      minWidth: 190,
    }}>
      <p style={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 10, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.14em',
        color: '#838A98', margin: '0 0 8px',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        maxWidth: 170,
      }}>
        {label}
      </p>
      <div style={{ display: 'flex', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
        {COLORS.map((c, i) => (
          <div key={i} style={{ background: c, height: 10, flex: 1 }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#5A6170' }}>
        {steps.map((v, i) => <span key={i}>{fmt(v)}</span>)}
      </div>
    </div>
  );
}

// ── Aviso zoom manzanas ──────────────────────────────────────────────────────

function ZoomHint() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 999, pointerEvents: 'none',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)',
        border: '1px solid #DCDFE4', color: '#8A6A1E',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 12, fontWeight: 600,
        padding: '10px 20px', borderRadius: 20,
        boxShadow: '0 8px 24px rgba(18,21,26,.10)',
      }}>
        Acerca el mapa para ver manzanas (zoom &ge; {MANZANA_MIN_ZOOM})
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function MapView({ setHoverInfo, activeVar, activeVarLabel, nivelGeo, userPoints, tagCol }) {
  const [legendStats, setLegendStats] = useState({ min: 0, max: 1 });
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
          onStatsChange={setLegendStats}
          onZoomChange={setCurrentZoom}
        />
        <UserPointsLayer userPoints={userPoints} tagCol={tagCol} />
      </MapContainer>

      {nivelGeo === 'manzana' && currentZoom < MANZANA_MIN_ZOOM && <ZoomHint />}

      <ChoroplethLegend min={legendStats.min} max={legendStats.max} label={activeVarLabel || activeVar} />
    </div>
  );
}
