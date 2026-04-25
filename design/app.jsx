/* global React, ReactDOM */
const { useState, useEffect, useMemo, useRef } = React;

// ── DATA ─────────────────────────────────────────────────────────────────
const MENU = {
  "Demografía": [
    { id: "n_per", label: "Población Total", units: "personas" },
    { id: "n_hombres", label: "Hombres", units: "personas" },
    { id: "n_mujeres", label: "Mujeres", units: "personas" },
    { id: "prom_edad", label: "Edad Promedio", units: "años" },
    { id: "n_inmigrantes", label: "Inmigrantes", units: "personas" },
    { id: "n_pueblos_orig", label: "Pueblos Originarios", units: "personas" },
    { id: "n_discapacidad", label: "Discapacidad", units: "personas" },
  ],
  "Grupos Etarios": [
    { id: "n_edad_0_5", label: "Infantes 0–5" },
    { id: "n_edad_6_13", label: "Escolares 6–13" },
    { id: "n_edad_14_17", label: "Adolescentes 14–17" },
    { id: "n_edad_18_24", label: "Jóvenes 18–24" },
    { id: "n_edad_25_44", label: "Adultos 25–44" },
    { id: "n_edad_60_mas", label: "Adultos Mayores 60+" },
  ],
  "Educación": [
    { id: "prom_escolaridad18", label: "Escolaridad Promedio", units: "años" },
    { id: "n_analfabet", label: "Analfabetismo" },
    { id: "n_asistencia_superior", label: "Asist. Ed. Superior" },
    { id: "n_cine_terciaria_maestria_doctorado", label: "Ed. Terciaria" },
  ],
  "Trabajo": [
    { id: "n_ocupado", label: "Ocupados" },
    { id: "n_desocupado", label: "Desocupados" },
    { id: "n_cise_rec_independientes", label: "Independientes" },
  ],
  "Transporte": [
    { id: "n_transporte_auto", label: "Usa Auto" },
    { id: "n_transporte_publico", label: "Transporte Público" },
    { id: "n_transporte_camina", label: "Va a Pie" },
    { id: "n_transporte_bicicleta", label: "Bicicleta" },
  ],
  "Vivienda": [
    { id: "n_vp", label: "Viviendas Totales" },
    { id: "n_viv_hacinadas", label: "Viviendas Hacinadas" },
    { id: "n_deficit_cuantitativo", label: "Déficit Cuantitativo" },
    { id: "n_tipo_viv_casa", label: "Casas" },
    { id: "n_tipo_viv_depto", label: "Departamentos" },
  ],
  "Hogar": [
    { id: "n_hog", label: "Total Hogares" },
    { id: "prom_per_hog", label: "Personas por Hogar" },
    { id: "n_jefatura_mujer", label: "Jefatura Femenina" },
    { id: "n_tenencia_propia_pagada", label: "Vivienda Propia" },
  ],
  "Servicios": [
    { id: "n_internet", label: "Internet (Total)" },
    { id: "n_serv_internet_fija", label: "Internet Fija" },
    { id: "n_serv_hig_alc_dentro", label: "Alcantarillado" },
    { id: "n_fuente_elect_no_tiene", label: "Sin Electricidad" },
  ],
};

const NIVELES = [
  { id: 'comuna',   label: 'Comuna',   scale: '1:50k' },
  { id: 'distrito', label: 'Distrito', scale: '1:20k' },
  { id: 'manzana',  label: 'Manzana',  scale: '1:5k'  },
];

// Color ramps profesionales (ColorBrewer-inspired, oklch-ajustadas)
const RAMPS = {
  // Sequential — para magnitudes
  indigo:    ['#F1EEF6','#BDC9E1','#74A9CF','#3B4FB8','#2A3C8F'],
  viridis:   ['#FDE725','#90D743','#35B779','#21908C','#443983'],
  ochre:     ['#FFF5D6','#FAD679','#E8A33D','#B6862C','#7A5A1C'],
  // Diverging — para % o residuales
  pivot:     ['#9B3D2E','#E6A693','#F2EDE5','#A8B4E0','#2A3C8F'],
};

const RAMP_KIND = {
  indigo: 'sequential', viridis: 'sequential', ochre: 'sequential', pivot: 'diverging'
};

const CLASSIFICATIONS = [
  { id: 'quantile', label: 'Cuantiles' },
  { id: 'jenks',    label: 'Jenks' },
  { id: 'equal',    label: 'Iguales' },
];

// Sample fake distritos (para mock visual)
const FAKE_DISTRICTS = (() => {
  const arr = [];
  let seed = 1;
  const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = 0; i < 64; i++) {
    arr.push({
      id: i,
      x: 60 + (i % 8) * 110 + rand() * 16,
      y: 60 + Math.floor(i / 8) * 90 + rand() * 12,
      w: 90 + rand() * 24,
      h: 70 + rand() * 22,
      v: Math.pow(rand(), 1.4) * 18000,   // poblacional skewed
      name: `Distrito ${100 + i}`,
      comuna: ['Las Condes','Providencia','Santiago','Ñuñoa','La Florida','Maipú','Vitacura','Lo Barnechea'][i % 8],
    });
  }
  return arr;
})();

// histograma
const computeHist = (vals, bins = 24) => {
  const max = Math.max(...vals), min = Math.min(...vals);
  const step = (max - min) / bins;
  const out = Array(bins).fill(0);
  vals.forEach(v => {
    const i = Math.min(bins - 1, Math.floor((v - min) / step));
    out[i] = (out[i] || 0) + 1;
  });
  return { hist: out, max, min, step };
};

// ── ICON helper ─────────────────────────────────────────────────────────
const I = ({ id, size = 14, ...rest }) => (
  <svg width={size} height={size} {...rest}><use href={`#i-${id}`}/></svg>
);

// ── SIDEBAR ─────────────────────────────────────────────────────────────
function Sidebar({ activeVar, setActiveVar, nivel, setNivel, pinned, togglePin, onUpload, onShowOnboard }) {
  const [open, setOpen] = useState(new Set(['Demografía','Vivienda']));
  const [q, setQ] = useState('');

  const toggle = (cat) => setOpen(prev => {
    const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n;
  });

  const allVars = useMemo(() => Object.entries(MENU).flatMap(([cat, items]) => items.map(v => ({ ...v, cat }))), []);
  const activeMeta = allVars.find(v => v.id === activeVar);

  const filtered = q ? allVars.filter(v => v.label.toLowerCase().includes(q.toLowerCase())) : null;

  return (
    <aside className="sb">
      <div className="sb-brand">
        <div className="sb-brand-row">
          <svg width="22" height="27" style={{ color: 'var(--accent)' }}><use href="#sk-mark"/></svg>
          <span className="wm">Skjalf<em>:</em></span>
        </div>
        <span className="tag">Censo CL · 2024</span>
      </div>

      <div className="sb-search">
        <I id="search" size={13} className="sicon" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar variable..." />
        {!q && <kbd>⌘ K</kbd>}
      </div>

      <div className="geo-level">
        <div className="lbl">
          <span>Nivel Geográfico</span>
          <span style={{ fontFamily: 'var(--font-mono)', textTransform: 'none', letterSpacing: 0 }}>z 11</span>
        </div>
        <div className="seg">
          {NIVELES.map(n => (
            <button key={n.id} className={nivel === n.id ? 'active' : ''} onClick={() => setNivel(n.id)}>
              <span>{n.label}</span>
              <span className="scale">{n.scale}</span>
            </button>
          ))}
        </div>
      </div>

      {pinned.length > 0 && !q && (
        <div className="pin-list">
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.16em', padding: '4px 8px 6px' }}>
            Fijadas
          </div>
          {pinned.map(id => {
            const v = allVars.find(x => x.id === id);
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

      <nav className="sb-nav">
        {filtered ? (
          filtered.length === 0 ? (
            <div style={{ padding: 12, fontSize: 12, color: 'var(--ink-400)', textAlign: 'center' }}>Sin resultados</div>
          ) : (
            filtered.map(v => (
              <button key={v.id} className={`nav-var ${activeVar === v.id ? 'active' : ''}`} onClick={() => setActiveVar(v.id)}>
                <span style={{ flex: 1 }}>{v.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{v.cat}</span>
              </button>
            ))
          )
        ) : (
          Object.entries(MENU).map(([cat, items]) => {
            const isOpen = open.has(cat);
            const hasActive = items.some(i => i.id === activeVar);
            return (
              <div key={cat} style={{ marginBottom: 1 }}>
                <button className={`nav-section-head ${hasActive ? 'has-active' : ''}`} onClick={() => toggle(cat)}>
                  <span>{cat}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="count">{items.length}</span>
                    <I id="chev" size={10} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 180ms' }} />
                  </span>
                </button>
                {isOpen && (
                  <div style={{ padding: '2px 0 4px' }}>
                    {items.map(v => (
                      <button key={v.id} className={`nav-var ${activeVar === v.id ? 'active' : ''}`} onClick={() => setActiveVar(v.id)}>
                        <span>{v.label}</span>
                        <span
                          className={`pin ${pinned.includes(v.id) ? 'pinned' : ''}`}
                          onClick={(e) => { e.stopPropagation(); togglePin(v.id); }}
                        >
                          <I id={pinned.includes(v.id) ? 'pin-fill' : 'pin'} size={11}/>
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

      <div className="sb-foot">
        <button className="toolbar-btn primary" style={{ height: 32, justifyContent: 'center' }} onClick={onUpload}>
          <I id="up" size={13} />
          <span>Cargar direcciones</span>
        </button>
        <button className="toolbar-btn ghost" style={{ height: 26, fontSize: 11, justifyContent: 'flex-start' }} onClick={onShowOnboard}>
          <I id="info" size={11} />
          <span>Cómo funciona</span>
        </button>
      </div>
    </aside>
  );
}

// ── MAPA SIMULADO ───────────────────────────────────────────────────────
function MapSurface({ activeVar, ramp, classification, comparing, dimRange, setHover }) {
  const vals = FAKE_DISTRICTS.map(d => d.v);
  const min = Math.min(...vals), max = Math.max(...vals);
  const palette = RAMPS[ramp];

  const colorFor = (v) => {
    let t;
    if (classification === 'equal') t = (v - min) / (max - min);
    else if (classification === 'quantile') {
      const sorted = [...vals].sort((a,b) => a-b);
      const rank = sorted.findIndex(x => x >= v);
      t = rank / sorted.length;
    } else {
      t = Math.pow((v - min) / (max - min), 0.55);
    }
    const i = Math.min(palette.length - 1, Math.floor(t * palette.length));
    const inDim = dimRange && (t < dimRange[0] || t > dimRange[1]);
    return { fill: palette[i], opacity: inDim ? 0.18 : 0.86 };
  };

  return (
    <svg className="map-svg" viewBox="0 0 1100 720" preserveAspectRatio="xMidYMid slice">
      {/* fondo dark basemap simulado */}
      <defs>
        <pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse">
          <rect width="64" height="64" fill="#0E1117"/>
          <path d="M64 0 H0 V64" stroke="#1B2230" strokeWidth="0.5" fill="none"/>
        </pattern>
        <pattern id="streets" width="220" height="220" patternUnits="userSpaceOnUse">
          <line x1="0" y1="40"  x2="220" y2="40"  stroke="#252E3F" strokeWidth="0.6"/>
          <line x1="0" y1="120" x2="220" y2="120" stroke="#252E3F" strokeWidth="0.6"/>
          <line x1="0" y1="190" x2="220" y2="190" stroke="#252E3F" strokeWidth="0.6"/>
          <line x1="40"  y1="0" x2="40"  y2="220" stroke="#252E3F" strokeWidth="0.6"/>
          <line x1="160" y1="0" x2="160" y2="220" stroke="#252E3F" strokeWidth="0.6"/>
        </pattern>
      </defs>
      <rect width="1100" height="720" fill="url(#grid)"/>
      <rect width="1100" height="720" fill="url(#streets)"/>

      {/* río ficticio (Mapocho) */}
      <path d="M-20 320 C 200 280, 400 360, 600 300 S 1000 360, 1120 320"
            stroke="#1A3B5A" strokeWidth="6" fill="none" opacity="0.55"/>

      {/* polígonos */}
      {FAKE_DISTRICTS.map(d => {
        const c = colorFor(d.v);
        return (
          <g key={d.id}
             onMouseEnter={() => setHover(d)}
             onMouseLeave={() => setHover(null)}
             style={{ cursor: 'pointer' }}>
            <rect x={d.x} y={d.y} width={d.w} height={d.h}
              fill={c.fill}
              fillOpacity={c.opacity}
              stroke="#0E1117" strokeWidth="0.8"
              style={{ transition: 'fill-opacity 220ms' }}
            />
          </g>
        );
      })}

      {/* etiquetas comuna sutiles */}
      {[
        { x: 250, y: 170, label: 'PROVIDENCIA' },
        { x: 540, y: 220, label: 'LAS CONDES' },
        { x: 760, y: 180, label: 'VITACURA' },
        { x: 380, y: 480, label: 'ÑUÑOA' },
        { x: 720, y: 520, label: 'LA REINA' },
      ].map((l, i) => (
        <text key={i} x={l.x} y={l.y}
          fill="#475569" opacity="0.7"
          fontFamily="var(--font-mono)" fontSize="11" letterSpacing="2">
          {l.label}
        </text>
      ))}

      {/* puntos de usuario simulados */}
      {[
        [320, 250], [340, 280], [360, 240], [330, 270],
        [580, 320], [610, 340], [600, 310],
        [780, 230], [800, 250],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5"
          fill="#F97316" stroke="#fff" strokeWidth="1.2"
          style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}/>
      ))}
    </svg>
  );
}

// ── LEYENDA con histograma + filtro ─────────────────────────────────────
function Legend({ varLabel, varUnits, ramp, setRamp, classification, setClassification, dimRange, setDimRange }) {
  const vals = FAKE_DISTRICTS.map(d => d.v);
  const { hist, max, min } = useMemo(() => computeHist(vals, 24), []);
  const histMax = Math.max(...hist);
  const palette = RAMPS[ramp];

  const fmt = n => n >= 1000 ? Math.round(n).toLocaleString('es-CL') : n.toFixed(0);

  return (
    <div className="legend">
      <div className="lh">
        <span className="title">{varLabel}</span>
        <div className="actions">
          {CLASSIFICATIONS.map(c => (
            <button key={c.id} className={classification === c.id ? 'active' : ''} onClick={() => setClassification(c.id)}>{c.label}</button>
          ))}
        </div>
      </div>

      {/* histograma */}
      <div className="hist">
        {hist.map((h, i) => {
          const t = i / hist.length;
          const inDim = dimRange && (t < dimRange[0] || t > dimRange[1]);
          const palIdx = Math.min(palette.length - 1, Math.floor(t * palette.length));
          return (
            <div key={i} className={`bar ${inDim ? 'dim' : ''}`}
              style={{
                height: `${(h / histMax) * 100}%`,
                background: palette[palIdx],
              }}
              onClick={() => {
                if (!dimRange) setDimRange([t, Math.min(1, t + 0.15)]);
                else setDimRange(null);
              }}
            />
          );
        })}
      </div>

      <div className="ramp">
        {palette.map((c, i) => <div key={i} className="seg" style={{ background: c }}/>)}
      </div>

      <div className="scale-labels">
        <span>{fmt(min)}</span>
        <span>{fmt(min + (max-min)*0.25)}</span>
        <span>{fmt(min + (max-min)*0.5)}</span>
        <span>{fmt(min + (max-min)*0.75)}</span>
        <span>{fmt(max)}</span>
      </div>

      <div className="foot">
        <span>{varUnits || 'unidades'} · {RAMP_KIND[ramp]} · 5 clases</span>
        {dimRange && <a onClick={() => setDimRange(null)}>Limpiar filtro</a>}
      </div>
    </div>
  );
}

// ── HOVER CARD ──────────────────────────────────────────────────────────
function HoverCard({ feature, varLabel }) {
  if (!feature) return null;
  const total = FAKE_DISTRICTS.reduce((s, d) => s + d.v, 0);
  const pct = (feature.v / total) * 100;
  const sorted = [...FAKE_DISTRICTS].sort((a,b) => b.v - a.v);
  const rank = sorted.findIndex(d => d.id === feature.id) + 1;
  // sparkline ficticia (5 niveles vecinos)
  const spark = [0.6, 0.72, 0.55, 0.88, 1.0, 0.92, 0.78].map(v => v * feature.v);
  const sMax = Math.max(...spark);
  return (
    <div className="hover-card">
      <div className="eyebrow">{feature.comuna}</div>
      <h3>{feature.name}</h3>
      <div className="kpi">
        <span className="v">{Math.round(feature.v).toLocaleString('es-CL')}</span>
        <span className="pct">{pct.toFixed(2)}% del total</span>
      </div>
      <div className="spark">
        <svg width="100%" height="32" viewBox="0 0 240 32" preserveAspectRatio="none">
          <polyline
            points={spark.map((v, i) => `${(i/(spark.length-1))*240},${32 - (v/sMax)*28}`).join(' ')}
            stroke="var(--accent)" strokeWidth="1.5" fill="none"/>
          <circle cx="240" cy={32 - (spark[spark.length-1]/sMax)*28} r="3" fill="var(--accent)"/>
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          <span>{varLabel}</span>
          <span>vecinos</span>
        </div>
      </div>
      <div className="rank-row">
        <span>Ranking nacional</span>
        <span className="v">#{rank} de {FAKE_DISTRICTS.length}</span>
      </div>
      <div className="rank-row">
        <span>Densidad relativa</span>
        <span className="v">{(feature.v / (feature.w * feature.h) * 100).toFixed(1)} /km²</span>
      </div>
    </div>
  );
}

// ── MODAL UPLOAD ────────────────────────────────────────────────────────
function UploadModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState(['Calle','Numero','Comuna']);
  const [tag, setTag] = useState('Sucursal');

  const cols = [
    { name: 'Sucursal',   preview: 'Mall Plaza Norte', suggested: 'tag' },
    { name: 'Calle',      preview: 'Av. Américo Vespucio', suggested: 'address' },
    { name: 'Numero',     preview: '1737', suggested: 'address' },
    { name: 'Comuna',     preview: 'Huechuraba', suggested: 'address' },
    { name: 'Region',     preview: 'Metropolitana', suggested: 'address' },
    { name: 'M2',         preview: '12450', suggested: null },
    { name: 'Categoria',  preview: 'Mall', suggested: null },
    { name: 'Ventas2024', preview: '$ 8.2 MM', suggested: null },
  ];

  const toggleAddr = (c) => {
    if (c === tag) return;
    setSelected(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };
  const toggleTag = (c) => {
    if (selected.includes(c)) return;
    setTag(prev => prev === c ? null : c);
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-h">
          <I id="up" size={16} style={{ color: 'var(--accent)' }} />
          <h3>Cargar direcciones propias</h3>
          <button className="close" onClick={onClose}><I id="x" size={14}/></button>
        </div>

        <div className="stepper">
          <div className={`step ${step >= 1 ? (step > 1 ? 'done' : 'active') : ''}`}>
            <span className="n">1</span><span>Archivo</span>
          </div>
          <div className="line" style={{ background: step > 1 ? 'var(--pos)' : 'var(--ink-200)' }}/>
          <div className={`step ${step === 2 ? 'active' : (step > 2 ? 'done' : '')}`}>
            <span className="n">2</span><span>Columnas</span>
          </div>
          <div className="line"/>
          <div className={`step ${step === 3 ? 'active' : ''}`}>
            <span className="n">3</span><span>Geocodificar</span>
          </div>
        </div>

        <div className="modal-b">
          {step === 1 && (
            <div>
              <div className="drop" onClick={() => setStep(2)}>
                <I id="up" size={32} className="glyph" />
                <h4>Arrastra tu archivo aquí</h4>
                <p>CSV o Excel (.xlsx) · máx. 10 MB · 100 filas por lote</p>
                <button className="toolbar-btn" style={{ marginTop: 8 }}>Seleccionar archivo</button>
              </div>
              <div style={{ marginTop: 14, padding: 12, background: 'var(--accent-dim)', borderRadius: 6, display: 'flex', gap: 10 }}>
                <I id="info" size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 12, color: 'var(--ink-700)', lineHeight: 1.5 }}>
                  Skjalf usa <b>Nominatim (OpenStreetMap)</b> con un límite de 1 solicitud/segundo. Procesos grandes pueden tardar varios minutos.
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ marginBottom: 14, fontSize: 12.5, color: 'var(--ink-500)', lineHeight: 1.5 }}>
                Detectamos <b style={{ color: 'var(--ink-900)' }}>sucursales.csv</b> · 412 filas. Confirma qué columnas componen la dirección y cuál identifica cada punto.
              </div>
              <div className="col-list">
                {cols.map(col => {
                  const isAddr = selected.includes(col.name);
                  const isTag = tag === col.name;
                  return (
                    <div key={col.name}
                         className={`col-item ${isAddr ? 'selected' : ''} ${isTag ? 'tag' : ''}`}
                         onClick={() => toggleAddr(col.name)}>
                      <div style={{ flex: 1 }}>
                        <div className="name">{col.name}</div>
                        <div className="preview">{col.preview}</div>
                      </div>
                      {isAddr && <span className="role-chip address">Dirección</span>}
                      {isTag && <span className="role-chip tag">Etiqueta</span>}
                      {!isAddr && !isTag && col.suggested === 'address' && (
                        <span className="role-chip suggested">Sugerida: dirección</span>
                      )}
                      {!isAddr && !isTag && col.suggested === 'tag' && (
                        <button className="toolbar-btn" style={{ height: 24, fontSize: 11 }}
                          onClick={(e) => { e.stopPropagation(); toggleTag(col.name); }}>
                          Usar como etiqueta
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--paper-2)', borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-500)' }}>
                <span style={{ color: 'var(--ink-700)' }}>Vista previa:</span> {selected.join(', ')}, Chile
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', border: '3px solid var(--accent-dim)', borderTopColor: 'var(--accent)', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }}/>
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 16, margin: '0 0 4px' }}>Geocodificando...</h4>
              <p style={{ fontSize: 12, color: 'var(--ink-500)', margin: 0 }}>~1 minuto 50 segundos restantes</p>
              <div style={{ width: '70%', margin: '20px auto 0', background: 'var(--ink-100)', borderRadius: 999, height: 6, overflow: 'hidden' }}>
                <div style={{ width: '38%', height: '100%', background: 'var(--accent)' }}/>
              </div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-400)', marginTop: 10 }}>38 / 100 · 4 fallidos</p>
            </div>
          )}
        </div>

        <div className="modal-f">
          <button className="toolbar-btn" onClick={onClose}>Cancelar</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 1 && <button className="toolbar-btn" onClick={() => setStep(step - 1)}>Atrás</button>}
            {step < 3 && (
              <button className="toolbar-btn primary" onClick={() => setStep(step + 1)}>
                <span>{step === 2 ? 'Iniciar geocodificación' : 'Siguiente'}</span>
                <I id="arrow-right" size={12}/>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ONBOARDING (estado vacío con guía) ──────────────────────────────────
function Onboard({ onDismiss }) {
  return (
    <div className="onboard">
      <div className="onboard-card">
        <svg width="56" height="68" style={{ color: 'var(--accent)' }}><use href="#sk-mark"/></svg>
        <h1>Skjalf<em style={{ color: 'var(--highlight)', fontStyle: 'normal' }}>:</em> visualiza el Censo 2024</h1>
        <p className="lead">
          Explora variables demográficas, educacionales y de vivienda al nivel
          de comuna, distrito o manzana. Cruza tus propias direcciones para
          analizar tu cartera junto a datos territoriales oficiales.
        </p>

        <div className="onboard-grid">
          <div className="onboard-item">
            <div className="num">01</div>
            <h4>Elige una variable</h4>
            <p>Hay 8 categorías y 60+ variables del Censo. Búscalas o fíjalas.</p>
          </div>
          <div className="onboard-item">
            <div className="num">02</div>
            <h4>Ajusta el coropleto</h4>
            <p>Cambia paleta, clasificación y filtra rangos directo en la leyenda.</p>
          </div>
          <div className="onboard-item">
            <div className="num">03</div>
            <h4>Cruza tus datos</h4>
            <p>Carga un CSV/Excel y geocodificamos tus direcciones automáticamente.</p>
          </div>
        </div>

        <button className="toolbar-btn primary" style={{ marginTop: 28, height: 36, padding: '0 18px', fontSize: 13 }} onClick={onDismiss}>
          <span>Empezar</span>
          <I id="arrow-right" size={12}/>
        </button>
      </div>
    </div>
  );
}

// ── TWEAKS ──────────────────────────────────────────────────────────────
function Tweaks({ open, onClose, state, set }) {
  if (!open) return null;
  return (
    <div className="tweaks">
      <h5>
        <span>Tweaks</span>
        <button onClick={onClose} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--ink-400)' }}><I id="x" size={12}/></button>
      </h5>
      <div className="twb">
        <div className="grp">
          <label>Paleta</label>
          <div className="opts">
            {['indigo','viridis','ochre','pivot'].map(r => (
              <button key={r} className={state.ramp === r ? 'active' : ''} onClick={() => set({ ramp: r })}>{r}</button>
            ))}
          </div>
        </div>
        <div className="grp">
          <label>Clasificación</label>
          <div className="opts">
            {CLASSIFICATIONS.map(c => (
              <button key={c.id} className={state.classification === c.id ? 'active' : ''} onClick={() => set({ classification: c.id })}>{c.label}</button>
            ))}
          </div>
        </div>
        <div className="grp">
          <label>Modo</label>
          <div className="opts">
            <button className={!state.comparing ? 'active' : ''} onClick={() => set({ comparing: false })}>Single</button>
            <button className={state.comparing ? 'active' : ''} onClick={() => set({ comparing: true })}>Compare A/B</button>
          </div>
        </div>
        <div className="grp">
          <label>Onboarding</label>
          <div className="opts">
            <button onClick={() => set({ showOnboard: true })}>Mostrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── APP ─────────────────────────────────────────────────────────────────
function App() {
  const [activeVar, setActiveVar] = useState('n_per');
  const [nivel, setNivel] = useState('distrito');
  const [pinned, setPinned] = useState(['n_per','n_viv_hacinadas']);
  const [ramp, setRamp] = useState('indigo');
  const [classification, setClassification] = useState('quantile');
  const [hover, setHover] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showOnboard, setShowOnboard] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [dimRange, setDimRange] = useState(null);
  const [tweaksOpen, setTweaksOpen] = useState(false);

  const togglePin = (id) => setPinned(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const allVars = useMemo(() => Object.entries(MENU).flatMap(([cat, items]) => items.map(v => ({ ...v, cat }))), []);
  const meta = allVars.find(v => v.id === activeVar);

  // Tweaks protocol
  useEffect(() => {
    const onMsg = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const setTweak = (patch) => {
    if ('ramp' in patch) setRamp(patch.ramp);
    if ('classification' in patch) setClassification(patch.classification);
    if ('comparing' in patch) setComparing(patch.comparing);
    if ('showOnboard' in patch) setShowOnboard(patch.showOnboard);
  };

  return (
    <div className="app">
      <Sidebar
        activeVar={activeVar} setActiveVar={setActiveVar}
        nivel={nivel} setNivel={setNivel}
        pinned={pinned} togglePin={togglePin}
        onUpload={() => setShowModal(true)}
        onShowOnboard={() => setShowOnboard(true)}
      />

      <div className="main">
        <div className="topbar">
          <div className="crumbs">
            <span>Chile</span>
            <span className="sep">›</span>
            <span>Región Metropolitana</span>
            <span className="sep">›</span>
            <span className="current">Santiago Centro</span>
          </div>
          <span style={{ flex: 1 }}/>
          <button className={`toolbar-btn ${comparing ? 'primary' : ''}`} onClick={() => setComparing(!comparing)}>
            <I id="compare" size={13}/>
            <span>Comparar</span>
          </button>
          <button className="toolbar-btn">
            <I id="layers" size={13}/>
            <span>Capas</span>
          </button>
          <button className="toolbar-btn">
            <I id="download" size={13}/>
            <span>Exportar</span>
          </button>
          <button className="toolbar-btn icon" title="Compartir vista"><I id="share" size={13}/></button>
        </div>

        <div className="map-wrap">
          <MapSurface activeVar={activeVar} ramp={ramp} classification={classification} comparing={comparing} dimRange={dimRange} setHover={setHover}/>

          {/* Compare overlay */}
          <div className={`compare-bar ${comparing ? 'on' : ''}`}/>
          <div className={`compare-handle ${comparing ? 'on' : ''}`}>
            <I id="compare" size={14}/>
          </div>
          {comparing && (
            <>
              <div className="compare-label left on">A · Población Total</div>
              <div className="compare-label right on">B · Hacinamiento</div>
            </>
          )}

          {/* Variable card */}
          <div className="var-card">
            <div className="eyebrow">Variable activa · {meta?.cat}</div>
            <h2>{meta?.label}</h2>
            <div className="row">
              <span className="num">7 112 808</span>
              <span className="delta">▲ +3.4%</span>
              <span style={{ flex: 1 }}/>
              <span className="units">{meta?.units || 'unidades'}</span>
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--ink-100)', fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.12em' }}>RM · 64 distritos visibles</span>
            </div>
          </div>

          {/* Hover card */}
          <HoverCard feature={hover} varLabel={meta?.label}/>

          {/* Legend */}
          <Legend
            varLabel={meta?.label}
            varUnits={meta?.units}
            ramp={ramp} setRamp={setRamp}
            classification={classification} setClassification={setClassification}
            dimRange={dimRange} setDimRange={setDimRange}
          />

          {/* Map controls */}
          <div className="map-controls">
            <div className="map-ctl-grp">
              <button title="Norte"><I id="north" size={14}/></button>
            </div>
            <div className="map-ctl-grp">
              <button title="Acercar"><I id="plus" size={14}/></button>
              <button title="Alejar"><I id="minus" size={14}/></button>
            </div>
          </div>

          {/* Coord readout */}
          <div className="coord-readout">
            -33.4520° S · -70.6621° W · z 11
          </div>

          {showOnboard && <Onboard onDismiss={() => setShowOnboard(false)}/>}
        </div>
      </div>

      {showModal && <UploadModal onClose={() => setShowModal(false)}/>}
      <Tweaks open={tweaksOpen} onClose={() => { setTweaksOpen(false); window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); }}
              state={{ ramp, classification, comparing }} set={setTweak}/>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
