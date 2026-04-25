# Skjalf — Spec de implementación

> Documento de handoff para Claude Code. Implementa el logo y mejoras de UX
> sobre el frontend existente (`frontend/src/`, React 19 + Vite + Tailwind v4 +
> React-Leaflet) y los tokens en `tokens.css` ya presentes en el repo.

---

## 1 · Logo Skjalf

### 1.1 Concepto
Pin cartográfico (rombo / drop) con la **runa Sól (ᛋ)** del Younger Futhark
inscrita como un zig-zag de 3 segmentos, una cruz de coordenadas sutil
(N/S · E/O) y un punto que marca el norte.

### 1.2 Archivos a crear
Ubica todo en `frontend/src/assets/brand/`:

| archivo | uso |
| --- | --- |
| `skjalf-mark.svg` | mark a solo (sidebar, favicon grande) |
| `skjalf-stamp.svg` | versión sólida (app icon, favicon) |
| `skjalf-lockup.svg` | lockup horizontal (mark + wordmark) |
| `skjalf-mark.tsx` | wrapper React que pasa `color` / `size` |

### 1.3 SVG del mark (24×30 viewbox, stroke 1.6)

```svg
<svg viewBox="0 0 28 34" xmlns="http://www.w3.org/2000/svg" fill="none">
  <path d="M14 1.5 L26.5 14 L14 32.5 L1.5 14 Z"
        stroke="currentColor" stroke-width="1.6" stroke-linejoin="miter"/>
  <line x1="14" y1="6"  x2="14" y2="22" stroke="currentColor" stroke-width="0.9" stroke-opacity="0.35"/>
  <line x1="6"  y1="14" x2="22" y2="14" stroke="currentColor" stroke-width="0.9" stroke-opacity="0.35"/>
  <path d="M9 9 L17 14 L9 19 L17 24"
        stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"/>
  <circle cx="14" cy="3.6" r="1.1" fill="currentColor"/>
</svg>
```

`currentColor` permite recolorearlo con CSS. Tamaños canónicos: 16, 20, 28, 56.

### 1.4 Wordmark
- Familia: **Abel** (ya está en `--font-brand`).
- Carácter especial: el `:` final va en color `var(--highlight)` (violeta).
- Para el lockup horizontal: gap 10px entre mark y wordmark, alineación
  baseline-to-baseline (line-height del wordmark = altura del mark).

### 1.5 Reemplazos en código

En `App.jsx` la marca actual se construye así:

```jsx
<MapIcon style={{ width: 28, height: 28, color: 'var(--accent)' }} />
<span className="wordmark">Skjalf<em>:</em></span>
```

Reemplaza por:

```jsx
import SkjalfMark from './assets/brand/skjalf-mark.tsx';
// ...
<SkjalfMark size={26} color="var(--accent)" />
<span className="wordmark">Skjalf<em>:</em></span>
```

Actualiza `frontend/index.html` con `<link rel="icon" href="/skjalf-stamp.svg">`.

---

## 2 · Mejoras de UX (priorizadas)

### 2.1 ⚠️ Color del coropleto (PRIORIDAD ALTA)

**Problema actual:** la rampa `['#E7EAF7','#A8B4E0','#3B4FB8','#2A3C8F','#1B2766']`
es secuencial monocromática indigo y queda apagada sobre basemap dark
(`cartocdn dark_all`). Las divisiones por umbral fijo (`>0.8`, `>0.6`, …)
no respetan distribución real → mucho gris medio + escasos extremos.

**Cambios concretos:**

1. **Múltiples paletas** seleccionables. Añadir a `tokens.css`:

   ```css
   /* Sequential — magnitudes positivas */
   --ramp-indigo:  #F1EEF6, #BDC9E1, #74A9CF, #3B4FB8, #2A3C8F;
   --ramp-viridis: #FDE725, #90D743, #35B779, #21908C, #443983;
   --ramp-ochre:   #FFF5D6, #FAD679, #E8A33D, #B6862C, #7A5A1C;
   /* Diverging — para % o residuos contra media */
   --ramp-pivot:   #9B3D2E, #E6A693, #F2EDE5, #A8B4E0, #2A3C8F;
   ```

2. **Clasificación seleccionable** (no umbrales fijos). Soporta tres modos:
   - `quantile` (default) — usa `d3-array` `quantile()` en 5 cortes.
   - `jenks` — usar `simple-statistics` `ckmeans(values, 5)`.
   - `equal` — `(max-min)/5`.

3. **Reemplazar `getFeatureStyle`** en `MapView.jsx`:

   ```js
   import { quantile } from 'd3-array';
   import { ckmeans } from 'simple-statistics';

   function getBreaks(values, k = 5, mode = 'quantile') {
     if (mode === 'equal') {
       const min = Math.min(...values), max = Math.max(...values);
       return Array.from({length: k+1}, (_, i) => min + (max-min)*i/k);
     }
     if (mode === 'jenks') {
       const groups = ckmeans(values, k);
       return [groups[0][0], ...groups.map(g => g[g.length-1])];
     }
     // quantile
     return Array.from({length: k+1}, (_, i) => quantile(values, i/k));
   }
   ```

4. **Histograma en la leyenda** — calcula 24 bins sobre los valores visibles
   y dibuja barras coloreadas con la rampa. Click en una barra filtra
   (atenúa a 18% opacity los polígonos fuera del rango).

5. **Capa heatmap** — la actual `gradient: { 0.25:'#3b82f6', 0.55:'#f97316', 1.0:'#ef4444' }`
   colisiona con cualquier paleta. Cambia a una rampa neutra que sume sobre
   el coropleto (`{ 0.4:'#6B4FBB55', 0.7:'#6B4FBB99', 1.0:'#6B4FBB' }`)
   cuando la paleta principal sea indigo. Si el usuario elige paleta cálida,
   pivota el heatmap a indigo. **Nunca dos hues compitiendo.**

### 2.2 Sidebar

- **Buscador `⌘K`** sobre el listado de variables.
- **Variables fijadas** — botón pin por variable, persiste en `localStorage`.
- **Selector de nivel mejorado** — muestra escala aprox (`1:50k`, `1:20k`, `1:5k`).
- **Aviso de zoom para manzanas** muévelo a un toast no-bloqueante en el mapa.

Estado en `localStorage`:
```js
{ pinnedVars: ['n_per','n_viv_hacinadas'], lastVar: 'n_per', lastLevel: 'distrito' }
```

### 2.3 Modal de carga (3 pasos)

Refactor a stepper:

1. **Archivo** — drop zone + nota sobre límite de 100 filas.
2. **Columnas** — auto-sugiere `address` para columnas con keywords (`calle`,
   `direccion`, `comuna`, `numero`, `region`) y `tag` para la primera columna
   string que no sea dirección. Muestra **preview** del primer valor.
3. **Geocodificación** — barra de progreso real con counter (`38/100`),
   conteo de fallidos, y botón "Pausar/Reanudar".

Estructura sugerida: `frontend/src/components/upload/{UploadModal,DropZone,ColumnPicker,GeocodeProgress}.jsx`.

### 2.4 Hover card

- Eyebrow con `comuna` superior.
- KPI grande del valor activo + `% del total visible`.
- **Sparkline** (7 vecinos espaciales más cercanos) — usa
  `geometry.intersects` o nearest-by-centroid con `turf.distance`.
- Ranking nacional (`#X de N`) y densidad relativa.

### 2.5 Leyenda con histograma + filtro

Componente nuevo `frontend/src/components/Legend.jsx`. Recibe:
```ts
{ values: number[], breaks: number[], ramp: string[],
  classification, setClassification, dimRange, setDimRange, label, units }
```

### 2.6 Onboarding / estado vacío

Si `localStorage.skjalf_seen_intro !== 'v1'`, muestra overlay con tres pasos
(elegir variable, ajustar paleta, cruzar datos). Botón "Empezar" lo cierra
y setea el flag.

### 2.7 Comparar A/B

Botón **Comparar** en topbar activa modo split:
- Dos `MapContainer` sincronizados (mismo center/zoom, listener `move`).
- Variable A a la izquierda, B a la derecha.
- Handle vertical arrastrable entre ambos (clip-path de la capa derecha).
- Cuando inactivo, ocultar bar y handle.

### 2.8 Exportar / compartir

- **PNG** — usa `html-to-image` del root del mapa.
- **Compartir URL** — codifica el state actual como query string:
  `?var=n_per&level=distrito&ramp=indigo&class=quantile&center=-33.45,-70.66&zoom=11`.
  Hidrata desde la URL al cargar.

### 2.9 Topbar

Añade breadcrumbs reactivos (`Chile › Región › Comuna`) y readout de
coordenadas/zoom en `bottom-center` del mapa.

---

## 3 · Tokens nuevos

Añadir a `tokens.css` debajo del bloque `--data-*`:

```css
/* Choropleth ramps */
--ramp-indigo-1: #F1EEF6;  --ramp-indigo-2: #BDC9E1;  --ramp-indigo-3: #74A9CF;
--ramp-indigo-4: #3B4FB8;  --ramp-indigo-5: #2A3C8F;

--ramp-viridis-1: #FDE725; --ramp-viridis-2: #90D743; --ramp-viridis-3: #35B779;
--ramp-viridis-4: #21908C; --ramp-viridis-5: #443983;

--ramp-ochre-1: #FFF5D6;   --ramp-ochre-2: #FAD679;   --ramp-ochre-3: #E8A33D;
--ramp-ochre-4: #B6862C;   --ramp-ochre-5: #7A5A1C;

--ramp-pivot-1: #9B3D2E;   --ramp-pivot-2: #E6A693;   --ramp-pivot-3: #F2EDE5;
--ramp-pivot-4: #A8B4E0;   --ramp-pivot-5: #2A3C8F;

/* Brand mark sizes */
--mark-sm: 16px;
--mark-md: 22px;
--mark-lg: 28px;
--mark-xl: 56px;
```

---

## 4 · Dependencias nuevas

```bash
npm i d3-array simple-statistics @turf/distance @turf/centroid html-to-image
```

---

## 5 · Orden de PRs sugerido

1. **brand**: SVGs + reemplazo de `MapIcon` por `SkjalfMark` + favicon.
2. **paletas**: tokens, `getBreaks`, selector en leyenda. (Resuelve la queja del usuario.)
3. **histograma + filtro** en leyenda.
4. **sidebar**: buscador + pinned + localStorage.
5. **upload modal** stepper.
6. **hover card** mejorado + sparkline.
7. **onboarding** overlay.
8. **compare A/B** + share URL + export PNG.

---

## 6 · Archivos de referencia

- `logo.html` — variantes del logo, construcción geométrica, color, no-uses.
- `app.html` + `app.jsx` — mock interactivo del estado deseado del UX.
- `tokens.css` — sistema actual al que sumamos las rampas.
