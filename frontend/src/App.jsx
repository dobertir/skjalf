import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import MapView    from './components/MapView';
import Legend     from './components/Legend';
import UploadModal from './components/UploadModal';
import Onboarding  from './components/Onboarding';
import SkjalfMark  from './assets/brand/SkjalfMark';
import { Upload, Search, Pin, X, Download, Share2, HelpCircle } from 'lucide-react';
import axios from 'axios';

// ── Constants ─────────────────────────────────────────────────────────────────
const MENU_VARIABLES = {
  "Demografía": [
    { label: "Población Total",       id: "n_per",           units: "personas" },
    { label: "Hombres",               id: "n_hombres",       units: "personas" },
    { label: "Mujeres",               id: "n_mujeres",       units: "personas" },
    { label: "Edad Promedio",         id: "prom_edad",       units: "años"     },
    { label: "Inmigrantes",           id: "n_inmigrantes",   units: "personas" },
    { label: "Pueblos Originarios",   id: "n_pueblos_orig",  units: "personas" },
    { label: "Afrodescendencia",      id: "n_afrodescendencia" },
    { label: "Discapacidad",          id: "n_discapacidad" },
  ],
  "Grupos Etarios": [
    { label: "Infantes 0–5 años",     id: "n_edad_0_5"     },
    { label: "Escolares 6–13 años",   id: "n_edad_6_13"    },
    { label: "Adolescentes 14–17",    id: "n_edad_14_17"   },
    { label: "Jóvenes 18–24 años",    id: "n_edad_18_24"   },
    { label: "Adultos 25–44 años",    id: "n_edad_25_44"   },
    { label: "Adultos 45–59 años",    id: "n_edad_45_59"   },
    { label: "Adultos Mayores 60+",   id: "n_edad_60_mas"  },
  ],
  "Educación": [
    { label: "Escolaridad Promedio",  id: "prom_escolaridad18",                    units: "años" },
    { label: "Analfabetismo",         id: "n_analfabet"                            },
    { label: "Asist. Ed. Básica",     id: "n_asistencia_basica"                    },
    { label: "Asist. Ed. Media",      id: "n_asistencia_media"                     },
    { label: "Asist. Ed. Superior",   id: "n_asistencia_superior"                  },
    { label: "Ed. Terciaria",         id: "n_cine_terciaria_maestria_doctorado"    },
    { label: "Sin Ed. Formal",        id: "n_cine_nunca_curso_primera_infancia"    },
  ],
  "Trabajo": [
    { label: "Ocupados",              id: "n_ocupado"                  },
    { label: "Desocupados",           id: "n_desocupado"               },
    { label: "Fuera Fuerza Trabajo",  id: "n_fuera_fuerza_trabajo"     },
    { label: "Independientes",        id: "n_cise_rec_independientes"  },
    { label: "Dependientes",          id: "n_cise_rec_dependientes"    },
  ],
  "Transporte": [
    { label: "Usa Auto",              id: "n_transporte_auto"        },
    { label: "Transporte Público",    id: "n_transporte_publico"     },
    { label: "Va a Pie",              id: "n_transporte_camina"      },
    { label: "Bicicleta",             id: "n_transporte_bicicleta"   },
    { label: "Motocicleta",           id: "n_transporte_motocicleta" },
  ],
  "Vivienda": [
    { label: "Viviendas Totales",     id: "n_vp"                    },
    { label: "Viviendas Ocupadas",    id: "n_vp_ocupada"            },
    { label: "Viviendas Desocupadas", id: "n_vp_desocupada"         },
    { label: "Viviendas Hacinadas",   id: "n_viv_hacinadas"         },
    { label: "Déficit Cuantitativo",  id: "n_deficit_cuantitativo"  },
    { label: "Casas",                 id: "n_tipo_viv_casa"         },
    { label: "Departamentos",         id: "n_tipo_viv_depto"        },
    { label: "Mediaguas",             id: "n_tipo_viv_mediagua"     },
    { label: "Viv. Irrecuperables",   id: "n_viv_irrecuperables"    },
  ],
  "Hogar": [
    { label: "Total Hogares",         id: "n_hog"                      },
    { label: "Personas por Hogar",    id: "prom_per_hog",  units: "p/hogar" },
    { label: "Hogares Unipersonales", id: "n_hog_unipersonales"        },
    { label: "Jefatura Femenina",     id: "n_jefatura_mujer"           },
    { label: "Hogares c/ May. 60+",   id: "n_hog_60"                   },
    { label: "Hogares c/ Menores",    id: "n_hog_menores"              },
    { label: "Arrienda c/ Contrato",  id: "n_tenencia_arrendada_contrato" },
    { label: "Vivienda Propia",       id: "n_tenencia_propia_pagada"   },
  ],
  "Servicios": [
    { label: "Electricidad Pública",  id: "n_fuente_elect_publica"  },
    { label: "Agua Red Pública",      id: "n_fuente_agua_publica"   },
    { label: "Internet (Total)",      id: "n_internet"              },
    { label: "Internet Fija",         id: "n_serv_internet_fija"    },
    { label: "Alcantarillado",        id: "n_serv_hig_alc_dentro"   },
    { label: "Recolección Basura",    id: "n_basura_servicios"      },
    { label: "Sin Electricidad",      id: "n_fuente_elect_no_tiene" },
    { label: "Sin Saneamiento",       id: "n_serv_hig_no_tiene"     },
  ],
};

const NIVELES = [
  { id: 'comuna',   label: 'Comuna',   scale: '1:50k' },
  { id: 'distrito', label: 'Distrito', scale: '1:20k' },
  { id: 'manzana',  label: 'Manzana',  scale: '1:5k'  },
];

const VALID_RAMPS = ['indigo', 'viridis', 'ochre', 'pivot'];
const VALID_CLS   = ['quantile', 'jenks', 'equal'];

const ALL_VARS = Object.entries(MENU_VARIABLES).flatMap(([cat, items]) =>
  items.map(v => ({ ...v, cat }))
);

const STORAGE_KEY = 'skjalf_prefs_v1';
const API_URL     = import.meta.env.VITE_API_URL ?? '';
const RATE_MS     = 1150;
const GEO_INIT    = { pct: 0, eta: '', done: 0, total: 0, ok: false, err: false, active: false };
const fmtEta = (sec) => {
  if (sec <= 0) return 'casi listo...';
  const m = Math.floor(sec / 60), s = Math.ceil(sec % 60);
  return m > 0 ? `~${m} min ${s} seg` : `~${s} seg`;
};

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

function readInitialState() {
  const p     = new URLSearchParams(window.location.search);
  const prefs = loadPrefs();
  return {
    activeVar:      (p.get('v') && ALL_VARS.find(x => x.id === p.get('v'))) ? p.get('v')  : (prefs.lastVar      || 'n_per'),
    nivelGeo:       (p.get('l') && NIVELES.find(x => x.id === p.get('l')))  ? p.get('l')  : (prefs.lastLevel    || 'distrito'),
    ramp:           (p.get('r') && VALID_RAMPS.includes(p.get('r')))         ? p.get('r')  : (prefs.ramp         || 'indigo'),
    classification: (p.get('c') && VALID_CLS.includes(p.get('c')))           ? p.get('c')  : (prefs.classification || 'quantile'),
    pinnedVars:     prefs.pinnedVars || [],
  };
}

// ── AddressLayerPanel ─────────────────────────────────────────────────────────
const ADDR_MODES = [
  { id: 'heatmap', label: 'Heatmap' },
  { id: 'hexbin',  label: 'Hexbin'  },
  { id: 'cluster', label: 'Cluster' },
  { id: 'points',  label: 'Puntos'  },
];
const ADDR_SWATCHES = {
  violet: '#6B4FBB',
  warm:   '#F0853A',
  cyan:   '#179BB3',
  mono:   '#5A6170',
};

function AddressLayerPanel({ filename, count, visible, setVisible, mode, setMode, ramp, setRamp, radius, setRadius, intensity, setIntensity }) {
  const swatchColor = ADDR_SWATCHES[ramp] || '#6B4FBB';
  const showRadius  = mode === 'heatmap' || mode === 'hexbin';

  return (
    <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 1000, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(10px)', border: '1px solid var(--ink-200)', borderRadius: 'var(--r-4)', boxShadow: 'var(--shadow-3)', padding: '11px 13px', width: 204 }}>

      {/* Dataset pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: swatchColor, flexShrink: 0 }}/>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-700)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {filename || 'Direcciones'}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-400)', flexShrink: 0 }}>{count}</span>
      </div>

      {/* Visibility toggle */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: visible ? 9 : 0 }}>
        <input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)} style={{ accentColor: 'var(--accent)', width: 13, height: 13 }}/>
        <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>{visible ? 'Visible' : 'Oculto'}</span>
      </label>

      {visible && (
        <>
          <div style={{ height: 1, background: 'var(--ink-100)', margin: '0 0 9px' }}/>

          {/* Mode buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, marginBottom: 10 }}>
            {ADDR_MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                style={{ padding: '5px 0', border: 'none', cursor: 'pointer', borderRadius: 'var(--r-2)', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: mode === m.id ? 700 : 400, background: mode === m.id ? swatchColor : 'var(--ink-100)', color: mode === m.id ? '#fff' : 'var(--ink-500)', transition: 'all 120ms', letterSpacing: mode === m.id ? '0.02em' : 0 }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Radius slider */}
          {showRadius && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Radio</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-600)' }}>{radius}</span>
              </div>
              <input type="range" min="14" max="56" step="2" value={radius} onChange={e => setRadius(+e.target.value)} style={{ width: '100%', accentColor: swatchColor }}/>
            </div>
          )}

          {/* Intensity slider (heatmap only) */}
          {mode === 'heatmap' && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Intensidad</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-600)' }}>{Math.round(intensity * 100)}%</span>
              </div>
              <input type="range" min="0.2" max="1" step="0.05" value={intensity} onChange={e => setIntensity(+e.target.value)} style={{ width: '100%', accentColor: swatchColor }}/>
            </div>
          )}

          {/* Color swatches */}
          <div style={{ height: 1, background: 'var(--ink-100)', margin: '0 0 9px' }}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.12em', flex: 1 }}>Color</span>
            {Object.entries(ADDR_SWATCHES).map(([r, color]) => (
              <button
                key={r}
                onClick={() => setRamp(r)}
                title={r}
                style={{ width: 16, height: 16, borderRadius: '50%', background: color, border: ramp === r ? `2px solid var(--ink-900)` : '1.5px solid transparent', cursor: 'pointer', padding: 0, transition: 'border 120ms', flexShrink: 0 }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const init = useMemo(readInitialState, []);

  const [activeVar,      setActiveVar]      = useState(init.activeVar);
  const [nivelGeo,       setNivelGeo]       = useState(init.nivelGeo);
  const [ramp,           setRamp]           = useState(init.ramp);
  const [classification, setClassification] = useState(init.classification);
  const [pinned,         setPinned]         = useState(init.pinnedVars);
  const [dimRange,       setDimRange]       = useState(null);
  const [expandedCats,   setExpandedCats]   = useState(new Set(['Demografía']));
  const [searchQ,        setSearchQ]        = useState('');
  const [mapValues,      setMapValues]      = useState([]);

  const [hoverInfo,      setHoverInfo]      = useState(null);
  const [userPoints,     setUserPoints]     = useState([]);
  const [tagCol,         setTagCol]         = useState(null);
  const [uploadedFile,   setUploadedFile]   = useState('');
  const [addrVisible,    setAddrVisible]    = useState(true);
  const [vizMode,        setVizMode]        = useState('heatmap');
  const [addrRamp,       setAddrRamp]       = useState('violet');
  const [addrRadius,     setAddrRadius]     = useState(32);
  const [addrIntensity,  setAddrIntensity]  = useState(1.0);

  const [showModal,      setShowModal]      = useState(false);
  const [showOnboard,    setShowOnboard]    = useState(
    () => localStorage.getItem('skjalf_seen_intro') !== 'v1'
  );
  const [toast,          setToast]          = useState('');
  const [geo,            setGeo]            = useState(GEO_INIT);

  const searchRef   = useRef(null);
  const mapRef      = useRef(null);
  const geoInterval = useRef(null);

  // ── Persist prefs to localStorage ─────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      lastVar: activeVar, lastLevel: nivelGeo,
      ramp, classification, pinnedVars: pinned,
    }));
  }, [activeVar, nivelGeo, ramp, classification, pinned]);

  // ── Sync state to URL ──────────────────────────────────────────────────────
  useEffect(() => {
    const p = new URLSearchParams({ v: activeVar, l: nivelGeo, r: ramp, c: classification });
    history.replaceState({}, '', '?' + p.toString());
  }, [activeVar, nivelGeo, ramp, classification]);

  // ── ⌘K search shortcut ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault(); searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const togglePin = (id) => setPinned(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleCat = (cat) => setExpandedCats(prev => {
    const next = new Set(prev);
    next.has(cat) ? next.delete(cat) : next.add(cat);
    return next;
  });

  const handleValuesChange = useCallback((values) => setMapValues(values), []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => showToast('URL copiada al portapapeles ✓'))
      .catch(() => showToast('No se pudo copiar la URL'));
  };

  const handleExport = async () => {
    if (!mapRef.current) return;
    try {
      const { toPng } = await import('html-to-image');
      const url = await toPng(mapRef.current, { pixelRatio: 2, cacheBust: true });
      const a = document.createElement('a');
      a.href = url;
      a.download = `skjalf-${activeVar}-${nivelGeo}.png`;
      a.click();
      showToast('Mapa exportado ✓');
    } catch { showToast('No se pudo exportar el mapa'); }
  };

  const dismissOnboard = () => {
    localStorage.setItem('skjalf_seen_intro', 'v1');
    setShowOnboard(false);
  };

  const startGeo = async (file, selAddr, tagColVal, totalRows) => {
    const total   = Math.min(totalRows, 100);
    const totalMs = total * RATE_MS;
    const t0      = Date.now();
    setGeo({ ...GEO_INIT, active: true, total, eta: fmtEta(totalMs / 1000) });
    geoInterval.current = setInterval(() => {
      const elapsed = Date.now() - t0;
      const pct = Math.min((elapsed / totalMs) * 100, 95);
      setGeo(g => ({ ...g, pct, eta: fmtEta(Math.max(0, (totalMs - elapsed) / 1000)), done: Math.floor(pct * total / 100) }));
    }, 300);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('columnas_direccion', JSON.stringify(selAddr));
      const res = await axios.post(`${API_URL}/api/usuario/geocodificar`, fd, { timeout: 180000 });
      clearInterval(geoInterval.current);
      setGeo(g => ({ ...g, pct: 100, eta: 'Completado', done: total, ok: true }));
      setTimeout(() => {
        const validPoints = res.data.filter(p => 
          p.lat !== null && 
          p.lon !== null && 
          !isNaN(p.lat) && 
          !isNaN(p.lon)
        );
        setUserPoints(validPoints);
        setTagCol(tagColVal);
        setUploadedFile(file?.name || '');
        setShowModal(false);
        setGeo(GEO_INIT);
      }, 1200);
    } catch {
      clearInterval(geoInterval.current);
      setGeo(g => ({ ...g, err: true, active: false }));
      showToast('Error al geocodificar. Intenta de nuevo.');
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const activeMeta     = ALL_VARS.find(v => v.id === activeVar);
  const activeVarLabel = activeMeta?.label || activeVar;
  const activeCat      = activeMeta?.cat   || '';

  const filteredVars = searchQ
    ? ALL_VARS.filter(v => v.label.toLowerCase().includes(searchQ.toLowerCase()))
    : null;

  const hoverTitle = hoverInfo ? (
    nivelGeo === 'comuna'  ? (hoverInfo.COMUNA_x  || hoverInfo.COMUNA  || hoverInfo.NOMBRE_COMUN || hoverInfo.NOMBRE) :
    nivelGeo === 'manzana' ? (hoverInfo.ENTIDAD    || hoverInfo.COD_MANZANA || 'Manzana') :
                              hoverInfo.DISTRITO
  ) : null;

  const hoverSubtitle = hoverInfo ? (
    nivelGeo === 'comuna'  ? (hoverInfo.REGION_x || hoverInfo.REGION) :
                              (hoverInfo.COMUNA_x || hoverInfo.COMUNA)
  ) : null;

  const hoverValue    = hoverInfo?.[activeVar] ?? null;
  const visibleTotal  = mapValues.reduce((a, b) => a + b, 0);
  const hoverPct      = (hoverValue != null && visibleTotal > 0) ? ((hoverValue / visibleTotal) * 100) : null;
  const hoverRank     = (hoverValue != null && mapValues.length > 0)
    ? mapValues.filter(v => v > hoverValue).length + 1
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside className="sidebar" style={{ width: 268, flexShrink: 0, position: 'relative', zIndex: 1000 }}>

        {/* Brand */}
        <div className="brand">
          <div className="brand-row">
            <SkjalfMark size={22} color="var(--accent)" />
            <span className="wordmark">Skjalf<em>:</em></span>
          </div>
          <span className="tagline">Visualizador de datos geográficos</span>
        </div>

        {/* Search */}
        <div className="sb-search">
          <Search size={12} style={{ color: 'var(--ink-400)', flexShrink: 0 }} />
          <input
            ref={searchRef}
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Buscar variable..."
          />
          {!searchQ
            ? <kbd>⌘K</kbd>
            : <button onClick={() => setSearchQ('')} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'var(--ink-300)' }}>
                <X size={11}/>
              </button>
          }
        </div>

        {/* Nivel geográfico */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--ink-200)' }}>
          <p className="nav-label" style={{ margin: '0 0 6px' }}>Nivel Geográfico</p>
          <div className="geo-seg">
            {NIVELES.map(n => (
              <button key={n.id} className={nivelGeo === n.id ? 'active' : ''} onClick={() => setNivelGeo(n.id)}>
                <span>{n.label}</span>
                <span className="scale">{n.scale}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '6px 4px' }}>

          {/* Pinned section */}
          {pinned.length > 0 && !searchQ && (
            <div className="pin-section">
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.16em', padding: '2px 12px 4px', margin: 0 }}>
                Fijadas
              </p>
              {pinned.map(id => {
                const v = ALL_VARS.find(x => x.id === id);
                if (!v) return null;
                return (
                  <div key={id} className={`pin-item ${activeVar === id ? 'active' : ''}`} onClick={() => setActiveVar(id)}>
                    <span className="dot"/>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Search results or categorized nav */}
          {filteredVars ? (
            filteredVars.length === 0
              ? <p style={{ fontSize: 'var(--fs-12)', color: 'var(--ink-400)', textAlign: 'center', padding: 16, margin: 0 }}>Sin resultados</p>
              : filteredVars.map(v => (
                  <button key={v.id} className={`nav-var ${activeVar === v.id ? 'active' : ''}`} onClick={() => { setActiveVar(v.id); setSearchQ(''); }}>
                    <span style={{ flex: 1 }}>{v.label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-400)', textTransform: 'uppercase' }}>{v.cat}</span>
                  </button>
                ))
          ) : (
            Object.entries(MENU_VARIABLES).map(([cat, items]) => {
              const isOpen    = expandedCats.has(cat);
              const hasActive = items.some(v => v.id === activeVar);
              return (
                <div key={cat} style={{ marginBottom: 1 }}>
                  <button className={`nav-section-head ${hasActive ? 'has-active' : ''}`} onClick={() => toggleCat(cat)}>
                    <span>{cat}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'inherit', background: hasActive ? 'rgba(42,60,143,0.15)' : 'var(--ink-200)', borderRadius: 8, padding: '1px 5px' }}>{items.length}</span>
                      <span style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 180ms', display: 'inline-block', fontSize: 9 }}>▾</span>
                    </span>
                  </button>
                  {isOpen && (
                    <div style={{ paddingBottom: 2 }}>
                      {items.map(v => (
                        <button key={v.id} className={`nav-var ${activeVar === v.id ? 'active' : ''}`} onClick={() => setActiveVar(v.id)}>
                          <span style={{ flex: 1 }}>{v.label}</span>
                          <span
                            className={`pin-btn ${pinned.includes(v.id) ? 'pinned' : ''}`}
                            onClick={e => { e.stopPropagation(); togglePin(v.id); }}
                          >
                            <Pin size={10} style={{ transform: pinned.includes(v.id) ? 'none' : 'rotate(45deg)' }}/>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </nav>

        {/* Upload button / geocoding progress */}
        <div style={{ padding: '10px 12px 14px', borderTop: '1px solid var(--ink-200)' }}>
          {geo.active ? (
            <div onClick={() => setShowModal(true)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-700)' }}>Geocodificando…</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-400)' }}>{geo.done}/{geo.total}</span>
              </div>
              <div style={{ background: 'var(--ink-100)', borderRadius: 999, height: 4, overflow: 'hidden', marginBottom: 4 }}>
                <div style={{ width: `${geo.pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 999, transition: 'width 300ms ease' }}/>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-500)' }}>{geo.eta}</span>
            </div>
          ) : (
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => { if (geo.err) setGeo(GEO_INIT); setShowModal(true); }}
            >
              <Upload size={13}/>
              Cargar Direcciones
            </button>
          )}
        </div>
      </aside>

      {/* ── MAIN (topbar + map) ───────────────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Topbar */}
        <div style={{ height: 44, background: '#fff', borderBottom: '1px solid var(--ink-200)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, flexShrink: 0, zIndex: 10 }}>
          {/* Active variable context */}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{activeCat}</span>
          <span style={{ color: 'var(--ink-300)', fontSize: 13 }}>›</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeVarLabel}</span>

          <div style={{ flex: 1 }}/>

          {/* Action buttons */}
          <button
            onClick={handleExport}
            title="Exportar PNG"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', border: '1px solid var(--ink-200)', borderRadius: 'var(--r-3)', background: '#fff', color: 'var(--ink-600)', fontSize: 12, cursor: 'pointer', transition: 'all 120ms', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--ink-100)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
          >
            <Download size={13}/>
            <span>Exportar</span>
          </button>

          <button
            onClick={handleShare}
            title="Copiar URL"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', border: '1px solid var(--ink-200)', borderRadius: 'var(--r-3)', background: '#fff', color: 'var(--ink-600)', fontSize: 12, cursor: 'pointer', transition: 'all 120ms', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--ink-100)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
          >
            <Share2 size={13}/>
            <span>Compartir</span>
          </button>

          <button
            onClick={() => setShowOnboard(true)}
            title="Cómo funciona"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, border: '1px solid var(--ink-200)', borderRadius: 'var(--r-3)', background: '#fff', color: 'var(--ink-400)', cursor: 'pointer', transition: 'all 120ms' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--ink-100)'; e.currentTarget.style.color = 'var(--ink-700)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = 'var(--ink-400)'; }}
          >
            <HelpCircle size={14}/>
          </button>
        </div>

        {/* Map area */}
        <div ref={mapRef} style={{ flex: 1, position: 'relative', background: '#1e293b', overflow: 'hidden' }}>
          <MapView
            setHoverInfo={setHoverInfo}
            activeVar={activeVar}
            nivelGeo={nivelGeo}
            ramp={ramp}
            classification={classification}
            dimRange={dimRange}
            userPoints={userPoints}
            tagCol={tagCol}
            vizMode={vizMode}
            addrRamp={addrRamp}
            addrRadius={addrRadius}
            addrIntensity={addrIntensity}
            addrVisible={addrVisible}
            onValuesChange={handleValuesChange}
          />

          {/* Legend */}
          <Legend
            values={mapValues}
            ramp={ramp}           setRamp={setRamp}
            classification={classification} setClassification={setClassification}
            dimRange={dimRange}   setDimRange={setDimRange}
            label={activeVarLabel}
          />

          {/* Address layer panel */}
          {userPoints.length > 0 && (
            <AddressLayerPanel
              filename={uploadedFile}
              count={userPoints.length}
              visible={addrVisible}   setVisible={setAddrVisible}
              mode={vizMode}          setMode={setVizMode}
              ramp={addrRamp}         setRamp={setAddrRamp}
              radius={addrRadius}     setRadius={setAddrRadius}
              intensity={addrIntensity} setIntensity={setAddrIntensity}
            />
          )}

          {/* Hover card */}
          {hoverInfo && (
            <div style={{ position: 'absolute', top: 16, right: 16, width: 240, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)', border: '1px solid var(--ink-200)', borderRadius: 'var(--r-4)', boxShadow: 'var(--shadow-3)', padding: 'var(--s-4)', zIndex: 1000 }}>

              {/* Eyebrow */}
              <p style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {hoverSubtitle}
              </p>

              {/* Title */}
              <h3 style={{ fontSize: 'var(--fs-16)', fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--ink-900)', margin: '0 0 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {hoverTitle}
              </h3>

              {/* KPI value */}
              <div style={{ marginBottom: 8 }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-400)', margin: '0 0 2px' }}>{activeVarLabel}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--ink-900)', lineHeight: 1 }}>
                    {hoverValue != null ? hoverValue.toLocaleString('es-CL') : '—'}
                  </span>
                  {activeMeta?.units && (
                    <span style={{ fontSize: 11, color: 'var(--ink-400)', fontFamily: 'var(--font-mono)' }}>{activeMeta.units}</span>
                  )}
                </div>
              </div>

              {/* Stats row */}
              {(hoverPct != null || hoverRank != null) && (
                <div style={{ display: 'flex', gap: 0, borderTop: '1px solid var(--ink-100)', paddingTop: 8 }}>
                  {hoverPct != null && (
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-400)', margin: '0 0 2px' }}>% del total</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--ink-700)', margin: 0 }}>{hoverPct.toFixed(1)}%</p>
                    </div>
                  )}
                  {hoverRank != null && (
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-400)', margin: '0 0 2px' }}>Ranking</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--ink-700)', margin: 0 }}>
                        #{hoverRank} <span style={{ fontWeight: 400, color: 'var(--ink-400)' }}>de {mapValues.length}</span>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── MODALS & OVERLAYS ────────────────────────────────────────────── */}
      {showModal && (
        <UploadModal
          apiUrl={API_URL}
          geo={geo}
          onStartGeo={startGeo}
          onClose={() => setShowModal(false)}
          onReset={() => setGeo(GEO_INIT)}
        />
      )}

      {showOnboard && <Onboarding onDismiss={dismissOnboard}/>}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--ink-900)', color: '#fff', padding: '8px 18px', borderRadius: 20, fontSize: 13, zIndex: 4000, pointerEvents: 'none', boxShadow: 'var(--shadow-3)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
