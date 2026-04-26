import { useState } from 'react';
import { Upload, X, ArrowRight, Check } from 'lucide-react';
import axios from 'axios';

const ADDR_KEYS = ['calle','street','address','direccion','dirección','numero','número','nro','num','comuna','city','ciudad','localidad','region','región','provincia','pais','país'];

function suggestRole(col) {
  const lo = col.toLowerCase();
  return ADDR_KEYS.some(k => lo.includes(k)) ? 'address' : null;
}

export default function UploadModal({ apiUrl, geo, onStartGeo, onClose, onReset }) {
  const [step,      setStep]      = useState(() => (geo.active || geo.ok || geo.err) ? 3 : 1);
  const [file,      setFile]      = useState(null);
  const [cols,      setCols]      = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [selAddr,   setSelAddr]   = useState([]);
  const [tagCol,    setTagCol]    = useState(null);

  const applyFile = async (f) => {
    if (!f) return;
    setFile(f);
    const isExcel = /\.(xlsx|xls)$/i.test(f.name);
    if (isExcel) {
      try {
        const fd = new FormData(); fd.append('file', f);
        const res = await axios.post(`${apiUrl}/api/usuario/columnas`, fd);
        const names = res.data.columnas;
        setCols(names.map(n => ({ name: n, preview: '—', role: suggestRole(n) })));
        setTotalRows(res.data.total_filas ?? 100);
        setSelAddr(names.filter(n => suggestRole(n) === 'address'));
        setTagCol(names.find(n => !suggestRole(n)) || null);
        setStep(2);
      } catch { alert('Error al leer el Excel.'); }
    } else {
      const reader = new FileReader();
      reader.onload = ev => {
        const lines = ev.target.result.split('\n').filter(l => l.trim());
        const names = lines[0].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const row1  = lines[1] ? lines[1].split(',').map(c => c.trim().replace(/^"|"$/g, '')) : [];
        setTotalRows(Math.max(0, lines.length - 1));
        setCols(names.map((n, i) => ({ name: n, preview: row1[i] || '—', role: suggestRole(n) })));
        setSelAddr(names.filter(n => suggestRole(n) === 'address'));
        setTagCol(names.find(n => !suggestRole(n)) || null);
        setStep(2);
      };
      reader.readAsText(f);
    }
  };

  const toggleAddr = col => {
    if (col === tagCol) return;
    setSelAddr(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  };
  const toggleTag = col => {
    if (selAddr.includes(col)) return;
    setTagCol(prev => prev === col ? null : col);
  };

  const handleStartGeo = () => {
    if (!selAddr.length) return alert('Selecciona al menos una columna de dirección');
    setStep(3);
    onStartGeo(file, selAddr, tagCol, totalRows);
  };

  const handleRetry = () => {
    onReset();
    setStep(1);
    setFile(null);
    setCols([]);
  };

  const preview = cols.filter(c => selAddr.includes(c.name)).map(c => c.name).join(', ');

  const StepDot = ({ n, label }) => {
    const done = step > n, active = step === n;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? 'var(--pos)' : active ? 'var(--accent)' : 'var(--ink-200)', color: (done || active) ? '#fff' : 'var(--ink-400)', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', transition: 'all 200ms', flexShrink: 0 }}>
          {done ? <Check size={12}/> : n}
        </div>
        <span style={{ fontSize: 12, color: active ? 'var(--ink-900)' : done ? 'var(--pos)' : 'var(--ink-400)', fontWeight: active ? 500 : 400 }}>{label}</span>
      </div>
    );
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,16,26,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={onClose}>
      <div style={{ width: 500, maxHeight: '90vh', background: '#fff', borderRadius: 10, boxShadow: 'var(--shadow-3)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '15px 20px', borderBottom: '1px solid var(--ink-200)' }}>
          <Upload size={16} style={{ color: 'var(--accent)' }}/>
          <h3 style={{ flex: 1, margin: 0, fontSize: 15, fontFamily: 'var(--font-display)', fontWeight: 600 }}>Cargar direcciones propias</h3>
          <button onClick={onClose} style={{ display: 'flex', color: 'var(--ink-400)', padding: 4, background: 'none', border: 'none', cursor: 'pointer' }}><X size={14}/></button>
        </div>

        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--ink-100)' }}>
          <StepDot n={1} label="Archivo"/>
          <div style={{ flex: 1, height: 1, background: step > 1 ? 'var(--pos)' : 'var(--ink-200)', margin: '0 10px', transition: 'background 200ms' }}/>
          <StepDot n={2} label="Columnas"/>
          <div style={{ flex: 1, height: 1, background: step > 2 ? 'var(--pos)' : 'var(--ink-200)', margin: '0 10px', transition: 'background 200ms' }}/>
          <StepDot n={3} label="Geocodificar"/>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

          {step === 1 && (
            <div>
              <div
                onDrop={e => { e.preventDefault(); applyFile(e.dataTransfer.files[0]); }}
                onDragOver={e => e.preventDefault()}
                onDragEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--ink-200)'; }}
                style={{ border: '2px dashed var(--ink-200)', borderRadius: 'var(--r-4)', padding: '36px 20px', textAlign: 'center', background: 'var(--paper-2)', transition: 'border-color 150ms' }}
              >
                <Upload size={28} style={{ color: 'var(--ink-300)', margin: '0 auto 10px', display: 'block' }}/>
                <h4 style={{ fontSize: 15, fontFamily: 'var(--font-display)', margin: '0 0 6px', color: 'var(--ink-700)' }}>Arrastra tu archivo aquí</h4>
                <p style={{ fontSize: 13, color: 'var(--ink-400)', margin: '0 0 14px' }}>CSV o Excel (.xlsx) · máx. 10 MB · 100 filas por lote</p>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--r-3)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                  <Upload size={13}/>
                  Seleccionar archivo
                  <input type="file" style={{ display: 'none' }} accept=".csv,.xlsx,.xls" onChange={e => applyFile(e.target.files[0])}/>
                </label>
              </div>
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--accent-dim)', borderRadius: 'var(--r-3)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--accent)', flexShrink: 0, lineHeight: 1.5 }}>ℹ</span>
                <p style={{ fontSize: 12, color: 'var(--ink-700)', lineHeight: 1.5, margin: 0 }}>
                  Skjalf usa <b>Nominatim (OpenStreetMap)</b> con límite de 1 req/seg. Procesos grandes pueden tardar varios minutos.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--ink-500)', margin: '0 0 14px', lineHeight: 1.5 }}>
                <b style={{ color: 'var(--ink-900)' }}>{file?.name}</b> · {totalRows} filas. Selecciona las columnas que forman la dirección.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                {cols.map(col => {
                  const isAddr = selAddr.includes(col.name);
                  const isTag  = tagCol === col.name;
                  return (
                    <div
                      key={col.name}
                      onClick={() => toggleAddr(col.name)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 'var(--r-3)', cursor: isTag ? 'default' : 'pointer', border: `1.5px solid ${isAddr ? 'var(--accent)' : isTag ? 'var(--highlight)' : 'var(--ink-200)'}`, background: isAddr ? 'var(--accent-dim)' : isTag ? 'var(--highlight-dim)' : '#fff', transition: 'all 120ms' }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-900)' }}>{col.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-400)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.preview}</div>
                      </div>
                      {isAddr && <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 10, flexShrink: 0 }}>dirección</span>}
                      {isTag  && <span style={{ background: 'var(--highlight)', color: '#fff', fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 10, flexShrink: 0 }}>etiqueta</span>}
                      {!isAddr && !isTag && col.role === 'address' && <span style={{ background: 'var(--ink-100)', color: 'var(--ink-400)', fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 10, flexShrink: 0 }}>sugerida</span>}
                      {!isAddr && !isTag && !col.role && (
                        <button
                          onClick={e => { e.stopPropagation(); toggleTag(col.name); }}
                          style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 10, background: 'transparent', border: '1px solid var(--highlight)', color: 'var(--highlight)', cursor: 'pointer', flexShrink: 0 }}
                        >
                          + etiqueta
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {preview && (
                <div style={{ padding: '9px 12px', background: 'var(--paper-2)', borderRadius: 'var(--r-3)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-500)' }}>
                  <span style={{ color: 'var(--ink-700)', fontWeight: 500 }}>Vista previa: </span>{preview}, Chile
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              {!geo.ok && !geo.err && (
                <>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', border: '3px solid var(--accent-dim)', borderTopColor: 'var(--accent)', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }}/>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 16, margin: '0 0 4px', color: 'var(--ink-900)' }}>Geocodificando...</h4>
                  <p style={{ fontSize: 12, color: 'var(--ink-500)', margin: '0 0 4px' }}>{geo.eta}</p>
                  <p style={{ fontSize: 11, color: 'var(--ink-400)', margin: '0 0 20px' }}>
                    Puedes cerrar esta ventana — el proceso continúa en segundo plano.
                  </p>
                  <div style={{ width: '70%', margin: '0 auto 8px', background: 'var(--ink-100)', borderRadius: 999, height: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${geo.pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 999, transition: 'width 300ms' }}/>
                  </div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-400)', margin: 0 }}>
                    {geo.done} / {geo.total} registros
                  </p>
                </>
              )}
              {geo.err && (
                <>
                  <div style={{ fontSize: 36, margin: '0 0 12px' }}>⚠️</div>
                  <h4 style={{ fontSize: 16, fontFamily: 'var(--font-display)', margin: '0 0 8px', color: 'var(--neg)' }}>Error al geocodificar</h4>
                  <p style={{ fontSize: 12, color: 'var(--ink-500)' }}>Verifica tu conexión e intenta de nuevo.</p>
                </>
              )}
              {geo.ok && (
                <>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--pos)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <Check size={22} style={{ color: '#fff' }}/>
                  </div>
                  <h4 style={{ fontSize: 16, fontFamily: 'var(--font-display)', margin: '0 0 4px', color: 'var(--pos)' }}>¡Completado!</h4>
                  <p style={{ fontSize: 12, color: 'var(--ink-500)' }}>Cerrando...</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--ink-200)', display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={onClose} className="btn btn-secondary">
            {step === 3 && !geo.ok && !geo.err ? 'Minimizar' : 'Cancelar'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {step === 2 && <button onClick={() => setStep(1)} className="btn btn-secondary">Atrás</button>}
            {step === 2 && (
              <button
                onClick={handleStartGeo}
                disabled={!selAddr.length}
                className="btn btn-primary"
                style={{ opacity: selAddr.length ? 1 : 0.4, cursor: selAddr.length ? 'pointer' : 'not-allowed' }}
              >
                Geocodificar <ArrowRight size={12}/>
              </button>
            )}
            {step === 3 && geo.err && (
              <button onClick={handleRetry} className="btn btn-primary">Reintentar</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
