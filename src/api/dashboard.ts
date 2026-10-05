import { apiFetch } from './client';
import type { ApiResponse, TipoCredito, TipoDocumento } from '../types/api';

export interface ClienteMapa {
  id: number;
  nombre: string;
  apellido: string;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  direccion: string | null;
  referencia: string | null;
  latitud: number;
  longitud: number;
  tiene_credito_activo: boolean;
  fecha_vencimiento_credito: string | null;
}

export function getMapaClientes() {
  return apiFetch<ApiResponse<ClienteMapa[]>>('/dashboard/mapa-clientes');
}

/**
 * `ventas` no es un tipo de crédito: son las ventas de tienda, que también
 * cuentan como cobranza. El backend acepta ambas cosas en el mismo filtro
 * (`DashboardService::TIPOS`).
 */
export type DashboardTipoFiltro = TipoCredito | 'ventas';

/** Total y número de operaciones de una de las dos magnitudes del día. */
export interface DashboardTotal {
  total: number;
  cantidad: number;
}

export interface DashboardResumen {
  /** Día al que corresponden los totales (YYYY-MM-DD), tal como lo calculó el backend. */
  fecha: string;
  cobranza: DashboardTotal;
  desembolso: DashboardTotal;
  /** Diferencia del día. Va en negativo cuando se desembolsó más de lo que se cobró. */
  neto: number;
}

export interface DashboardResumenFilters {
  agencia_id?: number;
  asesor_id?: number;
  tipo_credito?: DashboardTipoFiltro;
}

/**
 * Totales del día de cobranzas y desembolsos. Los tres filtros son opcionales
 * y solo recortan: el alcance ya viene acotado por la jerarquía del actor, así
 * que un filtro nunca amplía lo que la persona puede ver.
 */
export function getDashboardResumen(filters: DashboardResumenFilters = {}) {
  const params = new URLSearchParams();

  if (filters.agencia_id) params.set('agencia_id', String(filters.agencia_id));
  if (filters.asesor_id) params.set('asesor_id', String(filters.asesor_id));
  if (filters.tipo_credito) params.set('tipo_credito', filters.tipo_credito);

  const query = params.toString();

  return apiFetch<ApiResponse<DashboardResumen>>(`/dashboard/resumen${query ? `?${query}` : ''}`);
}
