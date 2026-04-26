import { quantile } from 'd3-array';
import { ckmeans } from 'simple-statistics';

export const RAMPS = {
  indigo:  ['#F1EEF6', '#BDC9E1', '#74A9CF', '#3B4FB8', '#2A3C8F'],
  viridis: ['#FDE725', '#90D743', '#35B779', '#21908C', '#443983'],
  ochre:   ['#FFF5D6', '#FAD679', '#E8A33D', '#B6862C', '#7A5A1C'],
  pivot:   ['#9B3D2E', '#E6A693', '#F2EDE5', '#A8B4E0', '#2A3C8F'],
};

export const DENSITY_RAMPS = {
  violet: ['#1B1530', '#3D2870', '#6B4FBB', '#A98AE6', '#E6D8FF'],
  warm:   ['#1A0F08', '#5C1F0E', '#C24A1D', '#F0853A', '#FFD79A'],
  cyan:   ['#062029', '#0F4E5F', '#179BB3', '#5FD3DC', '#C7F4F4'],
  mono:   ['#0E1117', '#2D333E', '#5A6170', '#B2B6BF', '#FFFFFF'],
};

export const RAMP_META = {
  indigo:  { label: 'Índigo',  kind: 'sequential' },
  viridis: { label: 'Viridis', kind: 'sequential' },
  ochre:   { label: 'Ocre',    kind: 'sequential' },
  pivot:   { label: 'Pivote',  kind: 'diverging'  },
};

export function getBreaks(values, k = 5, mode = 'quantile') {
  if (!values.length) return Array(k + 1).fill(0);
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (min === max) return Array(k + 1).fill(min);

  if (mode === 'equal') {
    return Array.from({ length: k + 1 }, (_, i) => min + (max - min) * i / k);
  }
  if (mode === 'jenks') {
    const groups = ckmeans(sorted, k);
    return [groups[0][0], ...groups.map(g => g[g.length - 1])];
  }
  // quantile
  return Array.from({ length: k + 1 }, (_, i) => quantile(sorted, i / k));
}

export function valueToColor(value, breaks, palette) {
  if (value == null || value <= 0 || !breaks?.length) return null;
  const k = palette.length;
  let idx = k - 1;
  for (let i = 1; i < breaks.length; i++) {
    if (value <= breaks[i]) { idx = i - 1; break; }
  }
  return palette[Math.min(idx, k - 1)];
}

export function normalizeValue(value, breaks) {
  const min = breaks[0], max = breaks[breaks.length - 1];
  if (max === min) return 0;
  return (value - min) / (max - min);
}
