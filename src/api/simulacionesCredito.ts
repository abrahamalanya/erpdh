import { apiFetch } from './client';
import type { ApiResponse, PaginatedData, SimulacionCredito, TipoCredito, TipoCuota } from '../types/api';

export interface CreateSimulacionCreditoPayload {
  tipo_credito: TipoCredito;
  cliente_id?: number | null;
  monto_prestamo: string;
  /** Opcional: si se omite, el backend usa el interés por defecto configurado para el tipo. */
  interes?: string;
  /** Opcional: si se omite, el backend usa 'simple'. */
  tipo_interes?: 'simple' | 'compuesto';
  tipo_cuota: TipoCuota;
  /** Opcional: si se omite, el backend usa el default por tipo_cuota. */
  numero_cuotas?: number;
  modo_calculo?: 'numero_cuotas' | 'importe_cuota';
  importe_cuota?: string;
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

export type CalculoSimulacion = Pick<SimulacionCredito,
  'tipo_credito' | 'monto_prestamo' | 'interes' | 'tipo_interes' | 'tipo_cuota' |
  'numero_cuotas' | 'fecha_base' | 'plazo_dias' | 'monto_total_pagar'> & {
  modo_calculo: 'numero_cuotas' | 'importe_cuota';
  importe_cuota: string | null;
  numero_cuotas_calculadas: number;
  total_interes: string;
  saldo_residual: string;
  cronograma: (SimulacionCredito['cronograma'][number] & { saldo_pendiente: string })[];
};

export function calcularSimulacion(payload: CreateSimulacionCreditoPayload) {
  return apiFetch<ApiResponse<CalculoSimulacion>>('/simulaciones-credito/calcular', {
    method: 'POST', body: JSON.stringify(payload),
  });
}

export function getConfiguracionSimulador() {
  return apiFetch<ApiResponse<Record<TipoCredito, { interes_default: string | null; max_cuotas: number }>>>(
    '/simulaciones-credito/configuracion'
  );
}
