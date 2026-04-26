import SkjalfMark from '../assets/brand/SkjalfMark';

export default function Onboarding({ onDismiss }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.82)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
      <div style={{ background: '#fff', borderRadius: 'var(--r-4)', padding: '40px 44px', maxWidth: 520, width: '90vw', textAlign: 'center', boxShadow: 'var(--shadow-3)' }}>
        <SkjalfMark size={52} color="var(--accent)" style={{ margin: '0 auto 18px' }}/>
        <h1 style={{ fontFamily: 'var(--font-brand)', fontSize: 30, fontWeight: 400, margin: '0 0 8px', letterSpacing: '0.02em', color: 'var(--ink-900)' }}>
          Skjalf<span style={{ color: 'var(--highlight)' }}>:</span>
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-500)', lineHeight: 1.65, margin: '0 0 28px' }}>
          Explora variables demográficas, educacionales y de vivienda<br/>
          al nivel de comuna, distrito o manzana — Censo 2024.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 28, textAlign: 'left' }}>
          {[
            { n: '01', title: 'Elige una variable', desc: '8 categorías, 60+ variables del Censo.' },
            { n: '02', title: 'Ajusta el coropleto', desc: 'Cambia paleta, clasificación y filtra rangos.' },
            { n: '03', title: 'Cruza tus datos', desc: 'Geocodificamos tus direcciones automáticamente.' },
          ].map(item => (
            <div key={item.n} style={{ background: 'var(--paper-2)', border: '1px solid var(--ink-200)', borderRadius: 'var(--r-3)', padding: '13px 12px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginBottom: 6, letterSpacing: '0.08em' }}>{item.n}</div>
              <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 4px', color: 'var(--ink-900)' }}>{item.title}</h4>
              <p style={{ fontSize: 12, color: 'var(--ink-500)', margin: 0, lineHeight: 1.45 }}>{item.desc}</p>
            </div>
          ))}
        </div>
        <button
          onClick={onDismiss}
          className="btn btn-primary"
          style={{ fontSize: 14, padding: '10px 28px' }}
        >
          Empezar
        </button>
      </div>
    </div>
  );
}
