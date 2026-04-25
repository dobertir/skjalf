import { useMemo } from 'react';
import { RAMPS, RAMP_META, getBreaks } from '../utils/choropleth';

const BINS = 24;
const CLS = [
  { id: 'quantile', label: 'Cuantiles' },
  { id: 'jenks',    label: 'Jenks'     },
  { id: 'equal',    label: 'Iguales'   },
];
const fmt = n => n >= 10000
  ? Math.round(n).toLocaleString('es-CL')
  : n >= 1000
    ? Math.round(n).toLocaleString('es-CL')
    : Number.isInteger(n) ? n : n.toFixed(1);

export default function Legend({ values, ramp, setRamp, classification, setClassification, dimRange, setDimRange, label }) {
  const palette = RAMPS[ramp] || RAMPS.indigo;

  const breaks = useMemo(() =>
    values?.length ? getBreaks(values.filter(v => v > 0), 5, classification) : [],
    [values, classification]
  );

  const hist = useMemo(() => {
    if (!values?.length || !breaks?.length) return [];
    const min = breaks[0], max = breaks[breaks.length - 1];
    const step = (max - min) / BINS;
    if (step === 0) return Array(BINS).fill(0);
    const counts = Array(BINS).fill(0);
    values.forEach(v => {
      if (v <= 0) return;
      const i = Math.min(BINS - 1, Math.floor((v - min) / step));
      counts[i]++;
    });
    return counts;
  }, [values, breaks]);

  const histMax = Math.max(...hist, 1);
  const min = breaks[0] ?? 0;
  const max = breaks[breaks.length - 1] ?? 1;

  return (
    <div style={{
      position: 'absolute', bottom: 28, right: 20, zIndex: 1000,
      background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(10px)',
      border: '1px solid var(--ink-200)',
      borderRadius: 'var(--r-4)',
      boxShadow: 'var(--shadow-3)',
      padding: '12px 14px',
      minWidth: 210, maxWidth: 240,
    }}>

      {/* label + classification */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.14em',
          color: 'var(--ink-500)', margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
        }}>
          {label}
        </p>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          {CLS.map(c => (
            <button
              key={c.id}
              onClick={() => setClassification(c.id)}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 9,
                padding: '2px 5px', borderRadius: 'var(--r-1)',
                background: classification === c.id ? 'var(--accent)' : 'var(--ink-100)',
                color: classification === c.id ? '#fff' : 'var(--ink-400)',
                border: 'none', cursor: 'pointer', transition: 'all 120ms',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* histogram */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 36, marginBottom: 4 }}>
        {hist.map((h, i) => {
          const t = i / BINS;
          const palIdx = Math.min(palette.length - 1, Math.floor(t * palette.length));
          const inDim = dimRange && (t < dimRange[0] || t > dimRange[1]);
          return (
            <div
              key={i}
              onClick={() => {
                if (dimRange) { setDimRange(null); return; }
                setDimRange([Math.max(0, t - 0.1), Math.min(1, t + 0.1)]);
              }}
              style={{
                flex: 1,
                height: `${Math.max(8, (h / histMax) * 100)}%`,
                background: palette[palIdx],
                opacity: inDim ? 0.18 : 1,
                borderRadius: '1px 1px 0 0',
                cursor: 'pointer',
                transition: 'opacity 150ms',
              }}
            />
          );
        })}
      </div>

      {/* ramp strip */}
      <div style={{ display: 'flex', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
        {palette.map((c, i) => <div key={i} style={{ background: c, height: 8, flex: 1 }} />)}
      </div>

      {/* scale labels */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-500)',
        marginBottom: 10,
      }}>
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <span key={i}>{fmt(min + (max - min) * t)}</span>
        ))}
      </div>

      {/* ramp selector */}
      <div style={{ display: 'flex', gap: 4 }}>
        {Object.keys(RAMPS).map(r => (
          <button
            key={r}
            onClick={() => setRamp(r)}
            title={RAMP_META[r].label}
            style={{
              flex: 1, padding: '3px 2px',
              border: ramp === r ? '1.5px solid var(--accent)' : '1.5px solid transparent',
              borderRadius: 'var(--r-2)', background: 'none', cursor: 'pointer',
              outline: 'none',
            }}
          >
            <div style={{ display: 'flex', borderRadius: 2, overflow: 'hidden', height: 6 }}>
              {RAMPS[r].map((c, i) => <div key={i} style={{ background: c, flex: 1 }} />)}
            </div>
          </button>
        ))}
      </div>

      {dimRange && (
        <button
          onClick={() => setDimRange(null)}
          style={{
            marginTop: 8, width: '100%', padding: '4px 0',
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'var(--accent)', background: 'var(--accent-dim)',
            border: 'none', borderRadius: 'var(--r-2)', cursor: 'pointer',
          }}
        >
          Limpiar filtro
        </button>
      )}
    </div>
  );
}
