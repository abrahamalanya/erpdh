import { apiFetch } from './client';
import type { ApiResponse, MedioInyeccion, MovimientoReporteItem } from '../types/api';

export function listMovimientosDinero(desde?: string, hasta?: string, medio?: MedioInyeccion, bovedaId?: number) {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  if (medio) params.set('medio', medio);
  if (bovedaId) params.set('boveda_id', String(bovedaId));
  const query = params.toString();

  return apiFetch<ApiResponse<MovimientoReporteItem[]>>(`/reportes/movimientos-dinero${query ? `?${query}` : ''}`);
}
