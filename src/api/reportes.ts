import { apiFetch } from './client';
import type { ApiResponse, CobranzaDiariaItem, MedioInyeccion, MovimientoReporteItem } from '../types/api';

export function listMovimientosDinero(desde?: string, hasta?: string, medio?: MedioInyeccion, bovedaId?: number) {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  if (medio) params.set('medio', medio);
  if (bovedaId) params.set('boveda_id', String(bovedaId));
  const query = params.toString();

  return apiFetch<ApiResponse<MovimientoReporteItem[]>>(`/reportes/movimientos-dinero${query ? `?${query}` : ''}`);
}

/** Cobranza diaria: clientes con una cuota vencida u hoy — un crédito con 2 filas si el cliente tiene 2 créditos. */
export function getReporteCobranzaDiaria() {
  return apiFetch<ApiResponse<CobranzaDiariaItem[]>>('/reportes/cobranza-diaria');
}
