import { apiFetch } from './client';
import type { ApiResponse, ConfiguracionVenta } from '../types/api';

export function listConfiguracionesVenta() {
  return apiFetch<ApiResponse<ConfiguracionVenta[]>>('/configuraciones-venta');
}

export interface UpdateConfiguracionVentaPayload {
  empresa_id?: number;
  agencia_id?: number;
  interes_mensual_default: string;
}

export function updateConfiguracionVenta(payload: UpdateConfiguracionVentaPayload) {
  return apiFetch<ApiResponse<ConfiguracionVenta>>('/configuraciones-venta', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/** Solo borra overrides de agencia; la fila default de la empresa no se puede eliminar. */
export function deleteConfiguracionVenta(id: number) {
  return apiFetch<ApiResponse<null>>(`/configuraciones-venta/${id}`, { method: 'DELETE' });
}
