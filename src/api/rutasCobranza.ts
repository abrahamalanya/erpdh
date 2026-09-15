import { apiFetch } from './client';
import type { ApiResponse } from '../types/api';

export interface AsesorRuta {
  id: number;
  nombre: string;
  apellido: string;
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
}

/** La ruta de cobranza del asesor autenticado, o la de `asesorId` si el actor puede verla. */
export function getRutaCobranza(asesorId?: number) {
  const query = asesorId ? `?asesor_id=${asesorId}` : '';
  return apiFetch<ApiResponse<RutaClienteItem[]>>(`/rutas-cobranza${query}`);
}

/** Asesores visibles para el actor — para el selector del mapa de ruta. */
export function getAsesoresRuta() {
  return apiFetch<ApiResponse<AsesorRuta[]>>('/rutas-cobranza/asesores');
}

/** Reordena la ruta propia del actor — `clienteIds` es la lista completa en el nuevo orden. */
export function reordenarRutaCobranza(clienteIds: number[]) {
  return apiFetch<ApiResponse<RutaClienteItem[]>>('/rutas-cobranza/reordenar', {
    method: 'POST',
    body: JSON.stringify({ cliente_ids: clienteIds }),
  });
}
