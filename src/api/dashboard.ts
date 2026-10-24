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

/** Modo de agrupación del gráfico Cobranza vs. Desembolso. Espeja `DashboardService::AGRUPACIONES`. */
export type DashboardAgrupacion = 'agencia' | 'asesor' | 'tipo_credito' | 'agencia_tipo_credito';

export interface DashboardGraficoFilaAgencia {
  agencia_id: number;
  agencia_nombre: string;
  cobranza: DashboardTotal;
  desembolso: DashboardTotal;
}

export interface DashboardGraficoFilaAsesor {
  asesor_id: number;
  asesor_nombre: string;
  cobranza: DashboardTotal;
  desembolso: DashboardTotal;
}

export interface DashboardGraficoFilaTipo {
  tipo_credito: DashboardTipoFiltro;
  cobranza: DashboardTotal;
  desembolso: DashboardTotal;
}

export interface DashboardGraficoFilaAgenciaTipo {
  agencia_id: number;
  agencia_nombre: string;
  cobranza: DashboardTotal;
  desembolso: DashboardTotal;
  tipos: DashboardGraficoFilaTipo[];
}

export type DashboardGrafico =
  | { fecha: string; agrupado_por: 'agencia'; filas: DashboardGraficoFilaAgencia[] }
  | { fecha: string; agrupado_por: 'asesor'; filas: DashboardGraficoFilaAsesor[] }
  | { fecha: string; agrupado_por: 'tipo_credito'; filas: DashboardGraficoFilaTipo[] }
  | { fecha: string; agrupado_por: 'agencia_tipo_credito'; filas: DashboardGraficoFilaAgenciaTipo[] };

export interface DashboardGraficoFilters extends DashboardResumenFilters {
  agrupar_por?: DashboardAgrupacion;
}

/**
 * Cobranza vs. desembolso del día agrupados para comparar entre agencias,
 * asesores o tipos de crédito a la vez — a diferencia de getDashboardResumen,
 * que da un solo total para el ámbito ya filtrado. Mismos filtros.
 */
export function getDashboardGrafico(filters: DashboardGraficoFilters = {}) {
  const params = new URLSearchParams();

  if (filters.agencia_id) params.set('agencia_id', String(filters.agencia_id));
  if (filters.asesor_id) params.set('asesor_id', String(filters.asesor_id));
  if (filters.tipo_credito) params.set('tipo_credito', filters.tipo_credito);
  if (filters.agrupar_por) params.set('agrupar_por', filters.agrupar_por);

  const query = params.toString();

  return apiFetch<ApiResponse<DashboardGrafico>>(`/dashboard/grafico-cobranza-desembolso${query ? `?${query}` : ''}`);
}

/** Saldo pendiente y cantidad de créditos de un tipo dentro de la cartera activa (activo + vencido). */
export interface DashboardCarteraTipo {
  tipo_credito: TipoCredito;
  saldo: number;
  cantidad: number;
}

export interface DashboardCartera {
  filas: DashboardCarteraTipo[];
}

/**
 * Composición de la cartera activa (créditos activo + vencido, no solo la
 * mora) por tipo de crédito — vista de stock, a diferencia de
 * getDashboardGrafico (flujo del día). Las ventas de tienda no tienen cuotas,
 * así que no entran: el filtro `tipo_credito=ventas` deja los 4 tipos en 0.
 */
export function getDashboardCarteraActivaPorTipo(filters: DashboardResumenFilters = {}) {
  const params = new URLSearchParams();

  if (filters.agencia_id) params.set('agencia_id', String(filters.agencia_id));
  if (filters.asesor_id) params.set('asesor_id', String(filters.asesor_id));
  if (filters.tipo_credito) params.set('tipo_credito', filters.tipo_credito);

  const query = params.toString();

  return apiFetch<ApiResponse<DashboardCartera>>(`/dashboard/cartera-activa-por-tipo${query ? `?${query}` : ''}`);
}

/** Monto y cantidad de créditos generados (desembolsados) de un tipo, dentro de la producción de un asesor. */
export interface DashboardProduccionTipo {
  tipo_credito: TipoCredito;
  monto: number;
  cantidad: number;
}

export interface DashboardProduccionAsesor {
  asesor_id: number;
  asesor_nombre: string;
  total: number;
  cantidad: number;
  tipos: DashboardProduccionTipo[];
}

export interface DashboardProduccion {
  desde: string;
  hasta: string;
  filas: DashboardProduccionAsesor[];
}

export interface DashboardProduccionFilters extends DashboardResumenFilters {
  desde?: string;
  hasta?: string;
}

/**
 * Créditos generados (= efectivamente desembolsados) por asesor y tipo de
 * crédito, en un período — a diferencia del resto de Inicio (siempre "hoy"),
 * este gráfico analiza un rango propio (desde/hasta), default mes en curso.
 */
export function getDashboardProduccionPorAsesor(filters: DashboardProduccionFilters = {}) {
  const params = new URLSearchParams();

  if (filters.desde) params.set('desde', filters.desde);
  if (filters.hasta) params.set('hasta', filters.hasta);
  if (filters.agencia_id) params.set('agencia_id', String(filters.agencia_id));
  if (filters.asesor_id) params.set('asesor_id', String(filters.asesor_id));
  if (filters.tipo_credito) params.set('tipo_credito', filters.tipo_credito);

  const query = params.toString();

  return apiFetch<ApiResponse<DashboardProduccion>>(`/dashboard/produccion-por-asesor${query ? `?${query}` : ''}`);
}

export interface DashboardAvanceAsesor {
  asesor_id: number;
  asesor_nombre: string;
  agencia_id: number;
  agencia_nombre: string | null;
  programado: number;
  cobrado: number;
  pendiente: number;
  /** null cuando no hay nada programado hoy — no confundir con 0%. */
  porcentaje: number | null;
}

export interface DashboardAvanceCobranza {
  fecha: string;
  filas: DashboardAvanceAsesor[];
}

/**
 * Avance de cobranza de HOY por asesor: cuánto debía cobrar (cuotas que
 * vencen hoy, no la mora acumulada — eso lo muestra la Ruta de Cobranza),
 * cuánto cobró y cuánto le falta. A diferencia de los demás desgloses por
 * asesor, lista a TODOS los asesores visibles aunque no tengan nada
 * programado hoy (porcentaje null en ese caso).
 */
export function getDashboardAvanceCobranzaHoy(filters: DashboardResumenFilters = {}) {
  const params = new URLSearchParams();

  if (filters.agencia_id) params.set('agencia_id', String(filters.agencia_id));
  if (filters.asesor_id) params.set('asesor_id', String(filters.asesor_id));

  const query = params.toString();

  return apiFetch<ApiResponse<DashboardAvanceCobranza>>(`/dashboard/avance-cobranza-hoy${query ? `?${query}` : ''}`);
}
