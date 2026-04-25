import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import MapView from './components/MapView';
import Legend  from './components/Legend';
import SkjalfMark from './assets/brand/SkjalfMark';
import { Upload, Loader2, Search, Pin, X } from 'lucide-react';
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

const ALL_VARS = Object.entries(MENU_VARIABLES).flatMap(([cat, items]) =>
  items.map(v => ({ ...v, cat }))
);

const STORAGE_KEY = 'skjalf_prefs_v1';
const API_URL = import.meta.env.VITE_API_URL ?? '';

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  const prefs = useMemo(loadPrefs, []);

  const [activeVar,      setActiveVar]      = useState(prefs.lastVar      || 'n_per');
  const [nivelGeo,       setNivelGeo]       = useState(prefs.lastLevel    || 'distrito');
  const [ramp,           setRamp]           = useState(prefs.ramp         || 'indigo');
  const [classification, setClassification] = useState(prefs.classification || 'quantile');
  const [pinned,         setPinned]         = useState(prefs.pinnedVars   || []);
  const [dimRange,       setDimRange]       = useState(null);
  const [expandedCats,   setExpandedCats]   = useState(new Set(['Demografía']));
  const [searchQ,        setSearchQ]        = useState('');
  const [mapValues,      setMapValues]      = useState([]);

  const [hoverInfo,    setHoverInfo]    = useState(null);
  const [userPoints,   setUserPoints]   = useState([]);
  const [showModal,    setShowModal]    = useState(false);
  const [tempFile,     setTempFile]     = useState(null);
  const [availableCols,setAvailableCols]= useState([]);
  const [selectedCols, setSelectedCols] = useState([]);
  const [tagCol,       setTagCol]       = useState(null);

  const [geocoding, setGeocoding] = useState({ active: false, pct: 0, eta: '', rows: 0 });
  const geoInterval = useRef(null);
  const geoStart    = useRef(null);
  const geoTotalMs  = useRef(0);
  const geoPending  = useRef(0);
  const RATE_MS     = 1150;
  const searchRef   = useRef(null);

  // localStorage persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      lastVar: activeVar, lastLevel: nivelGeo,
      ramp, classification, pinnedVars: pinned,
    }));
  }, [activeVar, nivelGeo, ramp, classification, pinned]);

  // ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const togglePin  = (id) => setPinned(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleCat  = (cat) => setExpandedCats(prev => {
    const next = new Set(prev);
    next.has(cat) ? next.delete(cat) : next.add(cat);
    return next;
  });

  const handleValuesChange = useCallback((values) => setMapValues(values), []);

  const activeMeta     = ALL_VARS.find(v => v.id === activeVar);
  const activeVarLabel = activeMeta?.label || activeVar;
  const filteredVars   = searchQ
    ? ALL_VARS.filter(v => v.label.toLowerCase().includes(searchQ.toLowerCase()))
    : null;

  // ── Geocoding helpers ──
  const fmtEta = (sec) => {
    if (sec <= 0) return 'casi listo...';
    const m = Math.floor(sec / 60), s = Math.ceil(sec % 60);
    return m > 0 ? `~${m}m ${s}s restantes` : `~${s}s restantes`;
  };
  const startProgress = (rows) => {
    const actual = Math.min(rows, 100);
    geoPending.current = actual;
    geoTotalMs.current = actual * RATE_MS;
    geoStart.current   = Date.now();
    setGeocoding({ active: true, pct: 0, eta: fmtEta(geoTotalMs.current / 1000), rows: actual });
    geoInterval.current = setInterval(() => {
      const elapsed = Date.now() - geoStart.current;
      const pct     = Math.min((elapsed / geoTotalMs.current) * 100, 95);
      const rem     = Math.max(0, (geoTotalMs.current - elapsed) / 1000);
      setGeocoding({ active: true, pct, eta: fmtEta(rem), rows: actual });
    }, 300);
  };
  const stopProgress = (ok) => {
    clearInterval(geoInterval.current);
    setGeocoding({ active: true, pct: 100, eta: ok ? 'Completado' : 'Error al procesar', rows: geoPending.current });
    setTimeout(() => setGeocoding({ active: false, pct: 0, eta: '', rows: 0 }), 2500);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setTempFile(file);
    setSelectedCols([]); setTagCol(null);
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (isExcel) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await axios.post(`${API_URL}/api/usuario/columnas`, fd);
        setAvailableCols(res.data.columnas);
        geoPending.current = res.data.total_filas ?? 100;
        setShowModal(true);
      } catch { alert("Error al leer el archivo Excel."); }
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const lines = ev.target.result.split('\n').filter(l => l.trim());
        const cols  = lines[0].split(',').map(c => c.trim().replace(/"/g, ''));
        geoPending.current = Math.max(0, lines.length - 1);
        setAvailableCols(cols);
        setShowModal(true);
      };
      reader.readAsText(file);
    }
  };

  const processGeocoding = async () => {
    if (selectedCols.length === 0) return alert("Selecciona al menos una columna");
    const fd = new FormData();
    fd.append('file', tempFile);
    fd.append('columnas_direccion', JSON.stringify(selectedCols));
    setShowModal(false);
    startProgress(geoPending.current);
    try {
      const res = await axios.post(`${API_URL}/api/usuario/geocodificar`, fd, { timeout: 180000 });
      setUserPoints(res.data);
      stopProgress(true);
    } catch { stopProgress(false); alert("Error al geocodificar."); }
  };

  const hoverTitle    = hoverInfo ? (nivelGeo === 'comuna' ? hoverInfo.COMUNA : nivelGeo === 'manzana' ? (hoverInfo.ENTIDAD || hoverInfo.COD_MANZANA || 'Manzana') : hoverInfo.DISTRITO) : null;
  const hoverSubtitle = hoverInfo ? (nivelGeo === 'comuna' ? hoverInfo.REGION : hoverInfo.COMUNA) : null;

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
          <span className="tagline">Censo CL · 2024</span>
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
                <X size={11} />
              </button>
          }
        </div>

        {/* Nivel geográfico */}
        <div style={{ padding: '10px 12px 10px', borderBottom: '1px solid var(--ink-200)' }}>
          <p className="nav-label" style={{ margin: '0 0 6px' }}>Nivel Geográfico</p>
          <div className="geo-seg">
            {NIVELES.map(n => (
              <button
                key={n.id}
                className={nivelGeo === n.id ? 'active' : ''}
                onClick={() => setNivelGeo(n.id)}
              >
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
                    <span className="dot" />
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
                            <Pin size={10} style={{ transform: pinned.includes(v.id) ? 'none' : 'rotate(45deg)' }} />
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

        {/* Geocoding progress */}
        {geocoding.active && (
          <div style={{ margin: '0 12px 8px', padding: 12, background: 'var(--ink-100)', border: '1px solid var(--ink-200)', borderRadius: 'var(--r-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-11)', color: 'var(--ink-700)', fontWeight: 500 }}>
                <Loader2 size={11} className="animate-spin" style={{ color: 'var(--accent)' }} />
                Geocodificando
              </span>
              <span style={{ fontSize: 'var(--fs-11)', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{geocoding.eta}</span>
            </div>
            <div style={{ width: '100%', background: 'var(--ink-200)', borderRadius: 999, height: 4, overflow: 'hidden' }}>
              <div style={{ height: 4, borderRadius: 999, width: `${geocoding.pct}%`, background: geocoding.pct === 100 ? 'var(--pos)' : 'var(--accent)', transition: 'width 300ms' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--ink-400)', fontFamily: 'var(--font-mono)' }}>{Math.round(geocoding.pct)}%</span>
              <span style={{ fontSize: 10, color: 'var(--ink-400)', fontFamily: 'var(--font-mono)' }}>{geocoding.rows} registros</span>
            </div>
          </div>
        )}

        {/* Upload button */}
        <div style={{ padding: '10px 12px 14px', borderTop: '1px solid var(--ink-200)' }}>
          <label className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', ...(geocoding.active ? { background: 'var(--ink-200)', color: 'var(--ink-400)', cursor: 'not-allowed', pointerEvents: 'none' } : {}) }}>
            <Upload size={13} />
            Cargar Direcciones
            {!geocoding.active && <input type="file" style={{ display: 'none' }} onChange={handleFileSelect} accept=".csv,.xlsx,.xls" />}
          </label>
        </div>
      </aside>

      {/* ── MAPA ─────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, position: 'relative', background: '#1e293b' }}>
        <MapView
          setHoverInfo={setHoverInfo}
          activeVar={activeVar}
          nivelGeo={nivelGeo}
          ramp={ramp}
          classification={classification}
          dimRange={dimRange}
          userPoints={userPoints}
          tagCol={tagCol}
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

        {/* Hover card */}
        {hoverInfo && (
          <div style={{
            position: 'absolute', top: 20, right: 20, width: 232,
            background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)',
            border: '1px solid var(--ink-200)', borderRadius: 'var(--r-4)',
            boxShadow: 'var(--shadow-3)', padding: 'var(--s-4)', zIndex: 1000,
          }}>
            <p style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 2px' }}>
              {hoverSubtitle}
            </p>
            <h3 style={{ fontSize: 'var(--fs-16)', fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--ink-900)', margin: '0 0 var(--s-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {hoverTitle}
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-13)' }}>
              <span style={{ color: 'var(--ink-500)', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8 }}>{activeVarLabel}:</span>
              <span style={{ color: 'var(--ink-900)', fontFamily: 'var(--font-mono)', fontWeight: 600, flexShrink: 0 }}>
                {hoverInfo[activeVar]?.toLocaleString('es-CL') ?? '—'}
              </span>
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL ────────────────────────────────────────────────────────── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(18,21,26,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="card" style={{ width: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-h"><h3>Configurar Archivo</h3></div>
            <div className="card-b">
              <div style={{ marginBottom: 'var(--s-5)' }}>
                <p className="label">Columnas de dirección</p>
                <p style={{ fontSize: 'var(--fs-12)', color: 'var(--ink-400)', margin: 'var(--s-1) 0 var(--s-3)' }}>Selecciona las columnas que forman la dirección completa</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s-2)' }}>
                  {availableCols.map(col => (
                    <button key={col} onClick={() => col !== tagCol && setSelectedCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])}
                      className={`chip ${selectedCols.includes(col) ? 'chip-navy' : 'chip-neutral'}`}
                      style={{ opacity: col === tagCol ? 0.35 : 1, cursor: col === tagCol ? 'not-allowed' : 'pointer', outline: selectedCols.includes(col) ? '1px solid var(--accent)' : 'none' }}>
                      {col}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 'var(--s-6)' }}>
                <p className="label">Etiqueta del pin <span style={{ marginLeft: 8, fontSize: 'var(--fs-11)', color: 'var(--ink-300)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s-2)' }}>
                  {availableCols.map(col => (
                    <button key={col} onClick={() => !selectedCols.includes(col) && setTagCol(prev => prev === col ? null : col)}
                      className={`chip ${tagCol === col ? 'chip-violet' : 'chip-neutral'}`}
                      style={{ opacity: selectedCols.includes(col) ? 0.35 : 1, cursor: selectedCols.includes(col) ? 'not-allowed' : 'pointer' }}>
                      {col}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
                <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-lg" style={{ flex: 1 }}>Cancelar</button>
                <button onClick={processGeocoding} disabled={selectedCols.length === 0} className="btn btn-primary btn-lg"
                  style={{ flex: 2, opacity: selectedCols.length === 0 ? 0.4 : 1, cursor: selectedCols.length === 0 ? 'not-allowed' : 'pointer' }}>
                  Iniciar Carga
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
