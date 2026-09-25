import { apiFetch } from './client';
import type { ApiResponse, TipoCredito } from '../types/api';

/** Tipos de crédito por los que se recorre la ruta de cobranza, en el orden en que se ofrecen como filtro. */
export const TIPOS_RUTA_COBRANZA: TipoCredito[] = ['diario', 'prendario', 'hipotecario', 'vehicular'];

export interface AsesorRuta {
  id: number;
  nombre: string;
  apellido: string;
}

export interface RutaCreditoItem {
  id: number;
  codigo: string;
  tipo_credito: TipoCredito;
}

export interface RutaClienteItem {
  orden: number;
  cliente_id: number;
  nombre: string;
  apellido: string;
  direccion: string | null;
  referencia: string | null;
  latitud: number | null;
  longitud: number | null;
  dias_atraso_max: number;
  creditos_vencidos: number;
  credito_codigos: string[];
  creditos: RutaCreditoItem[];
}

/**
 * La ruta de cobranza del asesor autenticado, o la de `asesorId` si el actor
 * puede verla. Con `tipoCredito` es la ruta de ese tipo de crédito (con su
 * propio orden); sin él, la general.
 */
export function getRutaCobranza(asesorId?: number, tipoCredito?: TipoCredito) {
  const params = new URLSearchParams();
  if (asesorId) params.set('asesor_id', String(asesorId));
  if (tipoCredito) params.set('tipo_credito', tipoCredito);

  const query = params.toString();
  return apiFetch<ApiResponse<RutaClienteItem[]>>(`/rutas-cobranza${query ? `?${query}` : ''}`);
}

/** Asesores visibles para el actor — para el selector del mapa de ruta. */
export function getAsesoresRuta() {
  return apiFetch<ApiResponse<AsesorRuta[]>>('/rutas-cobranza/asesores');
}

/** Reordena la ruta propia del actor — `clienteIds` es la lista completa en el nuevo orden, de la ruta de `tipoCredito` (o la general). */
export function reordenarRutaCobranza(clienteIds: number[], tipoCredito?: TipoCredito) {
  return apiFetch<ApiResponse<RutaClienteItem[]>>('/rutas-cobranza/reordenar', {
    method: 'POST',
    body: JSON.stringify({ cliente_ids: clienteIds, tipo_credito: tipoCredito }),
  });
}
