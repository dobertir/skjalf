# backend/utils_geo.py
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter
import pandas as pd

def geocodificar_columna(df, nombre_columna):
    """
    Toma un DataFrame y una columna de texto, devuelve el DF con lat/lon.
    """
    # 1. Configurar el geocodificador (Nominatim es gratuito pero limitado)
    geolocator = Nominatim(user_agent="visualizador_geografico_chile")
    
    # 2. RateLimiter evita que nos bloqueen la IP (máximo 1 petición por segundo)
    geocode = RateLimiter(geolocator.geocode, min_delay_seconds=1.1)

    # Copiamos para no modificar el original
    df_result = df.copy()
    
    # Optimizamos la dirección para Chile
    df_result['direccion_full'] = df_result[nombre_columna].astype(str) + ", Chile"

    print(f"Buscando coordenadas para {len(df_result)} filas...")
    
    # 3. Aplicar geocodificación
    # Limitamos a 50 para el prototipo para no esperar demasiado
    df_result = df_result.head(50) 
    df_result['location'] = df_result['direccion_full'].apply(geocode)
    
    # 4. Extraer Latitud y Longitud
    df_result['lat'] = df_result['location'].apply(lambda loc: loc.latitude if loc else None)
    df_result['lon'] = df_result['location'].apply(lambda loc: loc.longitude if loc else None)
    
    # Limpiamos columnas auxiliares
    return df_result.drop(columns=['location', 'direccion_full'])