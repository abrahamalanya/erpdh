import { apiFetch } from './client';
import type { ApiResponse, PaginatedData } from '../types/api';

export interface RegularizacionCredito {
  id: number;
  credito_id: number;
  agencia_id: number;
  numero_cuotas: number;
  monto_condonado: string;
  motivo: string;
  created_at: string;
  credito: {
    id: number;
    tipo_credito: string;
    cliente: { nombre: string; apellido: string };
  };
  agencia: { id: number; nombre: string };
  actor: { id: number; nombre: string; apellido: string };
}

export interface ListRegularizacionesParams {
  page?: number;
  agencia_id?: number;
  asesor_id?: number;
  desde?: string;
  hasta?: string;
}

function regularizacionesQuery(params: ListRegularizacionesParams): string {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.agencia_id) qs.set('agencia_id', String(params.agencia_id));
  if (params.asesor_id) qs.set('asesor_id', String(params.asesor_id));
  if (params.desde) qs.set('desde', params.desde);
  if (params.hasta) qs.set('hasta', params.hasta);

  const suffix = qs.toString();

  return suffix ? `?${suffix}` : '';
}

/** Historial de regularizaciones visible para el actor — para el reporte. */
export function getRegularizacionesCredito(params: ListRegularizacionesParams = {}) {
  return apiFetch<ApiResponse<PaginatedData<RegularizacionCredito>>>(
    `/regularizaciones-credito${regularizacionesQuery(params)}`
  );
}
