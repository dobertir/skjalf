import React, { useState, useRef } from 'react';
import MapView from './components/MapView';
import { Upload, Map as MapIcon, Loader2, ChevronDown } from 'lucide-react';
import axios from 'axios';

const MENU_VARIABLES = {
  "Demografía": [
    { label: "Población Total",       id: "n_per" },
    { label: "Hombres",               id: "n_hombres" },
    { label: "Mujeres",               id: "n_mujeres" },
    { label: "Edad Promedio",         id: "prom_edad" },
    { label: "Inmigrantes",           id: "n_inmigrantes" },
    { label: "Pueblos Originarios",   id: "n_pueblos_orig" },
    { label: "Afrodescendencia",      id: "n_afrodescendencia" },
    { label: "Discapacidad",          id: "n_discapacidad" },
  ],
  "Grupos Etarios": [
    { label: "Infantes 0–5 años",     id: "n_edad_0_5" },
    { label: "Escolares 6–13 años",   id: "n_edad_6_13" },
    { label: "Adolescentes 14–17",    id: "n_edad_14_17" },
    { label: "Jóvenes 18–24 años",    id: "n_edad_18_24" },
    { label: "Adultos 25–44 años",    id: "n_edad_25_44" },
    { label: "Adultos 45–59 años",    id: "n_edad_45_59" },
    { label: "Adultos Mayores 60+",   id: "n_edad_60_mas" },
  ],
  "Educación": [
    { label: "Escolaridad Promedio",  id: "prom_escolaridad18" },
    { label: "Analfabetismo",         id: "n_analfabet" },
    { label: "Asist. Ed. Básica",     id: "n_asistencia_basica" },
    { label: "Asist. Ed. Media",      id: "n_asistencia_media" },
    { label: "Asist. Ed. Superior",   id: "n_asistencia_superior" },
    { label: "Ed. Terciaria",         id: "n_cine_terciaria_maestria_doctorado" },
    { label: "Sin Ed. Formal",        id: "n_cine_nunca_curso_primera_infancia" },
  ],
  "Trabajo": [
    { label: "Ocupados",              id: "n_ocupado" },
    { label: "Desocupados",           id: "n_desocupado" },
    { label: "Fuera Fuerza Trabajo",  id: "n_fuera_fuerza_trabajo" },
    { label: "Independientes",        id: "n_cise_rec_independientes" },
    { label: "Dependientes",          id: "n_cise_rec_dependientes" },
  ],
  "Transporte": [
    { label: "Usa Auto",              id: "n_transporte_auto" },
    { label: "Transporte Público",    id: "n_transporte_publico" },
    { label: "Va a Pie",              id: "n_transporte_camina" },
    { label: "Bicicleta",             id: "n_transporte_bicicleta" },
    { label: "Motocicleta",           id: "n_transporte_motocicleta" },
  ],
  "Vivienda": [
    { label: "Viviendas Totales",     id: "n_vp" },
    { label: "Viviendas Ocupadas",    id: "n_vp_ocupada" },
    { label: "Viviendas Desocupadas", id: "n_vp_desocupada" },
    { label: "Viviendas Hacinadas",   id: "n_viv_hacinadas" },
    { label: "Déficit Cuantitativo",  id: "n_deficit_cuantitativo" },
    { label: "Casas",                 id: "n_tipo_viv_casa" },
    { label: "Departamentos",         id: "n_tipo_viv_depto" },
    { label: "Mediaguas",             id: "n_tipo_viv_mediagua" },
    { label: "Viv. Irrecuperables",   id: "n_viv_irrecuperables" },
  ],
  "Hogar": [
    { label: "Total Hogares",         id: "n_hog" },
    { label: "Personas por Hogar",    id: "prom_per_hog" },
    { label: "Hogares Unipersonales", id: "n_hog_unipersonales" },
    { label: "Jefatura Femenina",     id: "n_jefatura_mujer" },
    { label: "Hogares c/ May. 60+",   id: "n_hog_60" },
    { label: "Hogares c/ Menores",    id: "n_hog_menores" },
    { label: "Arrienda c/ Contrato",  id: "n_tenencia_arrendada_contrato" },
    { label: "Vivienda Propia",       id: "n_tenencia_propia_pagada" },
  ],
  "Servicios": [
    { label: "Electricidad Pública",  id: "n_fuente_elect_publica" },
    { label: "Agua Red Pública",      id: "n_fuente_agua_publica" },
    { label: "Internet (Total)",      id: "n_internet" },
    { label: "Internet Fija",         id: "n_serv_internet_fija" },
    { label: "Alcantarillado",        id: "n_serv_hig_alc_dentro" },
    { label: "Recolección Basura",    id: "n_basura_servicios" },
    { label: "Sin Electricidad",      id: "n_fuente_elect_no_tiene" },
    { label: "Sin Saneamiento",       id: "n_serv_hig_no_tiene" },
  ],
};

const NIVELES = [
  { id: 'comuna',   label: 'Comuna'   },
  { id: 'distrito', label: 'Distrito' },
  { id: 'manzana',  label: 'Manzana'  },
];

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

function App() {
  const [activeVar, setActiveVar]         = useState("n_per");
  const [nivelGeo, setNivelGeo]           = useState("distrito");
  const [expandedCats, setExpandedCats]   = useState(new Set());

  const toggleCat = (cat) =>
    setExpandedCats(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });

  const [hoverInfo, setHoverInfo]         = useState(null);
  const [userPoints, setUserPoints]       = useState([]);
  const [showModal, setShowModal]         = useState(false);
  const [tempFile, setTempFile]           = useState(null);
  const [availableCols, setAvailableCols] = useState([]);
  const [selectedCols, setSelectedCols]   = useState([]);
  const [tagCol, setTagCol]               = useState(null);

  const [geocoding, setGeocoding] = useState({ active: false, pct: 0, eta: '', rows: 0 });
  const geoInterval = useRef(null);
  const geoStart    = useRef(null);
  const geoTotalMs  = useRef(0);
  const geoPending  = useRef(0);
  const RATE_MS     = 1150;

  const fmtEta = (sec) => {
    if (sec <= 0) return 'casi listo...';
    const m = Math.floor(sec / 60);
    const s = Math.ceil(sec % 60);
    return m > 0 ? `~${m}m ${s}s restantes` : `~${s}s restantes`;
  };

  const startProgress = (rows) => {
    const actual        = Math.min(rows, 100);
    geoPending.current  = actual;
    geoTotalMs.current  = actual * RATE_MS;
    geoStart.current    = Date.now();
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

  const activeVarLabel = Object.values(MENU_VARIABLES).flat().find(v => v.id === activeVar)?.label || activeVar;

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setTempFile(file);
    setSelectedCols([]);
    setTagCol(null);
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await axios.post(`${API_URL}/api/usuario/columnas`, formData);
        setAvailableCols(res.data.columnas);
        geoPending.current = res.data.total_filas ?? 100;
        setShowModal(true);
      } catch {
        alert("Error al leer el archivo Excel. Verifica que el formato sea válido.");
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text  = event.target.result;
        const lines = text.split('\n').filter(l => l.trim().length > 0);
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
    const formData = new FormData();
    formData.append('file', tempFile);
    formData.append('columnas_direccion', JSON.stringify(selectedCols));
    setShowModal(false);
    startProgress(geoPending.current);
    try {
      const res = await axios.post(
        `${API_URL}/api/usuario/geocodificar`,
        formData,
        { timeout: 180000 }
      );
      setUserPoints(res.data);
      stopProgress(true);
    } catch {
      stopProgress(false);
      alert("Error al geocodificar. Revisa que las columnas de dirección sean correctas.");
    }
  };

  const hoverTitle = hoverInfo
    ? (nivelGeo === 'comuna'   ? hoverInfo.COMUNA
     : nivelGeo === 'manzana'  ? (hoverInfo.ENTIDAD || hoverInfo.COD_MANZANA || 'Manzana')
     : hoverInfo.DISTRITO)
    : null;
  const hoverSubtitle = hoverInfo
    ? (nivelGeo === 'comuna' ? hoverInfo.REGION : hoverInfo.COMUNA)
    : null;

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside className="sidebar" style={{ width: 272, position: 'relative', zIndex: 1000, flexShrink: 0 }}>

        {/* Brand */}
        <div className="brand">
          <div className="brand-row">
            <MapIcon style={{ width: 28, height: 28, color: 'var(--accent)', flexShrink: 0 }} />
            <span className="wordmark">Skjalf<em>:</em></span>
          </div>
          <span className="tagline">Visualizador de datos geográficos</span>
        </div>

        {/* Nivel geográfico */}
        <div style={{ padding: 'var(--s-3) var(--s-4)', borderBottom: '1px solid var(--ink-200)' }}>
          <p className="nav-label" style={{ margin: '0 0 var(--s-2)' }}>Nivel Geográfico</p>
          <div style={{ display: 'flex', gap: 3, background: 'var(--ink-100)', borderRadius: 'var(--r-3)', padding: 3 }}>
            {NIVELES.map(n => (
              <button
                key={n.id}
                onClick={() => setNivelGeo(n.id)}
                style={{
                  flex: 1,
                  padding: '5px 6px',
                  borderRadius: 'var(--r-2)',
                  border: 'none',
                  fontSize: 'var(--fs-12)',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: nivelGeo === n.id ? 600 : 400,
                  background: nivelGeo === n.id ? 'var(--accent)' : 'transparent',
                  color: nivelGeo === n.id ? '#fff' : 'var(--ink-500)',
                  cursor: 'pointer',
                  transition: 'all var(--t-fast) var(--ease)',
                }}
              >
                {n.label}
              </button>
            ))}
          </div>
          {nivelGeo === 'manzana' && (
            <p style={{ fontSize: 'var(--fs-11)', color: 'var(--warn)', marginTop: 'var(--s-1)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
              Requiere zoom alto (acercar al mapa)
            </p>
          )}
        </div>

        {/* Variables nav — extra left padding for .nav-item::before accent bar */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: 'var(--s-2) var(--s-2) var(--s-2) var(--s-4)' }}>
          {Object.entries(MENU_VARIABLES).map(([category, items]) => {
            const isOpen    = expandedCats.has(category);
            const hasActive = items.some(v => v.id === activeVar);
            return (
              <div key={category} style={{ marginBottom: 2 }}>
                <button
                  onClick={() => toggleCat(category)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '6px var(--s-2)',
                    borderRadius: 'var(--r-2)',
                    border: 'none',
                    background: hasActive ? 'var(--accent-dim)' : 'transparent',
                    color: hasActive ? 'var(--accent)' : 'var(--ink-400)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    cursor: 'pointer',
                    transition: 'background var(--t-fast) var(--ease)',
                  }}
                >
                  {category}
                  <ChevronDown
                    size={11}
                    style={{
                      flexShrink: 0,
                      transition: 'transform 200ms',
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                    }}
                  />
                </button>
                {isOpen && (
                  <div style={{ padding: '2px 0 4px 4px' }}>
                    {items.map(v => (
                      <button
                        key={v.id}
                        onClick={() => setActiveVar(v.id)}
                        className={activeVar === v.id ? 'nav-item active' : 'nav-item'}
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Geocoding progress */}
        {geocoding.active && (
          <div style={{
            margin: '0 var(--s-3) var(--s-2)',
            padding: 'var(--s-3)',
            background: 'var(--ink-100)',
            border: '1px solid var(--ink-200)',
            borderRadius: 'var(--r-4)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 'var(--fs-11)', color: 'var(--ink-700)', fontWeight: 500,
              }}>
                <Loader2 size={11} className="animate-spin" style={{ color: 'var(--accent)' }} />
                Geocodificando
              </span>
              <span style={{ fontSize: 'var(--fs-11)', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                {geocoding.eta}
              </span>
            </div>
            <div style={{ width: '100%', background: 'var(--ink-200)', borderRadius: 999, height: 5, overflow: 'hidden' }}>
              <div style={{
                height: 5, borderRadius: 999,
                width: `${geocoding.pct}%`,
                background: geocoding.pct === 100 ? 'var(--pos)' : 'var(--accent)',
                transition: 'width 300ms',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 'var(--fs-11)', color: 'var(--ink-400)', fontFamily: 'var(--font-mono)' }}>
                {Math.round(geocoding.pct)}%
              </span>
              <span style={{ fontSize: 'var(--fs-11)', color: 'var(--ink-400)', fontFamily: 'var(--font-mono)' }}>
                {geocoding.rows} registros
              </span>
            </div>
          </div>
        )}

        {/* Upload button */}
        <div style={{ padding: 'var(--s-3) var(--s-4) var(--s-4)', borderTop: '1px solid var(--ink-200)' }}>
          <label
            className="btn btn-primary"
            style={{
              width: '100%',
              justifyContent: 'center',
              ...(geocoding.active ? {
                background: 'var(--ink-200)',
                color: 'var(--ink-400)',
                cursor: 'not-allowed',
                pointerEvents: 'none',
              } : {}),
            }}
          >
            <Upload size={14} />
            Cargar Direcciones
            {!geocoding.active && (
              <input type="file" style={{ display: 'none' }} onChange={handleFileSelect} accept=".csv,.xlsx,.xls" />
            )}
          </label>
        </div>
      </aside>

      {/* ── MAPA ─────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, position: 'relative', background: '#1e293b' }}>
        <MapView
          setHoverInfo={setHoverInfo}
          activeVar={activeVar}
          activeVarLabel={activeVarLabel}
          nivelGeo={nivelGeo}
          userPoints={userPoints}
          tagCol={tagCol}
        />

        {/* Hover info card */}
        {hoverInfo && (
          <div style={{
            position: 'absolute',
            top: 'var(--s-6)', right: 'var(--s-6)',
            width: 228,
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--ink-200)',
            borderRadius: 'var(--r-4)',
            boxShadow: 'var(--shadow-3)',
            padding: 'var(--s-4)',
            zIndex: 1000,
          }}>
            <p style={{
              color: 'var(--accent)', fontFamily: 'var(--font-mono)',
              fontSize: 'var(--fs-11)', textTransform: 'uppercase',
              letterSpacing: '0.12em', margin: '0 0 2px',
            }}>
              {hoverSubtitle}
            </p>
            <h3 style={{
              fontSize: 'var(--fs-16)', fontFamily: 'var(--font-display)',
              fontWeight: 600, color: 'var(--ink-900)',
              margin: '0 0 var(--s-3)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {hoverTitle}
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-13)' }}>
              <span style={{ color: 'var(--ink-500)', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8 }}>
                {activeVarLabel}:
              </span>
              <span style={{ color: 'var(--ink-900)', fontFamily: 'var(--font-mono)', fontWeight: 600, flexShrink: 0 }}>
                {hoverInfo[activeVar]?.toLocaleString('es-CL') ?? '—'}
              </span>
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL ────────────────────────────────────────────────────────── */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(18,21,26,0.55)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000,
        }}>
          <div className="card" style={{ width: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-h">
              <h3>Configurar Archivo</h3>
            </div>
            <div className="card-b">

              {/* Columnas de dirección */}
              <div style={{ marginBottom: 'var(--s-5)' }}>
                <p className="label">Columnas de dirección</p>
                <p style={{ fontSize: 'var(--fs-12)', color: 'var(--ink-400)', margin: 'var(--s-1) 0 var(--s-3)' }}>
                  Selecciona las columnas que forman la dirección completa (calle, número, comuna, etc.)
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s-2)' }}>
                  {availableCols.map(col => (
                    <button
                      key={col}
                      onClick={() => col !== tagCol && setSelectedCols(prev =>
                        prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
                      )}
                      className={`chip ${selectedCols.includes(col) ? 'chip-navy' : 'chip-neutral'}`}
                      style={{
                        opacity: col === tagCol ? 0.35 : 1,
                        cursor: col === tagCol ? 'not-allowed' : 'pointer',
                        outline: selectedCols.includes(col) ? '1px solid var(--accent)' : 'none',
                      }}
                    >
                      {col}
                    </button>
                  ))}
                </div>
              </div>

              {/* Columna de etiqueta */}
              <div style={{ marginBottom: 'var(--s-6)' }}>
                <p className="label">
                  Etiqueta del pin
                  <span style={{ marginLeft: 8, fontSize: 'var(--fs-11)', color: 'var(--ink-300)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                    (opcional)
                  </span>
                </p>
                <p style={{ fontSize: 'var(--fs-12)', color: 'var(--ink-400)', margin: 'var(--s-1) 0 var(--s-3)' }}>
                  Una columna que identifique cada punto en el mapa (nombre, código, categoría, etc.)
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s-2)' }}>
                  {availableCols.map(col => (
                    <button
                      key={col}
                      onClick={() => !selectedCols.includes(col) && setTagCol(prev => prev === col ? null : col)}
                      className={`chip ${tagCol === col ? 'chip-violet' : 'chip-neutral'}`}
                      style={{
                        opacity: selectedCols.includes(col) ? 0.35 : 1,
                        cursor: selectedCols.includes(col) ? 'not-allowed' : 'pointer',
                        outline: tagCol === col ? '1px solid var(--highlight)' : 'none',
                      }}
                    >
                      {col}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
                <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-lg" style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button
                  onClick={processGeocoding}
                  disabled={selectedCols.length === 0}
                  className="btn btn-primary btn-lg"
                  style={{
                    flex: 2,
                    opacity: selectedCols.length === 0 ? 0.4 : 1,
                    cursor: selectedCols.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
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
