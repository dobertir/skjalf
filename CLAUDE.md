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
Backend: Funcional. Posee un script preprocesar.py que genera un distritos_master.parquet optimizado. El servidor main.py maneja endpoints de geometría y geocodificación por lotes. Requiere `pip install -r requirements.txt` (geopandas, etc.) en el entorno activo antes de correr — si falta, falla con `ModuleNotFoundError`.

Frontend: Build limpio (`npm run build` sin errores). El bug de pantalla en blanco reportado antes quedó resuelto por los commits posteriores de UI (heatmap, legend, sidebar).