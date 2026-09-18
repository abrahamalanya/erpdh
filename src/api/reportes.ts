import { apiFetch, apiFetchBlob } from './client';
import type {
  ApiResponse,
  CajaAperturaCierreItem,
  CajaCicloDetalle,
  CobranzaDiariaItem,
  MedioInyeccion,
  MovimientoReporteItem,
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
