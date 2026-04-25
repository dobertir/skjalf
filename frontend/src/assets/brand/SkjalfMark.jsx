export default function SkjalfMark({ size = 22, color = 'currentColor', style, ...rest }) {
  const h = Math.round(size * 34 / 28);
  return (
    <svg
      width={size} height={h}
      viewBox="0 0 28 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ color, flexShrink: 0, display: 'block', ...style }}
      {...rest}
    >
      <path
        d="M14 1.5 L26.5 14 L14 32.5 L1.5 14 Z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="miter"
      />
      <line x1="14" y1="6"  x2="14" y2="22" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.35"/>
      <line x1="6"  y1="14" x2="22" y2="14" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.35"/>
      <path
        d="M9 9 L17 14 L9 19 L17 24"
        stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter"
      />
      <circle cx="14" cy="3.6" r="1.1" fill="currentColor"/>
    </svg>
  );
}
