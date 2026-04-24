from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
import geopandas as gpd
import pandas as pd
import json
import io
import os
import shutil
from pathlib import Path
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter
from shapely import wkb

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR      = Path(__file__).resolve().parent
DATA_PATH     = BASE_DIR / "data" / "distritos_master.parquet"
COMUNAS_PATH  = BASE_DIR / "data" / "comunas_master.parquet"
# Configurable vía env var; por defecto en backend/data/ para Railway volumes
PATH_MANZANAS = Path(os.environ.get("MANZANAS_PATH", str(BASE_DIR / "data" / "manzanas.parquet")))

# --- CARGA INICIAL ---
if not DATA_PATH.exists():
    raise FileNotFoundError(f"No encontrado: {DATA_PATH}. Ejecuta preprocesar.py primero.")

print("Cargando distritos...")
GDF_DISTRITOS = gpd.read_parquet(DATA_PATH)
print(f"  OK: {len(GDF_DISTRITOS)} distritos")

GDF_COMUNAS = None
if COMUNAS_PATH.exists():
    print("Cargando comunas...")
    GDF_COMUNAS = gpd.read_parquet(COMUNAS_PATH)
    print(f"  OK: {len(GDF_COMUNAS)} comunas")
else:
    print("AVISO: comunas_master.parquet no encontrado. Ejecuta preprocesar.py para habilitar el nivel Comunal.")


# --- ENDPOINTS GEOGRÁFICOS ---

@app.get("/api/geo/distritos")
def get_distritos(
    minx: float = Query(None), miny: float = Query(None),
    maxx: float = Query(None), maxy: float = Query(None)
):
    try:
        if all(v is not None for v in [minx, miny, maxx, maxy]):
            gdf_visible = GDF_DISTRITOS.cx[minx:maxx, miny:maxy]
        else:
            gdf_visible = GDF_DISTRITOS
        return json.loads(gdf_visible.to_json())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/geo/comunas")
def get_comunas(
    minx: float = Query(None), miny: float = Query(None),
    maxx: float = Query(None), maxy: float = Query(None)
):
    if GDF_COMUNAS is None:
        raise HTTPException(status_code=503, detail="Datos comunales no disponibles. Ejecuta preprocesar.py.")
    try:
        if all(v is not None for v in [minx, miny, maxx, maxy]):
            gdf_visible = GDF_COMUNAS.cx[minx:maxx, miny:maxy]
        else:
            gdf_visible = GDF_COMUNAS
        return json.loads(gdf_visible.to_json())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/geo/manzanas")
def get_manzanas(
    minx: float = Query(...), miny: float = Query(...),
    maxx: float = Query(...), maxy: float = Query(...)
):
    """Retorna manzanas para el bbox visible. Solo viable con zoom alto (>= 13)."""
    if not PATH_MANZANAS.exists():
        raise HTTPException(
            status_code=503,
            detail="Datos de manzanas no disponibles en este servidor. Monta el archivo via Railway Volume en MANZANAS_PATH."
        )
    try:
        # Determinar qué comunas caen en el bbox usando los distritos ya cargados
        gdf_dist_visible = GDF_DISTRITOS.cx[minx:maxx, miny:maxy]
        if gdf_dist_visible.empty:
            return {"type": "FeatureCollection", "features": []}

        comunas_visibles = gdf_dist_visible['COMUNA'].unique().tolist()

        # Leer solo las manzanas de esas comunas (predicate pushdown)
        df_mz = pd.read_parquet(
            PATH_MANZANAS,
            filters=[('COMUNA', 'in', comunas_visibles)]
        )
        if df_mz.empty:
            return {"type": "FeatureCollection", "features": []}

        df_mz['geometry'] = df_mz['SHAPE'].apply(lambda x: wkb.loads(x))
        gdf_mz = gpd.GeoDataFrame(df_mz, geometry='geometry', crs="EPSG:4326")

        # Filtro exacto por bbox
        gdf_mz = gdf_mz.cx[minx:maxx, miny:maxy]

        # Simplificación ligera para web
        gdf_mz['geometry'] = gdf_mz['geometry'].simplify(0.0001, preserve_topology=True)

        cols_finales = [c for c in gdf_mz.columns if c not in ['SHAPE', 'SHAPE_bbox']]
        return json.loads(gdf_mz[cols_finales].to_json())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- ENDPOINTS DE USUARIO ---

@app.post("/api/usuario/columnas")
async def obtener_columnas(file: UploadFile = File(...)):
    """Recibe un archivo CSV o Excel y retorna sus nombres de columnas."""
    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df_head = pd.read_csv(io.BytesIO(contents), nrows=0)
            row_count = max(0, sum(1 for _ in io.BytesIO(contents)) - 1)  # -1 por header
        else:
            df_head = pd.read_excel(io.BytesIO(contents), nrows=0)
            df_count = pd.read_excel(io.BytesIO(contents), usecols=[0])
            row_count = len(df_count)
        return {"columnas": df_head.columns.tolist(), "total_filas": row_count}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al leer archivo: {str(e)}")


@app.post("/api/usuario/geocodificar")
async def geocodificar_archivo(
    file: UploadFile = File(...),
    columnas_direccion: str = Form(...)
):
    try:
        cols_to_use = json.loads(columnas_direccion)

        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))

        for col in cols_to_use:
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"Columna '{col}' no encontrada.")

        df['full_address'] = df[cols_to_use].astype(str).agg(', '.join, axis=1) + ", Chile"

        geolocator = Nominatim(user_agent="visualizador_censo_chile_2024", timeout=10)
        geocode = RateLimiter(geolocator.geocode, min_delay_seconds=1.1, max_retries=2)

        df_sample = df.head(100).copy()
        print(f"Geocodificando {len(df_sample)} registros...")

        # run_in_threadpool evita bloquear el event loop durante la geocodificación
        def _geocode_blocking():
            df_sample['location'] = df_sample['full_address'].apply(geocode)
            df_sample['lat'] = df_sample['location'].apply(lambda loc: loc.latitude if loc else None)
            df_sample['lon'] = df_sample['location'].apply(lambda loc: loc.longitude if loc else None)
            result = df_sample.dropna(subset=['lat', 'lon'])
            return result.drop(columns=['location', 'full_address'])

        df_final = await run_in_threadpool(_geocode_blocking)

        return df_final.to_dict(orient="records")

    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="'columnas_direccion' debe ser un JSON Array.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# --- ENDPOINT DE ADMIN (carga de archivos al Volume) ---

@app.post("/admin/upload-manzanas")
async def upload_manzanas(request: Request, file: UploadFile = File(...)):
    """
    Carga manzanas.parquet al Railway Volume.
    Requiere header X-Admin-Token con el valor de la env var ADMIN_TOKEN.
    Deshabilitar una vez cargado el archivo (remover o proteger con firewall).
    """
    admin_token = os.environ.get("ADMIN_TOKEN")
    if not admin_token or request.headers.get("X-Admin-Token") != admin_token:
        raise HTTPException(status_code=403, detail="Token de administrador inválido.")

    PATH_MANZANAS.parent.mkdir(parents=True, exist_ok=True)

    def _save():
        with open(PATH_MANZANAS, "wb") as f:
            shutil.copyfileobj(file.file, f)

    await run_in_threadpool(_save)

    size_mb = round(PATH_MANZANAS.stat().st_size / 1024 / 1024, 1)
    return {"ok": True, "ruta": str(PATH_MANZANAS), "tamaño_mb": size_mb}


# --- FRONTEND ESTÁTICO ---

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

FRONTEND_DIR = BASE_DIR.parent / "frontend" / "dist"
if FRONTEND_DIR.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        return FileResponse(FRONTEND_DIR / "index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
