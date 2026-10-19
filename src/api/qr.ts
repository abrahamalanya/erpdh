import { apiFetchBlob } from './client';

/** Genera un QR (PNG) a partir de una URL. Solo sistemas/administrador_general (ver backend). */
export function generarQr(url: string): Promise<Blob> {
  return apiFetchBlob(`/qr/generar?url=${encodeURIComponent(url)}`);
}
