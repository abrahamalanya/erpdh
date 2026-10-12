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
  numero_documento: string | null;
  direccion: string | null;
  referencia: string | null;
  latitud: number | null;
  longitud: number | null;
  dias_atraso_max: number;
  creditos_vencidos: number;
  credito_codigos: string[];
  creditos: RutaCreditoItem[];
  /** Asesor dueño del cliente: distinto del que arma la ruta cuando la parada fue clonada. */
  asesor_id: number;
  /** La parada se copió desde la ruta de otro asesor — solo pasa en la ruta propia de un supervisor. */
  clonado: boolean;
  /** La parada ya está en la ruta del actor; al mirar la ruta de un asesor dice si ya la copiaste. */
  en_mi_ruta: boolean;
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

export interface TrazadoRuta {
  /** [lat, lng] en orden de visita, siguiendo las calles; con < 2 paradas trae 0 o 1 punto. */
  trazado: [number, number][];
  distancia_m: number;
  /** En vehículo. */
  duracion_s: number;
  /** Algún tramo no se pudo trazar y quedó en línea recta. */
  aproximado: boolean;
}

/**
 * Recorrido por calles (OpenRouteService, cacheado en el backend) de la misma
 * ruta que devuelve getRutaCobranza(), con los mismos filtros y permisos.
 */
export function getTrazadoRutaCobranza(asesorId?: number, tipoCredito?: TipoCredito) {
  const params = new URLSearchParams();
  if (asesorId) params.set('asesor_id', String(asesorId));
  if (tipoCredito) params.set('tipo_credito', tipoCredito);

  const query = params.toString();
  return apiFetch<ApiResponse<TrazadoRuta>>(`/rutas-cobranza/trazado${query ? `?${query}` : ''}`);
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

/**
 * Copia un cliente a la ruta propia del actor (la del supervisor), al final de
 * la ruta de `tipoCredito`: el supervisor arma su ruta de visita con paradas de
 * las rutas de sus asesores. El cliente no sale de la cartera ni de la ruta de
 * su asesor. Devuelve la ruta propia ya actualizada.
 */
export function clonarClienteRutaCobranza(clienteId: number, tipoCredito?: TipoCredito) {
  return apiFetch<ApiResponse<RutaClienteItem[]>>(`/rutas-cobranza/clientes/${clienteId}/clonar`, {
    method: 'POST',
    body: JSON.stringify({ tipo_credito: tipoCredito }),
  });
}

/**
 * Quita una parada clonada de la ruta propia del actor (solo supervisor: los
 * clientes de su cartera se agregan solos al entrar en mora). Devuelve la ruta
 * propia ya actualizada.
 */
export function quitarClienteRutaCobranza(clienteId: number, tipoCredito?: TipoCredito) {
  return apiFetch<ApiResponse<RutaClienteItem[]>>(`/rutas-cobranza/clientes/${clienteId}`, {
    method: 'DELETE',
    body: JSON.stringify({ tipo_credito: tipoCredito }),
  });
}
