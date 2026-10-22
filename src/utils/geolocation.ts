export interface UbicacionCapturada {
  latitud: number;
  longitud: number;
  precision_metros: number | null;
  capturado_en: string;
}

/**
 * Pide permiso y lee la ubicación actual una sola vez (sin mapa, sin edición
 * manual) — mismo patrón de `navigator.geolocation.getCurrentPosition` que ya
 * usa `LocationMap.tsx`, pero leyendo también `coords.accuracy` (que ese
 * componente no necesita). Pensado para evidencia donde el usuario no debe
 * poder alterar las coordenadas capturadas.
 */
export function capturarUbicacionActual(): Promise<UbicacionCapturada> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Tu navegador no soporta geolocalización.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitud: pos.coords.latitude,
          longitud: pos.coords.longitude,
          precision_metros: pos.coords.accuracy ?? null,
          capturado_en: new Date(pos.timestamp).toISOString(),
        });
      },
      (err) => reject(new Error(err.message || 'No se pudo obtener tu ubicación.')),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}
