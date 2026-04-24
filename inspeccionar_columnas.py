import pandas as pd

def inspeccion_limpia(file_path):
    # Cargamos solo la primera fila para obtener los nombres de columnas
    df = pd.read_parquet(file_path)
    
    # Filtrar columnas para el print (quitamos lo pesado/geográfico)
    columnas_totales = df.columns.tolist()
    columnas_datos = [c for c in columnas_totales if c not in ['SHAPE', 'SHAPE_bbox']]
    
    print(f"\n--- COLUMNAS DETECTADAS EN {file_path} ---\n")
    print(f"Total de columnas: {len(columnas_totales)}")
    
    # Agrupamos las columnas para que sean fáciles de leer
    # Buscamos patrones comunes en censos (n_, prom_, total_)
    demograficas = [c for c in columnas_datos if c.startswith(('n_', 'prom_', 'total_', 'p_'))]
    geograficas = [c for c in columnas_datos if c not in demograficas]

    print("📍 Identificadores y Geografía:")
    print(geograficas)

    print("\n📊 Variables Censales (Datos de interés):")
    for col in demograficas:
        # Mostramos el nombre y el rango de valores para confirmar que hay datos
        min_v = df[col].min()
        max_v = df[col].max()
        print(f" - {col.ljust(30)} | Rango: [{min_v} a {max_v}]")

# Ejecución
inspeccion_limpia('datos_censo/Cartografia_censo2024_Pais_Manzanas.parquet')