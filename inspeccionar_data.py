import pandas as pd
import geopandas as gpd
from shapely import wkb

def inspeccion_profunda_censo(file_path):
    print(f"--- Análisis Técnico: {file_path} ---\n")
    
    # 1. Carga inicial con Pandas
    df = pd.read_parquet(file_path)
    
    # 2. Análisis de Columnas Numéricas (Buscando datos censales)
    # Filtramos int y float, excluyendo IDs conocidos
    ignorar = ['OBJECTID', 'CUT', 'COD_REGION', 'COD_PROVINCIA', 'COD_DISTRITO', 'ID_DISTRITO']
    columnas_numericas = df.select_dtypes(include=['number']).columns
    datos_potenciales = [c for c in columnas_numericas if c not in ignorar]
    
    print(f"📊 Columnas con datos numéricos (Potencial Censal):")
    if datos_potenciales:
        for col in datos_potenciales:
            print(f"   - {col}: [Min: {df[col].min()} | Max: {df[col].max()} | Mean: {df[col].mean():.2f}]")
    else:
        print("   ⚠️ No se detectaron columnas de datos (solo identificadores geográficos).")

    # 3. Validación de Geometría con GeoPandas
    print(f"\n🌍 Validación Geográfica (SHAPE):")
    try:
        # Intentamos convertir el binario SHAPE a geometría de Shapely
        df['geometry'] = df['SHAPE'].apply(lambda x: wkb.loads(x))
        gdf = gpd.GeoDataFrame(df, geometry='geometry', crs="EPSG:4326")
        
        print(f"   - Tipo de geometría: {gdf.geometry.type.unique()}")
        print(f"   - Sistema de Coordenadas (CRS): {gdf.crs}")
        print(f"   - Geometría válida: {gdf.geometry.is_valid.all()}")
        
        # Verificamos si hay nulos en la geometría
        nulos_geo = gdf.geometry.isnull().sum()
        print(f"   - Registros sin geometría: {nulos_geo}")
        
    except Exception as e:
        print(f"   ❌ Error procesando SHAPE: {e}")

    return df.columns.tolist()

# Ejecutar
inspeccion_profunda_censo('datos_censo/Cartografia_censo2024_Pais_Distrital.parquet')