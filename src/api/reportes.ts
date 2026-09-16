import { apiFetch, apiFetchBlob } from './client';
import type { ApiResponse, CobranzaDiariaItem, MedioInyeccion, MovimientoReporteItem } from '../types/api';

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
