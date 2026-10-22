/**
 * Límites de los adjuntos de imagen: espejo de la validación del backend
 * (`max:8192` KB por archivo; `fotos_adicionales` hasta 10) y de
 * `umax-app/src/utils/adjuntos.ts` — mismos límites en los tres lugares.
 */

export const MAX_ADJUNTO_BYTES = 8 * 1024 * 1024;

/** Igual que el `mimes:jpg,jpeg,png,webp,pdf` del backend. */
export const TIPOS_COMPROBANTE = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
/** Igual que el `mimes:jpg,jpeg,png,webp` de `fotos_adicionales`. */
export const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];

/** Igual que el `mimetypes:...` de StoreBienRequest/StoreDesembolsoEvidenciaRequest (backend). */
export const TIPOS_VIDEO = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
/** Mismo tope que el backend: `max:51200` (KB) = 50MB. */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** Tope del backend: `fotos_adicionales.* max:10`. */
export const MAX_FOTOS_ADICIONALES = 10;

export const NOMBRE_TIPO: Record<string, string> = {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
  'application/pdf': 'PDF',
  'video/mp4': 'MP4',
  'video/quicktime': 'MOV',
  'video/x-msvideo': 'AVI',
  'video/webm': 'WEBM',
};

export interface LimitesAdjunto {
  tipos: string[];
  maxBytes: number;
}

/** Algunos navegadores/dispositivos reportan `image/jpg`, que el backend acepta como jpg. */
function normalizarTipo(tipo: string): string {
  return tipo === 'image/jpg' ? 'image/jpeg' : tipo;
}

function formatearBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Etiqueta legible de los formatos admitidos, p. ej. "JPG, PNG o WEBP". */
export function etiquetaTipos(tipos: string[]): string {
  const nombres = tipos.map((t) => NOMBRE_TIPO[t] ?? t);
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} o ${nombres[nombres.length - 1]}`;
}

/** Mensaje de error si el adjunto no cumple los límites, o null si está bien. */
export function validarAdjunto(file: File, limites: LimitesAdjunto): string | null {
  const tipo = normalizarTipo(file.type);

  if (!limites.tipos.includes(tipo)) {
    return `Formato no admitido. Usa ${etiquetaTipos(limites.tipos)}.`;
  }

  if (file.size > limites.maxBytes) {
    return `El archivo pesa ${formatearBytes(file.size)} y el máximo es ${formatearBytes(limites.maxBytes)}.`;
  }

  return null;
}

/** Límites listos para pasar a `PhotoField`/`MultiPhotoField`. */
export const LIMITES_COMPROBANTE: LimitesAdjunto = {
  tipos: TIPOS_COMPROBANTE,
  maxBytes: MAX_ADJUNTO_BYTES,
};

export const LIMITES_FOTO: LimitesAdjunto = {
  tipos: TIPOS_FOTO,
  maxBytes: MAX_ADJUNTO_BYTES,
};

export const LIMITES_VIDEO_EVIDENCIA: LimitesAdjunto = {
  tipos: TIPOS_VIDEO,
  maxBytes: MAX_VIDEO_BYTES,
};
