🗺️ Proyecto: Visualizador Geográfico Censo 2024 (Chile)
1. Objetivo del Proyecto
Desarrollar un dashboard interactivo para visualizar datos del Censo 2024 de Chile a nivel distrital y de manzanas. El sistema permite:

Visualización dinámica (Choropleth) de variables demográficas y socioeconómicas.

Carga de datos propios del usuario (CSV) con geocodificación automática.

Superposición de mapas de calor (Heatmaps) basados en los datos cargados.

2. Stack Tecnológico
Backend: FastAPI (Python 3.12+), GeoPandas, PyArrow (para manejo de Parquet), Geopy (Nominatim).

Frontend: React 19 (Vite), Tailwind CSS v4, React-Leaflet.

Datos: Archivos Parquet de cartografía censal de Chile (Manzanas y Distritos).

3. Estado Actual
Backend: Funcional. Posee un script preprocesar.py que genera un distritos_master.parquet optimizado. El servidor main.py maneja endpoints de geometría y geocodificación por lotes.

Frontend: En estado de debugging. La pantalla se muestra en blanco. Se sospecha de:

Conflictos de dependencia entre React 19 y react-leaflet-heatmap-layer.

Errores de importación en App.jsx tras la limpieza de la plantilla de Vite.

Uso de hooks de Leaflet fuera de contexto en MapView.jsx.