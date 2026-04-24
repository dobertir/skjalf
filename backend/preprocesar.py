import pandas as pd
import geopandas as gpd
from shapely import wkb
import os

PATH_MANZANAS    = r"C:\Users\ricar\Codigos\Miscelaneos\visualizador_geografico\datos_censo\Cartografia_censo2024_Pais_Manzanas.parquet"
PATH_DISTRITAL   = r"C:\Users\ricar\Codigos\Miscelaneos\visualizador_geografico\datos_censo\Cartografia_censo2024_Pais_Distrital.parquet"
PATH_COMUNAL     = r"C:\Users\ricar\Codigos\Miscelaneos\visualizador_geografico\datos_censo\Cartografia_censo2024_Pais_Comunal.parquet"
OUT_DISTRITOS    = r"C:\Users\ricar\Codigos\Miscelaneos\visualizador_geografico\backend\data\distritos_master.parquet"
OUT_COMUNAS      = r"C:\Users\ricar\Codigos\Miscelaneos\visualizador_geografico\backend\data\comunas_master.parquet"

os.makedirs(r"C:\Users\ricar\Codigos\Miscelaneos\visualizador_geografico\backend\data", exist_ok=True)


def preprocesar_distritos():
    print("📖 Cargando manzanas para agregar a nivel distrital...")
    df_mz = pd.read_parquet(PATH_MANZANAS)

    cols_numericas = [c for c in df_mz.columns if c.startswith(('n_', 'prom_'))]
    agg_logic = {c: ('mean' if c.startswith('prom_') else 'sum') for c in cols_numericas}

    print("📊 Agregando a nivel distrital...")
    df_dist_stats = df_mz.groupby('ID_DISTRITO').agg(agg_logic).reset_index()

    print("🌍 Cargando cartografía distrital...")
    df_dist_geo = pd.read_parquet(PATH_DISTRITAL)

    master = df_dist_geo.merge(df_dist_stats, on='ID_DISTRITO', how='left')

    print("📐 Convirtiendo y simplificando geometrías distritales...")
    master['geometry'] = master['SHAPE'].apply(lambda x: wkb.loads(x))
    gdf = gpd.GeoDataFrame(master, geometry='geometry', crs="EPSG:4326")
    gdf['geometry'] = gdf['geometry'].simplify(0.001, preserve_topology=True)

    columnas_finales = [c for c in gdf.columns if c not in ['SHAPE', 'SHAPE_bbox']]
    gdf[columnas_finales].to_parquet(OUT_DISTRITOS, index=False)

    print(f"✅ distritos_master.parquet — {len(gdf)} distritos, {len(cols_numericas)} variables")


def preprocesar_comunas():
    print("\n📖 Cargando manzanas para agregar a nivel comunal...")
    df_mz = pd.read_parquet(PATH_MANZANAS)

    cols_numericas = [c for c in df_mz.columns if c.startswith(('n_', 'prom_'))]
    agg_logic = {c: ('mean' if c.startswith('prom_') else 'sum') for c in cols_numericas}

    print("📊 Agregando a nivel comunal por CUT...")
    # Preservar campos de identificación junto con CUT
    id_extra = ['COD_REGION', 'REGION', 'COD_PROVINCIA', 'PROVINCIA', 'COMUNA']
    id_cols_available = [c for c in id_extra if c in df_mz.columns]
    df_ids = df_mz.groupby('CUT')[id_cols_available].first().reset_index()
    df_stats = df_mz.groupby('CUT').agg(agg_logic).reset_index()
    df_com_stats = df_ids.merge(df_stats, on='CUT')

    print("🌍 Cargando cartografía comunal...")
    df_com_geo = pd.read_parquet(PATH_COMUNAL)

    master = df_com_geo.merge(df_com_stats, on='CUT', how='left')

    print("📐 Convirtiendo y simplificando geometrías comunales...")
    master['geometry'] = master['SHAPE'].apply(lambda x: wkb.loads(x))
    gdf = gpd.GeoDataFrame(master, geometry='geometry', crs="EPSG:4326")
    gdf['geometry'] = gdf['geometry'].simplify(0.001, preserve_topology=True)

    columnas_finales = [c for c in gdf.columns if c not in ['SHAPE', 'SHAPE_bbox']]
    gdf[columnas_finales].to_parquet(OUT_COMUNAS, index=False)

    print(f"✅ comunas_master.parquet — {len(gdf)} comunas, {len(cols_numericas)} variables")


if __name__ == "__main__":
    preprocesar_distritos()
    preprocesar_comunas()
    print("\n🎉 Preprocesamiento completo.")
