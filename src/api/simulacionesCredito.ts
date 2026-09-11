import { apiFetch } from './client';
import type { ApiResponse, PaginatedData, SimulacionCredito, TipoCredito, TipoCuota } from '../types/api';

export interface CreateSimulacionCreditoPayload {
  tipo_credito: TipoCredito;
  cliente_id: number;
  monto_prestamo: string;
  /** Opcional: si se omite, el backend usa el interés por defecto configurado para el tipo. */
  interes?: string;
  tipo_cuota: TipoCuota;
  /** Opcional: si se omite, el backend usa el default por tipo_cuota. */
  numero_cuotas?: number;
}

export function listSimulaciones(page = 1, clienteId?: number) {
  const params = new URLSearchParams({ page: String(page) });
  if (clienteId) params.set('cliente_id', String(clienteId));

  return apiFetch<ApiResponse<PaginatedData<SimulacionCredito>>>(
    `/simulaciones-credito?${params.toString()}`
  );
}

export function getSimulacion(id: number) {
  return apiFetch<ApiResponse<SimulacionCredito>>(`/simulaciones-credito/${id}`);
}

export function createSimulacion(payload: CreateSimulacionCreditoPayload) {
  return apiFetch<ApiResponse<SimulacionCredito>>('/simulaciones-credito', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function eliminarSimulacion(id: number) {
  return apiFetch<ApiResponse<null>>(`/simulaciones-credito/${id}`, {
    method: 'DELETE',
  });
}
