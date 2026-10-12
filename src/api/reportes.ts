import { apiFetch, apiFetchBlob } from './client';
import type {
  ApiResponse,
  AtrasosDiariosItem,
  CajaAperturaCierreItem,
  CajaCicloDetalle,
  CobranzaDiariaItem,
  MedioInyeccion,
  MovimientoReporteItem,
  ReporteCobranzaAnual,
  ReporteCobranzaMensual,
  ReporteCumpleanosItem,
  ReporteFlujoCaja,
  ReporteFlujoCajaAnual,
  ReporteFlujoCajaMensual,
  ReportePlanillaResumen,
  ReporteIngresosEgresos,
  ReportePlanilla,
} from '../types/api';

function movimientosDineroQuery(desde?: string, hasta?: string, medio?: MedioInyeccion, bovedaId?: number): string {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  if (medio) params.set('medio', medio);
  if (bovedaId) params.set('boveda_id', String(bovedaId));
  const query = params.toString();

  return query ? `?${query}` : '';
}

export function listMovimientosDinero(desde?: string, hasta?: string, medio?: MedioInyeccion, bovedaId?: number) {
  return apiFetch<ApiResponse<MovimientoReporteItem[]>>(
    `/reportes/movimientos-dinero${movimientosDineroQuery(desde, hasta, medio, bovedaId)}`
  );
}

export function getReporteMovimientosDineroPdf(desde?: string, hasta?: string, medio?: MedioInyeccion, bovedaId?: number) {
  return apiFetchBlob(`/reportes/movimientos-dinero/pdf${movimientosDineroQuery(desde, hasta, medio, bovedaId)}`);
}

export function getReporteMovimientosDineroExcel(desde?: string, hasta?: string, medio?: MedioInyeccion, bovedaId?: number) {
  return apiFetchBlob(`/reportes/movimientos-dinero/excel${movimientosDineroQuery(desde, hasta, medio, bovedaId)}`);
}

/** Cobranza diaria: clientes con una cuota vencida u hoy — un crédito con 2 filas si el cliente tiene 2 créditos. */
export function getReporteCobranzaDiaria() {
  return apiFetch<ApiResponse<CobranzaDiariaItem[]>>('/reportes/cobranza-diaria');
}

export function getReporteCobranzaDiariaPdf() {
  return apiFetchBlob('/reportes/cobranza-diaria/pdf');
}

export function getReporteCobranzaDiariaExcel() {
  return apiFetchBlob('/reportes/cobranza-diaria/excel');
}

/** Cobranza mensual: cobranza y desembolsos por día del mes — solo administrador_general/sistemas. */
export function getReporteCobranzaMensual(mes: string, empresaId?: number, agenciaId?: number, asesorId?: number) {
  const params = new URLSearchParams({ mes });
  if (empresaId) params.set('empresa_id', String(empresaId));
  if (agenciaId) params.set('agencia_id', String(agenciaId));
  if (asesorId) params.set('asesor_id', String(asesorId));

  return apiFetch<ApiResponse<ReporteCobranzaMensual>>(`/reportes/cobranza-mensual?${params.toString()}`);
}

/** Cobranza anual: cobranza y desembolsos por mes (enero a diciembre) del año — solo administrador_general/sistemas. */
export function getReporteCobranzaAnual(anio: number, empresaId?: number, agenciaId?: number, asesorId?: number) {
  const params = new URLSearchParams({ anio: String(anio) });
  if (empresaId) params.set('empresa_id', String(empresaId));
  if (agenciaId) params.set('agencia_id', String(agenciaId));
  if (asesorId) params.set('asesor_id', String(asesorId));

  return apiFetch<ApiResponse<ReporteCobranzaAnual>>(`/reportes/cobranza-mensual/anual?${params.toString()}`);
}

function cajasAperturaCierreQuery(desde?: string, hasta?: string, agenciaId?: number, estado?: string): string {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  if (agenciaId) params.set('agencia_id', String(agenciaId));
  if (estado) params.set('estado', estado);
  const query = params.toString();

  return query ? `?${query}` : '';
}

export function listCajasAperturaCierre(desde?: string, hasta?: string, agenciaId?: number, estado?: string) {
  return apiFetch<ApiResponse<CajaAperturaCierreItem[]>>(
    `/reportes/cajas-apertura-cierre${cajasAperturaCierreQuery(desde, hasta, agenciaId, estado)}`
  );
}

export function getReporteCajasAperturaCierrePdf(desde?: string, hasta?: string, agenciaId?: number, estado?: string) {
  return apiFetchBlob(`/reportes/cajas-apertura-cierre/pdf${cajasAperturaCierreQuery(desde, hasta, agenciaId, estado)}`);
}

export function getReporteCajasAperturaCierreExcel(desde?: string, hasta?: string, agenciaId?: number, estado?: string) {
  return apiFetchBlob(`/reportes/cajas-apertura-cierre/excel${cajasAperturaCierreQuery(desde, hasta, agenciaId, estado)}`);
}

/** Desglose línea por línea de un ciclo — cargado bajo demanda al abrir "Ver detalle". */
export function getCajaCicloDetalle(cicloId: number) {
  return apiFetch<ApiResponse<CajaCicloDetalle>>(`/reportes/cajas-apertura-cierre/${cicloId}/detalle`);
}

function flujoCajaQuery(desde?: string, hasta?: string, agenciaId?: number, asesorId?: number): string {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  if (agenciaId) params.set('agencia_id', String(agenciaId));
  if (asesorId) params.set('asesor_id', String(asesorId));
  const query = params.toString();

  return query ? `?${query}` : '';
}

/** Flujo de caja: saldo en vivo + billetaje/ingresos/egresos/cobranza/desembolsos del rango, por asesor. */
export function getReporteFlujoCaja(desde?: string, hasta?: string, agenciaId?: number, asesorId?: number) {
  return apiFetch<ApiResponse<ReporteFlujoCaja>>(`/reportes/flujo-caja${flujoCajaQuery(desde, hasta, agenciaId, asesorId)}`);
}

/** Flujo de caja anual: mismas 5 categorías por mes (enero a diciembre) — para el gráfico lineal. */
export function getReporteFlujoCajaAnual(anio: number, agenciaId?: number, asesorId?: number) {
  const params = new URLSearchParams({ anio: String(anio) });
  if (agenciaId) params.set('agencia_id', String(agenciaId));
  if (asesorId) params.set('asesor_id', String(asesorId));

  return apiFetch<ApiResponse<ReporteFlujoCajaAnual>>(`/reportes/flujo-caja/anual?${params.toString()}`);
}

/** Flujo de caja mensual: mismas 5 categorías por día del mes — para el gráfico lineal. */
export function getReporteFlujoCajaMensual(mes: string, agenciaId?: number, asesorId?: number) {
  const params = new URLSearchParams({ mes });
  if (agenciaId) params.set('agencia_id', String(agenciaId));
  if (asesorId) params.set('asesor_id', String(asesorId));

  return apiFetch<ApiResponse<ReporteFlujoCajaMensual>>(`/reportes/flujo-caja/mensual?${params.toString()}`);
}

/**
 * Reporte de cumpleaños: desde/hasta son OBLIGATORIOS (el backend los valida con
 * `required|date` y `after_or_equal:desde`), por eso no son opcionales acá. El
 * rango acota el día/mes del cumpleaños dentro de un año, no la fecha de
 * nacimiento literal, así que admite cruzar el cambio de año (20-12 → 05-01).
 * `agencia_id` es un filtro, no una ampliación de alcance: un administrador de
 * agencia sigue viendo solo su agencia, y pedir otra no devuelve filas.
 */
function cumpleanosQuery(desde: string, hasta: string, agenciaId?: number): string {
  const params = new URLSearchParams({ desde, hasta });
  if (agenciaId) params.set('agencia_id', String(agenciaId));

  return `?${params.toString()}`;
}

/** Cumpleaños de los USUARIOS del sistema — exige el permiso `usuarios.ver`. */
export function listCumpleanos(desde: string, hasta: string, agenciaId?: number) {
  return apiFetch<ApiResponse<ReporteCumpleanosItem[]>>(`/reportes/cumpleanos${cumpleanosQuery(desde, hasta, agenciaId)}`);
}

export function getReporteCumpleanosPdf(desde: string, hasta: string, agenciaId?: number) {
  return apiFetchBlob(`/reportes/cumpleanos/pdf${cumpleanosQuery(desde, hasta, agenciaId)}`);
}

export function getReporteCumpleanosExcel(desde: string, hasta: string, agenciaId?: number) {
  return apiFetchBlob(`/reportes/cumpleanos/excel${cumpleanosQuery(desde, hasta, agenciaId)}`);
}

/**
 * Atrasos diarios: una fila por crédito activo o vencido con los dos medidores
 * de mora (vencimiento del crédito completo y cuota vencida impaga más
 * antigua). NO acepta filtros — el backend no tiene FormRequest ni lee query
 * params, el alcance sale de `CreditoHierarchyService::visibleQuery()`; filtrar
 * en el frontend es sobre el array ya cargado.
 *
 * Exige el permiso `creditos_prendarios.ver`.
 */
export function getReporteAtrasosDiarios() {
  return apiFetch<ApiResponse<AtrasosDiariosItem[]>>('/reportes/atrasos-diarios');
}

export function getReporteAtrasosDiariosPdf() {
  return apiFetchBlob('/reportes/atrasos-diarios/pdf');
}

export function getReporteAtrasosDiariosExcel() {
  return apiFetchBlob('/reportes/atrasos-diarios/excel');
}

/** Planilla: mismos permisos que el módulo (`planillas.ver`); el alcance lo filtra el backend. */
export function listReportePlanillas(periodo?: string) {
  const query = periodo ? `?periodo=${encodeURIComponent(periodo)}` : '';
  return apiFetch<ApiResponse<ReportePlanillaResumen[]>>(`/reportes/planilla${query}`);
}

export function getReportePlanilla(id: number) {
  return apiFetch<ApiResponse<ReportePlanilla>>(`/reportes/planilla/${id}`);
}

export function getReportePlanillaPdf(id: number) {
  return apiFetchBlob(`/reportes/planilla/${id}/pdf`);
}

export function getReportePlanillaExcel(id: number) {
  return apiFetchBlob(`/reportes/planilla/${id}/excel`);
}

/**
 * Ingresos y Egresos (estado de resultados): exige `cajas.ver`. desde/hasta
 * opcionales (por defecto, del 1 del mes a hoy); el alcance por rol lo aplica
 * el backend (el adm. de agencia queda fijado a la suya, el asesor a su caja).
 */
function ingresosEgresosQuery(desde?: string, hasta?: string, agenciaId?: number): string {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  if (agenciaId) params.set('agencia_id', String(agenciaId));
  const query = params.toString();

  return query ? `?${query}` : '';
}

export function getReporteIngresosEgresos(desde?: string, hasta?: string, agenciaId?: number) {
  return apiFetch<ApiResponse<ReporteIngresosEgresos>>(
    `/reportes/ingresos-egresos${ingresosEgresosQuery(desde, hasta, agenciaId)}`
  );
}

export function getReporteIngresosEgresosPdf(desde?: string, hasta?: string, agenciaId?: number) {
  return apiFetchBlob(`/reportes/ingresos-egresos/pdf${ingresosEgresosQuery(desde, hasta, agenciaId)}`);
}

export function getReporteIngresosEgresosExcel(desde?: string, hasta?: string, agenciaId?: number) {
  return apiFetchBlob(`/reportes/ingresos-egresos/excel${ingresosEgresosQuery(desde, hasta, agenciaId)}`);
}
